import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const thirtyMinAgo = new Date(
      now.getTime() - 30 * 60 * 1000
    ).toISOString();

    // Active visitors = unique sessions in last 5 minutes
    const { data: recentEvents } = await supabase
      .from("events")
      .select("session_id, path, title, country, device, browser, created_at")
      .eq("site_id", siteId)
      .gte("created_at", fiveMinAgo)
      .order("created_at", { ascending: false });

    const events = recentEvents || [];

    // Count unique sessions (active visitors)
    const activeSessions = new Set(events.map((e) => e.session_id));
    const activeVisitors = activeSessions.size;

    // Active pages — count unique sessions per page
    const pageSessionMap = new Map<string, Set<string>>();
    events.forEach((e) => {
      const key = e.path || "/";
      if (!pageSessionMap.has(key)) {
        pageSessionMap.set(key, new Set());
      }
      pageSessionMap.get(key)!.add(e.session_id);
    });

    const activePages = Array.from(pageSessionMap.entries())
      .map(([path, sessions]) => ({
        path,
        visitors: sessions.size,
      }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 10);

    // Last 30 min events for the live feed (most recent 20)
    const { data: feedEvents } = await supabase
      .from("events")
      .select(
        "id, path, title, country, device, browser, session_id, created_at"
      )
      .eq("site_id", siteId)
      .eq("type", "pageview")
      .gte("created_at", thirtyMinAgo)
      .order("created_at", { ascending: false })
      .limit(20);

    const liveFeed = (feedEvents || []).map((e) => ({
      id: e.id,
      path: e.path,
      title: e.title,
      country: e.country,
      device: e.device,
      browser: e.browser,
      time: e.created_at,
    }));

    // Active visitors over last 30 min (per-minute buckets for sparkline)
    const { data: sparklineEvents } = await supabase
      .from("events")
      .select("session_id, created_at")
      .eq("site_id", siteId)
      .gte("created_at", thirtyMinAgo);

    const minuteBuckets: number[] = [];
    for (let i = 29; i >= 0; i--) {
      const bucketStart = new Date(now.getTime() - (i + 1) * 60 * 1000);
      const bucketEnd = new Date(now.getTime() - i * 60 * 1000);
      const sessionsInBucket = new Set(
        (sparklineEvents || [])
          .filter((e) => {
            const t = new Date(e.created_at).getTime();
            return t >= bucketStart.getTime() && t < bucketEnd.getTime();
          })
          .map((e) => e.session_id)
      );
      minuteBuckets.push(sessionsInBucket.size);
    }

    return NextResponse.json({
      active_visitors: activeVisitors,
      active_pages: activePages,
      live_feed: liveFeed,
      sparkline: minuteBuckets,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    console.error("Realtime error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
