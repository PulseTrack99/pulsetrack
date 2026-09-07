import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, planLimit } from "@/lib/plan";
import { resolveAccountOwner } from "@/lib/team";
import { isMissingSchema } from "@/lib/schema-guard";

/**
 * What the month's allowance is actually being spent on.
 *
 * A quota you can only see as one number tells you that you are at 80%,
 * never that 60% of it is a debug event somebody left running. The
 * breakdown is the part that lets you do something about it — and it is
 * where hiding and renaming an event stop being cosmetic.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const siteId = new URL(req.url).searchParams.get("site_id");
  if (!siteId) return NextResponse.json({ error: "site_id is required" }, { status: 400 });

  const plan = await getUserPlan(supabase, user.id);
  const limit = planLimit(plan, "events_per_month");

  // Usage is counted per account, not per site: the allowance is the
  // account's, and one site filling it starves the others.
  const owner = await resolveAccountOwner(supabase, user.id);
  const month = new Date();
  month.setUTCDate(1);
  month.setUTCHours(0, 0, 0, 0);

  const { data: counter } = await supabase
    .from("usage_counters")
    .select("events")
    .eq("user_id", owner)
    .eq("month", month.toISOString().slice(0, 10))
    .maybeSingle();

  // The named events of this month only — the same window the quota
  // uses, so the two figures can be read against each other.
  const { data: named, error } = await supabase.rpc("site_event_lexicon", {
    p_site: siteId,
    p_since: month.toISOString(),
  });

  if (error && !isMissingSchema(error)) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { count: pageviews } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("site_id", siteId)
    .eq("type", "pageview")
    .gte("created_at", month.toISOString());

  return NextResponse.json({
    plan,
    limit,
    used: counter?.events ?? 0,
    month: month.toISOString().slice(0, 7),
    pageviews: pageviews ?? 0,
    named: (named ?? []).map((e: { name: string; volume: number }) => ({
      name: e.name,
      volume: Number(e.volume),
    })),
  });
}
