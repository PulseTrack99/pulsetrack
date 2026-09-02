import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, planHas } from "@/lib/plan";

const PERIODS: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };

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
    const device = searchParams.get("device") || null;
    const path = searchParams.get("path") || null;
    const rageOnly = searchParams.get("rage") === "1";
    const offset = Number(searchParams.get("offset") || 0);
    // Capped rather than trusted outright — this also serves the compact
    // "sessions on this page" list the heatmap view asks for.
    const limit = Math.max(1, Math.min(30, Number(searchParams.get("limit") || 30)));

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

    const plan = await getUserPlan(supabase, user.id);
    if (!planHas(plan, "session_replay")) {
      return NextResponse.json(
        { error: "upgrade_required", plan, feature: "session_replay" },
        { status: 402 }
      );
    }

    const since = new Date(
      Date.now() - (PERIODS[period] ?? 30) * 86_400_000
    ).toISOString();

    const { data, error } = await supabase.rpc("list_session_replays", {
      p_site: siteId,
      p_since: since,
      p_device: device,
      p_rage_only: rageOnly,
      p_limit: limit,
      p_offset: offset,
      p_path: path,
    });

    if (error) {
      console.error("Replay list error:", error);
      return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    const rows = (data ?? []) as {
      id: string;
      replay_id: string;
      session_id: string;
      path: string | null;
      device: string | null;
      browser: string | null;
      country: string | null;
      started_at: string;
      duration_ms: number;
      event_count: number;
      status: string;
      has_rage: boolean;
      total_count: number;
    }[];

    return NextResponse.json({
      replays: rows.map((r) => ({
        id: r.id,
        replay_id: r.replay_id,
        session_id: r.session_id,
        path: r.path,
        device: r.device,
        browser: r.browser,
        country: r.country,
        started_at: r.started_at,
        duration_ms: r.duration_ms,
        event_count: r.event_count,
        status: r.status,
        has_rage: r.has_rage,
      })),
      total: rows[0]?.total_count ? Number(rows[0].total_count) : 0,
    });
  } catch (err) {
    console.error("Replay list error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
