import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Blobatar } from "@blobatar/react";
import { happy, idle, thinking } from "blobatar/expression";
import "blobatar/motion.css";
import { Send, X } from "lucide-react";

import { askAssistant, type AssistantTurn } from "@/lib/assistant.functions";

const AVATAR_SEED = "retakt-assistant";
const GREETING =
  "Hi, I'm Blobby. Ask me anything about Retakt — pages, buttons, policy rules or how a policy update works.";
const STARTERS = [
  "How do I upload a new policy?",
  "What changes in policy v2?",
  "How do I correct a decision?",
];

/** Floating blob avatar, fixed bottom-right on every page; click to chat about the platform. */
export function AssistantBlob() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cheer, setCheer] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, error]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setDraft("");
    setError(null);
    setBusy(true);
    try {
      const { answer } = await askAssistant({ data: { messages: next, page: pathname } });
      setMessages([...next, { role: "assistant", content: answer }]);
      setCheer(true);
      window.setTimeout(() => setCheer(false), 1800);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message.replace(/^(CONFIG|UPSTREAM): /, ""));
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(draft);
  }

  const expression = busy ? thinking : cheer ? happy : idle;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <section
          role="dialog"
          aria-label="Retakt assistant"
          className="flex h-[min(32rem,calc(100dvh-7rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-2xl"
        >
          <header className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Blobatar name={AVATAR_SEED} size={28} animate="always" expression={expression} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">Blobby</p>
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
            {busy && <p className="text-xs text-muted-foreground">Blobby is thinking…</p>}
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
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close assistant" : "Ask the Retakt assistant"}
        aria-expanded={open}
        className="rounded-full shadow-lg ring-1 ring-border transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Blobatar
          name={AVATAR_SEED}
          size={56}
          background="circle"
          animate="always"
          expression={expression}
        />
      </button>
    </div>
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
