import { createServerFn } from "@tanstack/react-start";

/**
 * Platform assistant behind the floating blob avatar.
 * Runs on the server only: the Gemini key (AI_API_KEY) never reaches the browser.
 * Configure AI_API_KEY, AI_BASE_URL (https://generativelanguage.googleapis.com/v1beta) and AI_MODEL,
 * locally in app/.env.local (git-ignored).
 */

export type AssistantTurn = { role: "user" | "assistant"; content: string };
export type AssistantInput = { messages: AssistantTurn[]; page: string };

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

const SYSTEM = `You are Blobby, the friendly built-in assistant of the Retakt platform.
Answer questions about the platform: what it does, where things are, which buttons exist, how workflows go,
and how the policy rules work. Use only the platform guide below; if something is not covered, say you don't know yet
instead of guessing. You cannot see live claim data and cannot perform actions yet — point the user to the right
page and button instead. Reply in the user's language, briefly (at most ~5 short sentences or a short list),
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
  return { messages, page };
}

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator(readInput)
  .handler(async ({ data }): Promise<{ answer: string }> => {
    const key = process.env["AI_API_KEY"];
    const base = (
      process.env["AI_BASE_URL"] || "https://generativelanguage.googleapis.com/v1beta"
    ).replace(/\/+$/, "");
    const model = process.env["AI_MODEL"] || "gemini-3.5-flash";
    if (!key) throw new Error("CONFIG: the assistant has no AI key on the server (AI_API_KEY).");
    if (!/^https:\/\/[^/?#@]+(\/[^?#]*)?$/.test(base) || !/^[A-Za-z0-9._-]+$/.test(model)) {
      throw new Error("CONFIG: AI_BASE_URL or AI_MODEL is invalid.");
    }

    const response = await fetch(`${base}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      redirect: "error",
      signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: `${SYSTEM}\n\nThe user is currently on page: ${data.page}` }],
        },
        contents: data.messages.map((turn) => ({
          role: turn.role === "assistant" ? "model" : "user",
          parts: [{ text: turn.content }],
        })),
        // Thinking tokens count against maxOutputTokens; keep thinking low and leave room for the answer.
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.3,
          thinkingConfig: { thinkingLevel: "low" },
        },
      }),
    }).catch(() => {
      throw new Error("UPSTREAM: the AI provider could not be reached.");
    });
    // Provider error bodies may echo request details; never forward them.
    if (!response.ok)
      throw new Error(`UPSTREAM: the AI provider returned HTTP ${response.status}.`);

    const value = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
    };
    const answer = (value.candidates?.[0]?.content?.parts ?? [])
      .filter((part) => typeof part.text === "string" && !part.thought)
      .map((part) => part.text)
      .join("")
      .trim();
    if (!answer) throw new Error("UPSTREAM: the AI provider returned no answer.");
    return { answer };
  });
