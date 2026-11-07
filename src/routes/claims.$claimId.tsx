import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Lock, PencilLine } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DecisionBadge } from "@/components/decision-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  CLAIMS,
  DECISION_LABELS,
  DECISION_ORDER,
  getRule,
  isChanged,
  type Decision,
} from "@/lib/policy-data";
import { usePolicy } from "@/lib/policy-store";

export const Route = createFileRoute("/claims/$claimId")({
  loader: ({ params }) => {
    const claim = CLAIMS.find((c) => c.id === params.claimId);
    if (!claim) throw notFound();
    return claim;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.id ?? "Claim"} — Policy Replay` },
      {
        name: "description",
        content: `Decision details, policy clause and explanation for claim ${loaderData?.id ?? ""}.`,
      },
      { property: "og:title", content: `${loaderData?.id ?? "Claim"} — Policy Replay` },
      {
        property: "og:description",
        content: `Decision details, policy clause and explanation for claim ${loaderData?.id ?? ""}.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClaimDetail,
});

function ClaimDetail() {
  const claim = Route.useLoaderData();
  const { mode, effectiveDecision, overridesFor, addOverride } = usePolicy();
  const rule = getRule(claim.rule);
  const claimOverrides = overridesFor(claim.id);
  const changed = isChanged(claim);
  const closed = claim.status === "closed";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDecision, setNewDecision] = useState<Decision>("standard_review");
  const [reason, setReason] = useState("");
  const [reviewer, setReviewer] = useState("");

  const currentDecision = effectiveDecision(claim, mode === "v1" ? "v1" : "v2");

  const saveOverride = () => {
    if (!reason.trim() || !reviewer.trim()) {
      toast.error("Please provide a reason and a reviewer name.");
      return;
    }
    addOverride({
      claimId: claim.id,
      previousDecision: currentDecision,
      newDecision,
      reason: reason.trim(),
      reviewer: reviewer.trim(),
    });
    setDialogOpen(false);
    setReason("");
    setReviewer("");
    toast.success(`Decision for ${claim.id} overridden.`);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Claims Queue
      </Link>

      {closed && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>Closed, decision is protected</AlertTitle>
          <AlertDescription>
            This claim is closed. A policy replay never changes closed decisions; they are shown for
            reference only.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="font-mono tabular-nums text-2xl">{claim.id}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {claim.claimant} · <span className="font-mono tabular-nums">€{claim.amountEur.toLocaleString("en-US")}</span> · Rule <span className="font-mono tabular-nums">{claim.rule}</span> (
                {rule.name})
              </p>
            </div>
            <div className="flex items-center gap-2">
              {claimOverrides.length > 0 && <Badge variant="outline">Overridden</Badge>}
              {closed && (
                <Badge variant="secondary" className="gap-1">
                  <Lock className="h-3 w-3" /> Closed
                </Badge>
              )}
            </div>
          </div>

          {mode === "compare" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <p className="text-xs font-medium tracking-normal text-muted-foreground uppercase">
                  Policy v1
                </p>
                <div className="mt-2">
                  <DecisionBadge decision={claim.decisionV1} size="lg" />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{rule.clauseV1}</p>
              </div>
              <div
                className={
                  changed
                    ? "rounded-lg border border-decision-specialist/40 bg-decision-specialist/5 p-4"
                    : "rounded-lg border border-border bg-muted/40 p-4"
                }
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium tracking-normal text-muted-foreground uppercase">
                    Policy v2
                  </p>
                  {changed && (
                    <Badge className="border border-decision-specialist/30 bg-decision-specialist/10 text-decision-specialist">
                      Changed
                    </Badge>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <DecisionBadge decision={claim.decisionV2} size="lg" />
                  {changed && <ArrowRight className="h-4 w-4 text-decision-specialist" />}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{rule.clauseV2}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="text-xs font-medium tracking-normal text-muted-foreground uppercase">
                Decision under policy {mode}
              </p>
              <div className="mt-2">
                <DecisionBadge decision={currentDecision} size="lg" />
              </div>
              <Separator className="my-4" />
              <p className="text-sm font-medium text-foreground">Decisive fact</p>
              <p className="mt-1 text-sm text-muted-foreground">{claim.decisiveFact}</p>
              <p className="mt-3 text-sm font-medium text-foreground">
                Policy clause (<span className="font-mono tabular-nums">{claim.rule}</span>)
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "v1" ? rule.clauseV1 : rule.clauseV2}
              </p>
            </div>
          )}

          {mode === "compare" && (
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-medium text-foreground">Decisive fact</p>
              <p className="mt-1 text-sm text-muted-foreground">{claim.decisiveFact}</p>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h2 className="text-sm font-medium text-foreground">Explanation</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{claim.explanation}</p>
          </div>

          {!closed && (
            <div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <PencilLine className="h-4 w-4" /> Correct decision
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Correct decision for <span className="font-mono tabular-nums">{claim.id}</span></DialogTitle>
                    <DialogDescription>
                      The correction is stored for this session only and is shown in the audit
                      trail.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>New decision</Label>
                      <Select
                        value={newDecision}
                        onValueChange={(v) => setNewDecision(v as Decision)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DECISION_ORDER.map((d) => (
                            <SelectItem key={d} value={d}>
                              {DECISION_LABELS[d]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="override-reason">Reason</Label>
                      <Textarea
                        id="override-reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Why is the engine's decision wrong?"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="override-reviewer">Reviewer</Label>
                      <Input
                        id="override-reviewer"
                        value={reviewer}
                        onChange={(e) => setReviewer(e.target.value)}
                        placeholder="Your name"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={saveOverride}>Save correction</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {claimOverrides.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-foreground">Override history</h2>
              <ul className="mt-2 space-y-2">
                {claimOverrides.map((o) => (
                  <li
                    key={o.id}
                    className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <DecisionBadge decision={o.previousDecision} />
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <DecisionBadge decision={o.newDecision} />
                    <span className="text-muted-foreground">
                      by {o.reviewer} · <span className="font-mono tabular-nums">{new Date(o.at).toLocaleString("en-GB")}</span>
                    </span>
                    <span className="w-full text-xs text-muted-foreground">{o.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
