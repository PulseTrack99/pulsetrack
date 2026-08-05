import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// DELETE — Delete user account and all their data
export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use service role to delete data and user
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all user's sites
    const { data: sites } = await serviceSupabase
      .from("sites")
      .select("id")
      .eq("user_id", user.id);

    const siteIds = (sites || []).map((s) => s.id);

    if (siteIds.length > 0) {
      // Delete all events for user's sites
      await serviceSupabase.from("events").delete().in("site_id", siteIds);

      // Delete all funnel steps for user's funnels
      const { data: funnels } = await serviceSupabase
        .from("funnels")
        .select("id")
        .in("site_id", siteIds);

      const funnelIds = (funnels || []).map((f) => f.id);
      if (funnelIds.length > 0) {
        await serviceSupabase
          .from("funnel_steps")
          .delete()
          .in("funnel_id", funnelIds);
      }

      // Delete funnels
      await serviceSupabase.from("funnels").delete().in("site_id", siteIds);

      // Delete sites
      await serviceSupabase.from("sites").delete().eq("user_id", user.id);
    }

    // Delete the user from auth
    const { error } = await serviceSupabase.auth.admin.deleteUser(user.id);

    if (error) {
      console.error("Delete user error:", error);
      return NextResponse.json(
        { error: "Impossible de supprimer le compte" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Account deletion error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
