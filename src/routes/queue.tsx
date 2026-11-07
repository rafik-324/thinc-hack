import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Lock } from "lucide-react";
import { useMemo, useState } from "react";

import { DecisionBadge } from "@/components/decision-badge";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CLAIMS,
  DECISION_LABELS,
  DECISION_ORDER,
  isChanged,
  type Decision,
} from "@/lib/policy-data";
import { usePolicy } from "@/lib/policy-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/queue")({
  head: () => ({
    meta: [
      { title: "Claims Queue — Policy Replay" },
      {
        name: "description",
        content: "Review insurance claims decided by the rules engine and compare policy v1 against v2.",
      },
      { property: "og:title", content: "Claims Queue — Policy Replay" },
      {
        property: "og:description",
        content: "Review insurance claims decided by the rules engine and compare policy v1 against v2.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClaimsQueue,
});

function ClaimsQueue() {
  const navigate = useNavigate();
  const { mode, effectiveDecision, overrides } = usePolicy();
  const [decisionFilter, setDecisionFilter] = useState<Decision | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
  const [changedOnly, setChangedOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "update" | "history">("overview");

  const rows = useMemo(() => {
    return CLAIMS.filter((claim) => {
      if (statusFilter !== "all" && claim.status !== statusFilter) return false;
      if (changedOnly && !isChanged(claim)) return false;
      if (decisionFilter !== "all") {
        if (mode === "compare") {
          if (claim.decisionV1 !== decisionFilter && claim.decisionV2 !== decisionFilter) return false;
        } else if (effectiveDecision(claim, mode) !== decisionFilter) {
          return false;
        }
      }
      return true;
    });
  }, [decisionFilter, statusFilter, changedOnly, mode, effectiveDecision]);

  const total = CLAIMS.length;
  const changedCount = CLAIMS.filter(isChanged).length;
  const openCount = CLAIMS.filter((c) => c.status === "open").length;
  const decisionCounts = DECISION_ORDER.map((d) => ({
    d,
    v1: CLAIMS.filter((c) => c.decisionV1 === d).length,
    v2: CLAIMS.filter((c) => c.decisionV2 === d).length,
  }));
  const maxCount = Math.max(1, ...decisionCounts.flatMap((x) => [x.v1, x.v2]));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="grid content-start gap-4 lg:col-span-2">
          <div className="grid gap-4">
            <KpiCard label="Claims in queue" value={total} chip={`${openCount} open`} caption="Decided by the rules engine" bars={decisionCounts.map((x) => x.v1)} max={maxCount} />
            <KpiCard label="Changed by v2" value={changedCount} chip={`${Math.round((changedCount / total) * 100)}%`} caption="Decision differs between v1 and v2" bars={decisionCounts.map((x) => x.v2)} max={maxCount} accent />
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium text-foreground">Queue filters</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-mono tabular-nums">{rows.length}</span> of <span className="font-mono tabular-nums">{total}</span> claims shown
                </p>
              </div>
              <div className="flex gap-1">
                {(["all", "open", "closed"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "h-8 rounded-sm border px-3 font-mono text-xs capitalize",
                      statusFilter === s ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-end gap-6">
              <div className="space-y-2">
                <Label htmlFor="decision-filter" className="eyebrow">Decision</Label>
                <Select value={decisionFilter} onValueChange={(v) => setDecisionFilter(v as Decision | "all")}>
                  <SelectTrigger id="decision-filter" className="w-48 rounded-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All decisions</SelectItem>
                    {DECISION_ORDER.map((d) => (
                      <SelectItem key={d} value={d}>{DECISION_LABELS[d]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch id="changed-filter" checked={changedOnly} onCheckedChange={setChangedOnly} />
                <Label htmlFor="changed-filter" className="eyebrow">Changed by v2</Label>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card lg:col-span-3">
          <div className="flex justify-end gap-1 border-b border-border p-3">
            {(["overview", "update", "history"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "h-8 rounded-sm border px-3 font-mono text-xs capitalize",
                  activeTab === tab
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="p-5" />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-start justify-between gap-4 p-5">
          <div>
            <h2 className="text-lg font-medium text-foreground">All claims</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Decisions shown for {mode === "compare" ? <>policy <span className="font-mono">v1</span> and <span className="font-mono">v2</span></> : <>policy <span className="font-mono">{mode}</span></>}
            </p>
          </div>
        </div>
      <div className="overflow-hidden border-t border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-card hover:bg-card">
              <TableHead className="eyebrow h-10">Claim ID</TableHead>
              <TableHead className="eyebrow h-10">Claimant</TableHead>
              {mode === "compare" ? (
                <TableHead className="eyebrow h-10" colSpan={2}>Decision v1 → v2</TableHead>
              ) : (
                <TableHead className="eyebrow h-10">Decision</TableHead>
              )}
              <TableHead className="eyebrow h-10">Rule</TableHead>
              <TableHead className="eyebrow h-10 w-1/3">Decisive fact</TableHead>
              <TableHead className="eyebrow h-10">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((claim) => {
              const changed = isChanged(claim);
              const overridden = overrides.some((o) => o.claimId === claim.id);
              return (
                <TableRow
                  key={claim.id}
                  className={cn(
                    "h-11 cursor-pointer hover:bg-card [&>td]:py-2",
                    changed && "shadow-[inset_2px_0_0_var(--contrast)]",
                  )}
                  onClick={() =>
                    navigate({ to: "/claims/$claimId", params: { claimId: claim.id } })
                  }
                >
                  <TableCell className="font-mono tabular-nums text-sm text-foreground">{claim.id}</TableCell>
                  <TableCell className="text-muted-foreground">{claim.claimant}</TableCell>
                  {mode === "compare" ? (
                    <TableCell colSpan={2}>
                      <div className="flex items-center gap-2">
                        <DecisionBadge decision={claim.decisionV1} />
                        <ArrowRight aria-hidden="true" size={14} className="shrink-0 text-contrast" />
                        <DecisionBadge decision={claim.decisionV2} />
                      </div>
                    </TableCell>
                  ) : (
                    <TableCell>
                      <DecisionBadge decision={effectiveDecision(claim, mode)} />
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant="outline" className="rounded-sm font-mono tabular-nums">{claim.rule}</Badge>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <span className="line-clamp-2 text-sm text-muted-foreground">
                      {claim.decisiveFact}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {claim.status === "closed" ? (
                        <Badge variant="secondary" className="gap-1 rounded-sm">
                          <Lock className="h-3 w-3" /> Closed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="rounded-sm">Open</Badge>
                      )}
                      {overridden && <Badge variant="outline" className="rounded-sm border-foreground/20 font-mono text-[10px] uppercase">Overridden</Badge>}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={mode === "compare" ? 7 : 6} className="py-10 text-center text-muted-foreground">
                  No claims match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, chip, caption, bars, max, accent }: { label: string; value: number; chip: string; caption: string; bars: number[]; max: number; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn("rounded-sm border px-1.5 py-0.5 font-mono text-[10px] tabular-nums", accent ? "border-contrast/40 text-contrast" : "border-border text-foreground")}>{chip}</span>
      </div>
      <p className="mt-3 font-mono text-4xl font-medium tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
      <div className="mt-5 flex h-12 items-end gap-1.5">
        {bars.map((b, i) => (
          <div key={i} className={cn("flex-1 rounded-sm", accent ? "bg-contrast/70" : "bg-foreground/70")} style={{ height: `${Math.max(6, (b / max) * 100)}%` }} />
        ))}
      </div>
    </div>
  );
}
