import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Lock } from "lucide-react";
import { useMemo, useState } from "react";

import { DecisionBadge } from "@/components/decision-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">CLAIMS QUEUE</p>
        <h1 className="text-3xl font-medium tracking-tight text-foreground">Claims Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="font-mono tabular-nums">{rows.length}</span> of <span className="font-mono tabular-nums">{CLAIMS.length}</span> claims · decisions shown for{" "}
          {mode === "compare" ? (
            <>policy <span className="font-mono tabular-nums">v1</span> and <span className="font-mono tabular-nums">v2</span></>
          ) : (
            <>policy <span className="font-mono tabular-nums">{mode}</span></>
          )}
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="decision-filter" className="eyebrow">Decision</Label>
            <Select
              value={decisionFilter}
              onValueChange={(v) => setDecisionFilter(v as Decision | "all")}
            >
              <SelectTrigger id="decision-filter" className="w-48 rounded-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All decisions</SelectItem>
                {DECISION_ORDER.map((d) => (
                  <SelectItem key={d} value={d}>
                    {DECISION_LABELS[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status-filter" className="eyebrow">Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as "all" | "open" | "closed")}
            >
              <SelectTrigger id="status-filter" className="w-40 rounded-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pb-1">
            <Switch id="changed-filter" className="rounded-sm" checked={changedOnly} onCheckedChange={setChangedOnly} />
            <Label htmlFor="changed-filter" className="eyebrow">Changed by v2</Label>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-lg border border-border">
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
  );
}
