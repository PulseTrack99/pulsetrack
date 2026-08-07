import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, planHas } from "@/lib/plan";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Aggregates interactions into everything the heatmap view renders:
 * the page picker, the click cloud, scroll depth and the element table.
 *
 * PostgREST caps a response at its max-rows setting (1000 by default), and
 * .limit() does not raise that ceiling — asking for 20k rows silently
 * returns 1000. So totals come from exact head-counts, which transfer no
 * rows at all, and the shapes that genuinely need rows read a paged,
 * bounded sample of the most recent interactions.
 */

const PERIODS: Record<string, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const PAGE = 1000;
const PATH_SCAN = 5000;
const CLICK_SAMPLE = 5000;
const RAGE_SAMPLE = 2000;
const SCROLL_SAMPLE = 5000;
const CLOUD_POINTS = 4000;

interface Row {
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

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

type Filters = {
  siteId: string;
  path: string;
  since: string;
  device: string;
};

function base(supabase: SupabaseClient, f: Filters, select: string, opts?: object) {
  let q = supabase
    .from("interactions")
    .select(select, opts)
    .eq("site_id", f.siteId)
    .eq("path", f.path)
    .gte("created_at", f.since);
  if (f.device !== "all") q = q.eq("device", f.device);
  return q;
}

/** Exact total without transferring any rows. */
async function countOf(
  supabase: SupabaseClient,
  f: Filters,
  type: string
): Promise<number> {
  const { count } = await base(supabase, f, "id", { count: "exact", head: true }).eq(
    "type",
    type
  );
  return count ?? 0;
}

/** Most recent rows of one type, walked in pages up to `max`. */
async function sample(
  supabase: SupabaseClient,
  f: Filters,
  type: string,
  select: string,
  max: number
): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; from < max; from += PAGE) {
    const { data, error } = await base(supabase, f, select)
      .eq("type", type)
      .order("created_at", { ascending: false })
      .range(from, Math.min(from + PAGE, max) - 1);

    if (error || !data || data.length === 0) break;
    out.push(...(data as unknown as Row[]));
    if (data.length < PAGE) break;
  }
  return out;
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
    const requestedPath = searchParams.get("path");
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

    // ── Pages with data, for the picker ──
    // Walked over several ranges rather than one, so a page that is
    // quieter than a busy neighbour still shows up in the list.
    const seen = new Map<string, number>();
    for (let from = 0; from < PATH_SCAN; from += PAGE) {
      const { data, error } = await supabase
        .from("interactions")
        .select("path")
        .eq("site_id", siteId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);

      if (error || !data || data.length === 0) break;
      (data as { path: string }[]).forEach((r) =>
        seen.set(r.path, (seen.get(r.path) ?? 0) + 1)
      );
      if (data.length < PAGE) break;
    }

    const pages = [...seen.entries()]
      .map(([p, count]) => ({ path: p, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    const path = requestedPath || pages[0]?.path || "/";

    // ── Which breakpoints this page was seen at ──
    // A click map may only ever cover one breakpoint: an x ratio means a
    // different place on a 390px phone than on a 1440px desktop, and
    // stacking them produces a cloud that corresponds to no real layout.
    const deviceCounts = await Promise.all(
      (["Desktop", "Mobile", "Tablet"] as const).map(async (d) => {
        const { count } = await supabase
          .from("interactions")
          .select("id", { count: "exact", head: true })
          .eq("site_id", siteId)
          .eq("path", path)
          .eq("device", d)
          .eq("type", "click")
          .gte("created_at", since);
        return { device: d, count: count ?? 0 };
      })
    );

    const available = deviceCounts.filter((d) => d.count > 0);
    const dominant = available.sort((a, b) => b.count - a.count)[0]?.device;

    // Fall back to the breakpoint with the most data rather than mixing.
    const resolvedDevice =
      device !== "all" && available.some((d) => d.device === device)
        ? device
        : (dominant ?? "Desktop");

    const f: Filters = { siteId, path, since, device: resolvedDevice };

    // ── Exact totals ──
    const [clickTotal, rageTotal] = await Promise.all([
      countOf(supabase, f, "click"),
      countOf(supabase, f, "rage"),
    ]);

    // ── Samples for the shapes that need rows ──
    const [clicks, rage, scrolls] = await Promise.all([
      sample(
        supabase,
        f,
        "click",
        "x_ratio, y_px, doc_h, viewport_w, selector, elem_text, interactive, session_id",
        CLICK_SAMPLE
      ),
      sample(supabase, f, "rage", "x_ratio, y_px, doc_h, selector, elem_text", RAGE_SAMPLE),
      sample(supabase, f, "scroll", "scroll_pct, session_id", SCROLL_SAMPLE),
    ]);

    // ── Click cloud ──
    // x is already a ratio; y is expressed as a ratio of the document
    // height it was captured on, so pages of differing length line up.
    const toPoint = (r: Row) => ({
      x: Number(r.x_ratio),
      y: Math.min(1, r.y_px! / r.doc_h!),
    });
    const usable = (r: Row) =>
      r.x_ratio !== null && r.y_px !== null && (r.doc_h ?? 0) > 0;

    const points = clicks.filter(usable).slice(0, CLOUD_POINTS).map(toPoint);
    const ragePoints = rage.filter(usable).map(toPoint);

    // ── Element ranking, over the sampled clicks ──
    const byElement = new Map<
      string,
      { selector: string; text: string; clicks: number; interactive: boolean }
    >();

    clicks.forEach((r) => {
      if (!r.selector) return;
      const entry = byElement.get(r.selector);
      if (entry) entry.clicks++;
      else
        byElement.set(r.selector, {
          selector: r.selector,
          text: r.elem_text || "",
          clicks: 1,
          interactive: Boolean(r.interactive),
        });
    });

    const elements = [...byElement.values()]
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 15)
      .map((e) => ({
        ...e,
        share: clicks.length ? Math.round((e.clicks / clicks.length) * 1000) / 10 : 0,
      }));

    // ── Rage hot spots, grouped by element ──
    const rageByElement = new Map<string, { selector: string; text: string; count: number }>();
    rage.forEach((r) => {
      if (!r.selector) return;
      const entry = rageByElement.get(r.selector);
      if (entry) entry.count++;
      else rageByElement.set(r.selector, { selector: r.selector, text: r.elem_text || "", count: 1 });
    });

    const rageSpots = [...rageByElement.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // ── Scroll depth ──
    // Each band is the share of pageviews reaching at least that far, so
    // the curve only ever descends.
    const depths = scrolls.map((r) => r.scroll_pct ?? 0).filter((d) => d > 0);

    const bands = Array.from({ length: 10 }, (_, i) => {
      const depth = (i + 1) * 10;
      const reached = depths.filter((d) => d >= depth).length;
      return {
        depth,
        reached,
        pct: depths.length ? Math.round((reached / depths.length) * 100) : 0,
      };
    });

    const avgScroll = depths.length
      ? Math.round(depths.reduce((a, b) => a + b, 0) / depths.length)
      : 0;

    // One scroll record is emitted per pageview, so distinct sessions
    // across them is the pageview-level session count.
    const sessions = new Set(
      [...scrolls, ...clicks].map((r) => r.session_id).filter(Boolean)
    ).size;

    const deadRate = clicks.length
      ? clicks.filter((r) => !r.interactive).length / clicks.length
      : 0;

    // ── Page structure, for the wireframe under the heat ──
    const { data: snapshot } = await supabase
      .from("page_snapshots")
      .select("viewport_w, doc_h, elements, captured_at")
      .eq("site_id", siteId)
      .eq("path", path)
      .eq("device", resolvedDevice)
      .maybeSingle();

    // ── Page geometry ──
    // Drives the aspect ratio the map is drawn at, so a tall page renders
    // tall instead of being squashed into a fixed box. Median rather than
    // mean because one outlier page length would skew the whole frame.
    // The snapshot wins when present: the wireframe and the heat must be
    // drawn at the same proportions or they will not line up.
    const geometry = snapshot
      ? { viewport_w: snapshot.viewport_w, doc_h: snapshot.doc_h }
      : {
          viewport_w: median(
            clicks.map((r) => r.viewport_w ?? 0).filter((n) => n > 0)
          ),
          doc_h: median(clicks.map((r) => r.doc_h ?? 0).filter((n) => n > 0)),
        };

    return NextResponse.json({
      site: { domain: site.domain },
      path,
      period,
      device: resolvedDevice,
      devices: available,
      geometry,
      snapshot: snapshot
        ? { elements: snapshot.elements, captured_at: snapshot.captured_at }
        : null,
      pages,
      summary: {
        clicks: clickTotal,
        rage_clicks: rageTotal,
        sessions,
        avg_scroll: avgScroll,
        // Scaled from the sample rate onto the exact total.
        dead_clicks: Math.round(deadRate * clickTotal),
      },
      // True when the cloud and rankings are drawn from a sample rather
      // than every row, so the UI can say so.
      sampled: clickTotal > clicks.length,
      sample_size: clicks.length,
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
