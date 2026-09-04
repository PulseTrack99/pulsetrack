import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, planHas } from "@/lib/plan";

/**
 * Latest proactive-insights digest for a site (src/app/api/cron/
 * weekly-insights writes these) — read-only, no model call, so
 * opening the dashboard never costs anything even if the widget is
 * viewed constantly.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const siteId = new URL(req.url).searchParams.get("site_id");
  if (!siteId) return NextResponse.json({ error: "site_id is required" }, { status: 400 });

  const plan = await getUserPlan(supabase, user.id);
  if (!planHas(plan, "ai_copilot")) {
    return NextResponse.json({ error: "upgrade_required", plan, feature: "ai_copilot" }, { status: 402 });
  }

  const { data, error } = await supabase
    .from("insight_digests")
    .select("week_start, summary, flagged")
    .eq("site_id", siteId)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Query failed" }, { status: 500 });
  return NextResponse.json({ digest: data });
}
