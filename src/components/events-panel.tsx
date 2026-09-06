"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Database, ChevronRight, Loader2 } from "lucide-react";
import { useSites } from "@/components/site-context";
import { useT } from "@/components/locale-context";
import { relativeTime } from "@/lib/relative-time";
import {
  FilterBar,
  SegmentedFilter,
  SearchableSelect,
  usePeriodOptions,
} from "@/components/filters";

/**
 * The event stream, which had no screen at all until now.
 *
 * Everything below is already in the database — the tracker sends
 * custom events, /api/track stores their name and properties — so this
 * is not a new capability, it is the missing window onto one. That
 * shapes the empty state: someone arriving here with only pageviews
 * has not hit a limit, they have simply never been told the function
 * exists, so the screen tells them.
 */

interface EventRow {
  id: string;
  type: string;
  event_name: string | null;
  event_props: Record<string, unknown> | null;
  path: string | null;
  title: string | null;
  visitor_id: string | null;
  session_id: string | null;
  device: string | null;
  browser: string | null;
  country: string | null;
  source: string | null;
  duration: number | null;
  created_at: string;
}

export function EventsPanel() {
  const { siteId, site } = useSites();
  const { t } = useT();

  if (!siteId) {
    return (
      <div className="app-card flex flex-col items-center justify-center py-16 text-center">
        <Database className="h-7 w-7 text-muted-light" />
        <h2 className="mt-3 text-[15px] font-semibold">{t.screens.common.noSiteTitle}</h2>
        <p className="mt-1 max-w-sm text-[13px] text-muted">{t.screens.events.noSiteBody}</p>
        <Link href="/dashboard/sites/new" className="btn btn-brand mt-4">
          {t.screens.common.addSite}
        </Link>
      </div>
    );
  }

  // Remount on site change rather than resetting five pieces of state
  // in an effect — the same approach the other screens take.
  return <SiteEvents key={siteId} siteId={siteId} domain={site?.domain ?? ""} />;
}

function SiteEvents({ siteId, domain }: { siteId: string; domain: string }) {
  const { t, intl } = useT();
  const periodOptions = usePeriodOptions();

  const [period, setPeriod] = useState("30d");
  const [kind, setKind] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [path, setPath] = useState("");

  const [rows, setRows] = useState<EventRow[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const query = useCallback(
    (before?: string) => {
      const p = new URLSearchParams({ site_id: siteId, period });
      if (kind) p.set("kind", kind);
      if (name) p.set("name", name);
      if (path.trim()) p.set("path", path.trim());
      if (before) p.set("before", before);
      return p;
    },
    [siteId, period, kind, name, path]
  );

  useEffect(() => {
    let cancelled = false;
    // The path box filters as you type; without this every keystroke
    // would be its own request.
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/events/list?${query()}`);
        const data = await res.json();
        if (cancelled) return;
        setRows(data.events ?? []);
        setNames(data.names ?? []);
        setNextBefore(data.next_before ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, path ? 300 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, path]);

  async function loadMore() {
    if (!nextBefore || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/events/list?${query(nextBefore)}`);
      const data = await res.json();
      setRows((r) => [...r, ...(data.events ?? [])]);
      setNextBefore(data.next_before ?? null);
    } finally {
      setLoadingMore(false);
    }
  }

  const filtering = kind !== null || name !== null || path.trim() !== "";

  const kindOptions = [
    { value: null, label: t.screens.events.kindAll },
    { value: "custom", label: t.screens.events.kindCustom },
    { value: "pageview", label: t.screens.events.kindPageview },
  ];

  /** A row's headline: the custom name, or what the built-in type is. */
  function labelOf(e: EventRow): string {
    if (e.event_name) return e.event_name;
    if (e.type === "pageview") return t.screens.events.pageview;
    if (e.type === "leave") return t.screens.events.leave;
    if (e.type === "identify") return t.screens.events.identify;
    return e.type;
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
        <SegmentedFilter value={kind} options={kindOptions} onChange={setKind} />
        <SearchableSelect
          value={name}
          options={names.map((n) => ({ value: n, label: n }))}
          onChange={(v) => setName(v || null)}
          placeholder={t.screens.events.allNames}
          minWidth={190}
        />
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder={t.screens.events.searchPath}
          className="w-44 rounded-sm border border-border bg-surface px-2 py-1 text-[12px] outline-none transition-colors focus:border-primary"
        />
      </FilterBar>

      <div className="app-card overflow-hidden p-0">
        {loading ? (
          <div className="flex justify-center py-14">
            <Loader2 className="h-5 w-5 animate-spin text-muted-light" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <Database className="mx-auto h-6 w-6 text-muted-light" />
            <p className="mt-3 text-[13px] font-medium">
              {filtering
                ? t.screens.events.emptyFilteredTitle
                : t.screens.events.emptyTitle}
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-[12px] text-muted">
              {filtering
                ? t.screens.events.emptyFilteredBody
                : t.screens.events.emptyBody}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-light">
                    <th className="px-3 py-2 font-medium">{t.screens.events.colTime}</th>
                    <th className="px-3 py-2 font-medium">{t.screens.events.colEvent}</th>
                    <th className="px-3 py-2 font-medium">{t.screens.events.colPage}</th>
                    <th className="px-3 py-2 font-medium">{t.screens.events.colVisitor}</th>
                    <th className="px-3 py-2 font-medium">{t.screens.events.colContext}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => {
                    const props = e.event_props ?? null;
                    const hasProps = props && Object.keys(props).length > 0;
                    const open = expanded === e.id;
                    return (
                      <tr
                        key={e.id}
                        onClick={() => setExpanded(open ? null : e.id)}
                        className="cursor-pointer border-b border-border/60 align-top last:border-0 hover:bg-surface-hover"
                      >
                        <td className="whitespace-nowrap px-3 py-2 text-muted-light">
                          {relativeTime(e.created_at, intl)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            {hasProps && (
                              <ChevronRight
                                className={`h-3 w-3 shrink-0 text-muted-light transition-transform ${
                                  open ? "rotate-90" : ""
                                }`}
                              />
                            )}
                            <span
                              className={
                                e.event_name ? "font-medium text-foreground" : "text-muted"
                              }
                            >
                              {labelOf(e)}
                            </span>
                          </div>
                          {open && (
                            <div className="mt-1.5 rounded-sm bg-surface-sunken p-2 font-mono text-[11px] leading-relaxed">
                              {hasProps ? (
                                Object.entries(props!).map(([k, v]) => (
                                  <div key={k}>
                                    <span className="text-muted-light">{k}</span>{" "}
                                    <span className="text-foreground">
                                      {typeof v === "object" ? JSON.stringify(v) : String(v)}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-muted-light">
                                  {t.screens.events.noProperties}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="max-w-[220px] truncate px-3 py-2 text-muted">
                          {e.path ?? "—"}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-muted-light">
                          {e.visitor_id ? e.visitor_id.slice(0, 8) : "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-muted-light">
                          {[e.device, e.browser, e.country !== "Unknown" ? e.country : null]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {nextBefore && (
              <div className="border-t border-border p-2 text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-sm px-3 py-1.5 text-[12px] font-medium text-primary transition-colors hover:bg-surface-hover disabled:opacity-50"
                >
                  {loadingMore ? t.screens.events.loading : t.screens.events.loadMore}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* How to send one. Shown always, not only when empty: the person
          who needs it most already has pageviews arriving and no idea
          the rest is possible. */}
      <div className="app-card">
        <p className="text-[13px] font-semibold">{t.screens.events.howtoTitle}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          {t.screens.events.howtoBody}
        </p>
        <pre className="mt-2.5 overflow-x-auto rounded-sm bg-surface-sunken p-3 font-mono text-[11.5px] leading-relaxed">
{`pulsetrack("Inscription", { plan: "growth" });
pulsetrack.identify("client@${domain || "exemple.com"}");`}
        </pre>
        <p className="mt-2 text-[11.5px] text-muted-light">
          {t.screens.events.howtoNote}
        </p>
      </div>
    </div>
  );
}
