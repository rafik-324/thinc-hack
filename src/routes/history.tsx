import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — Retakt" },
      {
        name: "description",
        content: "History of policy versions and decision changes.",
      },
      { property: "og:title", content: "History — Retakt" },
      {
        property: "og:description",
        content: "History of policy versions and decision changes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="rounded-lg border border-border bg-card p-10 text-center">
        <History aria-hidden="true" className="mx-auto h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
        <h1 className="mt-4 text-xl font-medium tracking-normal text-foreground">History</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page is still empty — the version history will live here.
        </p>
      </div>
    </div>
  );
}
