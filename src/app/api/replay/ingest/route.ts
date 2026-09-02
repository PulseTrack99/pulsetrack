import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSiteOwner, getUserPlan, planHas, canRecordReplay } from "@/lib/plan";
import { uploadSegment } from "@/lib/replay-storage";
import {
  getDailySalt,
  computeVisitorId,
  resolveSessionId,
  getClientIp,
} from "@/lib/visitor";

/**
 * Receives one flushed batch of rrweb events for one page-load recording.
 *
 * A recording arrives as several POSTs rather than one: the tracker
 * flushes periodically and on pagehide, and each call here is one
 * segment. The first segment (seq 0) creates the metadata row; every
 * later one updates it and appends its own object to Storage — see
 * src/lib/replay-storage.ts for why segments are not merged at write
 * time.
 *
 * session_id is resolved here, the same way /api/track and /api/heatmap
 * resolve it, rather than trusted from the client — the tracker has no
 * session identifier of its own to send (nothing is ever handed back to
 * it over sendBeacon), and this keeps all three pipelines agreeing on
 * what "the same session" means without the client needing to know.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CORS = { "Access-Control-Allow-Origin": "*" };

// A checkoutEveryNms full snapshot on a heavy page can run to a few
// hundred KB; this leaves headroom without accepting an unbounded body.
const MAX_BYTES = 3_000_000;

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

function browserFrom(ua: string): string {
  if (/firefox/i.test(ua)) return "Firefox";
  if (/edg/i.test(ua)) return "Edge";
  if (/chrome/i.test(ua)) return "Chrome";
  if (/safari/i.test(ua)) return "Safari";
  if (/opera|opr/i.test(ua)) return "Opera";
  return "Other";
}

function countryFrom(req: NextRequest): string {
  return (
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    "Unknown"
  );
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (raw.length > MAX_BYTES) {
      return NextResponse.json(
        { error: "Payload too large" },
        { status: 413, headers: CORS }
      );
    }

    const body = JSON.parse(raw);
    const { site_id, replay_id, path, seq, events, done } = body;

    // An empty batch is only valid as a closing ping: stopReplay() always
    // sends a final done=true flush to mark the row complete, even when
    // the periodic timer already shipped everything and there is nothing
    // new to attach.
    if (
      !site_id ||
      !replay_id ||
      typeof seq !== "number" ||
      !Array.isArray(events) ||
      (events.length === 0 && !done)
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400, headers: CORS }
      );
    }

    const ownerId = await getSiteOwner(supabase, site_id);
    if (!ownerId) {
      return NextResponse.json({ error: "Invalid site_id" }, { status: 404, headers: CORS });
    }

    const plan = await getUserPlan(supabase, ownerId);
    if (!planHas(plan, "session_replay")) {
      return NextResponse.json({ ok: true, stored: false, reason: "plan" }, { headers: CORS });
    }

    const ua = req.headers.get("user-agent") || "";
    const ip = getClientIp(req.headers);
    const salt = await getDailySalt(supabase);
    const visitor_id = computeVisitorId(salt, site_id, ip, ua);
    const session_id = await resolveSessionId(supabase, site_id, visitor_id);

    const cleanPath = path ? String(path).slice(0, 512) : null;
    const isFirstSegment = seq === 0;

    if (isFirstSegment) {
      // Re-checked here rather than trusted from the earlier /gate call:
      // that call is a hint the tracker uses to decide whether to load
      // rrweb at all, not the authority on whether to keep what it sent.
      const { allowed } = await canRecordReplay(supabase, ownerId, plan);
      if (!allowed) {
        return NextResponse.json({ ok: true, stored: false, reason: "quota" }, { headers: CORS });
      }

      const { error: insertError } = await supabase.from("session_replays").insert({
        site_id,
        user_id: ownerId,
        replay_id,
        session_id,
        visitor_id,
        path: cleanPath,
        device: deviceFrom(ua),
        browser: browserFrom(ua),
        country: countryFrom(req),
        status: done ? "complete" : "recording",
      });

      // A duplicate first segment (retry, double flush) is not an error —
      // the row already exists and the update below still applies.
      if (insertError && insertError.code !== "23505") {
        console.error("Failed to create replay row:", insertError);
        return NextResponse.json({ error: "Insert failed" }, { status: 500, headers: CORS });
      }
    } else {
      // A later segment for a recording the first segment was refused
      // (quota hit mid-session, or the row never made it in) has nothing
      // to attach to — drop it rather than create an orphaned Storage
      // folder no list query will ever reach.
      const { data: existing } = await supabase
        .from("session_replays")
        .select("id")
        .eq("site_id", site_id)
        .eq("replay_id", replay_id)
        .maybeSingle();

      if (!existing) {
        return NextResponse.json({ ok: true, stored: false, reason: "no_row" }, { headers: CORS });
      }
    }

    // A done-only closing ping carries nothing worth writing to Storage —
    // it exists to flip the row to 'complete', not to add a segment.
    const bytes =
      events.length > 0
        ? (await uploadSegment(supabase, site_id, replay_id, seq, events)).bytes
        : 0;

    const { error: updateError } = await supabase.rpc("bump_replay_segment", {
      p_site: site_id,
      p_replay: replay_id,
      p_events: events.length,
      p_bytes: bytes,
      p_done: Boolean(done),
    });

    if (updateError) {
      console.error("Failed to update replay row:", updateError);
    }

    return NextResponse.json({ ok: true, stored: true }, { headers: CORS });
  } catch (err) {
    console.error("Replay ingest error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: CORS });
  }
}
