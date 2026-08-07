import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getDailySalt,
  computeVisitorId,
  resolveSessionId,
  getClientIp,
} from "@/lib/visitor";
import { getPlanForSite, planHas } from "@/lib/plan";

/**
 * Interaction ingest for heatmaps.
 *
 * Separate from /api/track because interactions arrive batched and at a
 * much higher rate than pageviews, and are queried by path rather than
 * by session.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CORS = { "Access-Control-Allow-Origin": "*" };

const MAX_BATCH = 60;
const VALID_TYPES = new Set(["click", "rage", "scroll"]);

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...CORS,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function deviceFrom(ua: string): string {
  if (/mobile|android|iphone|ipod/i.test(ua)) return "Mobile";
  if (/tablet|ipad/i.test(ua)) return "Tablet";
  return "Desktop";
}

/** Clamp to the column's range so a hostile payload cannot poison a map. */
function int(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? Math.round(v) : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, n));
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);

    const raw = await req.text();
    if (raw.length > 64_000) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413, headers: CORS });
    }

    const body = JSON.parse(raw);
    const { site_id, path, batch } = body;

    if (!site_id || !path || !Array.isArray(batch) || batch.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: CORS });
    }

    const { data: site } = await supabase
      .from("sites")
      .select("id")
      .eq("id", site_id)
      .maybeSingle();

    if (!site) {
      return NextResponse.json({ error: "Invalid site_id" }, { status: 404, headers: CORS });
    }

    // Heatmaps are a paid capability. Accepting the request and dropping
    // the rows keeps the script simple — it does not need to know the
    // plan, and an upgrade starts working immediately.
    const plan = await getPlanForSite(supabase, site_id);
    if (!planHas(plan, "heatmaps")) {
      return NextResponse.json(
        { ok: true, stored: 0, reason: "plan" },
        { headers: CORS }
      );
    }

    const ua = req.headers.get("user-agent") || "";
    const device = deviceFrom(ua);

    const salt = await getDailySalt(supabase);
    const visitor_id = computeVisitorId(salt, site_id, ip, ua);
    const session_id = await resolveSessionId(supabase, site_id, visitor_id);

    const rows = batch
      .slice(0, MAX_BATCH)
      .filter((r: { type?: string }) => r?.type && VALID_TYPES.has(r.type))
      .map((r: Record<string, unknown>) => ({
        site_id,
        session_id,
        visitor_id,
        path: String(path).slice(0, 512),
        type: r.type as string,
        x_ratio:
          typeof r.x_ratio === "number" && Number.isFinite(r.x_ratio)
            ? Math.max(0, Math.min(1, r.x_ratio))
            : null,
        y_px: int(r.y_px, 0, 200_000),
        viewport_w: int(r.viewport_w, 0, 20_000),
        viewport_h: int(r.viewport_h, 0, 20_000),
        doc_h: int(r.doc_h, 0, 200_000),
        device,
        selector: r.selector ? String(r.selector).slice(0, 200) : null,
        elem_text: r.elem_text ? String(r.elem_text).slice(0, 60) : null,
        interactive: Boolean(r.interactive),
        scroll_pct: int(r.scroll_pct, 0, 100),
      }));

    if (rows.length === 0) {
      return NextResponse.json({ ok: true, stored: 0 }, { headers: CORS });
    }

    const { error } = await supabase.from("interactions").insert(rows);

    if (error) {
      console.error("Failed to insert interactions:", error);
      return NextResponse.json({ error: "Insert failed" }, { status: 500, headers: CORS });
    }

    return NextResponse.json({ ok: true, stored: rows.length }, { headers: CORS });
  } catch (err) {
    console.error("Heatmap ingest error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: CORS });
  }
}
