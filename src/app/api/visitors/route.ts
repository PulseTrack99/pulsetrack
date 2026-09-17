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
 *  - grouping happens in Postgres (site_visitors), not over a bounded
 *    scan in this process: the route's cost no longer grows with the
 *    site's traffic, and the screen only admits a limit when there are
 *    more visitors than it lists.
 *  - emails come from session_identities, which has RLS enabled and no
 *    policy — no signed-in user can read it, only the service role. So
 *    ownership is checked first, through the caller's own client, and
 *    only then does the service client fetch the emails for that site.
 */

const PERIODS: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };

/** Visitors returned, most recently seen first. */
const MAX_VISITORS = 200;

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

  // Regroupé en base (supabase/ingest-origin-and-visitors.sql) : la
  // route ne lit plus d'événements, seulement les visiteurs affichés.
  // SECURITY INVOKER, donc la RLS de events s'applique comme avant.
  const { data, error } = await supabase.rpc("site_visitors", {
    p_site: siteId,
    p_since: since,
    p_limit: MAX_VISITORS,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const visitors = ((data ?? []) as {
    visitor_id: string;
    sessions: number;
    pageviews: number;
    events: number;
    pages: number;
    first_at: string;
    last_at: string;
    device: string | null;
    browser: string | null;
    country: string | null;
    source: string | null;
    session_ids: string[] | null;
    total_visitors: number;
  }[]).map((v) => ({ ...v, sessions: new Set(v.session_ids ?? []) }));
  const totalVisitors = Number(visitors[0]?.total_visitors ?? 0);

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
      sessions: Number(v.sessions.size),
      pageviews: Number(v.pageviews),
      events: Number(v.events),
      pages: Number(v.pages),
      first_at: v.first_at,
      last_at: v.last_at,
      device: v.device,
      browser: v.browser,
      country: v.country,
      source: v.source,
      email: [...v.sessions].map((s) => emailBySession.get(s)).find(Boolean) ?? null,
    })),
    total: totalVisitors,
    // Plus de tranche d'événements : seule la liste est bornée, et
    // l'écran le dit quand il y a plus de visiteurs qu'il n'en montre.
    truncated: totalVisitors > visitors.length,
  });
}
