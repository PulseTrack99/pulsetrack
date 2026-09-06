import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * The raw event stream for one site.
 *
 * PulseTrack has always collected custom events — the tracker exposes
 * pulsetrack("name", props), /api/track stores them, and the Business
 * export serves them at /api/v1/events — but nothing in the dashboard
 * ever showed one. A customer could instrument their checkout and then
 * have no way to check the events were arriving, short of paying for
 * the export tier and writing a script.
 *
 * Read through the caller's own session, so RLS decides what comes
 * back (supabase/team.sql: owner or teammate of the site). No plan gate:
 * seeing your own data in your own dashboard is not a paid feature —
 * what stays paid is taking it out through the API.
 */

const PERIODS: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };

const PAGE_SIZE = 50;

/** Rows scanned when collecting the names for the filter dropdown. */
const NAME_SCAN = 2000;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("site_id");
  if (!siteId) return NextResponse.json({ error: "site_id is required" }, { status: 400 });

  const days = PERIODS[searchParams.get("period") ?? "30d"] ?? 30;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const kind = searchParams.get("kind"); // custom | pageview | null (all)
  const name = searchParams.get("name");
  const path = searchParams.get("path");
  // Keyset rather than offset: the stream grows while it is being read,
  // and an offset would skip or repeat rows as it does.
  const before = searchParams.get("before");
  // Set by the Visitors screen when it expands one row into a timeline.
  const visitor = searchParams.get("visitor");
  const includeHidden = searchParams.get("include_hidden") === "1";

  /* Names the Lexicon has been told to hide — a debug event left in
     production, a rename that left the old spelling behind. They keep
     arriving and keep counting; they just stop crowding this list.
     The table arrives with a migration, so its absence is not an
     error here, it simply means nothing is hidden yet. */
  let hiddenNames: string[] = [];
  if (!includeHidden && !name) {
    const { data: hidden } = await supabase
      .from("event_lexicon")
      .select("name")
      .eq("site_id", siteId)
      .eq("hidden", true);
    hiddenNames = (hidden ?? []).map((h: { name: string }) => h.name);
  }

  let q = supabase
    .from("events")
    .select(
      "id, type, event_name, event_props, path, url, title, visitor_id, session_id, device, browser, country, source, duration, created_at"
    )
    .eq("site_id", siteId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (kind === "custom") q = q.eq("type", "event");
  if (kind === "pageview") q = q.eq("type", "pageview");
  if (name) q = q.eq("event_name", name);
  if (path) q = q.ilike("path", `%${path}%`);
  if (visitor) q = q.eq("visitor_id", visitor);
  if (hiddenNames.length > 0) {
    // Rows with no name at all — pageviews, leaves — are never hidden
    // by a lexicon entry, so they have to survive this filter.
    q = q.or(
      `event_name.is.null,event_name.not.in.(${hiddenNames
        .map((n) => `"${n.replace(/"/g, '""')}"`)
        .join(",")})`
    );
  }
  if (before) q = q.lt("created_at", before);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  /* Names for the filter, from the most recent NAME_SCAN custom events.
     Postgres would do this in one grouped query, but that needs a
     function this deployment cannot add right now, and a name absent
     from the last two thousand events is not one you are looking for in
     a dropdown. The Lexicon screen is where exact counts belong. */
  const { data: nameRows } = await supabase
    .from("events")
    .select("event_name")
    .eq("site_id", siteId)
    .eq("type", "event")
    .gte("created_at", since)
    .not("event_name", "is", null)
    .order("created_at", { ascending: false })
    .limit(NAME_SCAN);

  const names = [
    ...new Set((nameRows ?? []).map((r: { event_name: string }) => r.event_name)),
  ]
    .filter((n) => includeHidden || !hiddenNames.includes(n))
    .sort();

  return NextResponse.json({
    events: page,
    names,
    next_before: hasMore ? page[page.length - 1].created_at : null,
  });
}
