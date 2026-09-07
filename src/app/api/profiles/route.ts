import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { scanRows } from "@/lib/scan";

/**
 * People, as opposed to visitors.
 *
 * A visitor here lasts one day by construction — the id is a hash of a
 * salt that is destroyed nightly (src/lib/visitor.ts), which is what
 * spares customers a consent banner. A profile is the other thing
 * entirely: it exists because the customer's own application called
 * pulsetrack.identify(email) and told us who someone is.
 *
 * That distinction is the whole design. We are not tracking harder to
 * get durable identity; we are showing the identity the customer
 * already had, for the people who gave it to them. It is also exactly
 * how Mixpanel's Users screen works — their distinct_id comes from
 * their customer's own account system, not from fingerprinting.
 *
 * session_identities has RLS enabled and no policy, so no signed-in
 * user can read it at all: only the service role. Ownership is
 * therefore checked first, through the caller's own client, and
 * nothing elevated runs until that passes.
 */

const PERIODS: Record<string, number> = {
  "7d": 7, "30d": 30, "90d": 90, "180d": 180, "365d": 365,
};

/** Identifications read before grouping. */
const SCAN = 3000;
/** Profiles returned, most recently seen first. */
const MAX_PROFILES = 200;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("site_id");
  if (!siteId) return NextResponse.json({ error: "site_id is required" }, { status: 400 });

  // Ownership, through the caller's own RLS. Everything below may use
  // elevated access, so nothing below it runs until this passes.
  const { data: site } = await supabase
    .from("sites")
    .select("id")
    .eq("id", siteId)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const days = PERIODS[searchParams.get("period") ?? "90d"] ?? 90;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { rows: identities, truncated, error } = await scanRows<{
    email: string;
    session_id: string;
    identified_at: string;
  }>(
    (from, to) =>
      service
        .from("session_identities")
        .select("email, session_id, identified_at")
        .eq("site_id", siteId)
        .gte("identified_at", since)
        .order("identified_at", { ascending: false })
        .range(from, to),
    SCAN
  );

  if (error) return NextResponse.json({ error }, { status: 500 });

  const byEmail = new Map<
    string,
    { sessions: Set<string>; first_at: string; last_at: string }
  >();

  // Rows arrive newest first, so the first seen for an email is its
  // most recent identification and the last seen is its earliest.
  for (const r of identities) {
    let p = byEmail.get(r.email);
    if (!p) {
      p = { sessions: new Set(), first_at: r.identified_at, last_at: r.identified_at };
      byEmail.set(r.email, p);
    }
    p.sessions.add(r.session_id);
    p.first_at = r.identified_at;
  }

  const profiles = [...byEmail.entries()]
    .sort((a, b) => (a[1].last_at < b[1].last_at ? 1 : -1))
    .slice(0, MAX_PROFILES);

  /* Revenue reads through the caller's own client: revenue_events has a
     policy, so RLS decides, and the elevated client stays confined to
     the one table that has none. */
  const { data: revenue } = await supabase
    .from("revenue_events")
    .select("customer_email, amount, currency")
    .eq("site_id", siteId)
    .not("customer_email", "is", null);

  const earned = new Map<string, { amount: number; currency: string; count: number }>();
  for (const r of revenue ?? []) {
    const key = r.customer_email as string;
    const cur = earned.get(key) ?? { amount: 0, currency: r.currency ?? "eur", count: 0 };
    cur.amount += Number(r.amount ?? 0);
    cur.count += 1;
    earned.set(key, cur);
  }

  return NextResponse.json({
    truncated,
    profiles: profiles.map(([email, p]) => ({
      email,
      sessions: p.sessions.size,
      first_at: p.first_at,
      last_at: p.last_at,
      revenue: earned.get(email)?.amount ?? 0,
      currency: earned.get(email)?.currency ?? null,
      payments: earned.get(email)?.count ?? 0,
    })),
  });
}
