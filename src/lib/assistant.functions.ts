import { createServerFn } from "@tanstack/react-start";

/**
 * Rico, the platform assistant behind the floating blob avatar.
 * Runs on the server only: the Gemini key (AI_API_KEY) never reaches the browser.
 * Locally the key is the one from the Settings page: the backend writes it to the repo-root .env,
 * which aiEnv() re-reads on every request. In production set AI_API_KEY as a server secret.
 */

export type AssistantTurn = { role: "user" | "assistant"; content: string };
export type AssistantInput = { messages: AssistantTurn[]; page: string; voice?: boolean };

const MAX_TURNS = 16;
const MAX_CHARS = 2000;

const PLATFORM_GUIDE = `
Retakt is a reviewer app for motor insurance claims. A rules engine decides every claim under policy v1.
When a new policy version (e.g. v2) arrives, Retakt replays all open claims and shows which ones change and why,
so reviewers know which open claims need a second look. The engine never approves or pays a claim; it only
recommends the next handling step: routine_processing, request_information or human_review.

Policy v1 rules, applied in order:
1. human_review if the policy was not active on the incident date; claim_type is not motor_own_damage;
   injury_reported, liability_disputed, duplicate_flag or evidence_conflict is true; or quote_eur > €1,500.
2. Otherwise request_information if incident_report_present or itemized_quote_present is false.
3. Otherwise routine_processing (normal downstream process, not a payment approval).
Missing or unreadable fields are never invented: request information unless a known fact already requires human review.
Policy v2 changes: the quote limit drops from €1,500 to €1,200, and repair_type ev_high_voltage_battery goes to human_review.
Closed claims keep their v1 decision; only open claims are re-evaluated.

Layout (always visible):
- Left sidebar: Overview, Policy Update, History. An arrow button collapses the sidebar.
- Header: "Testdaten / Live" toggle (built-in demo claims vs. real claims from the database),
  "Policy Version" dropdown (the version compared against v1) and "Change policy" button (applies the selection;
  a dot on the button marks an unapplied selection; with Live data and a new version the engine runs).

Overview page (/queue): open claims only.
- Filter buttons: "All decisions" and one per decision.
- Click a row to open the detail panel on the right: decision, rule, reason and decisive facts.
- "Edit claim" opens a correction form: new decision, reason ("Why is the engine's decision wrong?"), reviewer name,
  then "Save correction →" or "Cancel". The row gets an "Overridden" badge; the correction appears in the override
  history and the audit trail. Corrections are currently kept in the browser session only.
- "Claim fields" (Live only): edit raw claim fields, fill "Edited by", click "Save N". Changes show in the field history.

Policy Update page (/update):
- Upload bar at the top ("Expand"): drop or pick a file (.docx, .pdf, .txt, .md, .json, .yaml, .csv),
  enter Version (e.g. v2) and Name, click "Upload & apply" (uploads and re-evaluates all open claims, ~30 s).
  Or pick an uploaded policy in "Policy to apply" and click "Update".
- If a version is uploaded but not applied, a card offers "Apply vX now".
- Read-only analysis: KPIs, "Decisions under policy v1", "Decision heatmap v1 × vX" (off-diagonal cells are claims
  that change), "Changed claims per rule", "Changed claims" list (click opens the detail panel), "Is it correct?"
  (error rate against validated results), "Manual review vs. Retakt" (cost comparison), "Audit trail" (latest overrides).

History page (/history): closed claims, read-only, grey badges, lock icon. The detail panel says
"Closed — the decision is protected and cannot be corrected."

Typical workflow: upload v2 on Policy Update → engine runs ~30 s and reports how many open claims were re-checked,
changed or need a second look → inspect heatmap and changed claims → on Overview filter e.g. human_review and open
claims one by one → correct with "Edit claim" if needed → finished cases appear under History.
`.trim();

const SYSTEM = `You are Rico, the friendly built-in assistant of the Retakt platform.
Answer questions about the platform: what it does, where things are, which buttons exist, how workflows go,
and how the policy rules work. Use only the platform guide below; if something is not covered, say you don't know yet
instead of guessing. You cannot see live claim data and cannot perform actions yet — point the user to the right
page and button instead. Always reply in English, even if the user writes or speaks another language. Be brief (at most ~5 short sentences or a short list),
in plain text without Markdown headings. Refer to buttons by their exact label in quotes.

Platform guide:
${PLATFORM_GUIDE}`;

function readInput(raw: unknown): AssistantInput {
  const body = raw as Partial<AssistantInput> | null;
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    throw new Error("Send at least one message.");
  }
  const messages = body.messages.slice(-MAX_TURNS).map((turn) => {
    if (
      !turn ||
      (turn.role !== "user" && turn.role !== "assistant") ||
      typeof turn.content !== "string" ||
      !turn.content.trim() ||
      turn.content.length > MAX_CHARS
    ) {
      throw new Error(`Each message needs 1–${MAX_CHARS} characters.`);
    }
    return { role: turn.role, content: turn.content.trim() };
  });
  if (messages[messages.length - 1]!.role !== "user")
    throw new Error("The last message must be yours.");
  const page = typeof body.page === "string" ? body.page.slice(0, 200) : "/";
  return { messages, page, voice: body.voice === true };
}

const VOICE_STYLE = `This is a spoken conversation: your answer is read aloud.
Answer in one to three short, natural sentences. No lists, no quotes around labels, no symbols or abbreviations
that sound odd when spoken.`;

/**
 * AI settings for this request. In local dev the repo-root .env is re-read on every call, so a key changed
 * there (e.g. via the Settings page) works immediately without restarting Vite; its values win over
 * process.env. In production only process.env (server secrets) is used.
 */
async function aiEnv(): Promise<Record<string, string | undefined>> {
  const env: Record<string, string | undefined> = { ...process.env };
  if (import.meta.env.DEV) {
    try {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const text = await readFile(join(process.cwd(), "..", ".env"), "utf8");
      for (const line of text.split(/\r?\n/)) {
        const m = /^\s*(AI_PROVIDER|AI_API_KEY|AI_BASE_URL|AI_MODEL)\s*=\s*(.*?)\s*$/.exec(line);
        if (m && m[2]) env[m[1]!] = m[2].replace(/^(['"])(.*)\1$/, "$2");
      }
    } catch {
      // No root .env: fall back to process.env.
    }
  }
  return env;
}

type Provider = "gemini" | "openai_compatible" | "anthropic";

const DEFAULTS: Record<Provider, { base: string; model: string }> = {
  gemini: { base: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-3.5-flash" },
  openai_compatible: { base: "https://api.openai.com/v1", model: "gpt-4.1-mini" },
  anthropic: { base: "https://api.anthropic.com/v1", model: "claude-opus-5-5" },
};

/** Builds the provider request. Gemini: generateContent; OpenAI-compatible: chat/completions; Anthropic: messages. */
function providerRequest(
  provider: Provider,
  base: string,
  model: string,
  key: string,
  system: string,
  messages: AssistantTurn[],
) {
  if (provider === "anthropic") {
    return {
      url: `${base}/messages`,
      headers: {
        "x-api-key": key,
        "anthropic-version": "2026-10-21",
        "anthropic-beta": "server-side-fallback-2026-07-01",
      },
      body: {
        model,
        system,
        // The Messages API needs the conversation to start with a user turn.
        messages: messages.slice(messages.findIndex((turn) => turn.role === "user")),
        max_tokens: 4096,
        // Rico is a conversational helper: low effort keeps spoken answers fast.
        output_config: { effort: "low" },
        fallbacks: "default",
      },
    };
  }
  if (provider === "openai_compatible") {
    return {
      url: `${base}/chat/completions`,
      headers: { authorization: `Bearer ${key}` },
      body: {
        model,
        messages: [{ role: "system", content: system }, ...messages],
        max_completion_tokens: 2048,
      },
    };
  }
  return {
    url: `${base}/models/${model}:generateContent`,
    headers: { "x-goog-api-key": key },
    body: {
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((turn) => ({
        role: turn.role === "assistant" ? "model" : "user",
        parts: [{ text: turn.content }],
      })),
      // Thinking tokens count against maxOutputTokens; keep thinking low and leave room for the answer.
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.3,
        thinkingConfig: { thinkingLevel: "low" },
      },
    },
  };
}

function providerAnswer(provider: Provider, value: unknown): string {
  if (provider === "anthropic") {
    const v = value as { stop_reason?: string; content?: { type?: string; text?: string }[] };
    if (v.stop_reason === "refusal") return "";
    return (v.content ?? [])
      .filter((block) => block.type === "text" && typeof block.text === "string")
      .map((block) => block.text)
      .join("")
      .trim();
  }
  if (provider === "openai_compatible") {
    const v = value as { choices?: { message?: { content?: string | null } }[] };
    return (v.choices?.[0]?.message?.content ?? "").trim();
  }
  const v = value as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  };
  return (v.candidates?.[0]?.content?.parts ?? [])
    .filter((part) => typeof part.text === "string" && !part.thought)
    .map((part) => part.text)
    .join("")
    .trim();
}

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator(readInput)
  .handler(async ({ data }): Promise<{ answer: string }> => {
    const env = await aiEnv();
    // Same switch as the backend (AI_PROVIDER in .env): gemini, openai_compatible or anthropic.
    const provider: Provider =
      env["AI_PROVIDER"] === "openai_compatible" || env["AI_PROVIDER"] === "anthropic"
        ? env["AI_PROVIDER"]
        : "gemini";
    const key = env["AI_API_KEY"];
    const base = (env["AI_BASE_URL"] || DEFAULTS[provider].base).replace(/\/+$/, "");
    const model = env["AI_MODEL"] || DEFAULTS[provider].model;
    if (!key) throw new Error("CONFIG: the assistant has no AI key on the server (AI_API_KEY).");
    if (!/^https:\/\/[^/?#@]+(\/[^?#]*)?$/.test(base) || !/^[A-Za-z0-9._-]+$/.test(model)) {
      throw new Error("CONFIG: AI_BASE_URL or AI_MODEL is invalid.");
    }

    const system = `${SYSTEM}\n\nThe user is currently on page: ${data.page}${data.voice ? `\n\n${VOICE_STYLE}` : ""}`;
    const request = providerRequest(provider, base, model, key, system, data.messages);
    const response = await fetch(request.url, {
      method: "POST",
      headers: { "content-type": "application/json", ...request.headers },
      redirect: "error",
      signal: AbortSignal.timeout(25_000),
      body: JSON.stringify(request.body),
    }).catch(() => {
      throw new Error("UPSTREAM: the AI provider could not be reached.");
    });
    // Provider error bodies may echo request details; never forward them.
    if (response.status === 429)
      throw new Error(
        "UPSTREAM: Rico's AI quota is used up for now. Try again later or set a new API key in Settings.",
      );
    if (response.status === 401 || response.status === 403)
      throw new Error("UPSTREAM: the AI key was rejected. Set a valid API key in Settings.");
    if (!response.ok)
      throw new Error(`UPSTREAM: the AI provider returned HTTP ${response.status}.`);

    const answer = providerAnswer(provider, await response.json());
    if (!answer) throw new Error("UPSTREAM: the AI provider returned no answer.");
    return { answer };
  });

// ---- Rico's voice (ElevenLabs text-to-speech) ----

// Eric (ElevenLabs premade): male, smooth and calm — Rico's voice.
const VOICE_ID_DEFAULT = "cjVigY5qzO86Huf0OWal";
const MAX_SPEECH_CHARS = 1200;

/** ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID: process.env, in local dev also the repo-root .env.local and .env. */
async function voiceEnv(): Promise<Record<string, string | undefined>> {
  const env: Record<string, string | undefined> = { ...process.env };
  if (import.meta.env.DEV) {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    for (const file of [".env", ".env.local"]) {
      try {
        const text = await readFile(join(process.cwd(), "..", file), "utf8");
        for (const line of text.split(/\r?\n/)) {
          const m = /^\s*(ELEVENLABS_API_KEY|ELEVENLABS_VOICE_ID)\s*=\s*(.*?)\s*$/.exec(line);
          if (m && m[2]) env[m[1]!] = m[2].replace(/^(['"])(.*)\1$/, "$2");
        }
      } catch {
        // file not present
      }
    }
  }
  return env;
}

const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function numberWords(n: number): string {
  if (n < 20) return ONES[n]!;
  if (n < 100) return TENS[Math.floor(n / 10)]! + (n % 10 ? "-" + ONES[n % 10] : "");
  if (n < 1000)
    return ONES[Math.floor(n / 100)] + " hundred" + (n % 100 ? " and " + numberWords(n % 100) : "");
  for (const [size, name] of [
    [1e9, "billion"],
    [1e6, "million"],
    [1e3, "thousand"],
  ] as const) {
    if (n >= size)
      return (
        numberWords(Math.floor(n / size)) +
        " " +
        name +
        (n % size ? " " + numberWords(n % size) : "")
      );
  }
  return String(n);
}
const spoken = (digits: string) => {
  const n = Number(digits.replace(/,/g, ""));
  return Number.isSafeInteger(n) ? numberWords(n) : digits;
};

/**
 * Text as it should be spoken. Found with ElevenLabs speech-to-text checks of the flash model:
 * "€1,500" was read as "500", so amounts and large numbers are written out; claim IDs like "DEV-010"
 * became "Devs own", so they are spelled ("D E V 10"); snake_case words get spaces.
 */
export function speechText(text: string): string {
  return text
    .replace(
      /\b([A-Z]{2,4})-0*(\d+)\b/g,
      (_, letters: string, num: string) => `${letters.split("").join(" ")} ${num}`,
    )
    .replace(
      /(?:€|EUR)\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?/g,
      (_, num: string) => `${spoken(num)} euros`,
    )
    .replace(
      /\b(\d{1,3}(?:,\d{3})+|\d{4,})\s?(?:euros?\b|€|EUR\b)/gi,
      (_, num: string) => `${spoken(num)} euros`,
    )
    .replace(/\b\d{1,3}(?:,\d{3})+\b/g, (num) => spoken(num))
    .replace(/([a-z])_([a-z])/gi, "$1 $2")
    .replace(/([a-z])_([a-z])/gi, "$1 $2");
}

export const speakAssistant = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown): { text: string } => {
    const text = (raw as { text?: unknown } | null)?.text;
    if (typeof text !== "string" || !text.trim()) throw new Error("Send some text to speak.");
    return { text: text.trim().slice(0, MAX_SPEECH_CHARS) };
  })
  .handler(async ({ data }): Promise<{ audio: string; mime: string }> => {
    const env = await voiceEnv();
    if (!env["ELEVENLABS_API_KEY"]) throw new Error("CONFIG: no ELEVENLABS_API_KEY on the server.");
    const voiceId = env["ELEVENLABS_VOICE_ID"] || VOICE_ID_DEFAULT;
    if (!/^[A-Za-z0-9]+$/.test(voiceId)) throw new Error("CONFIG: ELEVENLABS_VOICE_ID is invalid.");
    const { ElevenLabsClient } = await import("@elevenlabs/elevenlabs-js");
    const client = new ElevenLabsClient({ apiKey: env["ELEVENLABS_API_KEY"] });
    const stream = await client.textToSpeech.convert(voiceId, {
      text: speechText(data.text),
      modelId: "eleven_flash_v2_5",
      outputFormat: "mp3_44100_128",
    });
    const bytes = new Uint8Array(await new Response(stream as ReadableStream).arrayBuffer());
    return { audio: Buffer.from(bytes).toString("base64"), mime: "audio/mpeg" };
  });
