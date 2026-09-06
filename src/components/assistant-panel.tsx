"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  History,
  X,
  ArrowUp,
  MessageSquare,
  Plus,
  Trash2,
} from "lucide-react";
import { getAppHelpFaq } from "@/content/assistant-faq";
import { findAnswer } from "@/lib/assistant-match";

/**
 * The always-there assistant, on the right, the way Mixpanel keeps
 * theirs. Its job is getting someone comfortable with the tool, not
 * analysing their data: the questions it answers are "how do I…" and
 * "what does this screen mean", which are the questions a new account
 * actually has.
 *
 * It answers from the predefined bank in src/content/assistant-faq.ts —
 * no model call, so it is instant and costs nothing however often it is
 * opened. That matters precisely because it is always on screen: a
 * panel you can ask at any moment would otherwise be a bill that grows
 * with curiosity. Data questions still go to the quota'd copilot inside
 * Session Replay, where they belong.
 */

const STORAGE_KEY = "pulsetrack:assistant-chats";
const MAX_CHATS = 20;

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

/* Suggestions follow the screen, so the assistant offers the question
   someone is likely to have where they are standing rather than a fixed
   trio that ignores context. */
const SUGGESTIONS: Record<string, string[]> = {
  "/dashboard": [
    "Comment installer le script de suivi ?",
    "Que compte exactement « visiteurs » ?",
    "Ai-je besoin d'un bandeau cookies ?",
  ],
  "/dashboard/flows": [
    "Comment lire le diagramme des parcours ?",
    "Que veut dire « Sortie du site » ?",
    "Quelle différence avec un funnel ?",
  ],
  "/dashboard/funnels": [
    "Comment créer un funnel ?",
    "Combien de funnels puis-je créer ?",
  ],
  "/dashboard/heatmaps": [
    "Que sont les clics de rage ?",
    "Comment fonctionne la profondeur de scroll ?",
  ],
  "/dashboard/replays": [
    "Comment fonctionne le Session Replay ?",
    "Les données sensibles sont-elles masquées ?",
  ],
  "/dashboard/revenue": [
    "Comment fonctionne l'attribution du revenu ?",
    "Quelle clé Stripe dois-je créer ?",
  ],
  "/dashboard/settings": [
    "Comment inviter un coéquipier ?",
    "Comment brancher Claude sur mes données ?",
  ],
};

const DEFAULT_SUGGESTIONS = [
  "Comment installer le script de suivi ?",
  "Ai-je besoin d'un bandeau cookies ?",
  "Que puis-je faire avec PulseTrack ?",
];

const FALLBACK =
  "Je n'ai pas de réponse toute prête à celle-là. Les réponses de ce panneau sont écrites à l'avance — elles couvrent l'installation, les offres, la confidentialité et chaque fonctionnalité. Reformulez avec d'autres mots, ou passez par le copilote de Session Replay pour une question portant sur vos propres sessions.";

/* localStorage read as an external store, so the stored conversations
   arrive through the hydration-safe path rather than a setState in an
   effect. The snapshot is the raw string — a primitive, so
   useSyncExternalStore's identity check is stable; parsing happens in
   render. Subscribing to `storage` also keeps two open tabs in step. */
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

/** The server has no localStorage, so it reports "nothing stored". */
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

/** First few words of the opening question, as the conversation's name. */
function titleFrom(question: string): string {
  const clean = question.trim().replace(/\s+/g, " ");
  return clean.length > 42 ? `${clean.slice(0, 42)}…` : clean;
}

/* Both helpers live at module scope so the clock stays out of the
   component: React's purity rule forbids Date.now() in render, and the
   compiler cannot tell that `ask` only ever runs from a click. */
function startChat(question: string, answer: string): Chat {
  const now = Date.now();
  return {
    id: String(now),
    title: titleFrom(question),
    messages: [
      { role: "user", text: question },
      { role: "assistant", text: answer },
    ],
    updatedAt: now,
  };
}

function continueChat(chat: Chat, question: string, answer: string): Chat {
  return {
    ...chat,
    messages: [
      ...chat.messages,
      { role: "user", text: question },
      { role: "assistant", text: answer },
    ],
    updatedAt: Date.now(),
  };
}

export function AssistantPanel({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();

  const storedRaw = useSyncExternalStore(
    subscribeToStorage,
    readRaw,
    noStoredValue
  );
  // Local edits win over the stored snapshot, which doesn't re-read on a
  // same-tab write.
  const [edited, setEdited] = useState<Chat[] | null>(null);
  const chats = useMemo(
    () => edited ?? parseChats(storedRaw),
    [edited, storedRaw]
  );

  // No conversation is reopened on mount: landing in the middle of an
  // old thread is more confusing than starting clean, and the history
  // button is right there.
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const active = chats.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [active?.messages.length]);

  const suggestions = SUGGESTIONS[pathname] ?? DEFAULT_SUGGESTIONS;

  function ask(question: string) {
    const q = question.trim();
    if (!q) return;
    setInput("");

    const answer = findAnswer(q, getAppHelpFaq("fr")) ?? FALLBACK;

    // Computed outside any state updater: an updater must stay pure —
    // React is free to run it twice — and this has to write to
    // localStorage and open the new conversation.
    const existing = chats.find((c) => c.id === activeId);
    const next = existing
      ? continueChat(existing, q, answer)
      : startChat(q, answer);

    const updated = [next, ...chats.filter((c) => c.id !== next.id)].slice(
      0,
      MAX_CHATS
    );

    saveChats(updated);
    setEdited(updated);
    if (!existing) setActiveId(next.id);
  }

  function newChat() {
    setActiveId(null);
    setHistoryOpen(false);
  }

  function removeChat(id: string) {
    const updated = chats.filter((c) => c.id !== id);
    saveChats(updated);
    setEdited(updated);
    if (activeId === id) setActiveId(null);
  }

  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-l border-border bg-background">
      <header className="relative flex h-12 shrink-0 items-center gap-1 border-b border-border px-3">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
          {active ? active.title : "Assistant"}
        </span>

        <button
          onClick={newChat}
          title="Nouvelle conversation"
          className="rounded p-1.5 text-muted-light transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setHistoryOpen((v) => !v)}
          title="Historique des conversations"
          className={`rounded p-1.5 transition-colors hover:bg-surface-hover ${
            historyOpen ? "text-primary" : "text-muted-light hover:text-foreground"
          }`}
        >
          <History className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onClose}
          title="Fermer l'assistant"
          className="rounded p-1.5 text-muted-light transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Conversation history — one thread per subject, so a question
            about funnels doesn't sit in the middle of one about Stripe. */}
        {historyOpen && (
          <div className="absolute right-2 top-full z-30 mt-1 w-[290px] overflow-hidden rounded-[var(--app-radius)] border border-border bg-surface shadow-lg">
            {chats.length === 0 ? (
              <p className="px-3 py-3 text-[12px] text-muted-light">
                Aucune conversation pour l&apos;instant.
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
                      title="Supprimer"
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
            <p className="mt-3 text-[13px] font-medium">
              Une question sur PulseTrack ?
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-light">
              Installation, offres, confidentialité, ou ce que fait l&apos;écran
              devant vous.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {active.messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[88%] rounded-lg rounded-br-sm bg-primary px-3 py-1.5 text-[12.5px] text-white"
                    : "max-w-[95%] rounded-lg rounded-bl-sm bg-surface-sunken px-3 py-2 text-[12.5px] leading-relaxed"
                }
              >
                {m.text}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border px-3 py-2.5">
        {!active && (
          <div className="mb-2 space-y-1">
            <p className="app-label">Suggestions</p>
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="block w-full rounded-[var(--app-radius-sm)] border border-border px-2.5 py-1.5 text-left text-[12px] text-muted transition-colors hover:border-primary/40 hover:text-foreground"
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
            placeholder="Posez votre question…"
            className="max-h-24 min-h-[22px] flex-1 resize-none bg-transparent text-[12.5px] outline-none placeholder:text-muted-light"
          />
          <button
            onClick={() => ask(input)}
            disabled={!input.trim()}
            title="Envoyer"
            className="shrink-0 rounded-md bg-primary p-1 text-white transition-opacity disabled:opacity-30"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>

        <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted-light">
          Réponses préécrites, sans appel à un modèle — instantanées et
          gratuites. Pour une question sur vos propres sessions, utilisez le
          copilote de Session Replay.
        </p>
      </div>
    </aside>
  );
}
