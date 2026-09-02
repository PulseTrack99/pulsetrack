import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, planHas } from "@/lib/plan";

const PERIODS: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };

/**
 * Behavioural filters resolve to a set of session_id first, then that
 * set is intersected with the ordinary path/device/rage filters inside
 * list_session_replays via its p_session_ids parameter — one query per
 * behaviour, composed rather than each combination needing its own SQL.
 *
 * These are read-time only: they narrow which already-recorded sessions
 * show up, never which ones get recorded. The gate that decides whether
 * to record (src/app/api/replay/gate) has no idea in advance whether a
 * visit will convert or where in a funnel it will stop — that is only
 * knowable in hindsight, which is exactly what these are for.
 */
async function resolveBehaviorSessionIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  siteId: string,
  since: string,
  searchParams: URLSearchParams
): Promise<{ ids: string[] | null; error?: string }> {
  const behavior = searchParams.get("behavior");
  if (!behavior) return { ids: null };

  if (behavior === "no_conversion") {
    const { data, error } = await supabase.rpc("sessions_without_conversion", {
      p_site: siteId,
      p_since: since,
    });
    if (error) return { ids: null, error: error.message };
    return { ids: (data ?? []).map((r: { session_id: string }) => r.session_id) };
  }

  if (behavior === "low_scroll") {
    const maxPct = Math.max(1, Math.min(99, Number(searchParams.get("scroll_max") || 25)));
    const { data, error } = await supabase.rpc("sessions_low_scroll", {
      p_site: siteId,
      p_since: since,
      p_max_pct: maxPct,
    });
    if (error) return { ids: null, error: error.message };
    return { ids: (data ?? []).map((r: { session_id: string }) => r.session_id) };
  }

  if (behavior === "funnel_dropoff") {
    const funnelId = searchParams.get("funnel_id");
    const step = Number(searchParams.get("step"));
    if (!funnelId || Number.isNaN(step)) {
      return { ids: null, error: "funnel_id and step are required for this filter" };
    }
    const { data, error } = await supabase.rpc("funnel_dropoff_sessions", {
      p_funnel: funnelId,
      p_since: since,
      p_step_index: step,
    });
    if (error) return { ids: null, error: error.message };
    return { ids: (data ?? []).map((r: { session_id: string }) => r.session_id) };
  }

  return { ids: null, error: `Unknown behavior filter: ${behavior}` };
}

/**
 * The general cohort builder (supabase/cohort-builder.sql) — an
 * arbitrary AND/OR combination of conditions, sent as a JSON-encoded
 * array rather than the fixed behavior/scroll_max/funnel_id params
 * above. Takes priority over `behavior` when both are present (the
 * UI never sends both at once, but the route shouldn't guess if it
 * did).
 */
async function resolveConditionSessionIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  siteId: string,
  since: string,
  searchParams: URLSearchParams
): Promise<{ ids: string[] | null; error?: string }> {
  const raw = searchParams.get("conditions");
  if (!raw) return { ids: null };

  let conditions: unknown;
  try {
    conditions = JSON.parse(raw);
  } catch {
    return { ids: null, error: "conditions must be valid JSON" };
  }

  const match = searchParams.get("match") === "OR" ? "OR" : "AND";
  const { data, error } = await supabase.rpc("resolve_cohort_sessions", {
    p_site: siteId,
    p_since: since,
    p_conditions: conditions,
    p_match: match,
  });
  if (error) return { ids: null, error: error.message };
  return { ids: (data ?? []).map((r: { session_id: string }) => r.session_id) };
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

    // No .eq("user_id", user.id) — RLS already scopes this to sites the
    // caller owns or was added to as a team member.
    const { data: site } = await supabase
      .from("sites")
      .select("id")
      .eq("id", siteId)
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

    const hasConditions = searchParams.has("conditions");
    const filtered = hasConditions
      ? await resolveConditionSessionIds(supabase, siteId, since, searchParams)
      : await resolveBehaviorSessionIds(supabase, siteId, since, searchParams);
    if (filtered.error) {
      return NextResponse.json({ error: filtered.error }, { status: 400 });
    }

    // No matching session at all for the requested filter — skip the
    // second query rather than asking list_session_replays to filter
    // against an empty set.
    if (filtered.ids && filtered.ids.length === 0) {
      return NextResponse.json({ replays: [], total: 0 });
    }

    const { data, error } = await supabase.rpc("list_session_replays", {
      p_site: siteId,
      p_since: since,
      p_device: device,
      p_rage_only: rageOnly,
      p_limit: limit,
      p_offset: offset,
      p_path: path,
      p_session_ids: filtered.ids,
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
