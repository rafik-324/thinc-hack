/**
 * Turns an uploaded policy file into plain text, one paragraph per line.
 * .docx is unzipped in the browser (word/document.xml), .pdf is read with pdf.js (loaded on demand),
 * text formats are read as UTF-8.
 * Anything binary is rejected instead of being stored as garbage.
 */

export const POLICY_FILE_ACCEPT = ".docx,.pdf,.txt,.md,.json,.yaml,.yml,.csv";
export const POLICY_FILE_HINT = ".docx .pdf .txt .md .json .yaml .csv";

export class PolicyFileError extends Error {}

export async function readPolicyFile(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  let text: string;
  if (isPdf) {
    text = await pdfToText(bytes);
  } else if (isZip) {
    const xml = await unzipEntry(bytes, "word/document.xml");
    if (xml == null) throw new PolicyFileError("This archive is not a Word document (.docx).");
    text = docxXmlToText(xml);
  } else {
    if (/\.(doc|pdf|odt|rtf|pages)$/i.test(file.name))
      throw new PolicyFileError("Please upload the policy as .docx, .pdf or plain text.");
    text = new TextDecoder("utf-8").decode(bytes);
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const bad = [...text].some((c) => c === "\u0000" || c === "\ufffd");
    if (bad)
      throw new PolicyFileError(
        "The file is not readable text. Please upload .docx, .pdf or plain text.",
      );
  }
  text = text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) throw new PolicyFileError("The file contains no text.");
  return text;
}

type PdfItem = { str: string; hasEOL?: boolean; height?: number; transform?: number[] };

/** Joins a PDF text layer into paragraphs: wrapped lines are merged, a new paragraph starts
 *  at a larger vertical gap, a change in font size (headings) or a numbered item ("1. "). */
export async function pdfToText(bytes: Uint8Array): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = (
      await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
    ).default;
  }
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: bytes.slice(), isEvalSupported: false }).promise;
  } catch {
    throw new PolicyFileError("The PDF could not be read.");
  }
  const paragraphs: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const items = (await page.getTextContent()).items as PdfItem[];
    // Collect visual lines with their baseline y and font size.
    const lines: { text: string; y: number; size: number }[] = [];
    let cur = { text: "", y: NaN, size: 0 };
    for (const it of items) {
      if (Number.isNaN(cur.y) && it.transform)
        cur = { ...cur, y: it.transform[5] ?? NaN, size: it.height ?? 0 };
      cur.text += it.str;
      if (it.height) cur.size = Math.max(cur.size, it.height);
      if (it.hasEOL) {
        if (cur.text.trim()) lines.push({ ...cur, text: cur.text.trim() });
        cur = { text: "", y: NaN, size: 0 };
      }
    }
    if (cur.text.trim()) lines.push({ ...cur, text: cur.text.trim() });
    let para = "";
    lines.forEach((line, i) => {
      const prev = lines[i - 1];
      const gap = prev ? prev.y - line.y : 0;
      const newPara =
        !prev ||
        Math.abs(line.size - prev.size) > 0.5 ||
        gap > Math.max(line.size, prev.size) * 1.6 ||
        /^\d+\.\s/.test(line.text);
      if (newPara) {
        if (para) paragraphs.push(para);
        para = line.text;
      } else {
        para += (para.endsWith("-") ? "" : " ") + line.text;
      }
    });
    if (para) paragraphs.push(para);
  }
  await doc.destroy();
  return paragraphs.join("\n");
}

/** Paragraphs of a WordprocessingML body as lines; tabs and line breaks kept. */
export function docxXmlToText(xml: string): string {
  const paragraphs = xml.match(/<w:p[ >][\s\S]*?<\/w:p>|<w:p\/>/g) ?? [];
  return paragraphs
    .map((p) =>
      decodeXml(
        p
          .replace(/<w:tab\/>/g, "\t")
          .replace(/<w:(br|cr)\/>/g, "\n")
          .replace(/<w:instrText[\s\S]*?<\/w:instrText>/g, "")
          .replace(/<[^>]+>/g, ""),
      ),
    )
    .filter((line) => line.trim())
    .join("\n");
}

function decodeXml(s: string) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

/** Reads one entry of a ZIP file via its central directory. Stored and deflate entries only. */
async function unzipEntry(zip: Uint8Array, name: string): Promise<string | null> {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new PolicyFileError("The .docx file is damaged.");
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  for (let n = 0; n < count && p + 46 <= zip.length; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const compSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const entry = dec.decode(zip.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (entry !== name) continue;
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const data = zip.subarray(start, start + compSize);
    if (method === 0) return dec.decode(data);
    if (method !== 8) throw new PolicyFileError("Unsupported .docx compression.");
    const stream = new Blob([data as Uint8Array<ArrayBuffer>])
      .stream()
      .pipeThrough(new DecompressionStream("deflate-raw"));
    return dec.decode(await new Response(stream).arrayBuffer());
  }
  return null;
}
