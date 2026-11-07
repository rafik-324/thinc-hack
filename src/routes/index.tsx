import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { AsciiColumns } from "@/components/ascii-columns";
import { CLAIMS, isChanged } from "@/lib/policy-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Policy Replay" },
      {
        name: "description",
        content:
          "When the policy changes: which open motor claims need a second look, and why. Replay policy v1 against v2.",
      },
      { property: "og:title", content: "Policy Replay" },
      {
        property: "og:description",
        content:
          "When the policy changes: which open motor claims need a second look, and why. Replay policy v1 against v2.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

function Logo() {
  return (
    <svg viewBox="0 0 48 48" className="h-14 w-14" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="19" stroke="currentColor" strokeWidth="3.5" />
      <path
        d="M9 31C16 20 27 13.5 41 15.5"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.04] px-4 py-3">
      <p className="text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-0.5 text-xs text-neutral-500">{label}</p>
    </div>
  );
}

function Landing() {
  const open = CLAIMS.filter((c) => c.status === "open");
  const changedOpen = open.filter(isChanged).length;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[oklch(0.17_0_0)] text-neutral-100">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative z-10 flex flex-col justify-center px-6 py-16 sm:px-12 lg:border-l lg:border-white/5 lg:px-0">
          <div className="mx-auto w-full max-w-sm">
            <div className="flex justify-center text-white lg:justify-start">
              <Logo />
            </div>

            <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500">
              Policy Replay · v1 → v2
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
              Which open claims need a second look?
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-neutral-400">
              When the motor policy changes, Policy Replay re-runs every open claim against the new
              rules and shows reviewers exactly which decisions flip, and why.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <Stat value={open.length} label="open claims in the queue" />
              <Stat value={changedOpen} label="decisions flip under v2" />
            </div>

            <Link
              to="/queue"
              className="group mt-10 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Start review
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <p className="mt-4 text-center text-xs text-neutral-500">
              Decisions come from the rules engine. Nothing changes without a reviewer.
            </p>

            <p className="mt-12 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600">
              thinc! hack MUC · Taktile Track
            </p>
          </div>
        </section>

        <div className="pointer-events-none absolute inset-0 opacity-25 lg:static lg:opacity-100">
          <AsciiColumns className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
