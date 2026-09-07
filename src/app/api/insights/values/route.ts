import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * What the builder's dropdowns offer.
 *
 * Two things nobody can be expected to know by heart: which values a
 * field actually holds on this site, and which property keys the custom
 * events carry. Asking someone to type "Google" from memory — and to
 * spell it the way the tracker recorded it — is how a query builder
 * ends up returning nothing for no visible reason.
 */

const PERIODS: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90, "180d": 180, "365d": 365 };

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

  const days = PERIODS[searchParams.get("period") ?? "30d"] ?? 30;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const field = searchParams.get("field");

  // No field asked for means "what property keys exist", which is the
  // question the breakdown menu needs answered before it can offer any.
  const rpc = field
    ? supabase.rpc("insights_values", {
        p_site: siteId,
        p_since: since,
        p_field: field,
        p_limit: 50,
      })
    : supabase.rpc("insights_property_keys", {
        p_site: siteId,
        p_since: since,
        p_limit: 40,
      });

  const { data, error } = await rpc;

  if (error) {
    if (isMissingSchema(error)) {
      return NextResponse.json({ migration_pending: true, rows: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rows: data ?? [], migration_pending: false });
}
