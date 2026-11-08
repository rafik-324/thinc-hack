import { DECISION_LABELS, type Decision } from "@/lib/policy-data";

/** Engine rule ids → reviewer wording (version-neutral, so it fits v1 and every later version). */
const RULE_LABELS: Record<string, string> = {
  HR_POLICY_INACTIVE: "Policy inactive on incident date",
  HR_CLAIM_TYPE: "Outside motor own-damage cover",
  HR_INJURY: "Injury reported",
  HR_LIABILITY: "Liability disputed",
  HR_DUPLICATE: "Flagged as duplicate",
  HR_EVIDENCE_CONFLICT: "Evidence conflicts",
  HR_QUOTE_LIMIT: "Repair quote above limit",
  HR_EV_BATTERY: "EV high-voltage battery repair",
  INFO_INCIDENT_REPORT_MISSING: "Incident report missing",
  INFO_ITEMIZED_QUOTE_MISSING: "Itemized quote missing",
  INFO_UNKNOWN_REQUIRED_FACT: "Required facts missing or unreadable",
  ROUTINE_ALL_CHECKS_PASSED: "All checks passed",
};

export function ruleLabel(id: unknown): string {
  const key = String(id ?? "");
  if (!key) return "—";
  return (
    RULE_LABELS[key] ??
    key
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/^\w/, (c) => c.toUpperCase())
  );
}

/** A raw engine value such as "routine_processing" as a known decision, if it is one. */
export function asDecision(value: unknown): Decision | null {
  const key = String(value ?? "").toLowerCase();
  return key in DECISION_LABELS ? (key as Decision) : null;
}

/** Same number format everywhere in the app: €18,611. */
export function formatEur(value: number): string {
  return `€${Math.round(value).toLocaleString("en-US")}`;
}

const FACT_LABELS: Record<string, string> = {
  quote_eur: "Quote",
  claim_type: "Claim type",
  repair_type: "Repair type",
  duplicate_flag: "Duplicate",
  injury_reported: "Injury",
  evidence_conflict: "Evidence conflict",
  liability_disputed: "Liability disputed",
  itemized_quote_present: "Itemized quote",
  incident_report_present: "Incident report",
  policy_active_on_incident: "Policy active",
};

function factValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "missing";
  if (key === "quote_eur" && Number.isFinite(Number(value))) return formatEur(Number(value));
  if (key.endsWith("_present")) return value === true || value === "true" ? "present" : "missing";
  if (value === true || value === "true") return "yes";
  if (value === false || value === "false") return "no";
  return String(value).replace(/_/g, " ");
}

/**
 * The fact that decided a claim, in reviewer wording. A routine decision lists every checked field,
 * which says nothing on its own: it collapses to "All checks passed · Quote €650".
 */
export function decisiveFact(facts: Record<string, unknown>, routine: boolean): string {
  const entries = Object.entries(facts);
  if (routine && entries.length > 2) {
    const quote = facts["quote_eur"];
    return quote === undefined
      ? "All checks passed"
      : `All checks passed · Quote ${factValue("quote_eur", quote)}`;
  }
  return entries
    .map(([k, v]) => `${FACT_LABELS[k] ?? k.replace(/_/g, " ")}: ${factValue(k, v)}`)
    .join(" · ");
}
