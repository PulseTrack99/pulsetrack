"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X, ArrowUp } from "lucide-react";

export interface AssistantLabels {
  pill: string;
  title: string;
  subtitle: string;
  placeholder: string;
  suggestions: string[];
  answer: string;
  disclaimer: string;
}

/**
 * Floating assistant. Answers come from a scripted intro today — the panel is
 * wired so a real endpoint can replace `reply()` without touching the shell.
 */
export function Assistant({ t }: { t: AssistantLabels }) {
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState<{ role: "user" | "bot"; text: string }[]>(
    []
  );
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread, typing]);

  function send(text: string) {
    const q = text.trim();
    if (!q) return;
    setThread((p) => [...p, { role: "user", text: q }]);
    setDraft("");
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      setThread((p) => [...p, { role: "bot", text: t.answer }]);
    }, 700);
  }

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-[14px] font-medium text-white transition-all hover:bg-primary-hover"
        style={{ boxShadow: "0 8px 28px rgba(91,61,245,0.32)" }}
        aria-expanded={open}
      >
        {open ? (
          <X className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">{t.pill}</span>
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-20 right-5 z-40 flex h-[460px] w-[calc(100vw-2.5rem)] max-w-[368px] flex-col overflow-hidden rounded-xl border border-border bg-surface"
          style={{ boxShadow: "var(--shadow-xl)" }}
          role="dialog"
          aria-label={t.title}
        >
          <div className="border-b border-border px-4 py-3">
            <p className="flex items-center gap-1.5 text-[14px] font-medium">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t.title}
            </p>
            <p className="mt-0.5 text-[12px] text-muted-light">{t.subtitle}</p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {thread.length === 0 && (
              <div className="space-y-2">
                {t.suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full rounded-sm border border-border px-3 py-2.5 text-left text-[12.5px] text-muted transition-colors hover:border-primary-light hover:bg-primary-pale/40 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {thread.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-[12.5px] leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto rounded-tr-sm bg-primary text-white"
                    : "rounded-tl-sm border border-border bg-surface-sunken text-foreground"
                }`}
              >
                {m.text}
              </div>
            ))}

            {typing && (
              <div className="flex w-14 gap-1 rounded-lg rounded-tl-sm border border-border bg-surface-sunken px-3 py-3">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-muted-light"
                    style={{
                      animation: `pulse-dot 1.1s ease-in-out ${i * 160}ms infinite`,
                    }}
                  />
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
            className="border-t border-border p-2.5"
          >
            <div className="flex items-center gap-2 rounded-sm border border-border px-3 py-2 focus-within:border-primary-light">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t.placeholder}
                className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-light"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-opacity disabled:opacity-30"
                aria-label="Send"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1.5 px-1 text-[10px] text-muted-light">
              {t.disclaimer}
            </p>
          </form>
        </div>
      )}
    </>
  );
}
