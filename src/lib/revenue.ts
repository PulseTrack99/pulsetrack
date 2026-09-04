import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Revenue computation, shared between the dashboard route
 * (src/app/api/revenue/stats/route.ts) and the MCP server (src/app/api/
 * mcp/route.ts) — extracted so both read the exact same numbers the
 * account owner already sees on screen, the same way getSiteStats
 * (src/lib/stats.ts) is shared everywhere stats are read.
 *
 * Expects a client that can read revenue_events regardless of caller
 * identity (service role, or a session client once RLS resolves team
 * access) — callers are responsible for their own plan/ownership checks
 * before calling this.
 */

export interface RevenueResult {
  connected: boolean;
  last_synced_at?: string;
  overview?: {
    total_revenue: number;
    total_transactions: number;
    avg_order_value: number;
    attribution_rate: number;
    revenue_growth: number;
    currency: string;
  };
  revenue_by_source?: { source: string; revenue: number; count: number }[];
  revenue_by_page?: { page: string; revenue: number; count: number }[];
  revenue_chart?: { date: string; revenue: number }[];
  recent_transactions?: {
    amount: number;
    currency: string;
    email: string | null;
    source: string | null;
    landing_page: string | null;
    date: string;
  }[];
}

export async function getSiteRevenue(
  supabase: SupabaseClient,
  siteId: string,
  period: "7d" | "30d" | "90d" | string
): Promise<RevenueResult> {
  const { data: connection } = await supabase
    .from("stripe_connections")
    .select("last_synced_at")
    .eq("site_id", siteId)
    .single();

  if (!connection) {
    return { connected: false };
  }

  const now = new Date();
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const { data: events } = await supabase
    .from("revenue_events")
    .select("*")
    .eq("site_id", siteId)
    .gte("stripe_created_at", since.toISOString())
    .order("stripe_created_at", { ascending: false });

  const revenueEvents = events || [];

  const totalRevenue = revenueEvents.reduce((sum, e) => sum + e.amount, 0);
  const totalTransactions = revenueEvents.length;
  const attributedEvents = revenueEvents.filter((e) => e.source !== "Unattributed");
  const attributionRate =
    totalTransactions > 0
      ? Math.round((attributedEvents.length / totalTransactions) * 100)
      : 0;
  const avgOrderValue =
    totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

  const prevSince = new Date(since.getTime() - days * 24 * 60 * 60 * 1000);
  const { data: prevEvents } = await supabase
    .from("revenue_events")
    .select("amount")
    .eq("site_id", siteId)
    .gte("stripe_created_at", prevSince.toISOString())
    .lt("stripe_created_at", since.toISOString());

  const prevRevenue = (prevEvents || []).reduce((sum, e) => sum + e.amount, 0);
  const revenueGrowth =
    prevRevenue > 0
      ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)
      : totalRevenue > 0
      ? 100
      : 0;

  const bySource: Record<string, { revenue: number; count: number }> = {};
  for (const e of revenueEvents) {
    const src = e.source || "Unattributed";
    if (!bySource[src]) bySource[src] = { revenue: 0, count: 0 };
    bySource[src].revenue += e.amount;
    bySource[src].count++;
  }
  const revenueBySource = Object.entries(bySource)
    .map(([source, data]) => ({ source, ...data }))
    .sort((a, b) => b.revenue - a.revenue);

  const byPage: Record<string, { revenue: number; count: number }> = {};
  for (const e of attributedEvents) {
    const page = e.landing_page || "(unknown)";
    if (!byPage[page]) byPage[page] = { revenue: 0, count: 0 };
    byPage[page].revenue += e.amount;
    byPage[page].count++;
  }
  const revenueByPage = Object.entries(byPage)
    .map(([page, data]) => ({ page, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const byDay: Record<string, number> = {};
  for (const e of revenueEvents) {
    const day = new Date(e.stripe_created_at).toISOString().split("T")[0];
    byDay[day] = (byDay[day] || 0) + e.amount;
  }
  const chart: { date: string; revenue: number }[] = [];
  for (let d = new Date(since); d <= now; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split("T")[0];
    chart.push({ date: key, revenue: byDay[key] || 0 });
  }

  const recentTransactions = revenueEvents.slice(0, 10).map((e) => ({
    amount: e.amount,
    currency: e.currency,
    email: e.customer_email,
    source: e.source,
    landing_page: e.landing_page,
    date: e.stripe_created_at,
  }));

  return {
    connected: true,
    last_synced_at: connection.last_synced_at,
    overview: {
      total_revenue: totalRevenue,
      total_transactions: totalTransactions,
      avg_order_value: avgOrderValue,
      attribution_rate: attributionRate,
      revenue_growth: revenueGrowth,
      currency: revenueEvents[0]?.currency || "eur",
    },
    revenue_by_source: revenueBySource,
    revenue_by_page: revenueByPage,
    revenue_chart: chart,
    recent_transactions: recentTransactions,
  };
}
