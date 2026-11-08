import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Fixed upstream routes — never constructed from user input.
const UPSTREAM_PATHS = {
  inbox: "/api/staff/inbox",
  reviewer: "/api/evidence/reviewer",
  document: "/api/evidence/document",
  replay: "/api/staff/policy-replay",
} as const;

type UpstreamKey = keyof typeof UPSTREAM_PATHS;

// Error kinds the UI maps to distinct states. Message prefix is the contract.
const ERR = {
  config: "CONFIG: staff API is not configured",
  forbidden: "FORBIDDEN: insurer staff access required",
  upstream: "UPSTREAM: staff API request failed",
} as const;

function requireStaff(claims: unknown): void {
  const appMetadata = (claims as { app_metadata?: Record<string, unknown> } | null)?.app_metadata;
  // Only verified app_metadata counts — user-editable metadata is never trusted.
  if (appMetadata?.["staff"] !== true) {
    throw new Error(ERR.forbidden);
  }
}

async function staffPost(pathKey: UpstreamKey, body: Record<string, unknown>) {
  const origin = process.env["STAFF_API_ORIGIN"];
  const reviewerKey = process.env["CLAIM_REVIEWER_KEY"];
  if (!origin || !reviewerKey) throw new Error(ERR.config);

  let base: URL;
  try {
    base = new URL(origin);
  } catch {
    throw new Error(ERR.config);
  }
  if (base.protocol !== "https:") throw new Error(ERR.config);

  const response = await fetch(new URL(UPSTREAM_PATHS[pathKey], base), {
    method: "POST",
    headers: { "content-type": "application/json" },
    redirect: "error",
    cache: "no-store",
    body: JSON.stringify({ ...body, reviewer_key: reviewerKey }),
  });
  if (!response.ok) throw new Error(`${ERR.upstream} (${response.status})`);
  return response.json();
}

const REFERENCE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{1,63}$/;

function validReference(value: unknown): string {
  if (typeof value !== "string" || !REFERENCE_RE.test(value)) {
    throw new Error("INVALID: malformed claim reference");
  }
  return value;
}

function validCursor(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || value.length > 200) {
    throw new Error("INVALID: malformed cursor");
  }
  return value;
}

function validPosition(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 999) {
    throw new Error("INVALID: malformed document position");
  }
  return value;
}

function validRevision(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100000) {
    throw new Error("INVALID: malformed revision");
  }
  return value;
}

export interface InboxClaim {
  reference: string;
  recommendation: string | null;
  effective_recommendation: string | null;
  revision: number | null;
  rule_id: string | null;
  submitted_at: string | null;
}

export interface InboxPage {
  claims: InboxClaim[];
  next_cursor: string | null;
}

export const listSubmittedClaims = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cursor?: string }) => ({
    cursor: validCursor(input?.cursor),
  }))
  .handler(async ({ data, context }): Promise<InboxPage> => {
    requireStaff(context.claims);
    const result = (await staffPost("inbox", data.cursor ? { cursor: data.cursor } : {})) as {
      claims?: Array<{
        reference: string;
        submitted_at?: string;
        category?: ReviewerEvidence["category"];
      }>;
      next_cursor?: string | null;
    };
    if (!Array.isArray(result?.claims)) throw new Error(ERR.upstream);
    return {
      claims: result.claims.map(({ reference, submitted_at, category }) => ({
        reference,
        submitted_at: submitted_at ?? null,
        recommendation: category?.recommendation ?? null,
        effective_recommendation: category?.effective_recommendation ?? null,
        revision: category?.revision ?? null,
        rule_id: category?.rule_id ?? null,
      })),
      next_cursor: typeof result?.next_cursor === "string" ? result.next_cursor : null,
    };
  });

export interface ReviewerEvidence {
  reference: string;
  category?: {
    recommendation?: string;
    effective_recommendation?: string;
    revision?: number;
    rule_id?: string;
  };
  evidence?: {
    decision?: {
      primary_rule_id?: string;
      policy_version?: string;
      recommendation?: string;
      audit?: { detail?: { employee?: { why?: string } } };
    };
  };
  documents?: Array<{ name?: string; position?: number }>;
  corrections?: Array<{
    previous?: string;
    next?: string;
    reason?: string;
    reviewer?: string;
    at?: string;
  }>;
}

export const getClaimEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reference: string }) => ({
    reference: validReference(input?.reference),
  }))
  .handler(async ({ data, context }) => {
    requireStaff(context.claims);
    const result = (await staffPost("reviewer", { reference: data.reference })) as Omit<
      ReviewerEvidence,
      "corrections"
    > & {
      corrections?: Array<{
        previous_recommendation?: string;
        recommendation?: string;
        reason?: string;
        reviewer?: string;
        created_at?: string;
      }>;
    };
    const decision = result.evidence?.decision;
    return {
      reference: result.reference,
      category: result.category,
      evidence: {
        decision: decision && {
          primary_rule_id: decision.primary_rule_id,
          policy_version: decision.policy_version,
          recommendation: decision.recommendation,
          audit: { detail: { employee: { why: decision.audit?.detail?.employee?.why } } },
        },
      },
      documents: result.documents?.map(({ name, position }) => ({ name, position })),
      corrections: result.corrections?.map((entry) => ({
        previous: entry.previous_recommendation,
        next: entry.recommendation,
        reason: entry.reason,
        reviewer: entry.reviewer,
        at: entry.created_at,
      })),
    };
  });

export interface ClaimDocument {
  name: string;
  content_base64: string;
}

export const getClaimDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reference: string; position: number }) => ({
    reference: validReference(input?.reference),
    position: validPosition(input?.position),
  }))
  .handler(async ({ data, context }): Promise<ClaimDocument> => {
    requireStaff(context.claims);
    const result = (await staffPost("document", {
      reference: data.reference,
      position: data.position,
    })) as { name?: string; content_base64?: string };
    if (typeof result?.content_base64 !== "string") {
      throw new Error(`${ERR.upstream} (document payload)`);
    }
    return { name: result.name ?? `document-${data.position}`, content_base64: result.content_base64 };
  });

export interface PolicyReplayResult {
  reference: string;
  revision: number;
  recorded?: { version?: string; recommendation?: string; rule?: string; why?: string };
  proposed?: { version?: string; recommendation?: string; rule?: string; why?: string };
  impacted_rules?: string[];
  needs_recheck?: boolean;
  closed_retained?: boolean;
}

export const getPolicyReplay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reference: string; expected_revision: number }) => ({
    reference: validReference(input?.reference),
    expected_revision: validRevision(input?.expected_revision),
  }))
  .handler(async ({ data, context }): Promise<PolicyReplayResult> => {
    requireStaff(context.claims);
    return (await staffPost("replay", {
      reference: data.reference,
      expected_revision: data.expected_revision,
      target_version: "v2",
    })) as PolicyReplayResult;
  });
