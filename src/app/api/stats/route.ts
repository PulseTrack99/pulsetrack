import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteStats } from "@/lib/stats";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("site_id");
    const period = searchParams.get("period") || "30d";

    if (!siteId) {
      return NextResponse.json({ error: "site_id is required" }, { status: 400 });
    }

    // No .eq("user_id", user.id) — RLS already scopes this to sites the
    // caller owns or was added to as a team member.
    const { data: site } = await supabase
      .from("sites")
      .select("id")
      .eq("id", siteId)
      .maybeSingle();

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    return NextResponse.json(await getSiteStats(supabase, siteId, period));
  } catch (err) {
    console.error("Stats error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
