import { createFileRoute } from "@tanstack/react-router";

import { LandingReplay } from "@/components/landing-replay/landing-replay";

// Pitch embedding: when the app runs inside the pitch deck iframe, hand arrow/page keys to the deck (not while typing).
if (typeof window !== "undefined" && window.parent !== window && !(window as any).__retaktKeyFwd) {
  (window as any).__retaktKeyFwd = true;
  // Behave like a device that already saw Rico's first-run tour, so the tour doesn't start during the pitch demo.
  try {
    window.localStorage.setItem("retakt.rico.tourDone", "1");
  } catch {
    // storage blocked: the tour treats that as done anyway
  }
  const KEYS = ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "PageDown", "PageUp"];
  window.addEventListener("keydown", (e) => {
    const t = e.target as HTMLElement | null;
    const tag = t?.tagName;
    if (!KEYS.includes(e.key) || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t?.isContentEditable) return;
    e.preventDefault();
    window.parent.postMessage({ type: "retakt-key", key: e.key }, "*");
  });
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Retakt" },
      {
        name: "description",
        content:
          "When the policy changes: which open motor claims need a second look, and why. Replay policy v1 against v2.",
      },
      { property: "og:title", content: "Retakt" },
      {
        property: "og:description",
        content:
          "When the policy changes: which open motor claims need a second look, and why. Replay policy v1 against v2.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LandingReplay,
});
