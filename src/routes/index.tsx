import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Leere Seite" },
      { name: "description", content: "Eine leere weiße Webseite." },
      { property: "og:title", content: "Leere Seite" },
      { property: "og:description", content: "Eine leere weiße Webseite." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return <div className="min-h-screen bg-background" />;
}
