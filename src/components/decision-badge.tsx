import { DECISION_LABELS, type Decision } from "@/lib/policy-data";
import { cn } from "@/lib/utils";

const DECISION_CLASSES: Record<Decision, string> = {
  fast_track: "bg-decision-fast-soft text-decision-fast border-decision-fast-line",
  standard_review: "bg-decision-standard-soft text-decision-standard border-decision-standard-line",
  specialist_review: "bg-decision-specialist-soft text-decision-specialist border-decision-specialist-line",
  reject: "bg-decision-reject-soft text-decision-reject border-decision-reject-line",
};

export function DecisionBadge({
  decision,
  size = "sm",
  className,
}: {
  decision: Decision;
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium whitespace-nowrap",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-4 py-1.5 text-base",
        DECISION_CLASSES[decision],
        className,
      )}
    >
      {DECISION_LABELS[decision]}
    </span>
  );
}
