import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { readPolicyFile } from "@/lib/policy-file";

export interface PolicyRow {
  id: string;
  version: string;
  name: string;
  file_name: string | null;
  created_at: string;
  /** False for seeded placeholders whose text has not been uploaded yet. */
  has_content: boolean;
}

const db = supabase as unknown as { from: (t: string) => any };

/** All uploaded policies from the database, oldest first. Every policy picker reads this. */
export function usePolicies() {
  return useQuery({
    queryKey: ["policies"],
    queryFn: async (): Promise<PolicyRow[]> => {
      const { data, error } = await db
        .from("policies")
        .select("id,version,name,file_name,created_at,content")
        .order("created_at");
      if (error) throw error;
      return (data as (Omit<PolicyRow, "has_content"> & { content: string | null })[]).map(
        ({ content, ...row }) => ({ ...row, has_content: !!content?.trim() }),
      );
    },
  });
}

export function useUploadPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { version: string; name: string; file: File }) => {
      const content = await readPolicyFile(input.file);
      const row = { name: input.name.trim(), file_name: input.file.name, content };
      const version = input.version.trim();
      // A seeded placeholder (empty content) is filled once; after that a version is immutable.
      const filled = await db
        .from("policies")
        .update(row)
        .eq("version", version)
        .eq("content", "")
        .select("id");
      if (filled.error) throw filled.error;
      if (filled.data?.length) return;
      const { error } = await db.from("policies").insert({ version, ...row });
      if (error) {
        if (error.code === "23505") throw new Error(`Policy ${version} already has a text.`);
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["policies"] }),
  });
}

/** Python backend (python3 -m backend). Override with VITE_REVIEWER_API_URL. */
export const REVIEWER_API = (
  (import.meta.env["VITE_REVIEWER_API_URL"] as string | undefined) || "http://127.0.0.1:8765"
).replace(/\/$/, "");

export interface ApplyCitation {
  target: string;
  old_quote: string;
  new_quote: string;
}

/** Response of POST /api/policies/{version}/apply (backend/policy_apply.py). */
export interface ApplyResult {
  version: string;
  baseline_version: string;
  claims_total: number;
  open_evaluated: number;
  closed_retained: number;
  changed: number;
  needs_recheck: number;
  config_created: boolean;
  summary: string | null;
  citations: ApplyCitation[];
  errors: unknown[];
}

export class ApplyError extends Error {
  constructor(
    message: string,
    public problems: string[] = [],
  ) {
    super(message);
  }
}

/**
 * Runs the engine for one uploaded policy version: the backend interprets the policy text
 * (LLM, checked against verbatim quotes), re-evaluates every current claim and stores one
 * decision per open claim for that version in Supabase.
 */
export function useApplyPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: APPLY_KEY,
    mutationFn: async (version: string): Promise<ApplyResult> => {
      let res: Response;
      try {
        res = await fetch(`${REVIEWER_API}/api/policies/${encodeURIComponent(version)}/apply`, {
          method: "POST",
        });
      } catch {
        throw new ApplyError(
          `Backend not reachable at ${REVIEWER_API}. Start it with: python3 -m backend --ui-origin ${window.location.origin}`,
        );
      }
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new ApplyError(body?.error ?? `Backend error ${res.status}`, body?.problems ?? []);
      }
      return body as ApplyResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live-claims"] });
      qc.invalidateQueries({ queryKey: ["db-impact"] });
      qc.invalidateQueries({ queryKey: ["policies"] });
      qc.invalidateQueries({ queryKey: ["policy-run"] });
      qc.invalidateQueries({ queryKey: ["policy-config"] });
      qc.invalidateQueries({ queryKey: DECIDED_KEY });
    },
  });
}

const APPLY_KEY = ["apply-policy"];
const DECIDED_KEY = ["decided-versions"];

/** Policy versions that already have engine decisions in the database (can be shown without a new run). */
export function useDecidedVersions() {
  return useQuery({
    queryKey: DECIDED_KEY,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase.from("decisions").select("policy_version");
      if (error) throw error;
      return new Set((data ?? []).map((row) => row.policy_version));
    },
    staleTime: 30_000,
  });
}

/** True while any engine run started from anywhere in the app is still in progress. */
export function useApplyRunning() {
  return useIsMutating({ mutationKey: APPLY_KEY }) > 0;
}

export function describeApply(r: ApplyResult) {
  return `${r.open_evaluated} open claims re-checked · ${r.changed} changed · ${r.needs_recheck} need a second look · ${r.closed_retained} closed kept`;
}

export function describeApplyError(e: unknown) {
  const err = e as ApplyError;
  return [err.message, ...(err.problems ?? [])].join(" · ");
}

/** Latest engine run of one version (policy_runs, written by the backend). null = not applied yet. */
export interface PolicyRun {
  id: number;
  version: string;
  baseline_version: string;
  claims_total: number;
  open_evaluated: number;
  closed_retained: number;
  changed: number;
  needs_recheck: number;
  created_at: string;
  /** Per claim: concrete engine rule (id + readable name) under the old and the new version. */
  rows: {
    case_id: string;
    rule_v1: string;
    rule_v2: string;
    rule_v1_name?: string;
    rule_v2_name?: string;
    recommendation_v1?: string;
    recommendation_v2?: string;
    needs_recheck?: boolean;
  }[];
}

export function useLatestRun(version: string, enabled = true) {
  return useQuery({
    queryKey: ["policy-run", version],
    enabled: enabled && version !== "v1",
    queryFn: async (): Promise<PolicyRun | null> => {
      const { data, error } = await db
        .from("policy_runs")
        .select(
          "id,version,baseline_version,claims_total,open_evaluated,closed_retained,changed,needs_recheck,created_at,rows",
        )
        .eq("version", version)
        .order("id", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data as PolicyRun[])[0] ?? null;
    },
  });
}

/** How an applied policy was read: the model and the verbatim quotes backing each rule change. */
export interface AppliedConfig {
  version: string;
  baseline_version: string;
  created_at: string;
  interpretation: {
    summary?: string;
    model?: string;
    citations?: ApplyCitation[];
  };
}

export function useAppliedConfig(version: string, enabled = true) {
  return useQuery({
    queryKey: ["policy-config", version],
    enabled: enabled && version !== "v1",
    queryFn: async (): Promise<AppliedConfig | null> => {
      const { data, error } = await db
        .from("policy_configs")
        .select("version,baseline_version,created_at,interpretation")
        .eq("version", version)
        .limit(1);
      if (error) throw error;
      return (data as AppliedConfig[])[0] ?? null;
    },
  });
}
