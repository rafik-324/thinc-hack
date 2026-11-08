import { createFileRoute, Link, Outlet, useMatch, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Inbox, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { demoRows, findDemoClaim, StaffGate, SubmittedStaff } from "@/components/staff-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listJudgeClaims, listSubmittedClaims, type InboxClaim } from "@/lib/staff-inbox.functions";
import { DecisionBadge } from "@/components/decision-badge";
import { asDecision, ruleLabel } from "@/lib/labels";
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
  component: SubmittedLayout,
});

function SubmittedLayout() {
  const detail = useMatch({ from: "/submitted/$reference", shouldThrow: false });
  const [staffId, setStaffId] = useState<string | null>(null);
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setStaffId(session?.user.app_metadata?.["staff"] === true ? session.user.id : null);
    });
    return () => subscription.unsubscribe();
  }, []);
  return (
    <SubmittedStaff.Provider key={staffId ?? "demo"} value={staffId}>
      {detail ? <Outlet /> : <SubmittedPage demo={!staffId} />}
    </SubmittedStaff.Provider>
  );
}

function SubmittedPage({ demo }: { demo: boolean }) {
  const navigate = useNavigate();
  const fetchInbox = useServerFn(listSubmittedClaims);

  const fetchJudgeInbox = useServerFn(listJudgeClaims);

  const [claims, setClaims] = useState<InboxClaim[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reference, setReference] = useState("");

  const loadPage = useCallback(
    async (cursor?: string) => {
      if (demo) {
        const page = await fetchJudgeInbox({ data: cursor ? { cursor } : {} });
        return { ...page, claims: page.next_cursor ? page.claims : [...page.claims, ...demoRows] };
      }
      return fetchInbox({ data: cursor ? { cursor } : {} });
    },
    [demo, fetchInbox, fetchJudgeInbox],
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
            <p className="eyebrow">{demo ? "Demo inbox" : "Submitted claims"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {demo
                ? "Open a demo claim to see its documents and compare V1 and V2."
                : loading
                  ? "Loading inbox…"
                  : `${claims.length} claim${claims.length === 1 ? "" : "s"} loaded`}
            </p>
          </div>
          {demo && (
            <Button size="sm" variant="outline" onClick={loadFirst} disabled={loading}>
              Refresh inbox
            </Button>
          )}
          {!demo && (
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
                placeholder="Receipt reference (CLM-…)"
                aria-label="Receipt reference"
                className="h-8 w-56 rounded-sm font-mono text-xs tabular-nums"
              />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 rounded-sm text-xs"
              >
                <Search size={13} strokeWidth={1.5} />
                Look up
              </Button>
            </form>
          )}
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
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-sm tabular-nums text-foreground">
                      {demo
                        ? (findDemoClaim(claim.reference)?.title ?? claim.reference)
                        : claim.reference}
                    </span>
                    <span
                      title={claim.reference}
                      className="mt-0.5 block truncate font-mono text-[11px] tabular-nums text-muted-foreground"
                    >
                      {demo && findDemoClaim(claim.reference)
                        ? claim.reference
                        : ruleLabel(claim.rule_id)}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    {claim.recommendation && (
                      <RecommendationBadge
                        value={claim.recommendation}
                        struck={
                          !!claim.effective_recommendation &&
                          claim.effective_recommendation !== claim.recommendation
                        }
                      />
                    )}
                    {claim.effective_recommendation &&
                      claim.effective_recommendation !== claim.recommendation && (
                        <RecommendationBadge value={claim.effective_recommendation} />
                      )}
                  </span>
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

/** Engine recommendation as the same coloured badge the rest of the app uses. */
function RecommendationBadge({ value, struck = false }: { value: string; struck?: boolean }) {
  const decision = asDecision(value);
  if (!decision) {
    return (
      <span className="rounded-sm border border-border px-2 py-0.5 text-xs text-foreground">
        {value}
      </span>
    );
  }
  return (
    <DecisionBadge decision={decision} muted={struck} className={cn(struck && "line-through")} />
  );
}
