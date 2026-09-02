import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Alert rules — v1 is a single rule per site (unique(site_id, type),
 * supabase/alerts.sql), so "manage alerts for this site" is really
 * just "upsert the one traffic_drop rule" rather than a list.
 */

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const siteId = new URL(req.url).searchParams.get("site_id");
  if (!siteId) return NextResponse.json({ error: "site_id is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("alert_rules")
    .select("id, type, threshold_pct, enabled, last_triggered_at")
    .eq("site_id", siteId)
    .eq("type", "traffic_drop")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Query failed" }, { status: 500 });
  return NextResponse.json({ rule: data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const siteId = typeof body.site_id === "string" ? body.site_id : null;
  const enabled = Boolean(body.enabled);
  const threshold = Math.max(1, Math.min(99, Number(body.threshold_pct) || 50));

  if (!siteId) return NextResponse.json({ error: "site_id is required" }, { status: 400 });

  // RLS (site_id must resolve to an accessible site) turns an attempt
  // to save against a foreign site into a clean failure here.
  const { data, error } = await supabase
    .from("alert_rules")
    .upsert(
      { site_id: siteId, type: "traffic_drop", threshold_pct: threshold, enabled },
      { onConflict: "site_id,type" }
    )
    .select("id, type, threshold_pct, enabled, last_triggered_at")
    .single();

  if (error) return NextResponse.json({ error: "Could not save alert" }, { status: 500 });
  return NextResponse.json({ rule: data });
}
