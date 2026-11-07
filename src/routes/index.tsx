import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Scale } from "lucide-react";

import { CLAIMS, isChanged } from "@/lib/policy-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Policy Replay — Test policy changes before they go live" },
      {
        name: "description",
        content:
          "Replay a new policy version against past claims and see exactly which decisions change, before you ship it.",
      },
      { property: "og:title", content: "Policy Replay — Test policy changes before they go live" },
      {
        property: "og:description",
        content:
          "Replay a new policy version against past claims and see exactly which decisions change, before you ship it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const changed = CLAIMS.filter(isChanged).length;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-8 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Scale className="h-4 w-4" />
          </div>
          <span className="text-base font-semibold tracking-tight text-foreground">
            Policy Replay
          </span>
        </div>
        <span className="font-mono text-xs text-muted-foreground">v1 → v2</span>
      </header>

      <main className="flex flex-1 items-center px-8">
        <div className="mx-auto w-full max-w-3xl py-16">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Decision intelligence for claims teams
          </p>
          <h1 className="mt-4 text-5xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
            Know what a policy change does before it goes live.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Policy Replay runs your new rules version against past claims and shows you exactly
            which decisions flip, what it costs, and where reviewers need to look — before you
            ship it.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              to="/queue"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Analyse starten
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="font-mono text-xs text-muted-foreground">
              {CLAIMS.length} claims loaded · {changed} decisions change under v2
            </span>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3">
            <div className="bg-card p-6">
              <p className="font-mono text-2xl font-medium text-foreground">{CLAIMS.length}</p>
              <p className="mt-1 text-sm text-muted-foreground">Past claims replayed</p>
            </div>
            <div className="bg-card p-6">
              <p className="font-mono text-2xl font-medium text-foreground">{changed}</p>
              <p className="mt-1 text-sm text-muted-foreground">Decisions changed by v2</p>
            </div>
            <div className="bg-card p-6">
              <p className="font-mono text-2xl font-medium text-foreground">8% → 3.2%</p>
              <p className="mt-1 text-sm text-muted-foreground">Error rate, v1 to v2</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border px-8 py-4">
        <p className="text-xs text-muted-foreground">Claims review prototype · demo data</p>
      </footer>
    </div>
  );
}
