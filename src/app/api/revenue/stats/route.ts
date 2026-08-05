import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("site_id");
    const period = searchParams.get("period") || "30d";

    if (!siteId) {
      return NextResponse.json(
        { error: "Missing site_id" },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: site } = await supabase
      .from("sites")
      .select("id")
      .eq("id", siteId)
      .single();

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if Stripe is connected
    const { data: connection } = await serviceSupabase
      .from("stripe_connections")
      .select("last_synced_at")
      .eq("site_id", siteId)
      .single();

    if (!connection) {
      return NextResponse.json({ connected: false });
    }

    // Calculate date range
    const now = new Date();
    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Get all revenue events in period
    const { data: events } = await serviceSupabase
      .from("revenue_events")
      .select("*")
      .eq("site_id", siteId)
      .gte("stripe_created_at", since.toISOString())
      .order("stripe_created_at", { ascending: false });

    const revenueEvents = events || [];

    // Calculate totals
    const totalRevenue = revenueEvents.reduce((sum, e) => sum + e.amount, 0);
    const totalTransactions = revenueEvents.length;
    const attributedEvents = revenueEvents.filter((e) => e.source !== "Unattributed");
    const attributionRate =
      totalTransactions > 0
        ? Math.round((attributedEvents.length / totalTransactions) * 100)
        : 0;
    const avgOrderValue =
      totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

    // Previous period for comparison
    const prevSince = new Date(since.getTime() - days * 24 * 60 * 60 * 1000);
    const { data: prevEvents } = await serviceSupabase
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

    // Revenue by source
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

    // Revenue by landing page
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

    // Revenue over time (daily)
    const byDay: Record<string, number> = {};
    for (const e of revenueEvents) {
      const day = new Date(e.stripe_created_at).toISOString().split("T")[0];
      byDay[day] = (byDay[day] || 0) + e.amount;
    }
    // Fill in missing days
    const chart: { date: string; revenue: number }[] = [];
    for (let d = new Date(since); d <= now; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split("T")[0];
      chart.push({ date: key, revenue: byDay[key] || 0 });
    }

    // Recent transactions
    const recentTransactions = revenueEvents.slice(0, 10).map((e) => ({
      amount: e.amount,
      currency: e.currency,
      email: e.customer_email,
      source: e.source,
      landing_page: e.landing_page,
      date: e.stripe_created_at,
    }));

    return NextResponse.json({
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
    });
  } catch (err) {
    console.error("Revenue stats error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
