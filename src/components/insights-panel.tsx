"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LineChart, Loader2, Plus, X, AlertTriangle, Pin, Check } from "lucide-react";
import { useSites } from "@/components/site-context";
import { useT } from "@/components/locale-context";
import { SERIES, Lines, Ranking } from "@/components/insight-chart";
import { useEventAliases } from "@/components/use-event-aliases";
import {
  FilterBar,
  SegmentedFilter,
  SearchableSelect,
  usePeriodOptions,
} from "@/components/filters";

/**
 * The question nobody wrote in advance.
 *
 * Every other screen answers something fixed: the home shows traffic,
 * funnels show a path someone configured, heatmaps show one page. None
 * of them can answer "visitors from LinkedIn who fired
 * checkout_completed, by week, split by plan" — and that shape of
 * question is most of what people actually want once they have data.
 *
 * So the controls here are the query, not a set of presets: a measure,
 * an optional split, any number of filters, and a grain. Drop the grain
 * and the same query becomes a ranking rather than a line, which is the
 * other half of what people ask for.
 */

interface Row {
  bucket: string;
  group_key: string;
  value: number;
}

export function InsightsPanel() {
  const { siteId } = useSites();
  const { t } = useT();

  if (!siteId) {
    return (
      <div className="app-card flex flex-col items-center justify-center py-16 text-center">
        <LineChart className="h-7 w-7 text-muted-light" />
        <h2 className="mt-3 text-[15px] font-semibold">{t.screens.common.noSiteTitle}</h2>
        <p className="mt-1 max-w-sm text-[13px] text-muted">{t.screens.insights.noSiteBody}</p>
        <Link href="/dashboard/sites/new" className="btn btn-brand mt-4">
          {t.screens.common.addSite}
        </Link>
      </div>
    );
  }

  return <SiteInsights key={siteId} siteId={siteId} />;
}

function SiteInsights({ siteId }: { siteId: string }) {
  const { t, intl } = useT();
  const periodOptions = usePeriodOptions();
  const eventLabel = useEventAliases(siteId);

  const [period, setPeriod] = useState("30d");
  const [measure, setMeasure] = useState("pageviews");
  const [eventName, setEventName] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<string | null>(null);
  const [grain, setGrain] = useState<string | null>("day");
  const [filters, setFilters] = useState<{ field: string; value: string }[]>([]);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  const [propKeys, setPropKeys] = useState<string[]>([]);
  const [eventNames, setEventNames] = useState<string[]>([]);

  const onEvents = measure === "events" || measure === "event_visitors";

  /* What the menus can offer. Property keys and event names are
     whatever this site has actually sent, so they cannot be a constant. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [keys, names] = await Promise.all([
        fetch(`/api/insights/values?site_id=${siteId}&period=${period}`).then((r) => r.json()),
        fetch(
          `/api/insights/values?site_id=${siteId}&period=${period}&field=event_name`
        ).then((r) => r.json()),
      ]);
      if (cancelled) return;
      setPropKeys((keys.rows ?? []).map((r: { key: string }) => r.key));
      setEventNames((names.rows ?? []).map((r: { value: string }) => r.value));
    })();
    return () => {
      cancelled = true;
    };
  }, [siteId, period]);

  const query = useCallback(() => {
    const p = new URLSearchParams({ site_id: siteId, period, measure });
    if (onEvents && eventName) p.set("event_name", eventName);
    if (breakdown) p.set("breakdown", breakdown);
    if (grain) p.set("grain", grain);
    if (filters.length) p.set("filters", JSON.stringify(filters));
    return p;
  }, [siteId, period, measure, onEvents, eventName, breakdown, grain, filters]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/insights?${query()}`);
        const data = await res.json();
        if (cancelled) return;
        setRows(data.rows ?? []);
        setPending(Boolean(data.migration_pending));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  /* One series per group, buckets aligned across all of them so a gap
     in one group is a gap on the chart and not a shifted line. */
  const { buckets, series, totals } = useMemo(() => {
    const bucketSet = [...new Set(rows.map((r) => r.bucket))].sort();
    const byGroup = new Map<string, Map<string, number>>();
    for (const r of rows) {
      const m = byGroup.get(r.group_key) ?? new Map();
      m.set(r.bucket, Number(r.value));
      byGroup.set(r.group_key, m);
    }
    const tot = [...byGroup.entries()]
      .map(([key, m]) => ({ key, total: [...m.values()].reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.total - a.total);
    return {
      buckets: bucketSet,
      series: tot.map(({ key }) => ({
        key,
        points: bucketSet.map((b) => byGroup.get(key)?.get(b) ?? 0),
      })),
      totals: tot,
    };
  }, [rows]);

  const measureOptions = [
    { value: "pageviews", label: t.screens.insights.mPageviews },
    { value: "sessions", label: t.screens.insights.mSessions },
    { value: "visitors", label: t.screens.insights.mVisitors },
    { value: "events", label: t.screens.insights.mEvents },
    { value: "event_visitors", label: t.screens.insights.mEventVisitors },
  ];

  /** With no split, SQL files everything under one neutral key — it has
   *  no idea what is being measured. This does. */
  const groupLabel = (key: string) =>
    breakdown
      ? breakdown === "event_name"
        ? eventLabel(key)
        : key
      : measureOptions.find((m) => m.value === measure)?.label ?? key;

  const grainOptions = [
    { value: "day", label: t.screens.insights.gDay },
    { value: "week", label: t.screens.insights.gWeek },
    { value: "month", label: t.screens.insights.gMonth },
    { value: null, label: t.screens.insights.gNone },
  ];

  const fieldOptions = [
    ...(
      ["path", "source", "country", "device", "browser", "language",
        "utm_medium", "utm_campaign", "event_name", "referrer"] as const
    ).map((f) => ({ value: f, label: t.screens.insights.fields[f] })),
    ...propKeys.map((k) => ({ value: `prop:${k}`, label: k, hint: t.screens.insights.property })),
  ];

  /** A field's label, including the `prop:` form the dictionary can't hold. */
  const fieldLabel = (f: string) =>
    f.startsWith("prop:")
      ? f.slice(5)
      : t.screens.insights.fields[f as keyof typeof t.screens.insights.fields] ?? f;

  if (pending) {
    return (
      <div className="app-card">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
          <AlertTriangle className="h-3.5 w-3.5 text-amber" />
          {t.screens.insights.pendingTitle}
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
          {t.screens.insights.pendingBody}
        </p>
        <pre className="mt-2.5 rounded-sm bg-surface-sunken p-3 font-mono text-[12px]">
          supabase/insights.sql
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── The query ── */}
      <div className="app-card space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-light">
            {t.screens.insights.measure}
          </span>
          <SegmentedFilter value={measure} options={measureOptions} onChange={setMeasure} />
          {onEvents && (
            <SearchableSelect
              value={eventName}
              options={eventNames.map((n) => ({ value: n, label: eventLabel(n) }))}
              onChange={(v) => setEventName(v || null)}
              placeholder={t.screens.insights.allEvents}
              minWidth={180}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-light">
            {t.screens.insights.splitBy}
          </span>
          <SearchableSelect
            value={breakdown}
            options={fieldOptions}
            onChange={(v) => setBreakdown(v || null)}
            placeholder={t.screens.insights.noSplit}
            minWidth={190}
          />
          {breakdown && (
            <button
              onClick={() => setBreakdown(null)}
              className="rounded-sm p-1 text-muted-light transition-colors hover:bg-surface-hover hover:text-foreground"
              title={t.screens.insights.clearSplit}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <FilterRow
          siteId={siteId}
          period={period}
          filters={filters}
          onChange={setFilters}
          fieldOptions={fieldOptions}
          fieldLabel={fieldLabel}
        />
      </div>

      <FilterBar>
        <SegmentedFilter
          value={period}
          options={periodOptions}
          onChange={setPeriod}
          ariaLabel={t.filters.period}
        />
        <SegmentedFilter value={grain} options={grainOptions} onChange={setGrain} />
        <div className="flex-1" />
        <PinToBoard
          siteId={siteId}
          config={{
            title: "",
            measure,
            event_name: onEvents ? eventName : null,
            breakdown,
            grain,
            filters,
          }}
        />
      </FilterBar>

      {/* ── The answer ── */}
      <div className="app-card">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-light" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-14 text-center">
            <LineChart className="mx-auto h-6 w-6 text-muted-light" />
            <p className="mt-3 text-[13px] font-medium">{t.screens.insights.emptyTitle}</p>
            <p className="mx-auto mt-1.5 max-w-sm text-[12px] text-muted">
              {t.screens.insights.emptyBody}
            </p>
          </div>
        ) : grain ? (
          <Lines
            buckets={buckets}
            series={series.map((x) => ({ ...x, key: groupLabel(x.key) }))}
            grain={grain}
            intl={intl}
          />
        ) : (
          <Ranking
            totals={totals.map((x) => ({ ...x, key: groupLabel(x.key) }))}
            intl={intl}
          />
        )}
      </div>

      {/* ── Totals, which the chart cannot state precisely ── */}
      {!loading && totals.length > 0 && grain && (
        <div className="app-card overflow-hidden p-0">
          <table className="w-full text-[12.5px]">
            <tbody>
              {totals.map((g, i) => (
                <tr key={g.key} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: SERIES[i % SERIES.length] }}
                      />
                      {groupLabel(g.key)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    {g.total.toLocaleString(intl)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Filters ── */
function FilterRow({
  siteId,
  period,
  filters,
  onChange,
  fieldOptions,
  fieldLabel,
}: {
  siteId: string;
  period: string;
  filters: { field: string; value: string }[];
  onChange: (f: { field: string; value: string }[]) => void;
  fieldOptions: { value: string; label: string; hint?: string }[];
  fieldLabel: (f: string) => string;
}) {
  const { t } = useT();
  const [adding, setAdding] = useState(false);
  const [field, setField] = useState<string | null>(null);
  const [values, setValues] = useState<{ value: string; hits: number }[]>([]);

  useEffect(() => {
    if (!field) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(
        `/api/insights/values?site_id=${siteId}&period=${period}&field=${encodeURIComponent(field)}`
      );
      const data = await res.json();
      if (!cancelled) setValues(data.rows ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [siteId, period, field]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-light">
        {t.screens.insights.filters}
      </span>

      {filters.map((f, i) => (
        <span
          key={`${f.field}-${i}`}
          className="flex items-center gap-1.5 rounded-sm border border-border bg-surface px-2 py-1 text-[12px]"
        >
          <span className="text-muted-light">{fieldLabel(f.field)}</span>
          <span className="font-medium">{f.value}</span>
          <button
            onClick={() => onChange(filters.filter((_, j) => j !== i))}
            className="text-muted-light transition-colors hover:text-coral"
            title={t.screens.insights.removeFilter}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      {adding ? (
        <>
          <SearchableSelect
            value={field}
            options={fieldOptions}
            onChange={(v) => setField(v || null)}
            placeholder={t.screens.insights.chooseField}
            minWidth={170}
          />
          {field && (
            // Values come from the data rather than a text box: asking
            // someone to spell a source exactly as the tracker recorded
            // it is how a builder returns nothing for no visible reason.
            <SearchableSelect
              value={null}
              options={values.map((v) => ({
                value: v.value,
                label: v.value,
                hint: String(v.hits),
              }))}
              onChange={(v) => {
                if (!v) return;
                onChange([...filters, { field, value: v }]);
                setField(null);
                setAdding(false);
              }}
              placeholder={t.screens.insights.chooseValue}
              minWidth={190}
            />
          )}
          <button
            onClick={() => {
              setAdding(false);
              setField(null);
            }}
            className="rounded-sm p-1 text-muted-light transition-colors hover:bg-surface-hover"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 rounded-sm border border-dashed border-border px-2 py-1 text-[12px] text-muted transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          {t.screens.insights.addFilter}
        </button>
      )}
    </div>
  );
}


/* ── Pinning a question onto a board ── */
function PinToBoard({
  siteId,
  config,
}: {
  siteId: string;
  config: Record<string, unknown>;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [boards, setBoards] = useState<{ id: string; name: string }[]>([]);
  const [title, setTitle] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/boards?site_id=${siteId}`);
      const data = await res.json();
      if (!cancelled) setBoards(data.boards ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, siteId]);

  async function pin(boardId: string) {
    await fetch(`/api/boards/${boardId}/blocks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "insight",
        width: config.breakdown ? "full" : "half",
        // The question travels, never its answer: the board recomputes.
        config: { ...config, title: title.trim() || t.screens.boards.newTile },
      }),
    });
    setDone(true);
    setOpen(false);
    setTimeout(() => setDone(false), 2000);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-sm border border-border px-2 py-1 text-[12px] text-muted transition-colors hover:border-primary/40 hover:text-foreground"
      >
        {done ? <Check className="h-3 w-3 text-primary" /> : <Pin className="h-3 w-3" />}
        {done ? t.screens.boards.pinned : t.screens.boards.pinHere}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-64 rounded-md border border-border bg-surface p-2 shadow-lg">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.screens.boards.pinTitle}
            className="mb-1.5 w-full rounded-sm border border-border bg-background px-2 py-1 text-[12px] outline-none focus:border-primary"
          />
          {boards.length === 0 ? (
            <p className="px-1 py-2 text-[12px] text-muted-light">
              {t.screens.boards.listEmptyTitle}
            </p>
          ) : (
            boards.map((b) => (
              <button
                key={b.id}
                onClick={() => pin(b.id)}
                className="block w-full truncate rounded-sm px-2 py-1.5 text-left text-[12.5px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                {b.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
