import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
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
        { error: "site_id is required" },
        { status: 400 }
      );
    }

    // Verify user owns this site
    const { data: site } = await supabase
      .from("sites")
      .select("id")
      .eq("id", siteId)
      .eq("user_id", user.id)
      .single();

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const periodStart = getPeriodStart(period);

    // Fetch all pageview events for the period
    const { data: events, error } = await supabase
      .from("events")
      .select("*")
      .eq("site_id", siteId)
      .eq("type", "pageview")
      .gte("created_at", periodStart)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Stats query error:", error);
      return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    const allEvents = events || [];

    // Fetch leave events for duration calculation
    const { data: leaveEvents } = await supabase
      .from("events")
      .select("session_id, duration")
      .eq("site_id", siteId)
      .eq("type", "leave")
      .gte("created_at", periodStart);

    // Calculate stats
    const uniqueSessionIds = new Set(allEvents.map((e) => e.session_id));
    const visitors = uniqueSessionIds.size;
    const pageviews = allEvents.length;

    // Bounce rate: sessions with only 1 pageview
    const sessionPageCounts = new Map<string, number>();
    allEvents.forEach((e) => {
      sessionPageCounts.set(
        e.session_id,
        (sessionPageCounts.get(e.session_id) || 0) + 1
      );
    });
    const bouncedSessions = Array.from(sessionPageCounts.values()).filter(
      (c) => c === 1
    ).length;
    const bounceRate =
      visitors > 0 ? Math.round((bouncedSessions / visitors) * 100) : 0;

    // Average duration
    const durations = (leaveEvents || [])
      .filter((e) => e.duration && e.duration > 0)
      .map((e) => e.duration as number);
    const avgDuration =
      durations.length > 0
        ? Math.round(
            durations.reduce((a, b) => a + b, 0) / durations.length
          )
        : 0;

    // Top pages
    const pageCounts = new Map<string, number>();
    allEvents.forEach((e) => {
      pageCounts.set(e.path, (pageCounts.get(e.path) || 0) + 1);
    });
    const topPages = Array.from(pageCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, views]) => ({ path, views }));

    // Top sources
    const sourceCounts = new Map<string, number>();
    allEvents.forEach((e) => {
      const source = e.source || "Direct";
      // Count unique sessions per source
      sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
    });
    const topSources = Array.from(sourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([source, visitors]) => ({ source, visitors }));

    // Top countries
    const countryCounts = new Map<string, number>();
    allEvents.forEach((e) => {
      const country = e.country || "Unknown";
      countryCounts.set(country, (countryCounts.get(country) || 0) + 1);
    });
    const topCountries = Array.from(countryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, visitors]) => ({ country, visitors }));

    // Devices
    const deviceCounts = new Map<string, number>();
    allEvents.forEach((e) => {
      const device = e.device || "Unknown";
      deviceCounts.set(device, (deviceCounts.get(device) || 0) + 1);
    });
    const devices = Array.from(deviceCounts.entries())
      .map(([device, count]) => ({ device, count }));

    // Visitors chart (daily)
    const days = period === "24h" ? 24 : period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const visitorsChart = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().slice(0, 10);
      const dayEvents = allEvents.filter(
        (e) => e.created_at && e.created_at.startsWith(dateStr)
      );
      const uniqueSessions = new Set(dayEvents.map((e) => e.session_id));
      visitorsChart.push({ date: dateStr, count: uniqueSessions.size });
    }

    return NextResponse.json({
      visitors,
      pageviews,
      bounce_rate: bounceRate,
      avg_duration: avgDuration,
      top_pages: topPages,
      top_sources: topSources,
      top_countries: topCountries,
      devices,
      visitors_chart: visitorsChart,
    });
  } catch (err) {
    console.error("Stats error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
