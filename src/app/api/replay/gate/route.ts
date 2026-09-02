import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSiteOwner, getUserPlan, planHas, canRecordReplay } from "@/lib/plan";

/**
 * "Should this page load be recorded?" — asked before the tracker
 * downloads rrweb's record module at all, so a visitor whose session
 * will not be kept never pays for it.
 *
 * There is no per-session continuation to reason about here: each page
 * load is its own recording (see supabase/session-replays.sql), so the
 * only question is whether this month's cap for the site's owner still
 * has room. First-come-first-served within the month — see the ingest
 * route for the honest caveat about what that means on a traffic spike.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CORS = { "Access-Control-Allow-Origin": "*" };

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { ...CORS, "Access-Control-Allow-Methods": "GET, OPTIONS" },
  });
}

export async function GET(req: NextRequest) {
  try {
    const siteId = new URL(req.url).searchParams.get("s");
    if (!siteId) {
      return NextResponse.json({ record: false }, { headers: CORS });
    }

    const ownerId = await getSiteOwner(supabase, siteId);
    if (!ownerId) {
      return NextResponse.json({ record: false }, { headers: CORS });
    }

    const plan = await getUserPlan(supabase, ownerId);
    if (!planHas(plan, "session_replay")) {
      return NextResponse.json({ record: false }, { headers: CORS });
    }

    const { allowed } = await canRecordReplay(supabase, ownerId, plan);

    return NextResponse.json(
      { record: allowed },
      {
        headers: {
          ...CORS,
          // Short cache so many visitors landing at once do not all hit
          // the database to ask the same question within the same second.
          "Cache-Control": "public, max-age=30",
        },
      }
    );
  } catch {
    return NextResponse.json({ record: false }, { headers: CORS });
  }
}
