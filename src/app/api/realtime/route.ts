import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ACTIVE_MINUTES = 5;
const SPARKLINE_MINUTES = 30;

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
      return NextResponse.json({ error: "site_id is required" }, { status: 400 });
    }

    const { data: site } = await supabase
      .from("sites")
      .select("id")
      .eq("id", siteId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const now = new Date();
    const sparkSince = new Date(
      now.getTime() - SPARKLINE_MINUTES * 60 * 1000
    ).toISOString();

    // Counted in Postgres. Reading the window into Node capped the live
    // figure at PostgREST's max-rows for any site busy enough to send
    // more than that within the window.
    const [activeRes, pagesRes, sparkRes, feedRes] = await Promise.all([
      supabase.rpc("realtime_active", {
        p_site: siteId,
        p_minutes: ACTIVE_MINUTES,
      }),
      supabase.rpc("realtime_pages", {
        p_site: siteId,
        p_minutes: ACTIVE_MINUTES,
        p_limit: 10,
      }),
      supabase.rpc("realtime_sparkline", {
        p_site: siteId,
        p_minutes: SPARKLINE_MINUTES,
      }),
      // The feed genuinely wants rows, and already asks for a bounded
      // number of them.
      supabase
        .from("events")
        .select("id, path, title, country, device, browser, created_at")
        .eq("site_id", siteId)
        .eq("type", "pageview")
        .gte("created_at", sparkSince)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const activeVisitors = Number(activeRes.data ?? 0);

    const activePages = (
      (pagesRes.data ?? []) as { path: string; visitors: number }[]
    ).map((r) => ({ path: r.path, visitors: Number(r.visitors) }));

    const liveFeed = (
      (feedRes.data ?? []) as {
        id: string;
        path: string;
        title: string;
        country: string;
        device: string;
        browser: string;
        created_at: string;
      }[]
    ).map((e) => ({
      id: e.id,
      path: e.path,
      title: e.title,
      country: e.country,
      device: e.device,
      browser: e.browser,
      time: e.created_at,
    }));

    // Quiet minutes are absent from the aggregate, so the series is
    // padded to keep the sparkline a fixed width.
    const byMinute = new Map<string, number>();
    ((sparkRes.data ?? []) as { minute: string; visitors: number }[]).forEach(
      (r) =>
        byMinute.set(
          new Date(r.minute).toISOString().slice(0, 16),
          Number(r.visitors)
        )
    );

    const minuteBuckets: number[] = [];
    for (let i = SPARKLINE_MINUTES - 1; i >= 0; i--) {
      const key = new Date(now.getTime() - i * 60 * 1000)
        .toISOString()
        .slice(0, 16);
      minuteBuckets.push(byMinute.get(key) ?? 0);
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
