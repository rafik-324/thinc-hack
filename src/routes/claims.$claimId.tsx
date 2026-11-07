import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Lock, PencilLine } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DecisionBadge } from "@/components/decision-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Back to Claims Queue
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

      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <p className="eyebrow mb-2">CLAIM</p>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-mono tabular-nums text-3xl font-medium tracking-tight">{claim.id}</h1>
                <div className="flex items-center gap-2">
                  {claimOverrides.length > 0 && <Badge variant="outline" className="rounded-sm border-foreground/20 font-mono text-[10px] uppercase">Overridden</Badge>}
                  {closed && (
                    <Badge variant="secondary" className="gap-1 rounded-sm">
                      <Lock className="h-3 w-3" /> Closed
                    </Badge>
                  )}
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {claim.claimant} · <span className="font-mono tabular-nums">€{claim.amountEur.toLocaleString("en-US")}</span> · Rule <span className="font-mono tabular-nums">{claim.rule}</span> (
                {rule.name})
              </p>
            </div>
          </div>

          {mode === "compare" ? (
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <div className="rounded-lg border border-border bg-card p-5">
                <p className="eyebrow">
                  Policy v1
                </p>
                <div className="mt-2">
                  <DecisionBadge decision={claim.decisionV1} size="lg" />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{rule.clauseV1}</p>
              </div>
              <ArrowRight aria-hidden="true" className="h-4 w-4 self-center justify-self-center text-contrast max-sm:rotate-90" strokeWidth={1.5} />
              <div
                className={
                  changed
                    ? "rounded-lg border border-contrast/40 bg-card p-5"
                    : "rounded-lg border border-border bg-card p-5"
                }
              >
                <div className="flex items-center justify-between">
                  <p className="eyebrow">
                    Policy v2
                  </p>
                  {changed && (
                    <Badge variant="outline" className="rounded-sm border-contrast/40 font-mono text-[10px] uppercase text-contrast">
                      Changed
                    </Badge>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <DecisionBadge decision={claim.decisionV2} size="lg" />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{rule.clauseV2}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="eyebrow">
                Decision under policy {mode}
              </p>
              <div className="mt-2">
                <DecisionBadge decision={currentDecision} size="lg" />
              </div>
              <Separator className="my-4" />
              <p className="eyebrow">Decisive fact</p>
              <p className="mt-1 text-sm text-muted-foreground">{claim.decisiveFact}</p>
              <p className="eyebrow mt-3">
                Policy clause (<span className="font-mono tabular-nums">{claim.rule}</span>)
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {mode === "v1" ? rule.clauseV1 : rule.clauseV2}
              </p>
            </div>
          )}

          {mode === "compare" && (
            <div>
              <p className="eyebrow">Decisive fact</p>
              <p className="mt-1 text-sm text-muted-foreground">{claim.decisiveFact}</p>
            </div>
          )}
        </div>
        <div className="space-y-6">
          <div>
            <h2 className="eyebrow">Explanation</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{claim.explanation}</p>
          </div>

          {!closed && (
            <div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="h-9 gap-2 rounded-sm bg-primary text-primary-foreground">
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
                      <Label htmlFor="override-decision" className="text-xs font-medium text-muted-foreground">New decision</Label>
                      <Select
                        value={newDecision}
                        onValueChange={(v) => setNewDecision(v as Decision)}
                      >
                        <SelectTrigger id="override-decision" className="h-9 rounded-sm">
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
                      <Label htmlFor="override-reason" className="text-xs font-medium text-muted-foreground">Reason</Label>
                      <Textarea
                        id="override-reason"
                        className="h-9 min-h-9 rounded-sm"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Why is the engine's decision wrong?"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="override-reviewer" className="text-xs font-medium text-muted-foreground">Reviewer</Label>
                      <Input
                        id="override-reviewer"
                        className="h-9 rounded-sm"
                        value={reviewer}
                        onChange={(e) => setReviewer(e.target.value)}
                        placeholder="Your name"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" className="h-9 rounded-sm" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button className="h-9 rounded-sm bg-primary text-primary-foreground" onClick={saveOverride}>Save correction →</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {claimOverrides.length > 0 && (
            <div>
              <h2 className="eyebrow">Override history</h2>
              <ul className="mt-4 ml-1 space-y-6 border-l border-border pl-5">
                {claimOverrides.map((o) => (
                  <li
                    key={o.id}
                    className="relative space-y-2 text-sm"
                  >
                    <span aria-hidden="true" className="absolute top-1 -left-[25px] size-2 rounded-full bg-foreground" />
                    <p className="font-mono tabular-nums text-xs text-muted-foreground">{new Date(o.at).toLocaleString("en-GB")}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <DecisionBadge decision={o.previousDecision} />
                      <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 text-contrast" />
                      <DecisionBadge decision={o.newDecision} />
                    </div>
                    <p className="text-sm">{o.reason}</p>
                    <p className="text-xs text-muted-foreground">by {o.reviewer}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
