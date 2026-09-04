import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getUserPlan, planHas } from "@/lib/plan";
import { getSiteRevenue } from "@/lib/revenue";

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
      return NextResponse.json(
        { error: "Missing site_id" },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: site } = await supabase
      .from("sites")
      .select("id")
      .eq("id", siteId)
      .single();

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    // A lapsed subscription should not keep showing revenue figures —
    // the data stays connected underneath, but stops being served.
    const plan = await getUserPlan(supabase, user.id);
    if (!planHas(plan, "revenue")) {
      return NextResponse.json(
        { error: "upgrade_required", plan, feature: "revenue" },
        { status: 402 }
      );
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const revenue = await getSiteRevenue(serviceSupabase, siteId, period);
    return NextResponse.json(revenue);
  } catch (err) {
    console.error("Revenue stats error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
