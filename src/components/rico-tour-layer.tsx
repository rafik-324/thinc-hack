import { useCallback, useEffect, useRef, useState } from "react";

import { speakAssistant } from "@/lib/assistant.functions";

import {
  TOUR_STEPS,
  isTourDone,
  loadTourMode,
  markTourDone,
  resetTour,
  saveTourMode,
  type TourMode,
  type TourStep,
} from "@/lib/rico-tour";

export const RICO_LANG = "en-US";

/** One ElevenLabs clip per sentence and page load: repeats and Back cost no extra credits. */
const clips = new Map<string, Promise<string>>();
function voiceClip(text: string): Promise<string> {
  let clip = clips.get(text);
  if (!clip) {
    clip = speakAssistant({ data: { text } }).then(
      ({ audio, mime }) => `data:${mime};base64,${audio}`,
    );
    clip.catch(() => clips.delete(text));
    clips.set(text, clip);
  }
  return clip;
}
const APP_PAGES = ["/queue", "/update", "/history", "/settings"];

type Box = { left: number; top: number; width: number; height: number };

export type RicoTour = {
  active: boolean;
  step: TourStep;
  index: number;
  total: number;
  rect: Box | null;
  mode: TourMode;
  speaking: boolean;
  viewport: { w: number; h: number };
  next: () => void;
  back: () => void;
  finish: () => void;
  repeat: () => void;
  toggleMode: () => void;
};

/** Prefers a natural-sounding English system voice when the browser offers one. */
function englishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const en = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  const preferred = [/Google US English/i, /Samantha/i, /Ava/i, /Allison/i, /Daniel/i, /en-US/i];
  for (const p of preferred) {
    const hit = en.find((v) => p.test(v.name) || p.test(v.lang));
    if (hit) return hit;
  }
  return en[0];
}

/** A step may highlight one element or several (shown as one box around all of them). */
function targetsOf(step: TourStep): HTMLElement[] {
  const t = step.target?.() ?? null;
  return (Array.isArray(t) ? t : [t]).filter((el): el is HTMLElement => el instanceof HTMLElement);
}
function unionBox(els: HTMLElement[]): Box | null {
  if (!els.length) return null;
  const rs = els.map((el) => el.getBoundingClientRect());
  const left = Math.min(...rs.map((r) => r.left));
  const top = Math.min(...rs.map((r) => r.top));
  const right = Math.max(...rs.map((r) => r.right));
  const bottom = Math.max(...rs.map((r) => r.bottom));
  return { left, top, width: right - left, height: bottom - top };
}
function insideTarget(step: TourStep, node: Node) {
  return targetsOf(step).some((el) => el.contains(node));
}

function sameBox(a: Box | null, b: Box | null) {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.left - b.left) < 1 &&
    Math.abs(a.top - b.top) < 1 &&
    Math.abs(a.width - b.width) < 1 &&
    Math.abs(a.height - b.height) < 1
  );
}

/** Runs the first-run tour on app pages; see src/lib/rico-tour.ts for the steps and storage. */
export function useRicoTour(pathname: string, onStart: () => void): RicoTour {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Box | null>(null);
  const [mode, setMode] = useState<TourMode>("voice");
  const [speaking, setSpeaking] = useState(false);
  const [viewport, setViewport] = useState({ w: 1280, h: 800 });
  const started = useRef(false);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const step = TOUR_STEPS[index]!;

  // Start once per device, on the first app page (not the landing).
  // "?tour" in the URL forces a fresh start (handy for testing and demos).
  useEffect(() => {
    if (!started.current && new URLSearchParams(window.location.search).has("tour")) resetTour();
    if (started.current || !APP_PAGES.some((p) => pathname.startsWith(p)) || isTourDone()) return;
    const t = window.setTimeout(() => {
      started.current = true;
      setMode(loadTourMode());
      setIndex(0);
      setActive(true);
      onStart();
    }, 900);
    return () => window.clearTimeout(t);
  }, [pathname, onStart]);

  useEffect(() => {
    if (!active) return;
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active]);

  // Rico's voice: ElevenLabs (same server function as the talk mode), browser voice as fallback.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRun = useRef(0);
  const unlock = useRef<(() => void) | null>(null);

  const stopSpeech = useCallback(() => {
    speechRun.current++;
    audioRef.current?.pause();
    audioRef.current = null;
    if (unlock.current) document.removeEventListener("pointerdown", unlock.current, true);
    unlock.current = null;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const browserVoice = useCallback((text: string, run: number) => {
    const synth = window.speechSynthesis;
    if (!synth || run !== speechRun.current) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = RICO_LANG;
    const voice = englishVoice();
    if (voice) u.voice = voice;
    u.rate = 1.02;
    u.onstart = () => setSpeaking(true);
    u.onend = u.onerror = () => setSpeaking(false);
    synth.speak(u);
  }, []);

  const speak = useCallback(
    (text: string) => {
      stopSpeech();
      const run = speechRun.current;
      void voiceClip(text)
        .then((src) => {
          if (run !== speechRun.current) return;
          const el = new Audio(src);
          audioRef.current = el;
          el.onplaying = () => setSpeaking(true);
          el.onended = el.onpause = () => setSpeaking(false);
          el.play().catch((e: unknown) => {
            if (run !== speechRun.current) return;
            // Autoplay blocked before the first interaction (tour start): play on the next click/tap.
            if (e instanceof DOMException && e.name === "NotAllowedError") {
              const retry = () => {
                unlock.current = null;
                if (run === speechRun.current) void el.play().catch(() => undefined);
              };
              unlock.current = retry;
              document.addEventListener("pointerdown", retry, { capture: true, once: true });
            } else browserVoice(text, run);
          });
        })
        .catch(() => browserVoice(text, run));
    },
    [stopSpeech, browserVoice],
  );

  const finish = useCallback(() => {
    markTourDone();
    stopSpeech();
    setActive(false);
    setRect(null);
  }, [stopSpeech]);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i >= TOUR_STEPS.length - 1) {
        window.setTimeout(finish, 0);
        return i;
      }
      return i + 1;
    });
  }, [finish]);
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // Speak each step (voice mode). Voices load async in Chrome, so retry once they arrive.
  useEffect(() => {
    if (!active) return;
    if (mode !== "voice") return stopSpeech();
    const say = () => speak(step.say);
    const synth = window.speechSynthesis;
    if (synth && synth.getVoices().length === 0) {
      synth.addEventListener("voiceschanged", say, { once: true });
      const t = window.setTimeout(say, 400);
      return () => {
        synth.removeEventListener("voiceschanged", say);
        window.clearTimeout(t);
      };
    }
    say();
  }, [active, index, mode, step.say, speak, stopSpeech]);

  // Track the target (layout shifts, route changes, scrolling) and auto-advance finished steps.
  useEffect(() => {
    if (!active) return;
    let scrolled = false;
    // Keep the last known box while the target is briefly gone (e.g. the Edit claim button vanishes when
    // the form opens), so Rico glides straight to the next target instead of jumping to the middle.
    let lastBox: Box | null = null;
    let advancing = false;
    const tick = () => {
      const els = targetsOf(step);
      const r = unionBox(els);
      if (r && !scrolled) {
        scrolled = true;
        if (r.top < 60 || r.top + r.height > window.innerHeight - 20)
          els[0]!.scrollIntoView({
            block: r.height > window.innerHeight * 0.7 ? "start" : "center",
            behavior: "smooth",
          });
      }
      if (r) lastBox = r;
      const box = r ?? lastBox;
      setRect((prev) => (sameBox(prev, box) ? prev : box));
      if (!advancing && step.done?.(pathRef.current)) {
        advancing = true;
        window.setTimeout(next, 450);
      }
    };
    tick();
    const id = window.setInterval(tick, 150);
    return () => window.clearInterval(id);
  }, [active, step, next]);

  // "scroll" steps advance when the user scrolls (wheel, touch or scrollbar) inside the highlighted element.
  useEffect(() => {
    if (!active || step.kind !== "scroll") return;
    let fired = false;
    const onScroll = (e: Event) => {
      if (fired || !(e.target instanceof Node) || !insideTarget(step, e.target)) return;
      fired = true;
      window.setTimeout(next, 600);
    };
    const events = ["wheel", "scroll", "touchmove"] as const;
    for (const type of events)
      document.addEventListener(type, onScroll, { capture: true, passive: true });
    return () => {
      for (const type of events) document.removeEventListener(type, onScroll, { capture: true });
    };
  }, [active, step, next]);

  // "click" steps without their own completion check advance when the highlighted element is clicked.
  useEffect(() => {
    if (!active || step.kind !== "click" || step.done) return;
    const onClick = (e: MouseEvent) => {
      if (e.target instanceof Node && insideTarget(step, e.target)) window.setTimeout(next, 120);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [active, step, next]);

  useEffect(() => stopSpeech, [stopSpeech]);

  const toggleMode = useCallback(() => {
    setMode((m) => {
      const nextMode: TourMode = m === "voice" ? "bubbles" : "voice";
      saveTourMode(nextMode);
      return nextMode;
    });
  }, []);
  // autoEnd steps: once Rico has finished speaking the line, end the tour (he flies back to his corner).
  const spokeThisStep = useRef(false);
  useEffect(() => {
    spokeThisStep.current = false;
  }, [index]);
  useEffect(() => {
    if (!active) return;
    if (speaking) {
      spokeThisStep.current = true;
      return;
    }
    if (!step.autoEnd || mode !== "voice" || !spokeThisStep.current) return;
    const t = window.setTimeout(finish, 900);
    return () => window.clearTimeout(t);
  }, [active, speaking, step, mode, finish]);

  const repeat = useCallback(() => {
    if (mode === "voice") speak(step.say);
  }, [mode, speak, step.say]);

  return {
    active,
    step,
    index,
    total: TOUR_STEPS.length,
    rect,
    mode,
    speaking,
    viewport,
    next,
    back,
    finish,
    repeat,
    toggleMode,
  };
}

/** Where Rico sits during a step: next to the highlighted element, or in the middle. */
/**
 * Where Rico sits during a step, and on which side of him the bubble goes. Rico and the bubble never cover
 * the highlighted element: narrow targets get Rico beside them (bubble further out), wide ones below/above.
 */
export function ricoSpot(
  tour: RicoTour,
  half: number,
): { x: number; y: number; side: "left" | "right" } {
  const { w, h } = tour.viewport;
  const r = tour.rect;
  const pad = 18;
  if (!r) return { x: w / 2, y: h / 2 - 40, side: "right" };
  if (tour.step.place === "corner")
    return {
      x: Math.min(r.left + r.width - half, w - half - 8),
      y: Math.min(r.top + r.height + half + 12, h - half - 8),
      side: "left",
    };
  const clampY = (y: number) => Math.min(Math.max(y, half + 8), h - half - 8);
  const clampX = (x: number) => Math.min(Math.max(x, half + 8), w - half - 8);
  const right = r.left + r.width;
  if (r.width < w * 0.45) {
    const y = clampY(r.top + Math.min(r.height / 2, 70));
    if (right + 2 * half + pad + 300 < w) return { x: right + half + pad, y, side: "right" };
    if (r.left - 2 * half - pad - 300 > 0) return { x: r.left - half - pad, y, side: "left" };
  }
  const below = r.top + r.height + half + pad;
  const y = below + half < h ? below : clampY(r.top - half - pad);
  return { x: clampX(r.left + half + 24), y, side: "right" };
}

/** Spotlight on the target plus Rico's bubble (bubble mode) or a compact control bar (voice mode). */
export function TourOverlay({
  tour,
  rico,
}: {
  tour: RicoTour;
  rico: { x: number; y: number; half: number; side: "left" | "right" };
}) {
  const { step, rect, mode, viewport } = tour;
  const pad = 8;
  const bubbleW = mode === "bubbles" ? 320 : 280;
  const leftSide = rico.side === "left";
  const left = Math.min(
    Math.max(leftSide ? rico.x - rico.half - 14 - bubbleW : rico.x + rico.half + 14, 12),
    viewport.w - bubbleW - 12,
  );
  const top = Math.min(Math.max(rico.y - 48, 12), viewport.h - (mode === "bubbles" ? 240 : 120));
  const isLast = tour.index === tour.total - 1;

  return (
    <>
      {/* Spotlight: a hole around the target (or a zero-size hole in the middle) in a dark veil. */}
      <div
        aria-hidden
        className="pointer-events-none fixed z-40 rounded-lg transition-all duration-500 ease-out"
        style={
          rect && step.dim === false
            ? {
                // No veil: fade the dark layer out so the whole UI stays visible.
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
                boxShadow: "0 0 0 200vmax rgb(0 0 0 / 0)",
              }
            : rect
              ? {
                  left: rect.left - pad,
                  top: rect.top - pad,
                  width: rect.width + 2 * pad,
                  height: rect.height + 2 * pad,
                  border: "2px solid #86f09f",
                  boxShadow:
                    "0 0 0 200vmax rgb(0 0 0 / 0.78), 0 0 28px 4px rgb(134 240 159 / 0.45)",
                }
              : {
                  left: viewport.w / 2,
                  top: viewport.h / 2,
                  width: 0,
                  height: 0,
                  boxShadow: "0 0 0 200vmax rgb(0 0 0 / 0.78)",
                }
        }
      />

      <div
        role="dialog"
        aria-label="Rico's tour"
        aria-live="polite"
        className="fixed z-50 rounded-xl border border-border bg-background/95 p-3 text-foreground shadow-2xl backdrop-blur transition-all duration-500 ease-out"
        style={{ left, top, width: bubbleW }}
      >
        {mode === "bubbles" ? (
          <p className="text-sm leading-relaxed">{step.say}</p>
        ) : (
          <p className="text-sm font-medium">
            {step.hint ?? (tour.speaking ? "Rico is talking…" : "Listen to Rico")}
          </p>
        )}
        {step.kind === "click" && mode === "bubbles" && step.hint && (
          <p className="mt-2 text-xs font-medium text-[#86f09f]">→ {step.hint}</p>
        )}
        <div className="mt-3 flex items-center gap-2">
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
            {tour.index + 1}/{tour.total}
          </span>
          <button
            type="button"
            onClick={tour.finish}
            className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Skip tutorial
          </button>
          <div className="ml-auto flex gap-1.5">
            {tour.index > 0 && (
              <button
                type="button"
                onClick={tour.back}
                className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Back
              </button>
            )}
            {step.kind === "info" || !rect ? (
              <button
                type="button"
                onClick={tour.next}
                className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
              >
                {isLast ? "Done" : tour.index === 0 ? "Let's go" : "Next"}
              </button>
            ) : (
              // Interactive step: the user has to act on the highlighted element itself.
              <button
                type="button"
                disabled
                title={step.hint}
                className="cursor-not-allowed rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground opacity-40"
              >
                {step.kind === "scroll" ? "Scroll" : "Click"}
              </button>
            )}
          </div>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          {mode === "voice" ? "Hold Rico to read instead" : "Hold Rico to hear him instead"}
        </p>
      </div>
    </>
  );
}
