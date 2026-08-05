import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getPeriodStart(period: string): string {
  const now = new Date();
  switch (period) {
    case "24h":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case "90d":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    case "30d":
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;

    // Use service role — this is a public endpoint, no user auth
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find site by share ID
    const { data: site } = await supabase
      .from("sites")
      .select("id, name, domain, public_share_id")
      .eq("public_share_id", shareId)
      .single();

    if (!site) {
      return NextResponse.json(
        { error: "Dashboard not found or not public" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "30d";
    const periodStart = getPeriodStart(period);

    // Get events for the period
    const { data: events } = await supabase
      .from("events")
      .select(
        "id, type, path, source, country, device, browser, session_id, duration, created_at"
      )
      .eq("site_id", site.id)
      .gte("created_at", periodStart)
      .order("created_at", { ascending: true });

    const allEvents = events || [];

    // Unique visitors (by session)
    const sessions = new Set(allEvents.map((e) => e.session_id));
    const visitors = sessions.size;

    // Pageviews
    const pageviews = allEvents.filter((e) => e.type === "pageview").length;

    // Bounce rate
    const sessionPageviews = new Map<string, number>();
    allEvents
      .filter((e) => e.type === "pageview")
      .forEach((e) => {
        sessionPageviews.set(
          e.session_id,
          (sessionPageviews.get(e.session_id) || 0) + 1
        );
      });
    const bouncedSessions = Array.from(sessionPageviews.values()).filter(
      (c) => c === 1
    ).length;
    const totalSessions = sessionPageviews.size;
    const bounce_rate =
      totalSessions > 0 ? Math.round((bouncedSessions / totalSessions) * 100) : 0;

    // Average duration
    const durations = allEvents
      .filter((e) => e.type === "page_leave" && e.duration > 0)
      .map((e) => e.duration);
    const avg_duration =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    // Top pages
    const pageCounts = new Map<string, number>();
    allEvents
      .filter((e) => e.type === "pageview")
      .forEach((e) => {
        pageCounts.set(e.path, (pageCounts.get(e.path) || 0) + 1);
      });
    const top_pages = Array.from(pageCounts.entries())
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Top sources
    const sourceCounts = new Map<string, number>();
    allEvents
      .filter((e) => e.type === "pageview" && e.source)
      .forEach((e) => {
        sourceCounts.set(e.source, (sourceCounts.get(e.source) || 0) + 1);
      });
    const top_sources = Array.from(sourceCounts.entries())
      .map(([source, visitors]) => ({ source, visitors }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 10);

    // Top countries
    const countryCounts = new Map<string, number>();
    allEvents
      .filter((e) => e.type === "pageview" && e.country)
      .forEach((e) => {
        countryCounts.set(e.country, (countryCounts.get(e.country) || 0) + 1);
      });
    const top_countries = Array.from(countryCounts.entries())
      .map(([country, visitors]) => ({ country, visitors }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 10);

    // Daily visitor chart
    const dayMs = 24 * 60 * 60 * 1000;
    const days = period === "24h" ? 1 : period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const visitors_chart = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(Date.now() - (i + 1) * dayMs);
      const dayEnd = new Date(Date.now() - i * dayMs);
      const date = dayEnd.toISOString().slice(0, 10);
      const daySessions = new Set(
        allEvents
          .filter((e) => {
            const t = new Date(e.created_at).getTime();
            return t >= dayStart.getTime() && t < dayEnd.getTime();
          })
          .map((e) => e.session_id)
      );
      visitors_chart.push({ date, count: daySessions.size });
    }

    return NextResponse.json({
      site: { name: site.name, domain: site.domain },
      period,
      visitors,
      pageviews,
      bounce_rate,
      avg_duration,
      top_pages,
      top_sources,
      top_countries,
      visitors_chart,
    });
  } catch (err) {
    console.error("Public stats error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
