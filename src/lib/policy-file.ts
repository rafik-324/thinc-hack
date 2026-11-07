/**
 * Turns an uploaded policy file into plain text, one paragraph per line.
 * .docx is unzipped in the browser (word/document.xml); text formats are read as UTF-8.
 * Anything binary is rejected instead of being stored as garbage.
 */

export const POLICY_FILE_ACCEPT = ".docx,.txt,.md,.json,.yaml,.yml,.csv";
export const POLICY_FILE_HINT = ".docx .txt .md .json .yaml .csv";

export class PolicyFileError extends Error {}

export async function readPolicyFile(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  let text: string;
  if (isZip) {
    const xml = await unzipEntry(bytes, "word/document.xml");
    if (xml == null) throw new PolicyFileError("This archive is not a Word document (.docx).");
    text = docxXmlToText(xml);
  } else {
    if (/\.(doc|pdf|odt|rtf|pages)$/i.test(file.name))
      throw new PolicyFileError("Please upload the policy as .docx or plain text.");
    text = new TextDecoder("utf-8").decode(bytes);
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const bad = [...text].some((c) => c === "\u0000" || c === "\ufffd");
    if (bad)
      throw new PolicyFileError(
        "The file is not readable text. Please upload .docx or plain text.",
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
