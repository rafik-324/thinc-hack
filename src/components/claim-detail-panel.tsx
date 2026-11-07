import { ArrowRight, Lock, PencilLine } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ClaimFieldsEditor } from "@/components/claim-fields-editor";
import { DecisionBadge } from "@/components/decision-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DECISION_LABELS,
  DECISION_ORDER,
  LIVE_DECISION_ORDER,
  isChanged,
  type Claim,
  type Decision,
} from "@/lib/policy-data";
import { usePolicy } from "@/lib/policy-store";

export function ClaimDetailPanel({ claim }: { claim: Claim }) {
  const { mode, effectiveDecision, overridesFor, addOverride } = usePolicy();
  const decisionOptions = claim.live ? LIVE_DECISION_ORDER : DECISION_ORDER;
  const claimOverrides = overridesFor(claim.id);
  const changed = isChanged(claim);
  const closed = claim.status === "closed";
  const currentDecision = effectiveDecision(claim, mode);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDecision, setNewDecision] = useState<Decision>(
    claim.live ? "human_review" : "standard_review",
  );
  const [reason, setReason] = useState("");
  const [reviewer, setReviewer] = useState("");

  const saveOverride = () => {
    if (!reason.trim() || !reviewer.trim()) {
      toast.error("Bitte Grund und Prüfer:in angeben.");
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
    toast.success(`Entscheidung für ${claim.id} korrigiert.`);
  };

  return (
    <div className="flex h-full min-h-80 flex-col" data-editing={dialogOpen ? "true" : undefined}>
      <div className="shrink-0 space-y-3 border-b border-border p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-mono text-xl font-medium tabular-nums tracking-tight text-foreground">
              {claim.id}
            </h2>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {claim.claimant} ·{" "}
              <span className="font-mono tabular-nums">
                €{claim.amountEur.toLocaleString("en-US")}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {changed && (
              <Badge
                variant="outline"
                className="rounded-sm border-contrast/40 font-mono text-[10px] uppercase text-contrast"
              >
                Changed
              </Badge>
            )}
            {claimOverrides.length > 0 && (
              <Badge
                variant="outline"
                className="rounded-sm border-foreground/20 font-mono text-[10px] uppercase"
              >
                Overridden
              </Badge>
            )}
            {closed && (
              <Badge variant="secondary" className="gap-1 rounded-sm">
                <Lock className="h-3 w-3" /> Closed
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5">
        {dialogOpen ? (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <p className="eyebrow">Edit claim</p>
              <p className="text-[11px] text-muted-foreground">
                Stored for this session · shown in the audit trail
              </p>
            </div>
            {claim.live && (
              <div className="space-y-2 border-b border-border pb-4">
                <p className="eyebrow">Claim fields</p>
                <ClaimFieldsEditor key={claim.id} caseId={claim.id} section="fields" />
              </div>
            )}
            <p className="eyebrow">Decision</p>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label
                  htmlFor="override-decision"
                  className="text-xs font-medium text-muted-foreground"
                >
                  New decision
                </Label>
                <Select value={newDecision} onValueChange={(v) => setNewDecision(v as Decision)}>
                  <SelectTrigger id="override-decision" className="h-9 rounded-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {decisionOptions.map((d) => (
                      <SelectItem key={d} value={d}>
                        {DECISION_LABELS[d]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="override-reason"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Reason
                </Label>
                <Textarea
                  id="override-reason"
                  className="h-9 min-h-9 rounded-sm"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why is the engine's decision wrong?"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="override-reviewer"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Reviewer
                </Label>
                <Input
                  id="override-reviewer"
                  className="h-9 rounded-sm"
                  value={reviewer}
                  onChange={(e) => setReviewer(e.target.value)}
                  placeholder="Your name"
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="eyebrow">Decision under policy {mode}</p>
              <div className="mt-2">
                <DecisionBadge decision={currentDecision} size="lg" />
              </div>
            </div>

            {claimOverrides.length > 0 && (
              <div>
                <p className="eyebrow">Override history</p>
                <ul className="mt-3 ml-1 space-y-4 border-l border-border pl-4">
                  {claimOverrides.map((o) => (
                    <li key={o.id} className="relative space-y-1.5 text-sm">
                      <span
                        aria-hidden="true"
                        className="absolute top-1.5 -left-[21px] size-1.5 rounded-full bg-foreground"
                      />
                      <p className="font-mono text-xs tabular-nums text-muted-foreground">
                        {new Date(o.at).toLocaleString("en-GB")}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <DecisionBadge decision={o.previousDecision} />
                        <ArrowRight
                          aria-hidden="true"
                          className="h-3 w-3 text-contrast"
                          strokeWidth={1.5}
                        />
                        <DecisionBadge decision={o.newDecision} />
                      </div>
                      <p className="text-sm text-muted-foreground">{o.reason}</p>
                      <p className="text-xs text-muted-foreground">by {o.reviewer}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {claim.live && <ClaimFieldsEditor key={claim.id} caseId={claim.id} section="history" />}
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-border p-4">
        {closed ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
            Closed — the decision is protected and cannot be corrected.
          </p>
        ) : dialogOpen ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-8 flex-1 rounded-sm text-xs"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="h-8 flex-1 rounded-sm bg-primary text-primary-foreground text-xs"
              onClick={saveOverride}
            >
              Save correction →
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            className="h-8 w-full gap-2 rounded-sm bg-primary text-primary-foreground text-xs"
            onClick={() => setDialogOpen(true)}
          >
            <PencilLine aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.5} />
            Edit claim
          </Button>
        )}
      </div>
    </div>
  );
}
