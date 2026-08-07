import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPlanForSite, planHas } from "@/lib/plan";

/**
 * Decides whether a visitor should capture the page, and receives the
 * capture when they do.
 *
 * Split from the interaction ingest because the two have nothing in
 * common operationally: interactions are small, constant and batched,
 * while a DOM snapshot is large, rare, and worth refusing outright when
 * a recent one already exists. Asking first is what keeps rrweb off the
 * critical path for almost every visitor.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CORS = { "Access-Control-Allow-Origin": "*" };

/** How long a capture stays good before a fresh one is worth its weight. */
const FRESH_FOR_MS = 7 * 24 * 60 * 60 * 1000;

/** Vercel accepts more, but a tree this large is a runaway page, not a page. */
const MAX_BYTES = 3_000_000;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...CORS,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function deviceFrom(ua: string): string {
  if (/mobile|android|iphone|ipod/i.test(ua)) return "Mobile";
  if (/tablet|ipad/i.test(ua)) return "Tablet";
  return "Desktop";
}

/** GET — "should I capture this page?" */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("s");
    const path = searchParams.get("p");

    if (!siteId || !path) {
      return NextResponse.json({ need: false }, { headers: CORS });
    }

    const plan = await getPlanForSite(supabase, siteId);
    if (!planHas(plan, "heatmaps")) {
      return NextResponse.json({ need: false }, { headers: CORS });
    }

    const device = deviceFrom(req.headers.get("user-agent") || "");

    const { data } = await supabase
      .from("page_snapshots")
      .select("captured_at, dom_bytes")
      .eq("site_id", siteId)
      .eq("path", path.slice(0, 512))
      .eq("device", device)
      .maybeSingle();

    const fresh =
      data?.dom_bytes != null &&
      data.captured_at != null &&
      Date.now() - new Date(data.captured_at).getTime() < FRESH_FOR_MS;

    return NextResponse.json(
      { need: !fresh },
      {
        headers: {
          ...CORS,
          // Short cache so a burst of visitors landing at once does not
          // all decide to capture the same page.
          "Cache-Control": "public, max-age=120",
        },
      }
    );
  } catch {
    return NextResponse.json({ need: false }, { headers: CORS });
  }
}

/** POST — the capture itself. */
export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (raw.length > MAX_BYTES) {
      return NextResponse.json(
        { error: "Snapshot too large" },
        { status: 413, headers: CORS }
      );
    }

    const body = JSON.parse(raw);
    const { site_id, path, dom, viewport_w, doc_h } = body;

    if (!site_id || !path || !dom) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400, headers: CORS }
      );
    }

    const { data: site } = await supabase
      .from("sites")
      .select("id")
      .eq("id", site_id)
      .maybeSingle();

    if (!site) {
      return NextResponse.json({ error: "Invalid site_id" }, { status: 404, headers: CORS });
    }

    const plan = await getPlanForSite(supabase, site_id);
    if (!planHas(plan, "heatmaps")) {
      return NextResponse.json({ ok: true, stored: false }, { headers: CORS });
    }

    const device = deviceFrom(req.headers.get("user-agent") || "");

    const { error } = await supabase.from("page_snapshots").upsert(
      {
        site_id,
        path: String(path).slice(0, 512),
        device,
        viewport_w: Math.max(1, Math.min(20_000, Math.round(viewport_w) || 0)),
        doc_h: Math.max(1, Math.min(200_000, Math.round(doc_h) || 0)),
        dom,
        dom_bytes: raw.length,
        captured_at: new Date().toISOString(),
      },
      { onConflict: "site_id,path,device" }
    );

    if (error) {
      console.error("Failed to store snapshot:", error);
      return NextResponse.json({ error: "Insert failed" }, { status: 500, headers: CORS });
    }

    return NextResponse.json({ ok: true, stored: true }, { headers: CORS });
  } catch (err) {
    console.error("Snapshot ingest error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: CORS });
  }
}
