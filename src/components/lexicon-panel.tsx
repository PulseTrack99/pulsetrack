"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Loader2, Eye, EyeOff, Pencil, AlertTriangle } from "lucide-react";
import { useSites } from "@/components/site-context";
import { useT } from "@/components/locale-context";
import { relativeTime } from "@/lib/relative-time";
import { FilterBar, SegmentedFilter, usePeriodOptionsNoDay } from "@/components/filters";

/**
 * The event dictionary.
 *
 * Half of it is derived and half is written by hand, and the screen
 * shows both in one row: how often a name fires and what properties it
 * carries, next to what somebody decided it means. The properties
 * column is the one that earns its place — two calls sending different
 * keys under the same name is the drift this exists to catch, and it is
 * invisible everywhere else in the product.
 */

interface Entry {
  name: string;
  volume: number;
  visitors: number;
  first_at: string;
  last_at: string;
  properties: string[];
  description: string | null;
  hidden: boolean;
}

export function LexiconPanel() {
  const { siteId } = useSites();
  const { t } = useT();

  if (!siteId) {
    return (
      <div className="app-card flex flex-col items-center justify-center py-16 text-center">
        <BookOpen className="h-7 w-7 text-muted-light" />
        <h2 className="mt-3 text-[15px] font-semibold">{t.screens.common.noSiteTitle}</h2>
        <p className="mt-1 max-w-sm text-[13px] text-muted">{t.screens.lexicon.noSiteBody}</p>
        <Link href="/dashboard/sites/new" className="btn btn-brand mt-4">
          {t.screens.common.addSite}
        </Link>
      </div>
    );
  }

  return <SiteLexicon key={siteId} siteId={siteId} />;
}

function SiteLexicon({ siteId }: { siteId: string }) {
  const { t, intl } = useT();
  const periodOptions = usePeriodOptionsNoDay();

  const [period, setPeriod] = useState("30d");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/lexicon?site_id=${siteId}&period=${period}`);
    const data = await res.json();
    setEntries(data.entries ?? []);
    setPending(Boolean(data.migration_pending));
  }, [siteId, period]);

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

  async function patch(name: string, body: Record<string, unknown>) {
    setSaving(true);
    try {
      await fetch("/api/lexicon", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId, name, ...body }),
      });
      await load();
    } finally {
      setSaving(false);
    }
  }

  function startEdit(e: Entry) {
    setEditing(e.name);
    setDraft(e.description ?? "");
  }

  async function saveEdit(name: string) {
    await patch(name, { description: draft });
    setEditing(null);
  }

  if (pending) {
    return (
      <div className="app-card">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
          <AlertTriangle className="h-3.5 w-3.5 text-amber" />
          {t.screens.lexicon.pendingTitle}
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
          {t.screens.lexicon.pendingBody}
        </p>
        <pre className="mt-2.5 rounded-sm bg-surface-sunken p-3 font-mono text-[12px]">
          {t.screens.lexicon.pendingFile}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FilterBar>
        <SegmentedFilter
          value={period}
          options={periodOptions}
          onChange={setPeriod}
          ariaLabel={t.filters.period}
        />
      </FilterBar>

      <div className="app-card overflow-hidden p-0">
        {loading ? (
          <div className="flex justify-center py-14">
            <Loader2 className="h-5 w-5 animate-spin text-muted-light" />
          </div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center">
            <BookOpen className="mx-auto h-6 w-6 text-muted-light" />
            <p className="mt-3 text-[13px] font-medium">{t.screens.lexicon.emptyTitle}</p>
            <p className="mx-auto mt-1.5 max-w-md text-[12px] text-muted">
              {t.screens.lexicon.emptyBody}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-light">
                  <th className="px-3 py-2 font-medium">{t.screens.lexicon.colName}</th>
                  <th className="px-3 py-2 font-medium">{t.screens.lexicon.colVolume}</th>
                  <th className="px-3 py-2 font-medium">{t.screens.lexicon.colProperties}</th>
                  <th className="px-3 py-2 font-medium">{t.screens.lexicon.colLastSeen}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr
                    key={e.name}
                    className={`border-b border-border/60 align-top last:border-0 ${
                      e.hidden ? "opacity-55" : ""
                    }`}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground">{e.name}</span>
                        {e.hidden && (
                          <span className="rounded-sm bg-surface-sunken px-1.5 py-0.5 text-[10px] text-muted-light">
                            {t.screens.lexicon.hidden}
                          </span>
                        )}
                      </div>

                      {editing === e.name ? (
                        <div className="mt-1.5 flex items-start gap-1.5">
                          <textarea
                            value={draft}
                            onChange={(ev) => setDraft(ev.target.value)}
                            rows={2}
                            maxLength={500}
                            autoFocus
                            placeholder={t.screens.lexicon.describePlaceholder}
                            className="w-72 resize-none rounded-sm border border-border bg-surface px-2 py-1 text-[12px] outline-none focus:border-primary"
                          />
                          <button
                            onClick={() => saveEdit(e.name)}
                            disabled={saving}
                            className="rounded-sm bg-primary px-2 py-1 text-[11.5px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                          >
                            {saving ? t.screens.lexicon.saving : t.screens.lexicon.save}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(e)}
                          className="mt-1 flex items-center gap-1 text-left text-[12px] text-muted transition-colors hover:text-foreground"
                        >
                          <Pencil className="h-3 w-3 shrink-0 text-muted-light" />
                          {e.description || t.screens.lexicon.describe}
                        </button>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2 text-muted">
                      {e.volume === 0 ? (
                        <span className="text-muted-light">{t.screens.lexicon.neverFired}</span>
                      ) : (
                        <>
                          {e.volume.toLocaleString(intl)}
                          <span className="text-muted-light">
                            {" · "}
                            {e.visitors.toLocaleString(intl)}{" "}
                            {t.screens.lexicon.visitorsSuffix}
                          </span>
                        </>
                      )}
                    </td>

                    <td className="px-3 py-2">
                      {e.properties.length === 0 ? (
                        <span className="text-muted-light">
                          {t.screens.lexicon.noProperties}
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {e.properties.map((p) => (
                            <span
                              key={p}
                              className="rounded-sm bg-surface-sunken px-1.5 py-0.5 font-mono text-[10.5px] text-muted"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2 text-muted-light">
                      {e.last_at ? relativeTime(e.last_at, intl) : "—"}
                    </td>

                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => patch(e.name, { hidden: !e.hidden })}
                        disabled={saving}
                        title={e.hidden ? t.screens.lexicon.unhide : t.screens.lexicon.hide}
                        className="rounded p-1 text-muted-light transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
                      >
                        {e.hidden ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="app-card">
        <p className="text-[13px] font-semibold">{t.screens.lexicon.whyTitle}</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
          {t.screens.lexicon.whyBody}
        </p>
      </div>
    </div>
  );
}
