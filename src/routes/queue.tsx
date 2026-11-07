import { createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ClaimDetailPanel } from "@/components/claim-detail-panel";
import { DecisionBadge } from "@/components/decision-badge";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClaimSource } from "@/lib/live-claims";
import {
  DECISION_LABELS,
  isChanged,
  type Decision,
} from "@/lib/policy-data";
import { usePolicy } from "@/lib/policy-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/queue")({
  validateSearch: (search: Record<string, unknown>): { claim?: string } => {
    const raw = search["claim"];
    return typeof raw === "string" ? { claim: raw } : {};
  },
  head: () => ({
    meta: [
      { title: "Claims Queue — Retakt" },
      {
        name: "description",
        content: "Review insurance claims decided by the rules engine under the current policy version.",
      },
      { property: "og:title", content: "Claims Queue — Retakt" },
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
  const { claims: CLAIMS, order: DECISION_ORDER, isLoading, error } = useClaimSource();
  const [decisionFilter, setDecisionFilter] = useState<Decision | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");

  useEffect(() => {
    if (search.claim) selectClaim(search.claim);
  }, [search.claim, selectClaim]);

  const rows = useMemo(() => {
    return CLAIMS.filter((claim) => {
      if (statusFilter !== "all" && claim.status !== statusFilter) return false;
      if (decisionFilter !== "all" && effectiveDecision(claim, mode) !== decisionFilter) {
        return false;
      }
      return true;
    });
  }, [CLAIMS, decisionFilter, statusFilter, mode, effectiveDecision]);

  useEffect(() => setDecisionFilter("all"), [DECISION_ORDER]);

  const wheelLock = useRef(0);
  const leftColRef = useRef<HTMLDivElement>(null);
  const active = rows.find((c) => c.id === selectedClaimId) ?? rows[0];

  // Slow down page scrolling while the wheel is over the left column (the list).
  useEffect(() => {
    const el = leftColRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const scroller = document.getElementById("app-scroll");
      (scroller ?? window).scrollBy({ top: event.deltaY * 0.3 });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const total = CLAIMS.length;
  const openCount = CLAIMS.filter((c) => c.status === "open").length;
  const currentCounts = DECISION_ORDER.map((d) => ({ d, n: CLAIMS.filter((c) => effectiveDecision(c, mode) === d).length }));
  const currentMax = Math.max(1, ...currentCounts.map((x) => x.n));
  const openVolume = CLAIMS.filter((c) => c.status === "open").reduce((sum, c) => sum + c.amountEur, 0);

  if (isLoading) {
    return <p className="eyebrow p-6">Loading live claims…</p>;
  }
  if (error) {
    return <p className="p-6 text-sm text-decision-reject">Live data could not be loaded: {error.message}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-3">
        <div ref={leftColRef} className="grid min-w-0 grid-cols-1 content-start gap-3">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="rounded-lg border border-border bg-card p-5 md:row-span-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Decision distribution</span>
                <span className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase text-foreground">Policy {mode}</span>
              </div>
              <div className="mt-5 space-y-3">
                {currentCounts.map(({ d, n }) => (
                  <button key={d} type="button" onClick={() => setDecisionFilter(decisionFilter === d ? "all" : d)} className={cn("block w-full text-left", decisionFilter !== "all" && decisionFilter !== d && "opacity-40")}>
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="text-muted-foreground">{DECISION_LABELS[d]}</span>
                      <span className="font-mono tabular-nums text-foreground">{n} <span className="text-muted-foreground">· {Math.round((n / Math.max(1, total)) * 100)}%</span></span>
                    </div>
                    <div className="mt-1.5 h-2.5 rounded-full bg-foreground/[0.06]">
                      <div className={cn("h-full rounded-full bg-gradient-to-r", n === currentMax ? "from-foreground/30 to-foreground shadow-[0_0_14px_oklch(1_0_0/0.12)]" : "from-foreground/5 to-foreground/25")} style={{ width: `${(n / currentMax) * 100}%` }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <SmallKpi label="Active claims" value={String(openCount)} chip={`of ${total}`} caption="Open claims under the current policy" />
            <SmallKpi label="Open claim volume" value={`€${Math.round(openVolume).toLocaleString("de-DE")}`} chip={`Ø €${Math.round(openVolume / Math.max(1, openCount)).toLocaleString("de-DE")}`} caption="Total amount of active claims" />
          </div>

          <div className="rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-end justify-between gap-4 p-5">
          <div>
            <h2 className="text-lg font-medium text-foreground">All claims</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Click a claim to open it · <span className="font-mono tabular-nums">{rows.length}</span> of <span className="font-mono tabular-nums">{total}</span> · policy <span className="font-mono">{mode}</span>
            </p>
          </div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
            <Select value={decisionFilter} onValueChange={(v) => setDecisionFilter(v as Decision | "all")}>
              <SelectTrigger aria-label="Filter by decision" className="h-8 w-40 rounded-sm text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All decisions</SelectItem>
                {DECISION_ORDER.map((d) => (
                  <SelectItem key={d} value={d}>{DECISION_LABELS[d]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              {(["all", "open", "closed"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "h-8 rounded-sm border px-2.5 font-mono text-xs capitalize",
                    statusFilter === s ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
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
          className="relative min-h-80 self-start lg:sticky lg:top-3 lg:h-[calc(100vh-96px)]"
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

function SmallKpi({ label, value, chip, caption }: { label: string; value: string; chip: string; caption: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-foreground">{chip}</span>
      </div>
      <p className="mt-3 font-mono text-3xl font-medium tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}
