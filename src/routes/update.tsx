import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChevronRight, CircleAlert, Lock } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  describeApply,
  describeApplyError,
  useApplyPolicy,
  useApplyRunning,
  useAppliedConfig,
  useLatestRun,
  usePolicies,
} from "@/lib/policies";
import { toast } from "sonner";
import { useClaimSource } from "@/lib/live-claims";
import { cn } from "@/lib/utils";

/** Rule names are full sentences: wrap them onto up to three centred lines instead of overlapping. */
function WrappedTick({
  x = 0,
  y = 0,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
}) {
  const lines: string[] = [];
  for (const word of String(payload?.value ?? "").split(" ")) {
    const last = lines[lines.length - 1];
    if (last && (last + " " + word).length <= 24) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  if (lines.length > 3) lines.splice(2, lines.length - 2, `${lines[2]}…`);
  return (
    <text x={x} y={y + 12} textAnchor="middle" fill="var(--color-muted-foreground)" fontSize={11}>
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : 13}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

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
  const { data: config } = useAppliedConfig(mode, live && comparing);
  // Same data source as the overview (demo sample or live database), never fixed sample rules.
  const { claims: CLAIMS, order: DECISION_ORDER } = useClaimSource();
  // A policy update only touches open claims: closed ones keep their historical decision.
  const open = CLAIMS.filter((c) => c.status === "open");
  const changedClaims = open.filter(isChanged);
  const matrix = DECISION_ORDER.map((v1) =>
    DECISION_ORDER.map(
      (v2) => open.filter((c) => c.decisionV1 === v1 && c.decisionV2 === v2).length,
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
    valueClass?: string | undefined;
    hint?: string;
    /** Small line under the value so the number explains itself. */
    sub?: string | undefined;
  };

  const closedCount = CLAIMS.length - open.length;
  const runList = run?.rows ?? [];
  const secondLook = run ? run.needs_recheck : changedClaims.length;
  const sameButRecheck = runList.filter(
    (r) => r.needs_recheck && r.recommendation_v1 === r.recommendation_v2,
  ).length;
  const avoided = Math.max(0, open.length - secondLook);
  const avoidedPct = open.length ? Math.round((avoided / open.length) * 100) : 0;
  const { minutesPerClaim } = IMPACT_STATS.manual;
  const avoidedHours = Math.round((avoided * minutesPerClaim) / 60);
  const hrBefore = open.filter((c) => c.decisionV1 === "human_review").length;
  const hrAfter = open.filter((c) => c.decisionV2 === "human_review").length;
  const hrDelta = hrAfter - hrBefore;
  const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

  const kpisBig: Kpi[] = comparing
    ? [
        {
          label: "Need a second look",
          value: String(secondLook),
          sub: `of ${open.length} open claims`,
          hint: `Open claims whose decision changes or that an amended rule touches under ${mode}`,
        },
        {
          label: `Changed by ${mode}`,
          value: String(changedClaims.length),
          sub: sameButRecheck
            ? `+${sameButRecheck} touched, decision unchanged`
            : "every touched claim changes",
          hint: `Open claims whose recommendation is different under ${mode}`,
        },
        {
          label: "Re-reviews avoided",
          value: `${avoided} · ${avoidedPct}%`,
          valueClass: "text-decision-fast",
          sub: `≈ ${avoidedHours} h at ${minutesPerClaim} min per review`,
          hint: `Without the replay every open claim would be reviewed again after the policy change. Assumes ${minutesPerClaim} minutes per manual review.`,
        },
        {
          label: "Human review queue",
          value: `${hrBefore} → ${hrAfter}`,
          valueClass: hrDelta > 0 ? "text-decision-human" : undefined,
          sub: hrBefore
            ? `${signed(hrDelta)} (${signed(Math.round((hrDelta / hrBefore) * 100))}%) open claims`
            : `${signed(hrDelta)} open claims`,
          hint: `Open claims routed to human review under v1 and under ${mode}`,
        },
      ]
    : [
        {
          label: "Open claims",
          value: String(open.length),
          sub: `${closedCount} closed claims keep their decision`,
        },
        {
          label: "Human review queue",
          value: String(hrBefore),
          sub: `of ${open.length} open claims under v1`,
        },
      ];

  // Where the comparison comes from: when it ran and which quotes back each rule change.
  const citations = config?.interpretation.citations ?? [];
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
            <div key={kpi.label} title={kpi.hint} className="min-w-[160px] flex-1 px-4 py-3.5">
              <p className="font-mono text-[10px] font-medium tracking-[0.04em] text-muted-foreground uppercase whitespace-nowrap">
                {kpi.label}
              </p>
              <p
                className={cn(
                  "mt-1.5 font-mono text-lg leading-none tabular-nums font-medium tracking-[-0.02em] text-foreground",
                  kpi.valueClass,
                )}
              >
                {kpi.value}
              </p>
              {kpi.sub && (
                <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{kpi.sub}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {comparing && run && (
        <div className="-mt-3 space-y-1 px-1 text-xs text-muted-foreground">
          <p>
            Engine run {new Date(run.created_at).toLocaleString("en-GB")} ·{" "}
            <span className="font-mono">
              {run.baseline_version} → {run.version}
            </span>{" "}
            · {run.open_evaluated} open claims re-checked · {run.closed_retained} closed claims kept
            their {run.baseline_version} decision
          </p>
          {config && (
            <p title={citations.map((c) => `${c.target}: “${c.new_quote}”`).join("\n")}>
              {citations.length} rule change{citations.length === 1 ? "" : "s"}, each backed by a
              verbatim quote from the uploaded policy
              {config.interpretation.model ? ` · read by ${config.interpretation.model}` : ""}
              {config.interpretation.summary ? ` · ${config.interpretation.summary}` : ""}
            </p>
          )}
        </div>
      )}

      {!comparing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open claims under policy v1</CardTitle>
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
                    {open.filter((c) => c.decisionV1 === d).length}
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
                                      ? "bg-contrast/20 text-foreground ring-1 ring-inset ring-contrast/60"
                                      : row === col && count > 0
                                        ? "bg-foreground/[0.06] text-muted-foreground"
                                        : "bg-foreground/[0.02] text-muted-foreground/60",
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
                  Open claims only. Highlighted cells change their decision under {mode}; the
                  diagonal keeps its decision.
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
                        interval={0}
                        height={48}
                        tick={<WrappedTick />}
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
                          <span className="mt-0.5 block max-w-xs text-xs text-foreground/70">
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
        </>
      )}

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
            <Lock className="h-3 w-3" /> Corrections made in the claim card appear here for this
            session.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
