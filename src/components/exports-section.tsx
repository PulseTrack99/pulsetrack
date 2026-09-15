"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Send,
  Loader2,
  AlertTriangle,
  Plus,
  Trash2,
  Play,
  Eye,
  EyeOff,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { useSites } from "@/components/site-context";
import { useT } from "@/components/locale-context";
import { relativeTime } from "@/lib/relative-time";

/**
 * Les exports planifiés — la seule carte de l'écran Destinations qui se
 * règle ici plutôt que dans les Paramètres, parce qu'elle n'existe
 * nulle part ailleurs.
 */

interface Destination {
  id: string;
  url: string;
  enabled: boolean;
  cursor: string | null;
  last_run_at: string | null;
  last_status: number | null;
  last_error: string | null;
  last_sent: number | null;
  created_at: string;
  secret: string;
}

export function ExportsSection() {
  const { siteId } = useSites();
  if (!siteId) return null;
  return <SiteExports key={siteId} siteId={siteId} />;
}

function SiteExports({ siteId }: { siteId: string }) {
  const { t, intl } = useT();
  const [items, setItems] = useState<Destination[]>([]);
  const [hasApi, setHasApi] = useState(true);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [shown, setShown] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/exports?site_id=${siteId}`);
    const data = await res.json();
    setItems(data.destinations ?? []);
    setHasApi(data.has_api !== false);
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

  const reason = (code: string | null | undefined) =>
    code === "https_only"
      ? t.screens.destinations.expHttpsOnly
      : code === "blocked_host"
        ? t.screens.destinations.expBlockedUrl
        : code === "invalid_url"
          ? t.screens.destinations.expInvalidUrl
          : code === "upgrade_required"
            ? t.screens.destinations.expLocked
            : t.screens.destinations.expFailed;

  async function call(key: string, init: RequestInit, onOk?: (data: Record<string, unknown>) => void) {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/exports" + (init.method === "DELETE" ? `?id=${key}` : ""), {
        headers: { "Content-Type": "application/json" },
        ...init,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(reason(data.error));
        return;
      }
      onOk?.(data);
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (pending) {
    return (
      <div className="app-card">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
          <AlertTriangle className="h-3.5 w-3.5 text-amber" />
          {t.screens.destinations.expTitle}
        </p>
        <p className="mt-1.5 text-[12.5px] text-muted">{t.screens.destinations.expPending}</p>
      </div>
    );
  }

  return (
    <div className="app-card space-y-3">
      <div>
        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
          <Send className="h-3.5 w-3.5 text-primary" />
          {t.screens.destinations.expTitle}
        </p>
        <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-muted">
          {t.screens.destinations.expBody}
        </p>
      </div>

      {!hasApi ? (
        <p className="flex items-center gap-1.5 text-[12.5px] text-muted">
          <Lock className="h-3.5 w-3.5" />
          {t.screens.destinations.expLocked}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://exemple.com/pulsetrack"
            className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 font-mono text-[12.5px] outline-none focus:border-primary"
          />
          <button
            onClick={() =>
              call("new", { method: "POST", body: JSON.stringify({ action: "create", site_id: siteId, url }) }, () =>
                setUrl("")
              )
            }
            disabled={busy === "new" || !url.trim()}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[12.5px] font-semibold text-white transition-opacity disabled:opacity-40"
          >
            {busy === "new" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {t.screens.destinations.expAdd}
          </button>
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-[12.5px] text-coral">
          <AlertTriangle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
      {notice && (
        <p className="flex items-center gap-1.5 text-[12.5px] text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {notice}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-light" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-[12px] text-muted-light">{t.screens.destinations.expNone}</p>
      ) : (
        <div className="space-y-2">
          {items.map((d) => (
            <div key={d.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-mono text-[12.5px]">{d.url}</p>
                  <p className="mt-0.5 text-[11.5px] text-muted-light">
                    {d.last_run_at ? (
                      <>
                        {t.screens.destinations.expLastRun} {relativeTime(d.last_run_at, intl)} ·{" "}
                        {d.last_error ? (
                          <span className="text-coral">{reason(d.last_error)}</span>
                        ) : (
                          <span className="text-emerald-600">
                            {(d.last_sent ?? 0).toLocaleString(intl)} {t.screens.destinations.expSent}
                          </span>
                        )}
                      </>
                    ) : (
                      t.screens.destinations.expNever
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {busy === d.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-light" />}
                  <button
                    onClick={() => call(d.id, { method: "PATCH", body: JSON.stringify({ id: d.id, enabled: !d.enabled }) })}
                    aria-pressed={d.enabled}
                    className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                      d.enabled
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-surface-sunken text-muted"
                    }`}
                  >
                    {d.enabled ? t.screens.destinations.expEnabled : t.screens.destinations.expDisabled}
                  </button>
                  <button
                    onClick={() =>
                      call(d.id, { method: "POST", body: JSON.stringify({ action: "test", id: d.id }) }, (r) =>
                        r.error
                          ? setError(`${t.screens.destinations.expTestFailed} ${reason(String(r.error))}`)
                          : setNotice(`${t.screens.destinations.expTestOk} (HTTP ${r.status})`)
                      )
                    }
                    className="rounded-sm border border-border px-2 py-1 text-[11.5px] text-muted transition-colors hover:text-foreground"
                  >
                    {t.screens.destinations.expTest}
                  </button>
                  <button
                    onClick={() =>
                      call(d.id, { method: "POST", body: JSON.stringify({ action: "run", id: d.id }) }, (r) =>
                        r.error
                          ? setError(reason(String(r.error)))
                          : setNotice(`${Number(r.sent).toLocaleString(intl)} ${t.screens.destinations.expSent}`)
                      )
                    }
                    title={t.screens.destinations.expRunNow}
                    className="rounded-sm border border-border p-1 text-muted transition-colors hover:text-foreground"
                  >
                    <Play className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => call(d.id, { method: "DELETE" })}
                    title={t.screens.destinations.expDelete}
                    className="rounded-sm p-1 text-muted-light transition-colors hover:text-coral"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
                <span>{t.screens.destinations.expSecret}</span>
                <code className="rounded-sm bg-surface-sunken px-1.5 py-0.5 font-mono">
                  {shown === d.id ? d.secret : `${d.secret.slice(0, 6)}••••••••`}
                </code>
                <button
                  onClick={() => setShown(shown === d.id ? null : d.id)}
                  className="text-muted-light transition-colors hover:text-foreground"
                  aria-label={t.screens.destinations.expReveal}
                >
                  {shown === d.id ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11.5px] leading-relaxed text-muted-light">{t.screens.destinations.expDelivery}</p>
    </div>
  );
}
