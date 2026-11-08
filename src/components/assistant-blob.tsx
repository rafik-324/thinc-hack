import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Blobatar } from "@blobatar/react";
import { happy, idle, surprised, thinking } from "blobatar/expression";
import "blobatar/motion.css";
import { Send, X } from "lucide-react";

import { askAssistant, type AssistantTurn } from "@/lib/assistant.functions";

const AVATAR_SEED = "alain00";
// Green of the design deck / "Routine processing" badge: --decision-fast oklch(0.87 0.15 150).
const AVATAR_PALETTE = { head: "#86f09f", eye: "#121212" };
const AVATAR_SIZE = 80;
const LONG_PRESS_MS = 500;
const GREETING =
  "Hi, I'm Rico. Ask me anything about Retakt — pages, buttons, policy rules or how a policy update works.";
const STARTERS = [
  "How do I upload a new policy?",
  "What changes in policy v2?",
  "How do I correct a decision?",
];

type Mode = "dock" | "talk";
type VoiceState = "idle" | "listening" | "thinking" | "speaking";

// Web Speech API (Chrome, Edge, Safari). Not in the TS DOM lib, so typed minimally here.
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult:
    | ((e: {
        results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
      }) => void)
    | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};
function createRecognition(): Recognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, (new () => Recognition) | undefined>;
  const Ctor = w["SpeechRecognition"] ?? w["webkitSpeechRecognition"];
  return Ctor ? new Ctor() : null;
}

/**
 * Floating blob avatar, fixed bottom-right on every page.
 * Short click: Rico moves to the middle of the screen and you talk to him (microphone + spoken answers).
 * Long press: opens the text chat window.
 */
export function AssistantBlob() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("dock");
  const [messages, setMessages] = useState<AssistantTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cheer, setCheer] = useState(false);
  const [voice, setVoice] = useState<VoiceState>("idle");
  const [heard, setHeard] = useState("");
  const [caption, setCaption] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [pressing, setPressing] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const recognition = useRef<Recognition | null>(null);
  const liveRecognitions = useRef(new Set<Recognition>());
  const modeRef = useRef<Mode>("dock");
  const messagesRef = useRef<AssistantTurn[]>([]);
  modeRef.current = mode;
  messagesRef.current = messages;

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, error]);

  const ask = useCallback(
    async (content: string, spoken: boolean) => {
      const next = [...messagesRef.current, { role: "user" as const, content }];
      setMessages(next);
      setError(null);
      setBusy(true);
      try {
        const { answer } = await askAssistant({
          data: { messages: next, page: pathname, voice: spoken },
        });
        setMessages([...next, { role: "assistant", content: answer }]);
        setCheer(true);
        window.setTimeout(() => setCheer(false), 1800);
        return answer;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message.replace(/^(CONFIG|UPSTREAM): /, ""));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [pathname],
  );

  // ---- Voice loop: listen → ask → speak → listen again, while Rico waits in the middle.
  // Ends every recognition this component started, so the microphone is released
  // as soon as Rico shrinks back into the corner (or the page unmounts).
  const stopVoice = useCallback(() => {
    recognition.current = null;
    for (const rec of liveRecognitions.current) {
      rec.onresult = rec.onerror = rec.onend = null;
      try {
        rec.abort();
      } catch {
        // already stopped
      }
    }
    liveRecognitions.current.clear();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setVoice("idle");
  }, []);

  const speak = useCallback((text: string, then: () => void) => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!synth) return then();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = navigator.language || "en-US";
    utterance.onend = then;
    utterance.onerror = then;
    setVoice("speaking");
    synth.cancel();
    synth.speak(utterance);
  }, []);

  const listen = useCallback(() => {
    if (modeRef.current !== "talk") return;
    const rec = createRecognition();
    if (!rec) {
      setVoiceSupported(false);
      setVoice("idle");
      return;
    }
    // Never run two recognitions at once.
    for (const old of liveRecognitions.current) old.abort();
    liveRecognitions.current.clear();
    liveRecognitions.current.add(rec);
    recognition.current = rec;
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const result = e.results[i]!;
        if (result.isFinal) finalText += result[0]!.transcript;
        else interim += result[0]!.transcript;
      }
      setHeard((finalText + interim).trim());
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setVoiceSupported(false);
        setCaption("Microphone access is blocked — type your question below instead.");
      }
    };
    rec.onend = () => {
      liveRecognitions.current.delete(rec);
      if (recognition.current !== rec || modeRef.current !== "talk") return;
      recognition.current = null;
      const text = finalText.trim();
      if (!text) {
        setVoice("idle");
        return;
      }
      setVoice("thinking");
      void ask(text, true).then((answer) => {
        if (modeRef.current !== "talk") return;
        if (!answer) return setVoice("idle");
        setCaption(answer);
        speak(answer, () => {
          setHeard("");
          listen();
        });
      });
    };
    setHeard("");
    setVoice("listening");
    try {
      rec.start();
    } catch {
      setVoice("idle");
    }
  }, [ask, speak]);

  const enterTalk = useCallback(() => {
    setOpen(false);
    setMode("talk");
    modeRef.current = "talk";
    setCaption("");
    setHeard("");
    setError(null);
    listen();
  }, [listen]);

  const leaveTalk = useCallback(() => {
    setMode("dock");
    modeRef.current = "dock";
    stopVoice();
  }, [stopVoice]);

  useEffect(() => {
    if (!open && mode === "dock") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      leaveTalk();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, mode, leaveTalk]);

  useEffect(() => stopVoice, [stopVoice]);

  // ---- Press handling: long press opens the text chat, a short click toggles talk mode.
  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    longPressed.current = false;
    setPressing(true);
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      pressTimer.current = null;
      setPressing(false);
      leaveTalk();
      setOpen(true);
    }, LONG_PRESS_MS);
  }
  function cancelPress() {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
    setPressing(false);
  }
  function onClick() {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    cancelPress();
    if (open) setOpen(false);
    if (mode === "talk") leaveTalk();
    else enterTalk();
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setDraft("");
    const answer = await ask(content, mode === "talk");
    if (answer && mode === "talk") setCaption(answer);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(draft);
  }

  const talking = mode === "talk";
  const expression =
    busy || voice === "thinking"
      ? thinking
      : voice === "listening"
        ? surprised
        : cheer || voice === "speaking"
          ? happy
          : idle;
  // Docked: bottom-right (16px inset). Talk: centre of the viewport, twice the size.
  const half = AVATAR_SIZE / 2 + 16;
  const blobTransform = talking
    ? `translate(calc(${half}px - 50vw), calc(${half}px - 50dvh)) scale(2)`
    : "none";
  const status =
    voice === "listening"
      ? heard || "I'm listening…"
      : voice === "thinking"
        ? heard || "Let me think…"
        : voice === "speaking"
          ? caption
          : caption || (voiceSupported ? "Click me again to stop, or just talk." : "");

  return (
    <>
      {talking && (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={leaveTalk}
          aria-hidden
        />
      )}

      {talking && (
        <div
          className="pointer-events-none fixed left-1/2 top-1/2 z-50 flex w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 translate-y-[9rem] flex-col items-center gap-3 text-center animate-in fade-in duration-500"
          role="status"
          aria-live="polite"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {voice === "listening"
              ? "Listening"
              : voice === "thinking"
                ? "Thinking"
                : voice === "speaking"
                  ? "Rico"
                  : "Rico is waiting"}
          </p>
          {status && <p className="text-base leading-relaxed text-foreground">{status}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="pointer-events-auto flex gap-2">
            {voice === "idle" && voiceSupported && (
              <button
                type="button"
                onClick={listen}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Talk again
              </button>
            )}
          </div>
          {!voiceSupported && (
            <form onSubmit={onSubmit} className="pointer-events-auto flex w-full gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={2000}
                autoFocus
                placeholder="Ask Rico…"
                className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="submit"
                disabled={busy || !draft.trim()}
                className="inline-flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"
                aria-label="Send"
              >
                <Send className="size-4" />
              </button>
            </form>
          )}
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
        {open && (
          <section
            role="dialog"
            aria-label="Retakt assistant"
            className="flex h-[min(32rem,calc(100dvh-8.5rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-2xl"
          >
            <header className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Blobatar
                name={AVATAR_SEED}
                size={28}
                background={false}
                palette={AVATAR_PALETTE}
                animate="always"
                expression={expression}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight">Rico</p>
                <p className="text-xs text-muted-foreground leading-tight">
                  {busy ? "Thinking…" : "Retakt assistant"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Close assistant"
              >
                <X className="size-4" />
              </button>
            </header>

            <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3 text-sm">
              <Bubble role="assistant" content={GREETING} />
              {messages.length === 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {messages.map((m, i) => (
                <Bubble key={i} role={m.role} content={m.content} />
              ))}
              {busy && <p className="text-xs text-muted-foreground">Rico is thinking…</p>}
              {error && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
                  {error}
                </p>
              )}
            </div>

            <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-border p-2">
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(draft);
                  }
                }}
                rows={1}
                maxLength={2000}
                placeholder="Ask about the platform…"
                className="max-h-28 min-h-9 flex-1 resize-none rounded-md border border-input bg-background px-2.5 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="submit"
                disabled={busy || !draft.trim()}
                className="inline-flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"
                aria-label="Send"
              >
                <Send className="size-4" />
              </button>
            </form>
          </section>
        )}

        <button
          type="button"
          onPointerDown={onPointerDown}
          onPointerUp={() => pressTimer.current && cancelPress()}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
          onContextMenu={(e) => e.preventDefault()}
          onClick={onClick}
          onKeyDown={(e) => {
            // Keyboard: Enter/Space = click (talk), Shift+Enter = text chat.
            if (e.key === "Enter" && e.shiftKey) {
              e.preventDefault();
              leaveTalk();
              setOpen((v) => !v);
            }
          }}
          aria-label={talking ? "Stop talking to Rico" : "Talk to Rico (long press for text chat)"}
          aria-expanded={open || talking}
          title="Click to talk · hold to chat"
          style={{
            transform: blobTransform,
            transition: "transform 700ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          className="relative touch-none select-none rounded-full bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            className={
              "block transition-transform duration-500 " +
              (pressing ? "scale-90" : talking ? "" : "hover:scale-105")
            }
          >
            <Blobatar
              name={AVATAR_SEED}
              size={AVATAR_SIZE}
              background={false}
              palette={AVATAR_PALETTE}
              animate="always"
              expression={expression}
            />
          </span>
          {talking && voice === "listening" && (
            <span className="pointer-events-none absolute inset-0 -z-10 animate-ping rounded-full bg-[#86f09f]/25" />
          )}
        </button>
      </div>
    </>
  );
}

function Bubble({ role, content }: AssistantTurn) {
  const mine = role === "user";
  return (
    <div className={mine ? "flex justify-end" : "flex justify-start"}>
      <p
        className={
          "max-w-[85%] whitespace-pre-wrap rounded-lg px-2.5 py-1.5 " +
          (mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")
        }
      >
        {content}
      </p>
    </div>
  );
}
