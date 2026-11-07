import { createContext, useContext } from "react";
import type { Claim, Decision, VersionMode } from "@/lib/policy-data";

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
  mode: VersionMode;
  setMode: (mode: VersionMode) => void;
  selectedClaimId: string | null;
  selectClaim: (claimId: string | null) => void;
  overrides: Override[];
  addOverride: (override: Omit<Override, "id" | "at">) => void;
  overridesFor: (claimId: string) => Override[];
  effectiveDecision: (claim: Claim, version: "v1" | "v2") => Decision;
}

export const PolicyContext = createContext<PolicyState | null>(null);

export function usePolicy(): PolicyState {
  const ctx = useContext(PolicyContext);
  if (!ctx) throw new Error("usePolicy must be used inside PolicyProvider");
  return ctx;
}
