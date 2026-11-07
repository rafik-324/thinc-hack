import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IMPACT_STATS } from "@/lib/policy-data";

export type VersionImpact = { version: string; validated: number; wrong: number; errorRate: number | null; automated: number; total: number };

/** Error rate = decisions that differ from validation_results.expected; savings = automated (non human_review) decisions × cost difference manual vs. Retakt. */
export function useDbImpact() {
  return useQuery({
    queryKey: ["db-impact"],
    queryFn: async () => {
      const [d, v] = await Promise.all([
        supabase.from("decisions").select("case_id, policy_version, recommendation"),
        supabase.from("validation_results").select("case_id, policy_version, expected"),
      ]);
      if (d.error) throw d.error;
      if (v.error) throw v.error;
      const versions = new Map<string, VersionImpact>();
      const rec = new Map<string, string>();
      for (const r of d.data ?? []) {
        rec.set(`${r.policy_version}|${r.case_id}`, r.recommendation);
        const s = versions.get(r.policy_version) ?? { version: r.policy_version, validated: 0, wrong: 0, errorRate: null, automated: 0, total: 0 };
        s.total++;
        if (r.recommendation !== "human_review") s.automated++;
        versions.set(r.policy_version, s);
      }
      for (const r of v.data ?? []) {
        const s = versions.get(r.policy_version);
        const got = rec.get(`${r.policy_version}|${r.case_id}`);
        if (!s || got === undefined) continue;
        s.validated++;
        if (got !== r.expected) s.wrong++;
      }
      for (const s of versions.values()) s.errorRate = s.validated ? (s.wrong / s.validated) * 100 : null;
      const perClaim = IMPACT_STATS.manual.costPerClaimEur - IMPACT_STATS.replay.costPerClaimEur;
      return { versions, perClaim };
    },
  });
}
