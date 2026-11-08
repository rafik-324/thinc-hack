import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Inbox, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { StaffGate } from "@/components/staff-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listSubmittedClaims,
  type InboxClaim,
} from "@/lib/staff-inbox.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/submitted")({
  head: () => ({
    meta: [
      { title: "Submitted claims — Retakt" },
      {
        name: "description",
        content: "Inbox of claims submitted by customers, with engine recommendations.",
      },
      { property: "og:title", content: "Submitted claims — Retakt" },
      {
        property: "og:description",
        content: "Inbox of claims submitted by customers, with engine recommendations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SubmittedPage,
});

function SubmittedPage() {
  const navigate = useNavigate();
  const fetchInbox = useServerFn(listSubmittedClaims);

  const [claims, setClaims] = useState<InboxClaim[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reference, setReference] = useState("");

  const loadPage = useCallback(
    async (cursor?: string) => {
      const page = await fetchInbox({ data: { cursor } });
      return page;
    },
    [fetchInbox],
  );

  const loadFirst = useCallback(() => {
    setLoading(true);
    setError(null);
    loadPage()
      .then((page) => {
        setClaims(page.claims);
        setNextCursor(page.next_cursor);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [loadPage]);

  useEffect(() => {
    loadFirst();
  }, [loadFirst]);

  const loadMore = () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    loadPage(nextCursor)
      .then((page) => {
        setClaims((prev) => [...prev, ...page.claims]);
        setNextCursor(page.next_cursor);
      })
      .catch(setError)
      .finally(() => setLoadingMore(false));
  };

  const lookup = () => {
    const ref = reference.trim();
    if (!ref) return;
    navigate({ to: "/submitted/$reference", params: { reference: ref } });
  };

  if (error) {
    return <StaffGate error={error} onRetry={loadFirst} />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Submitted claims</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {loading ? "Loading inbox…" : `${claims.length} claim${claims.length === 1 ? "" : "s"} loaded`}
            </p>
          </div>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              lookup();
            }}
          >
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Receipt reference, e.g. SUB-1042"
              aria-label="Receipt reference"
              className="h-8 w-56 rounded-sm font-mono text-xs tabular-nums"
            />
            <Button type="submit" size="sm" variant="outline" className="h-8 gap-1.5 rounded-sm text-xs">
              <Search size={13} strokeWidth={1.5} />
              Look up
            </Button>
          </form>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <Inbox size={14} strokeWidth={1.5} className="text-muted-foreground" />
          <p className="eyebrow">Inbox</p>
        </div>

        {loading ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">Loading…</p>
        ) : claims.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">No submitted claims.</p>
        ) : (
          <ul className="divide-y divide-border">
            {claims.map((claim) => (
              <li key={claim.reference}>
                <Link
                  to="/submitted/$reference"
                  params={{ reference: claim.reference }}
                  className="group flex items-center gap-4 px-5 py-3 transition-colors hover:bg-accent/40"
                >
                  <span className="w-36 shrink-0 font-mono text-sm tabular-nums text-foreground">
                    {claim.reference}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                    {claim.category ?? "—"}
                  </span>
                  {claim.recommendation && (
                    <span
                      className={cn(
                        "shrink-0 rounded-sm border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide",
                        claim.effective_recommendation &&
                          claim.effective_recommendation !== claim.recommendation
                          ? "text-muted-foreground line-through"
                          : "text-foreground",
                      )}
                    >
                      {claim.recommendation}
                    </span>
                  )}
                  {claim.effective_recommendation &&
                    claim.effective_recommendation !== claim.recommendation && (
                      <span className="shrink-0 rounded-sm border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-foreground">
                        {claim.effective_recommendation}
                      </span>
                    )}
                  <ArrowRight
                    size={14}
                    strokeWidth={1.5}
                    className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {nextCursor && !loading && (
          <div className="border-t border-border px-5 py-3">
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-sm text-xs"
              disabled={loadingMore}
              onClick={loadMore}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
