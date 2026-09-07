import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * The one screen whose question comes from the person asking it.
 *
 * Everything else answers something decided in advance — the home shows
 * traffic, funnels show a path someone configured. Nothing could answer
 * "how many visitors from LinkedIn fired checkout_completed, by week,
 * split by plan". This can.
 *
 * The shapes below are validated here and again in SQL. Not because one
 * of the two is unreliable, but because a rejected value should produce
 * a 400 that names the problem rather than an empty chart the person has
 * to interpret.
 */

const MEASURES = ["pageviews", "sessions", "visitors", "events", "event_visitors"] as const;
const GRAINS = ["day", "week", "month"] as const;

/** Breakdown and filter fields, mirroring insights_dimension in SQL.
 *  A custom event property is addressed as `prop:<key>`. */
const FIELDS = [
  "path", "source", "country", "device", "browser",
  "language", "utm_medium", "utm_campaign", "event_name", "referrer",
] as const;

const PERIODS: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90, "180d": 180, "365d": 365 };

function isField(v: string): boolean {
  return (FIELDS as readonly string[]).includes(v) || /^prop:[\w.-]{1,60}$/.test(v);
}

function isMissingSchema(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return (
    err.code === "42883" ||
    err.code === "42P01" ||
    err.code === "PGRST202" ||
    /does not exist|schema cache/i.test(err.message ?? "")
  );
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

  const measure = searchParams.get("measure") ?? "pageviews";
  if (!(MEASURES as readonly string[]).includes(measure)) {
    return NextResponse.json({ error: "unknown measure" }, { status: 400 });
  }

  const grainRaw = searchParams.get("grain");
  // No grain is a legitimate request, not a missing one: it asks for a
  // ranking over the whole period rather than a line over time.
  const grain = grainRaw && (GRAINS as readonly string[]).includes(grainRaw) ? grainRaw : null;

  const breakdown = searchParams.get("breakdown");
  if (breakdown && !isField(breakdown)) {
    return NextResponse.json({ error: "unknown breakdown field" }, { status: 400 });
  }

  let filters: { field: string; value: string }[] = [];
  const rawFilters = searchParams.get("filters");
  if (rawFilters) {
    try {
      const parsed = JSON.parse(rawFilters);
      if (!Array.isArray(parsed)) throw new Error("not an array");
      filters = parsed.slice(0, 8);
    } catch {
      return NextResponse.json({ error: "filters must be a JSON array" }, { status: 400 });
    }
    for (const f of filters) {
      if (!f || typeof f.field !== "string" || typeof f.value !== "string" || !isField(f.field)) {
        return NextResponse.json({ error: "invalid filter" }, { status: 400 });
      }
    }
  }

  const days = PERIODS[searchParams.get("period") ?? "30d"] ?? 30;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data, error } = await supabase.rpc("insights_query", {
    p_site: siteId,
    p_since: since,
    p_until: null,
    p_measure: measure,
    p_event_name: searchParams.get("event_name") || null,
    p_breakdown: breakdown || null,
    p_grain: grain,
    p_filters: filters.length ? filters : null,
    p_limit: 12,
  });

  if (error) {
    if (isMissingSchema(error)) {
      return NextResponse.json({ migration_pending: true, rows: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    rows: data ?? [],
    measure,
    grain,
    breakdown: breakdown || null,
    migration_pending: false,
  });
}
