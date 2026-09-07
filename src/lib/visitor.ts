import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side, cookie-free visitor identification.
 *
 * The browser sends no identifier at all — nothing is written to or read
 * from the visitor's device, so no consent is required under ePrivacy
 * Art. 5(3). Instead the server derives an anonymous id from request
 * attributes mixed with a salt that rotates every UTC day.
 *
 * Because yesterday's salt is deleted, yesterday's ids can no longer be
 * re-derived from an IP address. That one-way property is what keeps the
 * ids anonymous rather than merely pseudonymous, and it is why visitors
 * cannot be followed from one day to the next.
 */

const SESSION_WINDOW_MS = 30 * 60 * 1000;

/** Per-instance memo so we hit the salts table once per day, not per event. */
let memo: { day: string; salt: string } | null = null;

function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export async function getDailySalt(
  supabase: SupabaseClient,
  now = new Date()
): Promise<string> {
  const day = utcDay(now);
  if (memo?.day === day) return memo.salt;

  const { data: existing } = await supabase
    .from("daily_salts")
    .select("salt")
    .eq("day", day)
    .maybeSingle();

  if (existing?.salt) {
    memo = { day, salt: existing.salt };
    return existing.salt;
  }

  // Several instances can reach this at once on the first request of a
  // day. ignoreDuplicates leaves the first writer's row intact, then we
  // read back whichever one landed so everybody agrees on the salt.
  await supabase
    .from("daily_salts")
    .upsert({ day, salt: randomBytes(32).toString("hex") }, {
      onConflict: "day",
      ignoreDuplicates: true,
    });

  const { data: settled } = await supabase
    .from("daily_salts")
    .select("salt")
    .eq("day", day)
    .single();

  const salt = settled!.salt as string;
  memo = { day, salt };
  return salt;
}

/**
 * Anonymous id for a visitor, scoped to one site and one day.
 *
 * Site-scoped on purpose: the same person visiting two PulseTrack
 * customers produces two unrelated ids, so the data cannot be joined
 * into cross-site tracking.
 */
export function computeVisitorId(
  salt: string,
  siteId: string,
  ip: string,
  userAgent: string
): string {
  return createHash("sha256")
    .update(`${salt}|${siteId}|${ip}|${userAgent}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Finds the visitor's in-flight session, or starts a new one.
 *
 * A session continues while the visitor keeps sending events at least
 * every 30 minutes, matching the convention the dashboard's duration and
 * bounce figures assume.
 */
export interface SessionContext {
  sessionId: string;
  /**
   * The source already carried by this session, when it is not new.
   *
   * A visit has one origin, decided when it starts. Recomputing it on
   * every page made the second page of a visit report where it came
   * from — the first page — so one visitor arriving from Google and
   * reading five pages counted once under Google and four times under
   * whatever the referrer looked like next. Carrying the first value
   * forward is what makes "sources de trafic" add up to the number of
   * visitors, and it fixes every consumer at once rather than each
   * aggregate having to re-derive the same thing.
   */
  source: string | null;
}

export async function resolveSession(
  supabase: SupabaseClient,
  siteId: string,
  visitorId: string,
  now = new Date()
): Promise<SessionContext> {
  const cutoff = new Date(now.getTime() - SESSION_WINDOW_MS).toISOString();

  // The same single lookup that decides the session also carries its
  // origin, so propagating costs nothing extra.
  const { data: recent } = await supabase
    .from("events")
    .select("session_id, source")
    .eq("site_id", siteId)
    .eq("visitor_id", visitorId)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent?.session_id) {
    return {
      sessionId: recent.session_id as string,
      source: (recent.source as string | null) ?? null,
    };
  }

  return {
    sessionId: createHash("sha256")
      .update(`${visitorId}|${now.getTime()}|${randomBytes(8).toString("hex")}`)
      .digest("hex")
      .slice(0, 32),
    source: null,
  };
}

/** The session id alone, for the callers that only place a row in one. */
export async function resolveSessionId(
  supabase: SupabaseClient,
  siteId: string,
  visitorId: string,
  now = new Date()
): Promise<string> {
  return (await resolveSession(supabase, siteId, visitorId, now)).sessionId;
}

/** Client IP as seen through Vercel's proxy chain. Never persisted. */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "0.0.0.0"
  );
}
