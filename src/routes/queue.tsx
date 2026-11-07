import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRightLeft, Lock } from "lucide-react";
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
        <h1 className="text-2xl font-medium tracking-normal text-foreground">Claims Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="font-mono tabular-nums">{rows.length}</span> of <span className="font-mono tabular-nums">{CLAIMS.length}</span> claims · decisions shown for{" "}
          {mode === "compare" ? "policy v1 and v2" : `policy ${mode}`}
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="decision-filter">Decision</Label>
            <Select
              value={decisionFilter}
              onValueChange={(v) => setDecisionFilter(v as Decision | "all")}
            >
              <SelectTrigger id="decision-filter" className="w-48">
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
            <Label htmlFor="status-filter">Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as "all" | "open" | "closed")}
            >
              <SelectTrigger id="status-filter" className="w-40">
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
            <Switch id="changed-filter" checked={changedOnly} onCheckedChange={setChangedOnly} />
            <Label htmlFor="changed-filter">Changed by v2</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Claim ID</TableHead>
              <TableHead>Claimant</TableHead>
              {mode === "compare" ? (
                <>
                  <TableHead>Decision v1</TableHead>
                  <TableHead>Decision v2</TableHead>
                </>
              ) : (
                <TableHead>Decision</TableHead>
              )}
              <TableHead>Rule</TableHead>
              <TableHead className="w-1/3">Decisive fact</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((claim) => {
              const changed = isChanged(claim);
              const overridden = overrides.some((o) => o.claimId === claim.id);
              return (
                <TableRow
                  key={claim.id}
                  className="cursor-pointer"
                  onClick={() =>
                    navigate({ to: "/claims/$claimId", params: { claimId: claim.id } })
                  }
                >
                  <TableCell className="font-mono tabular-nums font-medium text-foreground">{claim.id}</TableCell>
                  <TableCell className="text-muted-foreground">{claim.claimant}</TableCell>
                  {mode === "compare" ? (
                    <>
                      <TableCell>
                        <DecisionBadge decision={claim.decisionV1} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DecisionBadge decision={claim.decisionV2} />
                          {changed && (
                            <ArrowRightLeft className="h-3.5 w-3.5 text-decision-specialist" />
                          )}
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <TableCell>
                      <DecisionBadge decision={effectiveDecision(claim, mode)} />
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant="outline" className="font-mono tabular-nums">{claim.rule}</Badge>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <span className="line-clamp-2 text-sm text-muted-foreground">
                      {claim.decisiveFact}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {claim.status === "closed" ? (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="h-3 w-3" /> Closed
                        </Badge>
                      ) : (
                        <Badge variant="outline">Open</Badge>
                      )}
                      {overridden && <Badge variant="outline">Overridden</Badge>}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No claims match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
