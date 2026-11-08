/**
 * Rico's first-run tour: an interactive walk through the whole Retakt workflow.
 * Steps point at real UI elements (found by role/text, no markup changes needed); "click" steps only advance
 * when the user clicks the highlighted element, "info" steps have a Next button.
 * Whether the tour already ran is stored per device (localStorage); Settings → Rico can reset it.
 */

const DONE_KEY = "retakt.rico.tourDone";
const MODE_KEY = "retakt.rico.tourMode";

export type TourMode = "voice" | "bubbles";

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function isTourDone(): boolean {
  try {
    return storage()?.getItem(DONE_KEY) === "1";
  } catch {
    return true; // storage blocked: never nag
  }
}
export function markTourDone() {
  try {
    storage()?.setItem(DONE_KEY, "1");
  } catch {
    // ignore
  }
}
/** Next reload starts the tour again on this device. */
export function resetTour() {
  try {
    storage()?.removeItem(DONE_KEY);
  } catch {
    // ignore
  }
}
export function loadTourMode(): TourMode {
  try {
    return storage()?.getItem(MODE_KEY) === "bubbles" ? "bubbles" : "voice";
  } catch {
    return "voice";
  }
}
export function saveTourMode(mode: TourMode) {
  try {
    storage()?.setItem(MODE_KEY, mode);
  } catch {
    // ignore
  }
}

// ---- Finding elements in the live UI

function byText(selector: string, text: string | RegExp, root: ParentNode = document) {
  const match = (s: string) => (typeof text === "string" ? s.startsWith(text) : text.test(s));
  return (
    Array.from(root.querySelectorAll<HTMLElement>(selector)).find(
      (el) => el.offsetParent !== null && match((el.textContent ?? "").trim()),
    ) ?? null
  );
}
const visible = (el: Element | null) =>
  el instanceof HTMLElement && el.offsetParent !== null ? el : null;
const cardTitled = (title: string | RegExp) =>
  byText("div.font-medium", title)?.closest<HTMLElement>(".bg-card") ?? null;
const uploadCard = () =>
  byText("button", /^Policy upload/)?.closest<HTMLElement>(".bg-card") ?? null;

export type TourStep = {
  id: string;
  /** Element to highlight; null = Rico talks from the middle of the screen. */
  target?: () => HTMLElement | HTMLElement[] | null;
  /** Spoken (voice mode) and shown in the bubble (bubble mode). */
  say: string;
  /** Short instruction shown in voice mode, e.g. "Click Policy Update". */
  hint?: string;
  /** "click"/"scroll": advances when the highlighted element is clicked/scrolled. "info": Next button. */
  kind: "click" | "info" | "scroll";
  /** Optional extra completion check (e.g. route reached), polled while the step is active. */
  done?: (pathname: string) => boolean;
  /** false: no dark veil, the whole UI stays visible (target only positions Rico). */
  dim?: boolean;
  /** "corner": Rico sits just below the target's right corner instead of beside it. */
  place?: "corner";
  /** Voice mode: finish the tour (Rico flies back to his corner) once he has said the line. */
  autoEnd?: boolean;
};

const openClaimsCard = () => byText("h2", "Open claims")?.closest<HTMLElement>(".bg-card") ?? null;
const detailPanel = (button: RegExp) =>
  byText("button", button)?.closest<HTMLElement>('[class*="min-h-80"]') ?? null;

/** The tour always starts on the Overview (/queue), then moves on to Policy Update. */
export const TOUR_START_ROUTE = "/queue";

const info = (
  id: string,
  target: (() => HTMLElement | HTMLElement[] | null) | undefined,
  say: string,
): TourStep => (target ? { id, kind: "info", target, say } : { id, kind: "info", say });

/**
 * Mostly short introductions (Next). The user only has to click the important buttons:
 * opening a claim, Edit claim, Policy Update and the upload panel.
 */
/** The KPI block at the top of the Overview: decision distribution, active claims, claim volume. */
const overviewKpis = () =>
  byText("span", "Decision distribution")?.closest<HTMLElement>(".bg-card")?.parentElement ?? null;

export const TOUR_STEPS: TourStep[] = [
  // ---- Overview
  info("hello", undefined, "Hi, I'm Rico. Let me show you around."),
  info(
    "sidebar",
    () => visible(document.querySelector("aside nav")),
    "Overview, Policy Update and History live here.",
  ),
  info("kpis", overviewKpis, "Up here: your key numbers for all open claims."),
  {
    id: "pick",
    kind: "click",
    target: () => visible(openClaimsCard()?.querySelector("tbody tr") ?? null),
    say: "Click a claim to open it.",
    hint: "Click a claim",
  },
  {
    id: "detail",
    kind: "scroll",
    target: () => detailPanel(/Edit claim$/),
    say: "The claim opens here. Scroll inside it to continue.",
    hint: "Scroll inside the claim",
  },
  {
    id: "edit",
    kind: "click",
    target: () => byText("button", /Edit claim$/),
    say: "Disagree with the engine? Then click Edit claim.",
    hint: "Click “Edit claim”",
  },
  info(
    "edit-explain",
    // The form fields (scroll area of the panel) and the Save / Cancel row below them.
    () =>
      [
        byText("p", "Edit claim")?.closest<HTMLElement>('[class*="overflow-y-auto"]'),
        byText("button", /^Save correction/)?.parentElement,
      ].filter((el): el is HTMLElement => !!el),
    "Pick a decision, add a reason and your name. Then save.",
  ),
  info(
    "inbox",
    () => visible(document.querySelector('a[aria-label="Submitted claims"]')),
    "Claims submitted by customers land here.",
  ),
  // ---- Policy Update
  {
    id: "go-update",
    kind: "click",
    target: () => visible(document.querySelector('aside a[href="/update"]')),
    say: "Now a new policy arrives. Click Policy Update.",
    hint: "Click “Policy Update”",
    done: (p) => p.startsWith("/update"),
  },
  {
    id: "upload",
    kind: "click",
    target: uploadCard,
    say: "New policies go here. Open the upload.",
    hint: "Click “Expand”",
    done: () => byText("button", /^Policy upload/)?.getAttribute("aria-expanded") === "true",
  },
  info("upload-explain", uploadCard, "Drop the file, set a version, press Upload and apply."),
  {
    // Last step: no veil, Rico perches at the "Human review queue" corner, says the line, then flies home.
    id: "changes",
    kind: "info",
    target: () => byText("p", "Human review queue")?.parentElement ?? null,
    dim: false,
    place: "corner",
    autoEnd: true,
    say: "Up here you see what changed since last time. That's it!",
  },
];
