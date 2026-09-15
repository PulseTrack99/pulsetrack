import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runInsights } from "@/lib/insights";

/**
 * The one screen whose question comes from the person asking it.
 *
 * Everything else answers something decided in advance — the home shows
 * traffic, funnels show a path someone configured. Nothing could answer
 * "how many visitors from LinkedIn fired checkout_completed, by week,
 * split by plan". This can.
 *
 * The computation lives in src/lib/insights.ts, shared with the MCP
 * server so an AI assistant gets exactly the figure this screen shows.
 * This route only checks who is asking; RLS and the RPC's own site
 * filter decide what they may see.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("site_id");
  if (!siteId) return NextResponse.json({ error: "site_id is required" }, { status: 400 });

  const outcome = await runInsights(supabase, siteId, searchParams);
  return NextResponse.json(outcome.body, { status: outcome.status });
}
