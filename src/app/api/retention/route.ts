import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchema } from "@/lib/schema-guard";

/**
 * Cohort retention, over identified people only.
 *
 * The function is SECURITY DEFINER and checks access itself, so this
 * route calls it through the caller's own client — no elevated
 * credential passes through here. Somebody without access to the site
 * gets an empty result rather than an error that would tell them the
 * site exists.
 */

const PERIODS: Record<string, number> = { "30d": 30, "90d": 90, "180d": 180, "365d": 365 };
const GRAINS = ["day", "week", "month"] as const;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("site_id");
  if (!siteId) return NextResponse.json({ error: "site_id is required" }, { status: 400 });

  const grainRaw = searchParams.get("grain") ?? "week";
  const grain = (GRAINS as readonly string[]).includes(grainRaw) ? grainRaw : "week";

  const days = PERIODS[searchParams.get("period") ?? "180d"] ?? 180;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data, error } = await supabase.rpc("retention_cohorts", {
    p_site: siteId,
    p_since: since,
    p_grain: grain,
  });

  if (error) {
    if (isMissingSchema(error)) return NextResponse.json({ migration_pending: true, rows: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rows: data ?? [], grain, migration_pending: false });
}
