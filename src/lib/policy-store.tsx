import { useMemo, useState, type ReactNode } from "react";
import type { VersionMode } from "@/lib/policy-data";
import { PolicyContext, type Override, type PolicyState } from "@/lib/policy-context";

const SEED_OVERRIDES: Override[] = [
  {
    id: "ov-seed-1",
    claimId: "CLM-1006",
    previousDecision: "reject",
    newDecision: "standard_review",
    reason: "Customer proved the second submission was a correction, not a duplicate.",
    reviewer: "J. Anders",
    at: "2026-11-05T14:32:00Z",
  },
  {
    id: "ov-seed-2",
    claimId: "CLM-1012",
    previousDecision: "standard_review",
    newDecision: "fast_track",
    reason: "Long-standing customer, damage fully documented with photos.",
    reviewer: "M. Roth",
    at: "2026-11-06T09:15:00Z",
  },
];

export function PolicyProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<VersionMode>("v2");
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Override[]>(SEED_OVERRIDES);

  const value = useMemo<PolicyState>(
    () => ({
      mode,
      setMode,
      selectedClaimId,
      selectClaim: setSelectedClaimId,
      overrides,
      addOverride: (override) =>
        setOverrides((prev) => [
          { ...override, id: `ov-${Date.now()}`, at: new Date().toISOString() },
          ...prev,
        ]),
      overridesFor: (claimId) => overrides.filter((o) => o.claimId === claimId),
      effectiveDecision: (claim, version) => {
        const latest = overrides.find((o) => o.claimId === claim.id);
        if (latest) return latest.newDecision;
        return version === "v1" ? claim.decisionV1 : claim.decisionV2;
      },
    }),
    [mode, selectedClaimId, overrides],
  );

  return <PolicyContext.Provider value={value}>{children}</PolicyContext.Provider>;
}
