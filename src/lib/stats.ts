import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Site statistics, aggregated in Postgres.
 *
 * Every figure here used to be computed by pulling the period's events
 * into Node and counting them. PostgREST caps a response at its max-rows
 * setting and `.limit()` does not raise that ceiling, so any site past a
 * thousand events reported silently undercounted numbers. The counting
 * now happens in the database, which has no such ceiling and does not
 * have to ship the rows across the wire to do it.
 *
 * Shared by the private dashboard and the public share view so the two
 * can never drift apart.
 */

export interface SiteStats {
  visitors: number;
  pageviews: number;
  bounce_rate: number;
  avg_duration: number;
  top_pages: { path: string; views: number }[];
  top_sources: { source: string; visitors: number }[];
  top_countries: { country: string; visitors: number }[];
  devices: { device: string; count: number }[];
  visitors_chart: { date: string; count: number }[];
}

export const PERIOD_DAYS: Record<string, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export function periodStart(period: string): string {
  const days = PERIOD_DAYS[period] ?? 30;
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/** Days the chart should show, so it keeps a fixed width regardless of traffic. */
export function chartDays(period: string): number {
  return PERIOD_DAYS[period] ?? 30;
}

export async function getSiteStats(
  supabase: SupabaseClient,
  siteId: string,
  period: string
): Promise<SiteStats> {
  const since = periodStart(period);
  const args = { p_site: siteId, p_since: since };

  const [overview, pages, sources, countries, devices, daily] = await Promise.all([
    supabase.rpc("stats_overview", args),
    supabase.rpc("stats_top_pages", { ...args, p_limit: 10 }),
    supabase.rpc("stats_top_sources", { ...args, p_limit: 10 }),
    supabase.rpc("stats_top_countries", { ...args, p_limit: 10 }),
    supabase.rpc("stats_devices", args),
    supabase.rpc("stats_daily", args),
  ]);

  // stats_overview returns a single row; an empty result means no traffic.
  const head = (overview.data?.[0] ?? {}) as Partial<{
    visitors: number;
    pageviews: number;
    bounce_rate: number;
    avg_duration: number;
  }>;

  // Days with no traffic are absent from stats_daily, so fill them in.
  const byDay = new Map<string, number>();
  ((daily.data ?? []) as { day: string; visitors: number }[]).forEach((r) =>
    byDay.set(String(r.day).slice(0, 10), Number(r.visitors))
  );

  const days = chartDays(period);
  const visitors_chart = Array.from({ length: days }, (_, i) => {
    const date = new Date(Date.now() - (days - 1 - i) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    return { date, count: byDay.get(date) ?? 0 };
  });

  return {
    visitors: Number(head.visitors ?? 0),
    pageviews: Number(head.pageviews ?? 0),
    bounce_rate: Number(head.bounce_rate ?? 0),
    avg_duration: Number(head.avg_duration ?? 0),
    top_pages: ((pages.data ?? []) as { path: string; views: number }[]).map((r) => ({
      path: r.path,
      views: Number(r.views),
    })),
    top_sources: ((sources.data ?? []) as { source: string; visitors: number }[]).map(
      (r) => ({ source: r.source, visitors: Number(r.visitors) })
    ),
    top_countries: (
      (countries.data ?? []) as { country: string; visitors: number }[]
    ).map((r) => ({ country: r.country, visitors: Number(r.visitors) })),
    devices: ((devices.data ?? []) as { device: string; count: number }[]).map((r) => ({
      device: r.device,
      count: Number(r.count),
    })),
    visitors_chart,
  };
}
