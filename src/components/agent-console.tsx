"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowUp,
  MessageSquare,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import { useT } from "@/components/locale-context";
import { useAssistantChat } from "@/components/assistant-chat";

/**
 * The assistant at full size, on its own screen.
 *
 * The rail panel is for a question you have while looking at something
 * else; this is for arriving without a question yet — the case where
 * someone opens the product, is not sure what to look at, and wants to
 * be pointed somewhere. So the history is a permanent column rather
 * than a dropdown, and the empty state leads with prompts instead of
 * waiting for you to type.
 *
 * Same assistant underneath: one hook, one quota, one history. The
 * shell hides the rail panel on this route, because two copies of the
 * same conversation on one screen help nobody.
 */
export function AgentConsole() {
  const { t } = useT();
  const router = useRouter();
  const {
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
  } = useAssistantChat();

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [active?.messages.length, busy]);

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* ── History column ── */}
      <aside className="hidden w-56 shrink-0 flex-col md:flex">
        <div className="flex items-center justify-between px-1 pb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-light">
            {t.assistant.page.historyTitle}
          </span>
          <button
            onClick={newChat}
            title={t.assistant.newChat}
            className="rounded p-1 text-muted-light transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {chats.length === 0 ? (
          <p className="px-1 text-[12px] text-muted-light">{t.assistant.noChats}</p>
        ) : (
          <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
            {chats.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12.5px] transition-colors ${
                  c.id === activeId
                    ? "bg-primary-pale text-primary"
                    : "text-muted hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                <button
                  onClick={() => setActiveId(c.id)}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                >
                  <MessageSquare className="h-3 w-3 shrink-0" />
                  <span className="truncate">{c.title}</span>
                </button>
                <button
                  onClick={() => removeChat(c.id)}
                  title={t.assistant.delete}
                  className="shrink-0 rounded p-0.5 text-muted-light opacity-0 transition-opacity hover:text-coral group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* ── Conversation ── */}
      <div className="app-card flex min-w-0 flex-1 flex-col overflow-hidden p-0">
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          {!active ? (
            <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center px-6 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-pale">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h1 className="mt-4 text-[22px] font-semibold">
                {t.assistant.page.welcome}
              </h1>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                {t.assistant.page.subtitle.replace("{site}", site?.name ?? "—")}
              </p>

              <div className="mt-6 w-full space-y-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    disabled={busy || !siteId}
                    className="w-full rounded-[var(--app-radius)] border border-border bg-surface px-3.5 py-2.5 text-left text-[13px] text-muted transition-colors hover:border-primary/40 hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <p className="mt-6 max-w-md text-[12px] leading-relaxed text-muted-light">
                {t.assistant.page.startBody}
              </p>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl space-y-3 px-5 py-5">
              {active.messages.map((m, i) => (
                <div
                  key={i}
                  className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={`max-w-[85%] rounded-[var(--app-radius)] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      m.role === "user"
                        ? "bg-primary text-white"
                        : "border border-border bg-surface text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.text}</p>
                    {m.replayHref && (
                      <button
                        onClick={() => router.push(m.replayHref!)}
                        className="mt-2.5 flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[12px] font-medium transition-colors hover:bg-surface-hover"
                      >
                        <Video className="h-3.5 w-3.5" />
                        {t.assistant.openReplays}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {busy && (
                <p className="text-[12.5px] text-muted-light">{t.assistant.thinking}</p>
              )}
            </div>
          )}
        </div>

        {/* ── Composer ── */}
        <div className="shrink-0 border-t border-border p-3">
          {error && (
            <p className="mb-2 text-center text-[12px] text-coral">{error}</p>
          )}
          <div className="mx-auto flex max-w-2xl items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends; Shift+Enter is a newline. On a full page
                // the box is big enough that people do write two lines.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(input);
                }
              }}
              rows={1}
              placeholder={t.assistant.placeholder}
              disabled={!siteId}
              className="max-h-32 min-h-[38px] flex-1 resize-none rounded-[var(--app-radius)] border border-border bg-surface px-3 py-2 text-[13px] outline-none transition-colors focus:border-primary disabled:opacity-50"
            />
            <button
              onClick={() => ask(input)}
              disabled={busy || !input.trim() || !siteId}
              title={t.assistant.send}
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[var(--app-radius)] bg-primary text-white transition-colors hover:bg-primary-hover disabled:opacity-40"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
          <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] text-muted-light">
            {quota
              ? `${t.assistant.quotaLeft} ${quota.limit - quota.used} / ${quota.limit}`
              : t.assistant.page.hint}
          </p>
        </div>
      </div>
    </div>
  );
}
