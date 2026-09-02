import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hashApiKey } from "@/lib/api-keys";
import { getUserPlan, planHas } from "@/lib/plan";
import { getSiteStats, PERIOD_DAYS } from "@/lib/stats";

/**
 * Public read API: aggregated stats for the key's own site.
 *
 * Authenticated by "Authorization: Bearer <key>" instead of a Supabase
 * session — this is the first route in the app external code is meant
 * to call, so it never trusts a client-supplied site_id the way the
 * dashboard-only routes safely can. The key IS the site: whichever
 * site the key was issued for is the only one it can ever read,
 * decided by the row the hash matches rather than anything the caller
 * sends. Reuses getSiteStats, the same source the dashboard overview
 * and the CSV export both read, so this can never disagree with what
 * the account owner already sees on screen.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Self-contained in-memory limiter, same shape as the tracker ingest
// route's (src/app/api/track/route.ts) — per key rather than per IP,
// since a key is the identity that matters here.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;
const RATE_WINDOW = 60_000;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const match = auth.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return NextResponse.json(
        { error: "Missing Authorization: Bearer <key> header" },
        { status: 401 }
      );
    }
    const plaintext = match[1].trim();
    const hash = hashApiKey(plaintext);

    const { data: key } = await supabase
      .from("api_keys")
      .select("id, site_id")
      .eq("key_hash", hash)
      .is("revoked_at", null)
      .maybeSingle();

    if (!key) {
      return NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 });
    }

    if (isRateLimited(key.id)) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const { data: site } = await supabase
      .from("sites")
      .select("id, user_id, name, domain")
      .eq("id", key.site_id)
      .maybeSingle();

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    // Checked on every call, not only at key issuance — a downgrade
    // after the key was created must take effect immediately.
    const plan = await getUserPlan(supabase, site.user_id);
    if (!planHas(plan, "api")) {
      return NextResponse.json({ error: "This site's plan no longer includes API access" }, { status: 403 });
    }

    const period = new URL(req.url).searchParams.get("period") || "30d";
    if (!(period in PERIOD_DAYS)) {
      return NextResponse.json(
        { error: `period must be one of: ${Object.keys(PERIOD_DAYS).join(", ")}` },
        { status: 400 }
      );
    }

    // Best-effort; a failed write here should never fail the request.
    supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", key.id)
      .then(() => {});

    const stats = await getSiteStats(supabase, site.id, period);

    return NextResponse.json({
      site: { name: site.name, domain: site.domain },
      period,
      ...stats,
    });
  } catch (err) {
    console.error("Public API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
