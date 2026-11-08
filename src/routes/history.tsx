import { createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useMemo, useState } from "react";

import { ClaimDetailPanel } from "@/components/claim-detail-panel";
import { DecisionBadge } from "@/components/decision-badge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClaimSource } from "@/lib/live-claims";
import { usePolicy } from "@/lib/policy-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — Retakt" },
      {
        name: "description",
        content: "Closed claims with their final decision. Read-only.",
      },
      { property: "og:title", content: "History — Retakt" },
      {
        property: "og:description",
        content: "Closed claims with their final decision. Read-only.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { mode, effectiveDecision } = usePolicy();
  const { claims, isLoading, error } = useClaimSource();
  const closed = useMemo(() => claims.filter((c) => c.status === "closed"), [claims]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const active = closed.find((c) => c.id === selectedId) ?? closed[0];

  if (isLoading) return <p className="eyebrow p-6">Loading claims…</p>;
  if (error) {
    return (
      <p className="p-6 text-sm text-decision-reject">
        Claims could not be loaded: {error.message}
      </p>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-3">
      <div className="min-w-0 rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-end justify-between gap-4 p-5">
          <div>
            <h1 className="text-lg font-medium text-foreground">Closed claims</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Completed claims keep their decision. They can be viewed here but no longer edited.
            </p>
          </div>
          <span className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-foreground">
            {closed.length} closed
          </span>
        </div>
        <div className="overflow-hidden border-t border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-card hover:bg-card">
                <TableHead className="eyebrow h-10 whitespace-nowrap">Claim ID</TableHead>
                <TableHead className="eyebrow hidden h-10 sm:table-cell">Claim type</TableHead>
                <TableHead className="eyebrow h-10">Decision</TableHead>
                <TableHead className="eyebrow h-10">Rule</TableHead>
                <TableHead className="eyebrow h-10 w-1/3">Decisive fact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {closed.map((claim) => (
                <TableRow
                  key={claim.id}
                  tabIndex={0}
                  aria-selected={active?.id === claim.id}
                  data-state={active?.id === claim.id ? "selected" : undefined}
                  className={cn(
                    "h-11 cursor-pointer outline-none hover:bg-muted/40 focus-visible:bg-muted/40 [&>td]:py-2",
                    "data-[state=selected]:bg-foreground/10 data-[state=selected]:shadow-[inset_3px_0_0_var(--foreground)] data-[state=selected]:hover:bg-foreground/10",
                  )}
                  onClick={() => setSelectedId(claim.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedId(claim.id);
                    }
                  }}
                >
                  <TableCell className="whitespace-nowrap font-mono tabular-nums text-sm text-foreground">
                    <span className="flex items-center gap-2">
                      <Lock aria-hidden="true" className="h-3 w-3 text-muted-foreground" />
                      {claim.id}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {claim.claimant}
                  </TableCell>
                  <TableCell>
                    <DecisionBadge decision={effectiveDecision(claim, mode)} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-sm font-mono tabular-nums">
                      {claim.rule}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <span className="line-clamp-2 text-sm text-muted-foreground">
                      {claim.decisiveFact}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {closed.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No closed claims yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="relative min-h-80 self-start lg:sticky lg:top-3 lg:h-[calc(100vh-96px)]">
        <div
          key={active?.id}
          className="relative h-full overflow-hidden rounded-lg border border-foreground/[0.14] bg-[oklch(0.15_0_0/0.92)] shadow-[inset_0_1px_0_oklch(1_0_0/0.06)] backdrop-blur-sm animate-in fade-in duration-300"
        >
          {active ? <ClaimDetailPanel claim={active} /> : null}
        </div>
      </div>
    </div>
  );
}
