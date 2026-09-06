"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useSites } from "@/components/site-context";
import { useT } from "@/components/locale-context";

/**
 * The assistant's conversation state, shared by the two surfaces that
 * show it: the rail panel (assistant-panel) and the full-page console
 * (agent-console).
 *
 * They are the same assistant — same quota, same history, same chats —
 * seen at two sizes, so the state lives here rather than in either of
 * them. Open the page and the rail panel side by side and they stay in
 * step, because both read the same localStorage key through the same
 * subscription.
 */

const STORAGE_KEY = "pulsetrack:assistant-chats";
export const MAX_CHATS = 20;

export interface Message {
  role: "user" | "assistant";
  text: string;
  /** Set on an assistant turn that offered a filtered Session Replay. */
  replayHref?: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

interface SessionFilter {
  type: "session_filter";
  behavior: string | null;
  scroll_max?: number | null;
  funnel_id?: string | null;
  step?: number | null;
  device?: string | null;
  rage_only?: boolean;
}

/* ── Storage ──
   useSyncExternalStore rather than an effect: the server has no
   localStorage, so the server snapshot is null and the client snapshot
   is the raw string. Keeping it a primitive matters — returning a
   parsed array would be a new identity on every render and loop. */

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  } catch {
    /* Private mode, or a full quota. The conversation still works for
       this session; only its history is lost. */
  }
}

function titleFrom(question: string): string {
  const clean = question.trim().replace(/\s+/g, " ");
  return clean.length > 42 ? `${clean.slice(0, 42)}…` : clean;
}

/* Module scope, not closures inside the component: the React compiler
   cannot tell that a Date.now() inside an event-only helper never runs
   during render, and flags it as impure. */

function startChat(question: string): Chat {
  const now = Date.now();
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    title: titleFrom(question),
    messages: [{ role: "user", text: question }],
    updatedAt: now,
  };
}

/** Appends turns to a chat and stamps it. */
function appendTo(chat: Chat, ...messages: Message[]): Chat {
  return { ...chat, messages: [...chat.messages, ...messages], updatedAt: Date.now() };
}

/** The assistant's Session Replay action, as a link a surface can offer. */
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

export function useAssistantChat() {
  const pathname = usePathname();
  const { siteId, site } = useSites();
  const { t, locale } = useT();

  const storedRaw = useSyncExternalStore(subscribeToStorage, readRaw, noStoredValue);
  const [edited, setEdited] = useState<Chat[] | null>(null);
  const chats = useMemo(() => edited ?? parseChats(storedRaw), [edited, storedRaw]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active = chats.find((c) => c.id === activeId) ?? null;

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
    setError(null);
  }

  function removeChat(id: string) {
    persist(chats.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  }

  return {
    site,
    siteId,
    chats,
    active,
    activeId,
    setActiveId,
    input,
    setInput,
    busy,
    quota,
    error,
    suggestions,
    ask,
    newChat,
    removeChat,
  };
}
