import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Download, FileText, PencilLine } from "lucide-react";
import { useContext, useState } from "react";
import { toast } from "sonner";

import {
  SubmittedStaff,
  demoDocument,
  demoEvidence,
  findDemoClaim,
  StaffGate,
} from "@/components/staff-gate";
import { Button } from "@/components/ui/button";
import {
  getClaimDocument,
  getClaimEvidence,
  getPolicyReplay,
  getJudgeEvidence,
  getJudgeDocument,
  getJudgeReplay,
} from "@/lib/staff-inbox.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/submitted/$reference")({
  head: () => ({
    meta: [
      { title: "Submitted claim — Retakt" },
      { name: "description", content: "Submitted claim detail with engine recommendation." },
      { property: "og:title", content: "Submitted claim — Retakt" },
      { property: "og:description", content: "Submitted claim detail with engine recommendation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SubmittedDetailPage,
});

function Field({ label, value, mono = true }: { label: string; value?: unknown; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-right text-sm text-foreground", mono && "font-mono tabular-nums")}>
        {value === undefined || value === null || value === "" ? "—" : String(value)}
      </span>
    </div>
  );
}

function SubmittedDetailPage() {
  const { reference } = Route.useParams();
  const staffId = useContext(SubmittedStaff);
  const sample = !staffId ? findDemoClaim(reference) : undefined;
  const fetchEvidence = useServerFn(getClaimEvidence);
  const fetchReplay = useServerFn(getPolicyReplay);
  const fetchDocument = useServerFn(getClaimDocument);
  const judgeEvidence = useServerFn(getJudgeEvidence);
  const judgeReplay = useServerFn(getJudgeReplay);
  const judgeDocument = useServerFn(getJudgeDocument);
  const [downloading, setDownloading] = useState<number | null>(null);

  const evidenceQuery = useQuery({
    queryKey: ["submitted-evidence", staffId, reference],
    queryFn: () =>
      sample
        ? demoEvidence(sample)
        : (staffId ? fetchEvidence : judgeEvidence)({ data: { reference } }),
    refetchInterval: !sample && !staffId ? 5000 : false,
    gcTime: 0,
    retry: false,
  });

  const revision = evidenceQuery.data?.category?.revision;
  const replayQuery = useQuery({
    queryKey: ["submitted-replay", staffId, reference, revision],
    gcTime: 0,
    queryFn: () =>
      sample
        ? sample.replay
        : (staffId ? fetchReplay : judgeReplay)({
            data: { reference, expected_revision: revision! },
          }),
    enabled: typeof revision === "number",
    retry: false,
  });

  if (evidenceQuery.error) {
    return <StaffGate error={evidenceQuery.error} onRetry={() => evidenceQuery.refetch()} />;
  }

  const evidence = evidenceQuery.data;
  const category = evidence?.category;
  const decision = evidence?.evidence?.decision;
  const employeeWhy = decision?.audit?.detail?.employee?.why;
  const documents = Array.isArray(evidence?.documents) ? evidence!.documents! : [];
  const corrections = Array.isArray(evidence?.corrections) ? evidence!.corrections! : [];
  const replay = replayQuery.data;

  const download = async (position: number, fallbackName?: string) => {
    setDownloading(position);
    try {
      const doc = sample
        ? demoDocument(sample, position)
        : await (staffId ? fetchDocument : judgeDocument)({ data: { reference, position } });
      const bytes = Uint8Array.from(atob(doc.content_base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], {
        type: sample ? "application/pdf" : "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.name || fallbackName || `document-${position}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Dokument konnte nicht geladen werden.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-5">
        <Link
          to="/submitted"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={13} strokeWidth={1.5} />
          Submitted claims
        </Link>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
          {sample && <p className="eyebrow w-full">Demo claim · {sample.title}</p>}
          <h1 className="font-mono text-xl font-medium tabular-nums tracking-tight text-foreground">
            {reference}
          </h1>
          {category?.revision !== undefined && (
            <span className="rounded-sm border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              Revision {String(category.revision)}
            </span>
          )}
        </div>
      </div>

      {evidenceQuery.isPending ? (
        <div className="rounded-lg border border-border bg-card px-5 py-8 text-sm text-muted-foreground">
          Loading claim…
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-border bg-card p-5">
            <p className="eyebrow">Category</p>
            <div className="mt-3">
              <Field label="Recommendation" value={category?.recommendation} />
              <Field label="Effective recommendation" value={category?.effective_recommendation} />
              <Field label="Rule" value={category?.rule_id} />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <p className="eyebrow">Recorded engine recommendation</p>
            <div className="mt-3">
              <Field label="Recommendation" value={decision?.recommendation} />
              <Field label="Primary rule" value={decision?.primary_rule_id} />
              <Field label="Policy version" value={decision?.policy_version} />
            </div>
            {employeeWhy && (
              <div className="mt-4 rounded-sm border border-border p-3">
                <p className="eyebrow">Employee explanation</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">{employeeWhy}</p>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <p className="eyebrow">Original documents</p>
            {documents.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No documents attached.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {documents.map((doc, index) => {
                  const position = typeof doc.position === "number" ? doc.position : index;
                  return (
                    <li
                      key={position}
                      className="flex items-center gap-3 rounded-sm border border-border px-3 py-2"
                    >
                      <FileText
                        size={14}
                        strokeWidth={1.5}
                        className="shrink-0 text-muted-foreground"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                        {doc.name ?? `Document ${position + 1}`}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 rounded-sm text-xs"
                        disabled={downloading === position}
                        onClick={() => void download(position, doc.name)}
                      >
                        <Download size={12} strokeWidth={1.5} />
                        {downloading === position ? "Loading…" : "Download"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <PencilLine size={13} strokeWidth={1.5} className="text-muted-foreground" />
              <p className="eyebrow">Reviewer corrections</p>
            </div>
            {corrections.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No reviewer corrections recorded.
              </p>
            ) : (
              <ul className="mt-3 ml-1 space-y-4 border-l border-border pl-4">
                {corrections.map((correction, index) => (
                  <li key={index} className="relative space-y-1 text-sm">
                    <span
                      aria-hidden="true"
                      className="absolute top-1.5 -left-[21px] size-1.5 rounded-full bg-foreground"
                    />
                    {correction.at && (
                      <p className="font-mono text-xs tabular-nums text-muted-foreground">
                        {new Date(String(correction.at)).toLocaleString("en-GB")}
                      </p>
                    )}
                    <p className="font-mono text-xs tabular-nums text-foreground">
                      {String(correction.previous ?? "—")} → {String(correction.next ?? "—")}
                    </p>
                    {correction.reason && (
                      <p className="text-sm text-muted-foreground">{String(correction.reason)}</p>
                    )}
                    {correction.reviewer && (
                      <p className="text-xs text-muted-foreground">
                        by {String(correction.reviewer)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-5 lg:col-span-2">
            <p className="eyebrow">Policy v1 → v2 preview</p>
            {typeof revision !== "number" ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No revision on this claim — replay unavailable.
              </p>
            ) : replayQuery.isPending ? (
              <p className="mt-3 text-sm text-muted-foreground">Replaying under v2…</p>
            ) : replayQuery.error ? (
              <p className="mt-3 text-sm text-muted-foreground">Replay could not be loaded.</p>
            ) : replay ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-sm border border-border p-4">
                  <p className="eyebrow">Recorded · {replay.recorded?.version ?? "v1"}</p>
                  <div className="mt-3">
                    <Field label="Recommendation" value={replay.recorded?.recommendation} />
                    <Field label="Rule" value={replay.recorded?.rule} />
                  </div>
                  {replay.recorded?.why && (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {replay.recorded.why}
                    </p>
                  )}
                </div>
                <div className="rounded-sm border border-border p-4">
                  <p className="eyebrow">Proposed · {replay.proposed?.version ?? "v2"}</p>
                  <div className="mt-3">
                    <Field label="Recommendation" value={replay.proposed?.recommendation} />
                    <Field label="Rule" value={replay.proposed?.rule} />
                  </div>
                  {replay.proposed?.why && (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {replay.proposed.why}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 md:col-span-2">
                  {Array.isArray(replay.impacted_rules) && replay.impacted_rules.length > 0 && (
                    <span className="rounded-sm border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      Impacted rules: {replay.impacted_rules.join(", ")}
                    </span>
                  )}
                  {replay.needs_recheck && (
                    <span className="rounded-sm border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-foreground">
                      Needs re-check
                    </span>
                  )}
                  {replay.closed_retained && (
                    <span className="rounded-sm border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      Closed decision retained
                    </span>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
