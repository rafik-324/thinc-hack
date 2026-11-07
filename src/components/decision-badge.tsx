import { DECISION_LABELS, type Decision } from "@/lib/policy-data";
import { cn } from "@/lib/utils";

const DECISION_CLASSES: Record<Decision, string> = {
  fast_track: "bg-decision-fast-soft text-decision-fast border-decision-fast-line",
  standard_review: "bg-decision-standard-soft text-decision-standard border-decision-standard-line",
  specialist_review:
    "bg-decision-specialist-soft text-decision-specialist border-decision-specialist-line",
  reject: "bg-decision-reject-soft text-decision-reject border-decision-reject-line",
  routine_processing: "bg-decision-fast-soft text-decision-fast border-decision-fast-line",
  request_information:
    "bg-decision-standard-soft text-decision-standard border-decision-standard-line",
  human_review: "bg-decision-human-soft text-decision-human border-decision-human-line",
};

export function DecisionBadge({
  decision,
  size = "sm",
  muted = false,
  className,
}: {
  decision: Decision;
  size?: "sm" | "lg";
  /** Neutral grey without the decision colour, e.g. for closed claims. */
  muted?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        size === "lg" && "px-3 py-1 text-sm",
        muted ? "border-border bg-muted/40 text-muted-foreground" : DECISION_CLASSES[decision],
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current opacity-70" />
      {DECISION_LABELS[decision]}
    </span>
  );
}
