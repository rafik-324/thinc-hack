import { ArrowRight, ExternalLink, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { DecisionBadge } from "@/components/decision-badge";
import { Badge } from "@/components/ui/badge";
import {
  DECISION_LABELS,
  getRule,
  isChanged,
  type Claim,
} from "@/lib/policy-data";
import { usePolicy } from "@/lib/policy-context";
import { cn } from "@/lib/utils";

export function ClaimDetailPanel({ claim }: { claim: Claim }) {
  const { mode, effectiveDecision, overridesFor } = usePolicy();
  const rule = getRule(claim.rule);
  const claimOverrides = overridesFor(claim.id);
  const changed = isChanged(claim);
  const closed = claim.status === "closed";
  const currentDecision = effectiveDecision(claim, mode === "v1" ? "v1" : "v2");

  return (
    <div className="flex h-full min-h-80 flex-col">
      <div className="shrink-0 space-y-3 border-b border-border p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow mb-1.5">Claim</p>
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

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="eyebrow">Rule</span>
          <Badge variant="outline" className="rounded-sm font-mono tabular-nums">
            {claim.rule}
          </Badge>
          <span className="truncate">{rule.name}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
        {mode === "compare" ? (
          <div className="space-y-2">
            <p className="eyebrow">Decision v1 → v2</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="eyebrow">Policy v1</p>
                <div className="mt-2">
                  <DecisionBadge decision={claim.decisionV1} />
                </div>
                <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
                  {rule.clauseV1}
                </p>
              </div>
              <div
                className={cn(
                  "rounded-lg border bg-card p-4",
                  changed ? "border-contrast/40" : "border-border",
                )}
              >
                <p className="eyebrow">Policy v2</p>
                <div className="mt-2">
                  <DecisionBadge decision={claim.decisionV2} />
                </div>
                <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
                  {rule.clauseV2}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-contrast" strokeWidth={1.5} />
              <span>
                {changed
                  ? `Decision changes from ${DECISION_LABELS[claim.decisionV1]} to ${DECISION_LABELS[claim.decisionV2]}.`
                  : "No change between policy versions."}
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="eyebrow">Decision under policy {mode}</p>
            <div className="mt-2">
              <DecisionBadge decision={currentDecision} size="lg" />
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
              {mode === "v1" ? rule.clauseV1 : rule.clauseV2}
            </p>
          </div>
        )}

        <div>
          <p className="eyebrow">Decisive fact</p>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground">{claim.decisiveFact}</p>
        </div>

        <div>
          <p className="eyebrow">Explanation</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {claim.explanation}
          </p>
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
                    <ArrowRight aria-hidden="true" className="h-3 w-3 text-contrast" strokeWidth={1.5} />
                    <DecisionBadge decision={o.newDecision} />
                  </div>
                  <p className="text-sm text-muted-foreground">{o.reason}</p>
                  <p className="text-xs text-muted-foreground">by {o.reviewer}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border p-4">
        <Link
          to="/claims/$claimId"
          params={{ claimId: claim.id }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Open full claim
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  );
}
