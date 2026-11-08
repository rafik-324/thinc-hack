import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import {
  CLAIMS,
  DECISION_ORDER,
  LIVE_DECISION_ORDER,
  type Claim,
  type Decision,
} from "@/lib/policy-data";
import { usePolicy } from "@/lib/policy-store";

const LIVE_DECISIONS = new Set<string>(LIVE_DECISION_ORDER);
const toDecision = (value: string | undefined): Decision =>
  value && LIVE_DECISIONS.has(value) ? (value as Decision) : "human_review";

/** `version` is the policy compared against v1 (the selected policy version). */
async function fetchLiveClaims(version: string): Promise<Claim[]> {
  const [claimsRes, decisionsRes] = await Promise.all([
    supabase.from("claims").select("*").order("case_id"),
    supabase.from("decisions").select("*"),
  ]);
  if (claimsRes.error) throw claimsRes.error;
  if (decisionsRes.error) throw decisionsRes.error;

  return claimsRes.data.map((row) => {
    const decisions = decisionsRes.data.filter((d) => d.case_id === row.case_id);
    const v1 = decisions.find((d) => d.policy_version.startsWith("v1")) ?? decisions[0];
    // Closed claims have no row for a newer version: they keep their v1 decision.
    const v2 = version === "v1" ? undefined : decisions.find((d) => d.policy_version === version);
    const fields = (row.source_fields ?? {}) as Record<string, unknown>;
    const amount = Number(fields["quote_eur"] ?? 0);
    const facts = (v1?.supporting_facts ?? {}) as Record<string, unknown>;
    const factText = Object.entries(facts)
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${String(v)}`)
      .join(" · ");
    const clause = v1?.policy_clause ?? "";
    return {
      id: row.case_id,
      claimant: String(fields["claim_type"] ?? "—").replace(/_/g, " "),
      rule: v1?.matched_rule ?? "—",
      ruleV2: v2?.matched_rule ?? undefined,
      decisiveFact: factText || row.claim_summary,
      explanation: v1?.explanation ?? row.claim_summary,
      decisionV1: toDecision(v1?.recommendation),
      decisionV2: toDecision((v2 ?? v1)?.recommendation),
      status: row.case_status === "closed" ? "closed" : "open",
      amountEur: Number.isFinite(amount) ? amount : 0,
      live: true,
      ruleInfo: {
        id: v1?.matched_rule ?? "—",
        name: row.claim_summary,
        clauseV1: clause,
        clauseV2: v2?.policy_clause ?? clause,
        changed: Boolean(v2 && v2.recommendation !== v1?.recommendation),
      },
    } satisfies Claim;
  });
}

/** Claims for the currently chosen data source (demo sample data or the live database). */
export function useClaimSource() {
  const { dataSource, mode } = usePolicy();
  const live = useQuery({
    queryKey: ["live-claims", mode],
    queryFn: () => fetchLiveClaims(mode),
    enabled: dataSource === "live",
  });
  if (dataSource === "demo") {
    return { claims: CLAIMS, order: DECISION_ORDER, isLoading: false, error: null };
  }
  return {
    claims: live.data ?? [],
    order: LIVE_DECISION_ORDER,
    isLoading: live.isLoading,
    error: live.error,
  };
}
