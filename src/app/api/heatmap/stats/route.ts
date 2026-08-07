import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, planHas } from "@/lib/plan";

/**
 * Aggregates interactions into everything the heatmap view renders:
 * the page picker, the click cloud, scroll depth and the element table.
 */

const PERIODS: Record<string, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

interface Row {
  type: string;
  x_ratio: number | null;
  y_px: number | null;
  doc_h: number | null;
  viewport_w: number | null;
  selector: string | null;
  elem_text: string | null;
  interactive: boolean | null;
  scroll_pct: number | null;
  session_id: string | null;
}

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
    const path = searchParams.get("path");
    const device = searchParams.get("device") || "all";
    const period = searchParams.get("period") || "30d";

    if (!siteId) {
      return NextResponse.json({ error: "site_id is required" }, { status: 400 });
    }

    const { data: site } = await supabase
      .from("sites")
      .select("id, domain")
      .eq("id", siteId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const plan = await getUserPlan(supabase, user.id);
    if (!planHas(plan, "heatmaps")) {
      return NextResponse.json(
        { error: "upgrade_required", plan, feature: "heatmaps" },
        { status: 402 }
      );
    }

    const days = PERIODS[period] ?? 30;
    const since = new Date(Date.now() - days * 86_400_000).toISOString();

    // ── Pages that have data, for the picker ──
    const { data: pageRows } = await supabase
      .from("interactions")
      .select("path")
      .eq("site_id", siteId)
      .gte("created_at", since)
      .limit(20_000);

    const pageCounts = new Map<string, number>();
    (pageRows ?? []).forEach((r: { path: string }) => {
      pageCounts.set(r.path, (pageCounts.get(r.path) ?? 0) + 1);
    });

    const pages = [...pageCounts.entries()]
      .map(([p, count]) => ({ path: p, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    const targetPath = path || pages[0]?.path || "/";

    // ── Interactions for the selected page ──
    let query = supabase
      .from("interactions")
      .select(
        "type, x_ratio, y_px, doc_h, viewport_w, selector, elem_text, interactive, scroll_pct, session_id"
      )
      .eq("site_id", siteId)
      .eq("path", targetPath)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20_000);

    if (device !== "all") query = query.eq("device", device);

    const { data } = await query;
    const rows = (data ?? []) as Row[];

    const clicks = rows.filter((r) => r.type === "click");
    const rage = rows.filter((r) => r.type === "rage");
    const scrolls = rows.filter((r) => r.type === "scroll");

    // ── Click cloud ──
    // The overlay is drawn in a normalised space: x is already a ratio,
    // y is expressed as a ratio of the document height it was captured
    // on, so pages of differing length still line up.
    const points = clicks
      .filter((r) => r.x_ratio !== null && r.y_px !== null && (r.doc_h ?? 0) > 0)
      .slice(0, 4000)
      .map((r) => ({
        x: Number(r.x_ratio),
        y: Math.min(1, r.y_px! / r.doc_h!),
      }));

    const ragePoints = rage
      .filter((r) => r.x_ratio !== null && r.y_px !== null && (r.doc_h ?? 0) > 0)
      .slice(0, 500)
      .map((r) => ({
        x: Number(r.x_ratio),
        y: Math.min(1, r.y_px! / r.doc_h!),
      }));

    // ── Element ranking ──
    const byElement = new Map<
      string,
      { selector: string; text: string; clicks: number; interactive: boolean }
    >();

    clicks.forEach((r) => {
      if (!r.selector) return;
      const entry = byElement.get(r.selector);
      if (entry) {
        entry.clicks++;
      } else {
        byElement.set(r.selector, {
          selector: r.selector,
          text: r.elem_text || "",
          clicks: 1,
          interactive: Boolean(r.interactive),
        });
      }
    });

    const elements = [...byElement.values()]
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 15)
      .map((e) => ({
        ...e,
        share: clicks.length ? Math.round((e.clicks / clicks.length) * 1000) / 10 : 0,
      }));

    // ── Rage-click hot spots, grouped by element ──
    const rageByElement = new Map<string, { selector: string; text: string; count: number }>();
    rage.forEach((r) => {
      if (!r.selector) return;
      const entry = rageByElement.get(r.selector);
      if (entry) entry.count++;
      else
        rageByElement.set(r.selector, {
          selector: r.selector,
          text: r.elem_text || "",
          count: 1,
        });
    });

    const rageSpots = [...rageByElement.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // ── Scroll depth ──
    // Each band shows the share of sessions that reached at least that
    // far, so the curve only ever descends.
    const depths = scrolls
      .map((r) => r.scroll_pct ?? 0)
      .filter((d) => d > 0);

    const bands = Array.from({ length: 10 }, (_, i) => {
      const threshold = (i + 1) * 10;
      const reached = depths.filter((d) => d >= threshold).length;
      return {
        depth: threshold,
        reached,
        pct: depths.length ? Math.round((reached / depths.length) * 100) : 0,
      };
    });

    const avgScroll = depths.length
      ? Math.round(depths.reduce((a, b) => a + b, 0) / depths.length)
      : 0;

    const uniqueSessions = new Set(rows.map((r) => r.session_id).filter(Boolean)).size;

    return NextResponse.json({
      site: { domain: site.domain },
      path: targetPath,
      period,
      device,
      pages,
      summary: {
        clicks: clicks.length,
        rage_clicks: rage.length,
        sessions: uniqueSessions,
        avg_scroll: avgScroll,
        dead_clicks: clicks.filter((r) => !r.interactive).length,
      },
      points,
      rage_points: ragePoints,
      elements,
      rage_spots: rageSpots,
      scroll_bands: bands,
    });
  } catch (err) {
    console.error("Heatmap stats error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
