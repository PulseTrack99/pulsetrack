import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * One person's history.
 *
 * A POST for what is plainly a read, because the parameter is an email
 * address: query strings end up in server logs, proxy logs, browser
 * history and referrer headers, and none of those are places to put a
 * customer's customers.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const siteId: string | undefined = body?.site_id;
  const email: string | undefined = body?.email;
  if (!siteId || !email) {
    return NextResponse.json({ error: "site_id and email are required" }, { status: 400 });
  }

  const { data: site } = await supabase
    .from("sites")
    .select("id")
    .eq("id", siteId)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // The sessions this person was identified in — the only bridge
  // between an email and any behaviour at all.
  const { data: ids } = await service
    .from("session_identities")
    .select("session_id, identified_at")
    .eq("site_id", siteId)
    .eq("email", email)
    .order("identified_at", { ascending: false })
    .limit(200);

  const sessionIds = (ids ?? []).map((r) => r.session_id as string);
  if (sessionIds.length === 0) {
    return NextResponse.json({ profile: { email, sessions: [], events: [], revenue: [] } });
  }

  const { data: events } = await supabase
    .from("events")
    .select("id, type, event_name, event_props, path, source, device, browser, country, created_at, session_id")
    .eq("site_id", siteId)
    .in("session_id", sessionIds.slice(0, 100))
    .order("created_at", { ascending: false })
    .limit(300);

  const { data: revenue } = await supabase
    .from("revenue_events")
    .select("amount, currency, source, landing_page, stripe_created_at")
    .eq("site_id", siteId)
    .eq("customer_email", email)
    .order("stripe_created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({
    profile: {
      email,
      identified_at: ids?.[0]?.identified_at ?? null,
      sessions: sessionIds,
      events: events ?? [],
      revenue: revenue ?? [],
    },
  });
}
