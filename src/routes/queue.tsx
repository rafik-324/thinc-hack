import { createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ClaimDetailPanel } from "@/components/claim-detail-panel";
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
import { usePolicy } from "@/lib/policy-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/queue")({
  validateSearch: (search: Record<string, unknown>): { claim?: string } => {
    const raw = search["claim"];
    return typeof raw === "string" ? { claim: raw } : {};
  },
  head: () => ({
    meta: [
      { title: "Claims Queue — Policy Replay" },
      {
        name: "description",
        content: "Review insurance claims decided by the rules engine under the current policy version.",
      },
      { property: "og:title", content: "Claims Queue — Policy Replay" },
      {
        property: "og:description",
        content: "Review insurance claims decided by the rules engine under the current policy version.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClaimsQueue,
});

function ClaimsQueue() {
  const { mode, effectiveDecision, overrides, selectedClaimId, selectClaim } = usePolicy();
  const search = Route.useSearch();
  const [decisionFilter, setDecisionFilter] = useState<Decision | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
  const [changedOnly, setChangedOnly] = useState(false);

  useEffect(() => {
    if (search.claim) selectClaim(search.claim);
  }, [search.claim, selectClaim]);

  const rows = useMemo(() => {
    return CLAIMS.filter((claim) => {
      if (statusFilter !== "all" && claim.status !== statusFilter) return false;
      if (changedOnly && !isChanged(claim)) return false;
      if (decisionFilter !== "all" && effectiveDecision(claim, mode) !== decisionFilter) {
        return false;
      }
      return true;
    });
  }, [decisionFilter, statusFilter, changedOnly, mode, effectiveDecision]);

  const wheelLock = useRef(0);
  const leftColRef = useRef<HTMLDivElement>(null);
  const active = rows.find((c) => c.id === selectedClaimId) ?? rows[0];

  // Slow down page scrolling while the wheel is over the left column (the list).
  useEffect(() => {
    const el = leftColRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      window.scrollBy({ top: event.deltaY * 0.3 });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

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
    <div className="space-y-3">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-3">
        <div ref={leftColRef} className="grid min-w-0 grid-cols-1 content-start gap-3">
          <div className="grid gap-4 sm:grid-cols-2">
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

          <div className="rounded-lg border border-border bg-card">
        <div className="flex items-start justify-between gap-4 p-5">
          <div>
            <h2 className="text-lg font-medium text-foreground">All claims</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Click a claim to open it in the panel · Decisions shown for policy <span className="font-mono">{mode}</span>
            </p>
          </div>
        </div>
      <div className="overflow-hidden border-t border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-card hover:bg-card">
              <TableHead className="eyebrow h-10">Claim ID</TableHead>
              <TableHead className="eyebrow h-10">Claimant</TableHead>
              <TableHead className="eyebrow h-10">Decision</TableHead>
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
                  tabIndex={0}
                  aria-selected={active?.id === claim.id}
                  data-state={active?.id === claim.id ? "selected" : undefined}
                  className={cn(
                    "h-11 cursor-pointer outline-none hover:bg-muted/40 focus-visible:bg-muted/40 [&>td]:py-2",
                    "data-[state=selected]:bg-foreground/10 data-[state=selected]:hover:bg-foreground/10",
                    changed && "shadow-[inset_2px_0_0_var(--contrast)]",
                    active?.id === claim.id &&
                      !changed &&
                      "data-[state=selected]:shadow-[inset_3px_0_0_var(--foreground)]",
                  )}
                  onClick={() => selectClaim(claim.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectClaim(claim.id);
                    }
                  }}
                >
                  <TableCell className="font-mono tabular-nums text-sm text-foreground">{claim.id}</TableCell>
                  <TableCell className="text-muted-foreground">{claim.claimant}</TableCell>
                  <TableCell>
                    <DecisionBadge decision={effectiveDecision(claim, mode)} />
                  </TableCell>
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
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No claims match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      </div>
        </div>
        <div
          className="relative min-h-80 self-start lg:sticky lg:top-[72px] lg:h-[calc(100vh-84px)]"
          onWheel={(event) => {
            if (!active || rows.length < 2) return;
            // Let the card body scroll first; switch claims only at its edge.
            let el = event.target as HTMLElement | null;
            while (el && el !== event.currentTarget) {
              const oy = getComputedStyle(el).overflowY;
              if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight) {
                const atTop = el.scrollTop <= 0;
                const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
                if ((event.deltaY > 0 && !atBottom) || (event.deltaY < 0 && !atTop)) return;
                break;
              }
              el = el.parentElement;
            }
            const now = Date.now();
            if (now - wheelLock.current < 250 || Math.abs(event.deltaY) < 2) return;
            wheelLock.current = now;
            const idx = rows.findIndex((c) => c.id === active.id);
            const next = Math.min(rows.length - 1, Math.max(0, idx + (event.deltaY > 0 ? 1 : -1)));
            const target = rows[next];
            if (next !== idx && target) selectClaim(target.id);
          }}
        >
          {/* Two cards peeking out behind, fanned to the right */}
          {rows.length > 2 && (
            <div aria-hidden="true" className="absolute inset-0 origin-bottom-left rotate-[3.2deg] rounded-lg border border-foreground/25 bg-card opacity-60" />
          )}
          {rows.length > 1 && (
            <div aria-hidden="true" className="absolute inset-0 origin-bottom-left rotate-[1.6deg] rounded-lg border border-foreground/25 bg-card opacity-85" />
          )}
          <div key={active?.id} className="relative h-full overflow-hidden rounded-lg border border-border bg-card animate-in fade-in slide-in-from-top-2 duration-300">
            {active ? <ClaimDetailPanel claim={active} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, chip, caption, bars, max, accent, className }: { label: string; value: number; chip: string; caption: string; bars: number[]; max: number; accent?: boolean; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-5", className)}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn("rounded-sm border px-1.5 py-0.5 font-mono text-[10px] tabular-nums", accent ? "border-contrast/40 text-contrast" : "border-border text-foreground")}>{chip}</span>
      </div>
      <p className="mt-3 font-mono text-4xl font-medium tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
      <div className="mt-5 flex h-16 items-end gap-1.5">
        {bars.map((b, i) => (
          <div key={i} className={cn("flex-1 rounded-t-md bg-gradient-to-b", b === Math.max(...bars) ? "from-foreground to-foreground/25 shadow-[0_0_14px_oklch(1_0_0/0.12)]" : "from-foreground/15 to-foreground/[0.02]")} style={{ height: `${Math.max(8, (b / max) * 100)}%` }} />
        ))}
      </div>
    </div>
  );
}
