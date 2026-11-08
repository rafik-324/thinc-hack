import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  Lock,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PolicyUploadBar } from "@/components/policy-upload-bar";
import { DecisionBadge } from "@/components/decision-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DECISION_LABELS, IMPACT_STATS, isChanged } from "@/lib/policy-data";
import { usePolicy } from "@/lib/policy-store";
import { useDbImpact } from "@/lib/db-impact";
import { Button } from "@/components/ui/button";
import {
  describeApply,
  describeApplyError,
  useApplyPolicy,
  useApplyRunning,
  useLatestRun,
  usePolicies,
} from "@/lib/policies";
import { toast } from "sonner";
import { useClaimSource } from "@/lib/live-claims";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/update")({
  head: () => ({
    meta: [
      { title: "Policy Update — Retakt" },
      {
        name: "description",
        content:
          "Compare policy v1 against v2: KPIs, decision heatmap, changed claims and audit trail.",
      },
      { property: "og:title", content: "Policy Update — Retakt" },
      {
        property: "og:description",
        content:
          "Compare policy v1 against v2: KPIs, decision heatmap, changed claims and audit trail.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PolicyUpdate,
});

const HEAT_SHADES = [
  "bg-foreground/[0.03]",
  "bg-foreground/[0.06]",
  "bg-foreground/[0.10]",
  "bg-foreground/[0.15]",
  "bg-foreground/[0.21]",
];

function PolicyUpdate() {
  const { overrides, mode, dataSource } = usePolicy();
  const live = dataSource === "live";
  const { data: run, isLoading: runLoading } = useLatestRun(mode, live);
  const { data: policies = [] } = usePolicies();
  const applyPolicy = useApplyPolicy();
  const running = useApplyRunning();
  // Uploaded but never processed: show a call to action instead of an empty comparison.
  const notApplied =
    live &&
    mode !== "v1" &&
    !runLoading &&
    !run &&
    policies.some((p) => p.version === mode && p.has_content);
  // Compare only when a newer version is selected and (live) actually processed; otherwise show v1 as is.
  const comparing = mode !== "v1" && (!live || !!run);
  const applyNow = () =>
    applyPolicy.mutate(mode, {
      onSuccess: (r) => toast.success(`Policy ${mode} applied`, { description: describeApply(r) }),
      onError: (e) => toast.error("Policy update failed", { description: describeApplyError(e) }),
    });
  const { data: impact } = useDbImpact();
  // Same data source as the overview (demo sample or live database), never fixed sample rules.
  const { claims: CLAIMS, order: DECISION_ORDER } = useClaimSource();
  const changedClaims = CLAIMS.filter(isChanged);
  const matrix = DECISION_ORDER.map((v1) =>
    DECISION_ORDER.map(
      (v2) => CLAIMS.filter((c) => c.decisionV1 === v1 && c.decisionV2 === v2).length,
    ),
  );

  // A changed claim counts for the rule that decides it under the new version ("v2.1" -> "Rule 1").
  const ruleKey = (c: (typeof CLAIMS)[number]) => (c.ruleV2 ?? c.rule).replace(/^v\d+\./, "");
  const ruleLabel = (key: string) =>
    /^\d+$/.test(key) ? `Rule ${key}` : key === "missing" ? "Missing data" : key;
  const ruleKeys = [...new Set(CLAIMS.map(ruleKey))]
    .filter((k) => k !== "—")
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  // Concrete rule names from the latest engine run (e.g. "The repair quote exceeds EUR 1200").
  const runRows = new Map((run?.rows ?? []).map((r) => [r.case_id, r]));
  const ruleName = (c: (typeof CLAIMS)[number]) =>
    runRows.get(c.id)?.rule_v2_name || ruleLabel(ruleKey(c));
  const ruleNameBefore = (c: (typeof CLAIMS)[number]) => runRows.get(c.id)?.rule_v1_name || c.rule;
  const changedPerRule = runRows.size
    ? [...new Set(changedClaims.map(ruleName))].sort().map((rule) => ({
        rule,
        changed: changedClaims.filter((c) => ruleName(c) === rule).length,
      }))
    : ruleKeys.map((key) => ({
        rule: ruleLabel(key),
        changed: changedClaims.filter((c) => ruleKey(c) === key).length,
      }));

  type Kpi = {
    label: string;
    value: string;
    valueClass?: string;
    hint?: string;
    /** Shown only while hovering the card. */
    prevValue?: string;
  };

  const fmtRate = (r: number | null | undefined) => (r == null ? "—" : `${r.toFixed(1)}%`);
  const v1 = impact?.versions.get("v1");
  const v2 = mode === "v1" ? undefined : impact?.versions.get(mode);
  const latest = v2 ?? v1;
  const savings = latest && impact ? latest.automated * impact.perClaim : null;

  const kpisBig: Kpi[] = [
    { label: "Total claims", value: String(CLAIMS.length) },
    ...(comparing ? [{ label: `Changed by ${mode}`, value: String(changedClaims.length) }] : []),
    ...(live && run
      ? [
          {
            label: "Need a second look",
            value: String(run.needs_recheck),
            hint: `Open claims touched by an amended rule in ${run.version} (run ${new Date(run.created_at).toLocaleString("en-GB")}), including unchanged recommendations`,
          },
        ]
      : []),
    {
      label: "Error rate",
      value: fmtRate(latest?.errorRate),
      ...(v2 && v1 ? { prevValue: fmtRate(v1.errorRate) } : {}),
      valueClass: "text-decision-fast",
      hint: latest
        ? `${latest.wrong} of ${latest.validated} validated decisions (policy ${latest.version}) differ from the expected outcome`
        : "Loading…",
    },
    {
      label: "Savings",
      value: savings == null ? "—" : `€${savings.toLocaleString("en-US")}`,
      valueClass: "text-decision-fast",
      hint:
        latest && impact
          ? `${latest.automated} automated decisions × €${impact.perClaim} saved per claim`
          : "Loading…",
    },
  ];

  const correctness = [
    {
      label: "Correctly changed",
      count: IMPACT_STATS.correctness.correctlyChanged,
      icon: CheckCircle2,
      className: "text-decision-fast",
    },
    {
      label: "Wrongly changed",
      count: IMPACT_STATS.correctness.wronglyChanged,
      icon: XCircle,
      className: "text-decision-reject",
    },
    {
      label: "Missing change",
      count: IMPACT_STATS.correctness.missingChange,
      icon: CircleAlert,
      className: "text-decision-specialist",
    },
    {
      label: "Unexpected change",
      count: IMPACT_STATS.correctness.unexpectedChange,
      icon: CircleHelp,
      className: "text-muted-foreground",
    },
  ];

  return (
    <div className="space-y-6">
      <PolicyUploadBar />
      <h1 className="text-2xl font-medium tracking-normal text-foreground">Policy Update</h1>

      {notApplied && (
        <Card className="border-contrast/40">
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <CircleAlert className="h-4 w-4 text-decision-specialist" />
            <p className="text-sm text-foreground">
              {running ? (
                <>
                  Applying policy <span className="font-mono">{mode}</span>: reading the policy and
                  re-checking every claim (about half a minute)…
                </>
              ) : (
                <>
                  Policy <span className="font-mono">{mode}</span> is uploaded but has not been
                  applied to the claims yet.
                </>
              )}
            </p>
            <Button size="sm" className="ml-auto h-8 text-xs" disabled={running} onClick={applyNow}>
              {running ? "Running engine…" : `Apply ${mode} now`}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-stretch divide-x divide-border p-0">
          {kpisBig.map((kpi) => (
            <div
              key={kpi.label}
              title={kpi.hint}
              className="group/kpi min-w-[140px] flex-1 px-4 py-3.5"
            >
              <p className="font-mono text-[10px] font-medium tracking-[0.04em] text-muted-foreground uppercase whitespace-nowrap">
                {kpi.label}
              </p>
              <p
                className={cn(
                  "mt-1.5 font-mono text-lg leading-none tabular-nums font-medium tracking-[-0.02em] text-foreground",
                  kpi.valueClass,
                )}
              >
                {kpi.prevValue ? (
                  <span className="relative inline-grid">
                    <span className="col-start-1 row-start-1 transition-all duration-300 ease-out group-hover/kpi:-translate-y-1 group-hover/kpi:opacity-0">
                      {kpi.value}
                    </span>
                    <span className="col-start-1 row-start-1 translate-y-1 opacity-0 transition-all duration-300 ease-out group-hover/kpi:translate-y-0 group-hover/kpi:opacity-100">
                      {kpi.prevValue}
                    </span>
                  </span>
                ) : (
                  kpi.value
                )}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {!comparing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Decisions under policy v1</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {DECISION_ORDER.map((d) => (
                <div
                  key={d}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2.5"
                >
                  <DecisionBadge decision={d} />
                  <span className="font-mono text-lg tabular-nums font-medium text-foreground">
                    {CLAIMS.filter((c) => c.decisionV1 === d).length}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Only the current policy is active. Upload a new policy above to see which open claims
              change and why.
            </p>
          </CardContent>
        </Card>
      )}

      {comparing && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Decision heatmap: v1 × {mode}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="p-2 text-left text-xs font-medium text-muted-foreground">
                          v1 \ {mode}
                        </th>
                        {DECISION_ORDER.map((d) => (
                          <th
                            key={d}
                            className="p-2 text-center text-xs font-medium text-muted-foreground"
                          >
                            {DECISION_LABELS[d]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {DECISION_ORDER.map((rowDecision, row) => (
                        <tr key={rowDecision}>
                          <td className="p-2 text-xs font-medium text-muted-foreground">
                            {DECISION_LABELS[rowDecision]}
                          </td>
                          {DECISION_ORDER.map((colDecision, col) => {
                            const count = matrix[row]?.[col] ?? 0;
                            const offDiagonal = row !== col && count > 0;
                            return (
                              <td key={colDecision} className="p-1">
                                <div
                                  className={cn(
                                    "flex h-12 items-center justify-center rounded-md text-sm font-mono tabular-nums font-medium",
                                    offDiagonal
                                      ? "bg-foreground/[0.04] ring-1 ring-inset ring-foreground/15"
                                      : (HEAT_SHADES[Math.min(count, HEAT_SHADES.length - 1)] ??
                                          HEAT_SHADES[0]),
                                    count > 0 ? "text-foreground" : "text-muted-foreground",
                                  )}
                                >
                                  {count}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Highlighted cells off the diagonal are claims whose decision changes under {mode}.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Changed claims per rule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={changedPerRule}
                      margin={{ top: 8, right: 16, left: -16, bottom: 0 }}
                    >
                      <defs>
                        {/* Nearly transparent at the base, solid grey at the top of each bar. */}
                        <linearGradient id="changed-bar-gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="0%"
                            style={{ stopColor: "oklch(0.55 0 0)", stopOpacity: 1 }}
                          />
                          <stop
                            offset="25%"
                            style={{ stopColor: "oklch(0.55 0 0)", stopOpacity: 0.45 }}
                          />
                          <stop
                            offset="100%"
                            style={{ stopColor: "oklch(0.55 0 0)", stopOpacity: 0 }}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--color-border)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="rule"
                        tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                        axisLine={{ stroke: "var(--color-border)" }}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "var(--color-muted)" }}
                        contentStyle={{
                          background: "var(--color-popover)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-md)",
                          color: "var(--color-popover-foreground)",
                          fontSize: 13,
                        }}
                      />
                      <Bar dataKey="changed" name="Changed claims" radius={[6, 6, 0, 0]}>
                        {changedPerRule.map((entry) => (
                          <Cell
                            key={entry.rule}
                            fill={
                              entry.changed > 0
                                ? "url(#changed-bar-gradient)"
                                : "var(--color-muted)"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Collapsible asChild defaultOpen>
            <Card>
              <CardHeader className="p-0">
                <CollapsibleTrigger className="group flex w-full items-center gap-2 p-6 text-left">
                  <ChevronRight
                    aria-hidden="true"
                    className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90"
                    strokeWidth={1.5}
                  />
                  <CardTitle className="text-base">Changed claims</CardTitle>
                  <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
                    {changedClaims.length}
                  </span>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim ID</TableHead>
                      <TableHead>Rule</TableHead>
                      <TableHead>v1</TableHead>
                      <TableHead />
                      <TableHead>{mode}</TableHead>
                      <TableHead>Decisive fact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changedClaims.map((claim) => (
                      <TableRow key={claim.id}>
                        <TableCell>
                          <Link
                            to="/queue"
                            search={{ claim: claim.id }}
                            className="font-mono tabular-nums font-medium text-foreground underline-offset-4 hover:underline"
                          >
                            {claim.id}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <span
                            className="block max-w-xs text-sm text-foreground"
                            title={`Before: ${ruleNameBefore(claim)}`}
                          >
                            {ruleName(claim)}
                          </span>
                          <span className="block max-w-xs text-xs text-muted-foreground">
                            was: {ruleNameBefore(claim)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DecisionBadge decision={claim.decisionV1} />
                        </TableCell>
                        <TableCell>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell>
                          <DecisionBadge decision={claim.decisionV2} />
                        </TableCell>
                        <TableCell className="max-w-md">
                          <span className="line-clamp-2 text-sm text-muted-foreground">
                            {claim.decisiveFact}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <div>
            <h2 className="text-lg font-medium tracking-normal text-foreground">Is it correct?</h2>
            <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {correctness.map((item) => (
                <Card key={item.label}>
                  <CardContent className="flex items-start gap-3 pt-6">
                    <item.icon className={cn("mt-0.5 h-5 w-5", item.className)} />
                    <div>
                      <p className="text-2xl font-mono tabular-nums font-medium text-foreground">
                        {item.count}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manual review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-mono tabular-nums font-medium text-foreground">
              €{IMPACT_STATS.manual.costPerClaimEur}
              <span className="text-base font-normal text-muted-foreground"> / claim</span>
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono tabular-nums">{IMPACT_STATS.manual.minutesPerClaim}</span>{" "}
              minutes per claim · €
              <span className="font-mono tabular-nums">
                {(IMPACT_STATS.manual.costPerClaimEur * CLAIMS.length).toLocaleString("en-US")}
              </span>{" "}
              and{" "}
              <span className="font-mono tabular-nums">
                {Math.round((IMPACT_STATS.manual.minutesPerClaim * CLAIMS.length) / 60)}
              </span>{" "}
              hours for the whole portfolio.
            </p>
          </CardContent>
        </Card>
        <Card className="border-decision-fast/40">
          <CardHeader>
            <CardTitle className="text-base">Retakt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-mono tabular-nums font-medium text-decision-fast">
              €{IMPACT_STATS.replay.costPerClaimEur}
              <span className="text-base font-normal text-muted-foreground"> / claim</span>
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono tabular-nums">{IMPACT_STATS.replay.minutesPerClaim}</span>{" "}
              minutes per claim · €
              <span className="font-mono tabular-nums">
                {(IMPACT_STATS.replay.costPerClaimEur * CLAIMS.length).toLocaleString("en-US")}
              </span>{" "}
              and under <span className="font-mono tabular-nums">2</span> hours for the whole
              portfolio.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit trail — latest overrides</CardTitle>
        </CardHeader>
        <CardContent>
          {overrides.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No overrides yet. Correct a decision in the claim card to see it here.
            </p>
          ) : (
            <ul className="space-y-2">
              {overrides.map((o) => (
                <li
                  key={o.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <Link
                    to="/queue"
                    search={{ claim: o.claimId }}
                    className="font-mono tabular-nums font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {o.claimId}
                  </Link>
                  <DecisionBadge decision={o.previousDecision} />
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <DecisionBadge decision={o.newDecision} />
                  <span className="text-muted-foreground">
                    by {o.reviewer} ·{" "}
                    <span className="font-mono tabular-nums">
                      {new Date(o.at).toLocaleString("en-GB")}
                    </span>
                  </span>
                  <span className="w-full text-xs text-muted-foreground">{o.reason}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> Overrides are kept in memory for this demo session only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
