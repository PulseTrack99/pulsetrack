import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getUserPlan, planHas } from "@/lib/plan";
import { downloadEvents } from "@/lib/replay-storage";

/**
 * Returns the merged rrweb event stream for one recording.
 *
 * Ownership is checked with the caller's own session (RLS on
 * session_replays already restricts this to rows the signed-in user
 * owns), then Storage is read with the service role, since the bucket
 * grants that role alone.
 */
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
    const replayId = searchParams.get("replay_id");

    if (!siteId || !replayId) {
      return NextResponse.json(
        { error: "site_id and replay_id are required" },
        { status: 400 }
      );
    }

    const plan = await getUserPlan(supabase, user.id);
    if (!planHas(plan, "session_replay")) {
      return NextResponse.json(
        { error: "upgrade_required", plan, feature: "session_replay" },
        { status: 402 }
      );
    }

    // RLS on session_replays (user_id = auth.uid()) makes this both the
    // ownership check and the row fetch in one query.
    const { data: replay } = await supabase
      .from("session_replays")
      .select("id, path, started_at, duration_ms, device")
      .eq("site_id", siteId)
      .eq("replay_id", replayId)
      .maybeSingle();

    if (!replay) {
      return NextResponse.json({ error: "Replay not found" }, { status: 404 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const events = await downloadEvents(serviceSupabase, siteId, replayId);

    if (events.length === 0) {
      return NextResponse.json({ error: "No recording data" }, { status: 404 });
    }

    return NextResponse.json({
      meta: {
        path: replay.path,
        started_at: replay.started_at,
        duration_ms: replay.duration_ms,
        device: replay.device,
      },
      events,
    });
  } catch (err) {
    console.error("Replay events error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
