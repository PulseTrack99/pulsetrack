import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Saved behavioural-filter combinations for a site. Reuses exactly the
 * filter shape the session replay panel and the copilot already
 * produce (behavior, scroll_max, funnel_id, step, device, rage_only)
 * — a cohort is a name attached to that shape, nothing more.
 */

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const siteId = new URL(req.url).searchParams.get("site_id");
  if (!siteId) return NextResponse.json({ error: "site_id is required" }, { status: 400 });

  // No .eq("user_id", user.id) on a sites check here — RLS on cohorts
  // itself (has_account_access) already scopes the result correctly.
  const { data, error } = await supabase
    .from("cohorts")
    .select("id, name, behavior, scroll_max, funnel_id, step, device, rage_only, created_at")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Query failed" }, { status: 500 });
  return NextResponse.json({ cohorts: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const siteId = typeof body.site_id === "string" ? body.site_id : null;
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
  if (!siteId || !name) {
    return NextResponse.json({ error: "site_id and name are required" }, { status: 400 });
  }

  const VALID_BEHAVIORS = ["no_conversion", "low_scroll", "funnel_dropoff"];
  const behavior = VALID_BEHAVIORS.includes(body.behavior) ? body.behavior : null;

  const { data, error } = await supabase
    .from("cohorts")
    .insert({
      site_id: siteId,
      name,
      behavior,
      scroll_max: behavior === "low_scroll" ? Number(body.scroll_max) || 25 : null,
      funnel_id: behavior === "funnel_dropoff" && typeof body.funnel_id === "string" ? body.funnel_id : null,
      step: behavior === "funnel_dropoff" ? Number(body.step) || 0 : null,
      device: ["Desktop", "Mobile", "Tablet"].includes(body.device) ? body.device : null,
      rage_only: Boolean(body.rage_only),
    })
    .select("id, name, behavior, scroll_max, funnel_id, step, device, rage_only, created_at")
    .single();

  // RLS (site_id must resolve to an accessible site) turns an attempt
  // to save against a foreign site into a clean insert failure here.
  if (error) return NextResponse.json({ error: "Could not save cohort" }, { status: 500 });

  return NextResponse.json(data);
}
