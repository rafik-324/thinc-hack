import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Claim, DataSource, Decision, VersionMode } from "@/lib/policy-data";

export interface Override {
  id: string;
  claimId: string;
  previousDecision: Decision;
  newDecision: Decision;
  reason: string;
  reviewer: string;
  at: string;
}

export interface PolicyState {
  dataSource: DataSource;
  setDataSource: (source: DataSource) => void;
  mode: VersionMode;
  setMode: (mode: VersionMode) => void;
  selectedClaimId: string | null;
  selectClaim: (claimId: string | null) => void;
  overrides: Override[];
  addOverride: (override: Omit<Override, "id" | "at">) => void;
  overridesFor: (claimId: string) => Override[];
  effectiveDecision: (claim: Claim, version: VersionMode) => Decision;
}

// Context, hook and provider live in ONE module on purpose: they hot-reload
// together, so the context identity can never drift apart during HMR.
const PolicyContext = createContext<PolicyState | null>(null);

export function usePolicy(): PolicyState {
  const ctx = useContext(PolicyContext);
  if (!ctx) throw new Error("usePolicy must be used inside PolicyProvider");
  return ctx;
}

// Overrides start empty: every entry in the audit trail comes from a correction made in this session.
const SEED_OVERRIDES: Override[] = [];

export function PolicyProvider({ children }: { children: ReactNode }) {
  // v1 is the baseline; the top bar switches to the newest uploaded version once policies load.
  const [mode, setMode] = useState<VersionMode>("v1");
  const [dataSource, setDataSource] = useState<DataSource>("live");
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Override[]>(SEED_OVERRIDES);

  const value = useMemo<PolicyState>(
    () => ({
      dataSource,
      setDataSource: (source: DataSource) => {
        setDataSource(source);
        setSelectedClaimId(null);
      },
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
        return version.startsWith("v1") ? claim.decisionV1 : claim.decisionV2;
      },
    }),
    [dataSource, mode, selectedClaimId, overrides],
  );

  return <PolicyContext.Provider value={value}>{children}</PolicyContext.Provider>;
}
