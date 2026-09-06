"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Sparkles,
  History,
  X,
  ArrowUp,
  MessageSquare,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import { useSites } from "@/components/site-context";
import { useT } from "@/components/locale-context";

/**
 * The dashboard assistant, in the right-hand rail.
 *
 * There used to be two assistants on the same screen: this panel,
 * answering from a fixed bank of product FAQs, and the Session Replay
 * copilot squeezed into a column, which was the only one that could
 * actually see the customer's data. The FAQ one belongs on the
 * marketing site, where the visitor has no account yet; in here it was
 * a large panel that could not answer the questions someone with a
 * dashboard in front of them actually has.
 *
 * So this is the copilot now, in the big panel, able to read the
 * account through /api/assistant. Same monthly quota per plan as
 * before — the panel shows what's left of it, because an assistant you
 * can ask at any moment has to be honest about the meter.
 */

const STORAGE_KEY = "pulsetrack:assistant-chats";
const MAX_CHATS = 20;

interface Message {
  role: "user" | "assistant";
  text: string;
  /** Set on an assistant turn that opened a filtered Session Replay. */
  replayHref?: string;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

interface SessionFilter {
  type: "session_filter";
  behavior: string | null;
  scroll_max: number | null;
  funnel_id: string | null;
  step: number;
  device: string | null;
  rage_only: boolean;
}

/* localStorage as an external store, so the stored conversations arrive
   through the hydration-safe path rather than a setState in an effect.
   The snapshot is the raw string — a primitive, so the identity check
   is stable; parsing happens in render. */
function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

const noStoredValue = () => null;

function parseChats(raw: string | null): Chat[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Chat[]) : [];
  } catch {
    return [];
  }
}

function saveChats(chats: Chat[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats.slice(0, MAX_CHATS)));
  } catch {
    // Private mode — the conversation still works, it just isn't kept.
  }
}

function titleFrom(question: string): string {
  const clean = question.trim().replace(/\s+/g, " ");
  return clean.length > 42 ? `${clean.slice(0, 42)}…` : clean;
}

/* Module scope so the clock stays out of render: React's purity rule
   forbids Date.now() there, and the compiler cannot tell that `ask`
   only ever runs from a click. */
function startChat(question: string): Chat {
  const now = Date.now();
  return {
    id: String(now),
    title: titleFrom(question),
    messages: [{ role: "user", text: question }],
    updatedAt: now,
  };
}

/** Appends turns to a chat and stamps it. */
function appendTo(chat: Chat, ...messages: Message[]): Chat {
  return {
    ...chat,
    messages: [...chat.messages, ...messages],
    updatedAt: Date.now(),
  };
}

/** The assistant's Session Replay action, as a link the panel can offer. */
function replayHrefFrom(action: SessionFilter, siteId: string): string {
  const params = new URLSearchParams({ site: siteId });
  if (action.behavior) params.set("behavior", action.behavior);
  if (action.scroll_max != null) params.set("scroll_max", String(action.scroll_max));
  if (action.funnel_id) {
    params.set("funnel_id", action.funnel_id);
    params.set("step", String(action.step));
  }
  if (action.device) params.set("device", action.device);
  if (action.rage_only) params.set("rage", "1");
  return `/dashboard/replays?${params}`;
}

export function AssistantPanel({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { siteId, site } = useSites();
  const { t, locale } = useT();

  const storedRaw = useSyncExternalStore(
    subscribeToStorage,
    readRaw,
    noStoredValue
  );
  const [edited, setEdited] = useState<Chat[] | null>(null);
  const chats = useMemo(
    () => edited ?? parseChats(storedRaw),
    [edited, storedRaw]
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const active = chats.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [active?.messages.length, busy]);

  const suggestions =
    t.assistant.suggestions_by_screen[pathname] ?? t.assistant.suggestions_default;

  function persist(next: Chat[]) {
    saveChats(next);
    setEdited(next);
  }

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy || !siteId) return;
    setInput("");
    setError(null);

    const existing = chats.find((c) => c.id === activeId);
    const withUser: Chat = existing
      ? appendTo(existing, { role: "user", text: q })
      : startChat(q);

    const afterUser = [withUser, ...chats.filter((c) => c.id !== withUser.id)].slice(
      0,
      MAX_CHATS
    );
    persist(afterUser);
    if (!existing) setActiveId(withUser.id);
    setBusy(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: siteId,
          question: q,
          locale,
          // The turns before this one, so a follow-up like "and on
          // mobile?" still makes sense.
          history: withUser.messages.slice(0, -1).map((m) => ({
            role: m.role,
            text: m.text,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error === "quota_exceeded"
            ? t.assistant.quotaExceeded
            : data.error === "upgrade_required"
              ? t.assistant.upgradeRequired
              : t.assistant.failed
        );
        if (typeof data.limit === "number") {
          setQuota({ used: data.used, limit: data.limit });
        }
        return;
      }

      const reply: Message = { role: "assistant", text: data.answer };
      if (data.action?.type === "session_filter") {
        reply.replayHref = replayHrefFrom(data.action as SessionFilter, siteId);
      }

      const withReply = appendTo(withUser, reply);
      persist(
        [withReply, ...afterUser.filter((c) => c.id !== withReply.id)].slice(0, MAX_CHATS)
      );
      if (typeof data.limit === "number") {
        setQuota({ used: data.used, limit: data.limit });
      }
    } catch {
      setError(t.assistant.failed);
    } finally {
      setBusy(false);
    }
  }

  function newChat() {
    setActiveId(null);
    setHistoryOpen(false);
    setError(null);
  }

  function removeChat(id: string) {
    persist(chats.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  }

  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-l border-border bg-background">
      <header className="relative flex h-12 shrink-0 items-center gap-1 border-b border-border px-3">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
          {active ? active.title : t.assistant.title}
        </span>

        <button
          onClick={newChat}
          title={t.assistant.newChat}
          className="rounded p-1.5 text-muted-light transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setHistoryOpen((v) => !v)}
          title={t.assistant.history}
          className={`rounded p-1.5 transition-colors hover:bg-surface-hover ${
            historyOpen ? "text-primary" : "text-muted-light hover:text-foreground"
          }`}
        >
          <History className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onClose}
          title={t.assistant.close}
          className="rounded p-1.5 text-muted-light transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {historyOpen && (
          <div className="absolute right-2 top-full z-30 mt-1 w-[290px] overflow-hidden rounded-[var(--app-radius)] border border-border bg-surface shadow-lg">
            {chats.length === 0 ? (
              <p className="px-3 py-3 text-[12px] text-muted-light">
                {t.assistant.noChats}
              </p>
            ) : (
              <ul className="max-h-72 overflow-y-auto py-1">
                {chats.map((c) => (
                  <li key={c.id} className="flex items-center gap-1 px-1">
                    <button
                      onClick={() => {
                        setActiveId(c.id);
                        setHistoryOpen(false);
                      }}
                      className={`flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1.5 text-left text-[12.5px] transition-colors hover:bg-surface-hover ${
                        c.id === activeId ? "text-primary" : ""
                      }`}
                    >
                      <MessageSquare className="h-3 w-3 shrink-0 text-muted-light" />
                      <span className="truncate">{c.title}</span>
                    </button>
                    <button
                      onClick={() => removeChat(c.id)}
                      title={t.assistant.delete}
                      className="shrink-0 rounded p-1 text-muted-light transition-colors hover:text-coral"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
        {!active ? (
          <div className="flex h-full flex-col items-center justify-center px-2 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-pale">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-3 text-[13px] font-medium">{t.assistant.emptyTitle}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-light">
              {site ? `${t.assistant.emptyBody} ${site.name}.` : t.assistant.emptyBody}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {active.messages.map((m, i) => (
              <div key={i}>
                <div
                  className={
                    m.role === "user"
                      ? "ml-auto max-w-[88%] rounded-lg rounded-br-sm bg-primary px-3 py-1.5 text-[12.5px] text-white"
                      : "max-w-[95%] whitespace-pre-line rounded-lg rounded-bl-sm bg-surface-sunken px-3 py-2 text-[12.5px] leading-relaxed"
                  }
                >
                  {m.text}
                </div>
                {m.replayHref && (
                  <button
                    onClick={() => router.push(m.replayHref!)}
                    className="mt-1.5 flex items-center gap-1.5 rounded-[var(--app-radius-sm)] border border-border px-2.5 py-1.5 text-[12px] font-medium transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <Video className="h-3.5 w-3.5" />
                    {t.assistant.openReplays}
                  </button>
                )}
              </div>
            ))}

            {busy && (
              <div className="flex items-center gap-2 px-1 text-[12px] text-muted-light">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                {t.assistant.thinking}
              </div>
            )}

            {error && (
              <p className="rounded-[var(--app-radius-sm)] border border-coral/30 bg-coral-pale px-3 py-2 text-[12px] text-coral">
                {error}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border px-3 py-2.5">
        {!active && (
          <div className="mb-2 space-y-1">
            <p className="app-label">{t.assistant.suggestions}</p>
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                disabled={busy || !siteId}
                className="block w-full rounded-[var(--app-radius-sm)] border border-border px-2.5 py-1.5 text-left text-[12px] text-muted transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-1.5 rounded-[var(--app-radius)] border border-border bg-surface px-2.5 py-1.5 focus-within:border-primary">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            rows={1}
            disabled={!siteId}
            placeholder={t.assistant.placeholder}
            className="max-h-24 min-h-[22px] flex-1 resize-none bg-transparent text-[12.5px] outline-none placeholder:text-muted-light"
          />
          <button
            onClick={() => ask(input)}
            disabled={!input.trim() || busy || !siteId}
            title={t.assistant.send}
            className="shrink-0 rounded-md bg-primary p-1 text-white transition-opacity disabled:opacity-30"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* The meter is shown, not hidden: an assistant that is always on
            screen has to be honest about what each question spends. */}
        <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted-light">
          {quota
            ? `${t.assistant.quotaLeft} ${Math.max(0, quota.limit - quota.used)} / ${quota.limit}`
            : t.assistant.disclaimer}
        </p>
      </div>
    </aside>
  );
}
