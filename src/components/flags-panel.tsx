"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ToggleLeft,
  Loader2,
  AlertTriangle,
  Plus,
  Archive,
  Undo2,
  ShieldCheck,
  X,
} from "lucide-react";
import { useSites } from "@/components/site-context";
import { useT } from "@/components/locale-context";

/**
 * Les feature flags — le seul écran du produit qui écrit dans l'app du
 * client au lieu de l'observer.
 *
 * D'où deux partis pris visibles. Un flag naît éteint, quel que soit
 * son pourcentage : créer et déployer d'un même geste retirerait la
 * seconde où l'on relit la clé avant d'exposer quiconque. Et
 * l'interrupteur principal est séparé du pourcentage, parce qu'éteindre
 * en urgence ne doit dépendre d'aucun calcul.
 */

interface Flag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rollout: number;
  archived_at: string | null;
  created_at: string;
}

export function FlagsPanel() {
  const { siteId } = useSites();
  const { t } = useT();

  if (!siteId) {
    return (
      <div className="app-card flex flex-col items-center justify-center py-16 text-center">
        <ToggleLeft className="h-7 w-7 text-muted-light" />
        <h2 className="mt-3 text-[15px] font-semibold">{t.screens.common.noSiteTitle}</h2>
        <p className="mt-1 max-w-sm text-[13px] text-muted">{t.screens.flags.noSiteBody}</p>
        <Link href="/dashboard/sites/new" className="btn btn-brand mt-4">
          {t.screens.common.addSite}
        </Link>
      </div>
    );
  }

  return <SiteFlags key={siteId} siteId={siteId} />;
}

function SiteFlags({ siteId }: { siteId: string }) {
  const { t } = useT();

  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/flags?site_id=${siteId}`);
    const data = await res.json();
    setFlags(data.flags ?? []);
    setPending(Boolean(data.migration_pending));
  }, [siteId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await load();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const patch = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      setBusy(id);
      setError(null);
      try {
        const res = await fetch("/api/flags", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...body }),
        });
        if (!res.ok) {
          setError(t.screens.flags.updateFailed);
          return;
        }
        const { flag } = await res.json();
        setFlags((prev) => prev.map((f) => (f.id === id ? flag : f)));
      } finally {
        setBusy(null);
      }
    },
    [t]
  );

  async function create() {
    const key = newKey.trim().toLowerCase();
    const name = newName.trim();
    if (!key || !name) return;
    setBusy("new");
    setError(null);
    try {
      const res = await fetch("/api/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId, key, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "duplicate_key"
            ? t.screens.flags.duplicateKey
            : data.error === "invalid_key"
              ? t.screens.flags.invalidKey
              : t.screens.flags.createFailed
        );
        return;
      }
      setFlags((prev) => [data.flag, ...prev]);
      setNewKey("");
      setNewName("");
      setCreating(false);
    } finally {
      setBusy(null);
    }
  }

  if (pending) {
    return (
      <div className="app-card">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
          <AlertTriangle className="h-3.5 w-3.5 text-amber" />
          {t.screens.flags.pendingTitle}
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
          {t.screens.flags.pendingBody}
        </p>
        <pre className="mt-2.5 rounded-sm bg-surface-sunken p-3 font-mono text-[12px]">
          supabase/feature-flags.sql
        </pre>
      </div>
    );
  }

  const live = flags.filter((f) => !f.archived_at);
  const archived = flags.filter((f) => f.archived_at);

  return (
    <div className="space-y-4">
      <div className="app-toolbar justify-between">
        <p className="text-[13px] text-muted">{t.screens.flags.intro}</p>
        <button
          onClick={() => setCreating((v) => !v)}
          className="flex items-center gap-1.5 rounded-[var(--app-radius-sm)] bg-primary px-2.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-3.5 w-3.5" />
          {t.screens.flags.create}
        </button>
      </div>

      {error && (
        <div className="app-card flex items-start gap-2 border-coral/40 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
          <p className="text-[12.5px] leading-relaxed text-coral">{error}</p>
        </div>
      )}

      {creating && (
        <div className="app-card space-y-2.5">
          <div className="flex flex-wrap gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t.screens.flags.namePlaceholder}
              className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
            />
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder={t.screens.flags.keyPlaceholder}
              className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 font-mono text-[13px] outline-none focus:border-primary"
            />
          </div>
          <p className="text-[11.5px] leading-relaxed text-muted-light">
            {t.screens.flags.keyHint}
          </p>
          <div className="flex gap-2">
            <button
              onClick={create}
              disabled={busy === "new" || !newKey.trim() || !newName.trim()}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[12.5px] font-semibold text-white transition-opacity disabled:opacity-40"
            >
              {busy === "new" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t.screens.flags.createCta}
            </button>
            <button
              onClick={() => setCreating(false)}
              className="rounded-md px-3 py-2 text-[12.5px] text-muted transition-colors hover:text-foreground"
            >
              {t.screens.flags.cancel}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="app-card flex justify-center py-14">
          <Loader2 className="h-5 w-5 animate-spin text-muted-light" />
        </div>
      ) : live.length === 0 && !creating ? (
        <div className="app-card p-10 text-center">
          <ToggleLeft className="mx-auto h-6 w-6 text-muted-light" />
          <p className="mt-3 text-[13px] font-medium">{t.screens.flags.emptyTitle}</p>
          <p className="mx-auto mt-1.5 max-w-md text-[12px] leading-relaxed text-muted">
            {t.screens.flags.emptyBody}
          </p>
          <pre className="mx-auto mt-3 w-fit rounded-sm bg-surface-sunken px-3 py-2 text-left font-mono text-[11.5px]">
{`pulsetrack.onFlags(function () {
  if (pulsetrack.enabled("nouveau-panier")) { … }
});`}
          </pre>
        </div>
      ) : (
        <div className="space-y-2.5">
          {live.map((f) => (
            <FlagRow
              key={f.id}
              flag={f}
              busy={busy === f.id}
              onPatch={(b) => patch(f.id, b)}
            />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div className="app-card">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold">
            <Archive className="h-3.5 w-3.5 text-muted" />
            {t.screens.flags.archivedTitle}
            <span className="text-muted">({archived.length})</span>
          </p>
          <div className="mt-3 space-y-1.5">
            {archived.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{f.name}</p>
                  <p className="mt-0.5 font-mono text-[11.5px] text-muted-light">{f.key}</p>
                </div>
                <button
                  onClick={() => patch(f.id, { archived: false })}
                  disabled={busy === f.id}
                  className="flex shrink-0 items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-[12.5px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-40"
                >
                  {busy === f.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Undo2 className="h-3.5 w-3.5" />
                  )}
                  {t.screens.flags.restore}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ce que la répartition sait faire, et ce qu'elle ne sait pas. */}
      <div className="app-card">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          {t.screens.flags.stableTitle}
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
          {t.screens.flags.stableBody}
        </p>
        <pre className="mt-2.5 w-fit rounded-sm bg-surface-sunken px-3 py-2 font-mono text-[11.5px]">
          pulsetrack.setUser(&quot;user-123&quot;)
        </pre>
        <p className="mt-2 text-[11.5px] leading-relaxed text-muted-light">
          {t.screens.flags.stableNote}
        </p>
      </div>
    </div>
  );
}

function FlagRow({
  flag,
  busy,
  onPatch,
}: {
  flag: Flag;
  busy: boolean;
  onPatch: (body: Record<string, unknown>) => void;
}) {
  const { t } = useT();
  // Le curseur bouge sous le doigt ; la base n'apprend le chiffre qu'au
  // relâchement, sinon chaque pixel serait une écriture.
  const [draft, setDraft] = useState(flag.rollout);

  return (
    <div className="app-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold">{flag.name}</p>
          <p className="mt-0.5 font-mono text-[11.5px] text-muted-light">{flag.key}</p>
        </div>

        <div className="flex items-center gap-2">
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-light" />}
          {/* L'interrupteur d'urgence, séparé du pourcentage. */}
          <button
            onClick={() => onPatch({ enabled: !flag.enabled })}
            aria-pressed={flag.enabled}
            className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
              flag.enabled
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-surface-sunken text-muted"
            }`}
          >
            {flag.enabled ? t.screens.flags.on : t.screens.flags.off}
          </button>
          <button
            onClick={() => onPatch({ archived: true })}
            title={t.screens.flags.archive}
            aria-label={`${t.screens.flags.archive} — ${flag.name}`}
            className="rounded-sm p-1 text-muted-light transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={100}
          value={draft}
          disabled={!flag.enabled}
          onChange={(e) => setDraft(Number(e.target.value))}
          onMouseUp={() => draft !== flag.rollout && onPatch({ rollout: draft })}
          onTouchEnd={() => draft !== flag.rollout && onPatch({ rollout: draft })}
          onKeyUp={() => draft !== flag.rollout && onPatch({ rollout: draft })}
          className="h-1 flex-1 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={t.screens.flags.rollout}
        />
        <span
          className={`w-14 shrink-0 text-right text-[13px] font-medium tabular-nums ${
            flag.enabled ? "" : "text-muted-light"
          }`}
        >
          {draft} %
        </span>
      </div>

      <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-light">
        {flag.enabled ? t.screens.flags.liveNote : t.screens.flags.offNote}
      </p>
    </div>
  );
}
