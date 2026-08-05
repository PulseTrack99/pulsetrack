import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// DELETE — Delete a site and all its data
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: siteId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user owns this site
    const { data: site } = await supabase
      .from("sites")
      .select("id")
      .eq("id", siteId)
      .eq("user_id", user.id)
      .single();

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    // Use service role to cascade delete
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Delete events
    await serviceSupabase.from("events").delete().eq("site_id", siteId);

    // Delete funnel steps then funnels
    const { data: funnels } = await serviceSupabase
      .from("funnels")
      .select("id")
      .eq("site_id", siteId);

    const funnelIds = (funnels || []).map((f) => f.id);
    if (funnelIds.length > 0) {
      await serviceSupabase
        .from("funnel_steps")
        .delete()
        .in("funnel_id", funnelIds);
      await serviceSupabase.from("funnels").delete().eq("site_id", siteId);
    }

    // Delete the site
    await serviceSupabase.from("sites").delete().eq("id", siteId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Site deletion error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
