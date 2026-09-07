"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Repeat, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { useSites } from "@/components/site-context";
import { useT } from "@/components/locale-context";
import { FilterBar, SegmentedFilter } from "@/components/filters";

/**
 * Do people come back?
 *
 * The one question in the product that needs following somebody across
 * days — and the one thing the visitor id deliberately refuses to do,
 * since its salt is destroyed nightly. So this covers the people the
 * customer named through pulsetrack.identify(email), and says so
 * plainly on the page: a retention curve that quietly described 4% of
 * an audience would be worse than no curve at all.
 */

interface Row {
  cohort: string;
  period_index: number;
  people: number;
}

/** Warm for a cell people came back to, cool for one they didn't. */
function shade(rate: number): string {
  if (rate <= 0) return "transparent";
  // A single hue, varying only in weight: comparing cells is comparing
  // one thing, and a rainbow would invite reading meaning into colour.
  return `color-mix(in srgb, var(--primary) ${Math.round(12 + rate * 78)}%, transparent)`;
}

export function RetentionPanel() {
  const { siteId } = useSites();
  const { t } = useT();

  if (!siteId) {
    return (
      <div className="app-card flex flex-col items-center justify-center py-16 text-center">
        <Repeat className="h-7 w-7 text-muted-light" />
        <h2 className="mt-3 text-[15px] font-semibold">{t.screens.common.noSiteTitle}</h2>
        <p className="mt-1 max-w-sm text-[13px] text-muted">{t.screens.retention.noSiteBody}</p>
        <Link href="/dashboard/sites/new" className="btn btn-brand mt-4">
          {t.screens.common.addSite}
        </Link>
      </div>
    );
  }

  return <SiteRetention key={siteId} siteId={siteId} />;
}

function SiteRetention({ siteId }: { siteId: string }) {
  const { t, intl } = useT();

  const [grain, setGrain] = useState("week");
  const [period, setPeriod] = useState("180d");
  const [rows, setRows] = useState<Row[]>([]);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/retention?site_id=${siteId}&grain=${grain}&period=${period}`
    );
    const data = await res.json();
    setRows(data.rows ?? []);
    setPending(Boolean(data.migration_pending));
  }, [siteId, grain, period]);

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

  /* The triangle: one row per cohort, one column per period since it
     started. Cohorts that started recently have fewer columns — that is
     the shape of the thing, not missing data, so the cells simply stop
     rather than showing zeros. */
  const { cohorts, maxIndex } = useMemo(() => {
    const byCohort = new Map<string, Map<number, number>>();
    for (const r of rows) {
      const m = byCohort.get(r.cohort) ?? new Map();
      m.set(Number(r.period_index), Number(r.people));
      byCohort.set(r.cohort, m);
    }
    const list = [...byCohort.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([cohort, m]) => ({
        cohort,
        size: m.get(0) ?? 0,
        cells: m,
        span: Math.max(...m.keys()),
      }));
    return { cohorts: list, maxIndex: Math.max(0, ...list.map((c) => c.span)) };
  }, [rows]);

  const grainOptions = [
    { value: "day", label: t.screens.retention.gDay },
    { value: "week", label: t.screens.retention.gWeek },
    { value: "month", label: t.screens.retention.gMonth },
  ];

  const periodOptions = [
    { value: "30d", label: "30j" },
    { value: "90d", label: "90j" },
    { value: "180d", label: "6m" },
    { value: "365d", label: "12m" },
  ];

  const fmtCohort = (iso: string) =>
    new Date(iso).toLocaleDateString(intl, {
      day: grain === "month" ? undefined : "numeric",
      month: "short",
      year: grain === "month" ? "numeric" : undefined,
    });

  if (pending) {
    return (
      <div className="app-card">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
          <AlertTriangle className="h-3.5 w-3.5 text-amber" />
          {t.screens.retention.pendingTitle}
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
          {t.screens.retention.pendingBody}
        </p>
        <pre className="mt-2.5 rounded-sm bg-surface-sunken p-3 font-mono text-[12px]">
          supabase/retention.sql
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FilterBar>
        <SegmentedFilter value={grain} options={grainOptions} onChange={setGrain} />
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
        ) : cohorts.length === 0 ? (
          <div className="p-10 text-center">
            <Repeat className="mx-auto h-6 w-6 text-muted-light" />
            <p className="mt-3 text-[13px] font-medium">{t.screens.retention.emptyTitle}</p>
            <p className="mx-auto mt-1.5 max-w-md text-[12px] leading-relaxed text-muted">
              {t.screens.retention.emptyBody}
            </p>
            <pre className="mx-auto mt-3 w-fit rounded-sm bg-surface-sunken px-3 py-2 font-mono text-[11.5px]">
              pulsetrack.identify(&quot;client@exemple.com&quot;)
            </pre>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-light">
                  <th className="px-3 py-2 text-left font-medium">
                    {t.screens.retention.colCohort}
                  </th>
                  <th className="px-2 py-2 text-right font-medium">
                    {t.screens.retention.colPeople}
                  </th>
                  {Array.from({ length: maxIndex + 1 }, (_, i) => (
                    <th key={i} className="px-2 py-2 text-center font-medium">
                      {i === 0 ? t.screens.retention.start : `+${i}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c) => (
                  <tr key={c.cohort} className="border-b border-border/60 last:border-0">
                    <td className="whitespace-nowrap px-3 py-1.5 text-muted">
                      {fmtCohort(c.cohort)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-medium tabular-nums">
                      {c.size}
                    </td>
                    {Array.from({ length: maxIndex + 1 }, (_, i) => {
                      if (i > c.span) return <td key={i} />;
                      const n = c.cells.get(i) ?? 0;
                      const rate = c.size > 0 ? n / c.size : 0;
                      return (
                        <td key={i} className="px-1 py-1">
                          <div
                            className="rounded-sm px-1.5 py-1 text-center tabular-nums"
                            style={{ backgroundColor: shade(rate) }}
                            title={`${n} / ${c.size}`}
                          >
                            {Math.round(rate * 100)}%
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Who this covers, and who it does not. */}
      <div className="app-card">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          {t.screens.retention.whoTitle}
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
          {t.screens.retention.whoBody}
        </p>
        <p className="mt-2 text-[11.5px] leading-relaxed text-muted-light">
          {t.screens.retention.whoTip}
        </p>
      </div>
    </div>
  );
}
