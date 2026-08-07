import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSiteStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;

    // Service role: this endpoint is public, so there is no session to
    // authorise against. The share id is the capability — it resolves to
    // exactly one site and nothing else is readable through it.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: site } = await supabase
      .from("sites")
      .select("id, name, domain")
      .eq("public_share_id", shareId)
      .maybeSingle();

    if (!site) {
      return NextResponse.json(
        { error: "Dashboard not found or not public" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "30d";

    // Same aggregation as the private dashboard, so the two can never
    // disagree about the same site. Revenue is not part of it and stays
    // out of public view.
    const stats = await getSiteStats(supabase, site.id, period);

    return NextResponse.json({
      site: { name: site.name, domain: site.domain },
      period,
      ...stats,
    });
  } catch (err) {
    console.error("Public stats error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
