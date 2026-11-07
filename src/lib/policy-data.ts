export type Decision = "fast_track" | "standard_review" | "specialist_review" | "reject";
export type ClaimStatus = "open" | "closed";
export type VersionMode = "v1" | "v2" | "compare";

export const DECISION_LABELS: Record<Decision, string> = {
  fast_track: "Fast track",
  standard_review: "Standard review",
  specialist_review: "Specialist review",
  reject: "Reject",
};

export const DECISION_ORDER: Decision[] = ["fast_track", "standard_review", "specialist_review", "reject"];

export interface Rule {
  id: string;
  name: string;
  clauseV1: string;
  clauseV2: string;
  changed: boolean;
}

export const RULES: Rule[] = [
  {
    id: "R1",
    name: "Fast-track threshold",
    clauseV1: "Claims with a damage amount of €5,000 or less and no reported injuries are fast-tracked.",
    clauseV2: "Claims with a damage amount of €2,500 or less and no reported injuries are fast-tracked.",
    changed: true,
  },
  {
    id: "R2",
    name: "Injury escalation",
    clauseV1: "Claims with any reported bodily injury require specialist review.",
    clauseV2: "Claims with any reported bodily injury require specialist review.",
    changed: false,
  },
  {
    id: "R3",
    name: "Documentation deadline",
    clauseV1: "Claims older than 30 days without complete documentation are rejected.",
    clauseV2: "Claims older than 45 days without complete documentation are rejected.",
    changed: true,
  },
  {
    id: "R4",
    name: "Water damage escalation",
    clauseV1: "Water damage claims above €10,000 require specialist review.",
    clauseV2: "Water damage claims above €8,000 require specialist review.",
    changed: true,
  },
  {
    id: "R5",
    name: "Duplicate submissions",
    clauseV1: "Duplicate claim submissions within 90 days are rejected.",
    clauseV2: "Duplicate claim submissions within 90 days are rejected.",
    changed: false,
  },
  {
    id: "R6",
    name: "Default handling",
    clauseV1: "All remaining claims receive a standard review.",
    clauseV2: "All remaining claims receive a standard review.",
    changed: false,
  },
];

export interface Claim {
  id: string;
  claimant: string;
  rule: string;
  decisiveFact: string;
  explanation: string;
  decisionV1: Decision;
  decisionV2: Decision;
  status: ClaimStatus;
  amountEur: number;
}

export const CLAIMS: Claim[] = [
  {
    id: "CLM-1001",
    claimant: "M. Berger",
    rule: "R6",
    decisiveFact: "Kitchen fire damage of €1,800, no injuries, complete documentation.",
    explanation:
      "No fast-track or escalation rule applies. The claim falls through to the default rule R6 and receives a standard review under both policy versions.",
    decisionV1: "standard_review",
    decisionV2: "standard_review",
    status: "open",
    amountEur: 1800,
  },
  {
    id: "CLM-1002",
    claimant: "S. Kramer",
    rule: "R1",
    decisiveFact: "Broken window, damage of €1,200, no injuries.",
    explanation:
      "The damage amount is below the fast-track threshold in both v1 (€5,000) and v2 (€2,500), so the claim is fast-tracked under both versions.",
    decisionV1: "fast_track",
    decisionV2: "fast_track",
    status: "open",
    amountEur: 1200,
  },
  {
    id: "CLM-1003",
    claimant: "A. Yilmaz",
    rule: "R1",
    decisiveFact: "Bicycle theft, damage of €3,100, no injuries.",
    explanation:
      "Under v1 the amount of €3,100 was below the €5,000 fast-track threshold. Policy v2 lowers the threshold to €2,500, so the claim now requires a standard review.",
    decisionV1: "fast_track",
    decisionV2: "standard_review",
    status: "open",
    amountEur: 3100,
  },
  {
    id: "CLM-1004",
    claimant: "J. Novak",
    rule: "R2",
    decisiveFact: "Car accident with reported whiplash injury, damage of €6,500.",
    explanation:
      "Rule R2 escalates every claim with a reported bodily injury to specialist review. This rule is unchanged between v1 and v2.",
    decisionV1: "specialist_review",
    decisionV2: "specialist_review",
    status: "open",
    amountEur: 6500,
  },
  {
    id: "CLM-1005",
    claimant: "L. Fontaine",
    rule: "R6",
    decisiveFact: "Storm damage to roof tiles, €2,100, documentation complete.",
    explanation:
      "Standard handling under R6 in both versions. The claim is closed; the decision is protected and cannot be changed by a policy replay.",
    decisionV1: "standard_review",
    decisionV2: "standard_review",
    status: "closed",
    amountEur: 2100,
  },
  {
    id: "CLM-1006",
    claimant: "P. Hansen",
    rule: "R5",
    decisiveFact: "Same water damage submitted twice within 40 days.",
    explanation:
      "Rule R5 rejects duplicate submissions within 90 days. The rule is identical in v1 and v2, so the rejection stands under both versions.",
    decisionV1: "reject",
    decisionV2: "reject",
    status: "open",
    amountEur: 4400,
  },
  {
    id: "CLM-1007",
    claimant: "R. Silva",
    rule: "R1",
    decisiveFact: "Smartphone damage, €4,200 claim bundle, no injuries.",
    explanation:
      "The €4,200 amount qualified for fast track under the v1 threshold of €5,000. With the v2 threshold lowered to €2,500, the claim moves to standard review.",
    decisionV1: "fast_track",
    decisionV2: "standard_review",
    status: "open",
    amountEur: 4200,
  },
  {
    id: "CLM-1008",
    claimant: "T. Weber",
    rule: "R6",
    decisiveFact: "Storm damage to garden and fence, €7,800, no injuries.",
    explanation:
      "No escalation rule applies to this storm damage claim. It receives a standard review under R6 in both policy versions.",
    decisionV1: "standard_review",
    decisionV2: "standard_review",
    status: "open",
    amountEur: 7800,
  },
  {
    id: "CLM-1009",
    claimant: "E. Rossi",
    rule: "R1",
    decisiveFact: "Cracked ceramic hob, €900, no injuries.",
    explanation:
      "Well below the fast-track threshold in both versions. The claim is closed; the decision is protected.",
    decisionV1: "fast_track",
    decisionV2: "fast_track",
    status: "closed",
    amountEur: 900,
  },
  {
    id: "CLM-1010",
    claimant: "K. Meyer",
    rule: "R2",
    decisiveFact: "Rear-end collision, passenger with back injury, €12,000.",
    explanation:
      "A reported bodily injury triggers specialist review under R2 in both v1 and v2.",
    decisionV1: "specialist_review",
    decisionV2: "specialist_review",
    status: "open",
    amountEur: 12000,
  },
  {
    id: "CLM-1011",
    claimant: "N. Ali",
    rule: "R3",
    decisiveFact: "Theft claim submitted 38 days after the incident, documentation incomplete.",
    explanation:
      "Under v1 the claim exceeded the 30-day documentation deadline and was rejected. Policy v2 extends the grace period to 45 days, so the claim now receives a standard review.",
    decisionV1: "reject",
    decisionV2: "standard_review",
    status: "open",
    amountEur: 2600,
  },
  {
    id: "CLM-1012",
    claimant: "B. Kovacs",
    rule: "R6",
    decisiveFact: "Water pipe leak in bathroom, €3,400, complete documentation.",
    explanation:
      "The amount is below the water damage escalation threshold in both v1 (€10,000) and v2 (€8,000), so standard review applies under R6.",
    decisionV1: "standard_review",
    decisionV2: "standard_review",
    status: "open",
    amountEur: 3400,
  },
  {
    id: "CLM-1013",
    claimant: "H. Lindqvist",
    rule: "R5",
    decisiveFact: "Duplicate of a luggage claim filed 20 days earlier.",
    explanation:
      "Rejected as a duplicate under R5 in both versions. The claim is closed; the decision is protected.",
    decisionV1: "reject",
    decisionV2: "reject",
    status: "closed",
    amountEur: 1150,
  },
  {
    id: "CLM-1014",
    claimant: "C. Dubois",
    rule: "R4",
    decisiveFact: "Water damage after pipe burst, €9,200.",
    explanation:
      "Under v1 the €9,200 water damage stayed below the €10,000 escalation threshold. Policy v2 lowers the threshold to €8,000, so the claim now requires specialist review.",
    decisionV1: "standard_review",
    decisionV2: "specialist_review",
    status: "open",
    amountEur: 9200,
  },
  {
    id: "CLM-1015",
    claimant: "O. Petrov",
    rule: "R1",
    decisiveFact: "Vandalism to front door, €2,300, no injuries.",
    explanation:
      "The amount is below the fast-track threshold in both versions, so the claim is fast-tracked under v1 and v2.",
    decisionV1: "fast_track",
    decisionV2: "fast_track",
    status: "open",
    amountEur: 2300,
  },
  {
    id: "CLM-1016",
    claimant: "G. Fischer",
    rule: "R6",
    decisiveFact: "Hail damage to car roof, €5,600, no injuries.",
    explanation:
      "No escalation rule applies; standard review under R6 in both policy versions.",
    decisionV1: "standard_review",
    decisionV2: "standard_review",
    status: "open",
    amountEur: 5600,
  },
  {
    id: "CLM-1017",
    claimant: "I. Santos",
    rule: "R1",
    decisiveFact: "E-bike theft, €2,900, no injuries.",
    explanation:
      "Fast-tracked under the v1 threshold of €5,000. The v2 threshold of €2,500 is exceeded, so the claim moves to standard review.",
    decisionV1: "fast_track",
    decisionV2: "standard_review",
    status: "open",
    amountEur: 2900,
  },
  {
    id: "CLM-1018",
    claimant: "W. Braun",
    rule: "R2",
    decisiveFact: "Workplace accident with fracture, €15,300.",
    explanation:
      "Specialist review under R2 in both versions due to the reported injury. The claim is closed; the decision is protected.",
    decisionV1: "specialist_review",
    decisionV2: "specialist_review",
    status: "closed",
    amountEur: 15300,
  },
  {
    id: "CLM-1019",
    claimant: "D. Marino",
    rule: "R6",
    decisiveFact: "Laptop damage during business trip, €4,100.",
    explanation:
      "Standard review under R6 in both policy versions; no fast-track or escalation rule applies.",
    decisionV1: "standard_review",
    decisionV2: "standard_review",
    status: "open",
    amountEur: 4100,
  },
  {
    id: "CLM-1020",
    claimant: "F. Nielsen",
    rule: "R4",
    decisiveFact: "Water damage in basement, €8,400.",
    explanation:
      "Below the v1 escalation threshold of €10,000, but above the new v2 threshold of €8,000. The claim moves from standard to specialist review.",
    decisionV1: "standard_review",
    decisionV2: "specialist_review",
    status: "open",
    amountEur: 8400,
  },
  {
    id: "CLM-1021",
    claimant: "V. Schmidt",
    rule: "R3",
    decisiveFact: "Claim submitted 52 days after the incident, documentation still incomplete.",
    explanation:
      "The claim exceeds the documentation deadline in both v1 (30 days) and v2 (45 days), so it is rejected under both versions.",
    decisionV1: "reject",
    decisionV2: "reject",
    status: "open",
    amountEur: 3900,
  },
  {
    id: "CLM-1022",
    claimant: "U. Keller",
    rule: "R6",
    decisiveFact: "Bicycle accident without injuries, €1,500, documentation complete.",
    explanation:
      "Standard review under R6 in both versions. The claim is closed; the decision is protected.",
    decisionV1: "standard_review",
    decisionV2: "standard_review",
    status: "closed",
    amountEur: 1500,
  },
  {
    id: "CLM-1023",
    claimant: "Q. Adam",
    rule: "R2",
    decisiveFact: "Slip and fall in supermarket, concussion reported, €8,900.",
    explanation:
      "The reported concussion triggers specialist review under R2 in both policy versions.",
    decisionV1: "specialist_review",
    decisionV2: "specialist_review",
    status: "open",
    amountEur: 8900,
  },
  {
    id: "CLM-1024",
    claimant: "Z. Horvat",
    rule: "R3",
    decisiveFact: "Claim submitted 41 days after the incident, receipts missing.",
    explanation:
      "Rejected under the v1 deadline of 30 days. The v2 grace period of 45 days covers this claim, so it now receives a standard review.",
    decisionV1: "reject",
    decisionV2: "standard_review",
    status: "open",
    amountEur: 2200,
  },
  {
    id: "CLM-1025",
    claimant: "X. Wagner",
    rule: "R1",
    decisiveFact: "Coffee machine water leak, €1,700, no injuries.",
    explanation:
      "Below the fast-track threshold in both versions; fast-tracked under v1 and v2.",
    decisionV1: "fast_track",
    decisionV2: "fast_track",
    status: "open",
    amountEur: 1700,
  },
];

export function isChanged(claim: Claim): boolean {
  return claim.decisionV1 !== claim.decisionV2;
}

export function getRule(ruleId: string): Rule {
  return RULES.find((r) => r.id === ruleId) ?? RULES[RULES.length - 1];
}

/** v1 rows x v2 columns decision matrix for the heatmap. */
export function decisionMatrix(): number[][] {
  const matrix = DECISION_ORDER.map(() => DECISION_ORDER.map(() => 0));
  for (const claim of CLAIMS) {
    const row = DECISION_ORDER.indexOf(claim.decisionV1);
    const col = DECISION_ORDER.indexOf(claim.decisionV2);
    matrix[row][col] += 1;
  }
  return matrix;
}

export const IMPACT_STATS = {
  errorRateV1: 8.0,
  errorRateV2: 3.2,
  savingsEur: 12400,
  correctness: {
    correctlyChanged: 5,
    wronglyChanged: 1,
    missingChange: 2,
    unexpectedChange: 1,
  },
  manual: { costPerClaimEur: 38, minutesPerClaim: 45 },
  replay: { costPerClaimEur: 4, minutesPerClaim: 3 },
};
