import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Install status per site: has this site ever sent us anything, when
 * was the last time, and how much in the last 30 days.
 *
 * Two callers, one shape:
 *  - /dashboard/sites lists every site with its status;
 *  - the setup guide polls this with ?site_id= while it waits for the
 *    very first event, which is what turns "en écoute…" into "données
 *    reçues" without the user having to guess whether the script works.
 *
 * Both queries ride idx_events_site_created (site_id, created_at DESC).
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const only = new URL(req.url).searchParams.get("site_id");

    // No .eq("user_id", …) — RLS already scopes this to sites the caller
    // owns or was added to as a team member.
    let query = supabase.from("sites").select("id").order("created_at");
    if (only) query = query.eq("id", only);
    const { data: sites } = await query;

    if (!sites || sites.length === 0) {
      return NextResponse.json({ sites: [] });
    }

    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

    const statuses = await Promise.all(
      sites.map(async (site) => {
        const [lastRes, countRes] = await Promise.all([
          supabase
            .from("events")
            .select("created_at")
            .eq("site_id", site.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("events")
            .select("id", { count: "exact", head: true })
            .eq("site_id", site.id)
            .gte("created_at", since),
        ]);

        return {
          id: site.id,
          last_event_at: lastRes.data?.created_at ?? null,
          events_30d: countRes.count ?? 0,
        };
      })
    );

    return NextResponse.json({ sites: statuses });
  } catch (err) {
    console.error("Site status error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
