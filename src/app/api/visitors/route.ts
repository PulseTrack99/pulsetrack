import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * Visitors, grouped from the event stream.
 *
 * What a "visitor" is here is decided by src/lib/visitor.ts, and it is
 * not what an analytics product usually means by the word: the id is a
 * hash of request attributes and a salt that is thrown away every UTC
 * day, so the same person is a different visitor tomorrow and cannot be
 * followed across days by design. The screen says so rather than
 * quietly presenting a day's worth of rows as durable profiles.
 *
 * Two consequences shape this route:
 *
 *  - grouping happens over a bounded scan, in this process. Postgres
 *    would GROUP BY, but PostgREST cannot and this deployment cannot
 *    add a function right now. The cap is reported back so the screen
 *    can admit when it is showing a slice rather than everything.
 *  - emails come from session_identities, which has RLS enabled and no
 *    policy — no signed-in user can read it, only the service role. So
 *    ownership is checked first, through the caller's own client, and
 *    only then does the service client fetch the emails for that site.
 */

const PERIODS: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };

/** Events read per request before grouping. */
const SCAN = 3000;
/** Visitors returned, most recently seen first. */
const MAX_VISITORS = 200;

interface Grouped {
  visitor_id: string;
  sessions: Set<string>;
  pageviews: number;
  events: number;
  first_at: string;
  last_at: string;
  device: string | null;
  browser: string | null;
  country: string | null;
  source: string | null;
  paths: Set<string>;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("site_id");
  if (!siteId) return NextResponse.json({ error: "site_id is required" }, { status: 400 });

  // Ownership, through the caller's own RLS. Everything below this line
  // may use elevated access, so nothing below it runs until this passes.
  const { data: site } = await supabase
    .from("sites")
    .select("id")
    .eq("id", siteId)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const days = PERIODS[searchParams.get("period") ?? "24h"] ?? 1;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data: rows, error } = await supabase
    .from("events")
    .select("visitor_id, session_id, type, path, device, browser, country, source, created_at")
    .eq("site_id", siteId)
    .gte("created_at", since)
    .not("visitor_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(SCAN);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const events = rows ?? [];
  const byVisitor = new Map<string, Grouped>();

  // Rows arrive newest first, so the first one seen for a visitor is
  // their last event and the last one seen is their first.
  for (const e of events) {
    const id = e.visitor_id as string;
    let g = byVisitor.get(id);
    if (!g) {
      g = {
        visitor_id: id,
        sessions: new Set(),
        pageviews: 0,
        events: 0,
        first_at: e.created_at,
        last_at: e.created_at,
        device: e.device,
        browser: e.browser,
        country: e.country,
        source: e.source,
        paths: new Set(),
      };
      byVisitor.set(id, g);
    }
    if (e.session_id) g.sessions.add(e.session_id);
    if (e.type === "pageview") g.pageviews++;
    if (e.type === "event") g.events++;
    if (e.path) g.paths.add(e.path);
    g.first_at = e.created_at;
    // The oldest row wins for source: a visit's origin is where it
    // started, not where the person happened to be last seen.
    if (e.source) g.source = e.source;
  }

  const visitors = [...byVisitor.values()]
    .sort((a, b) => (a.last_at < b.last_at ? 1 : -1))
    .slice(0, MAX_VISITORS);

  /* Emails, for the visitors on this page only. session_identities is
     keyed by session, so one visitor can carry several — a person who
     signed in during one visit and not another. */
  const sessionIds = visitors.flatMap((v) => [...v.sessions]);
  const emailBySession = new Map<string, string>();

  if (sessionIds.length > 0) {
    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: ids } = await service
      .from("session_identities")
      .select("session_id, email")
      .eq("site_id", siteId)
      .in("session_id", sessionIds.slice(0, 1000));
    for (const r of ids ?? []) emailBySession.set(r.session_id, r.email);
  }

  return NextResponse.json({
    visitors: visitors.map((v) => ({
      visitor_id: v.visitor_id,
      sessions: v.sessions.size,
      pageviews: v.pageviews,
      events: v.events,
      pages: v.paths.size,
      first_at: v.first_at,
      last_at: v.last_at,
      device: v.device,
      browser: v.browser,
      country: v.country,
      source: v.source,
      email: [...v.sessions].map((s) => emailBySession.get(s)).find(Boolean) ?? null,
    })),
    scanned: events.length,
    // True when the scan filled up, so the screen can say the list is a
    // slice of the period rather than all of it.
    truncated: events.length >= SCAN,
  });
}
