import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveApiKey, isApiKeyRateLimited } from "@/lib/api-keys";
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
 *
 * resolveApiKey/isApiKeyRateLimited (src/lib/api-keys.ts) are shared
 * with the MCP server (src/app/api/mcp/route.ts) so both surfaces enforce
 * the exact same validity rules and count against the same quota.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    const resolved = await resolveApiKey(supabase, match[1].trim());
    if (!resolved) {
      return NextResponse.json(
        { error: "Invalid, revoked API key, or this site's plan no longer includes API access" },
        { status: 401 }
      );
    }

    if (isApiKeyRateLimited(resolved.keyId)) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const period = new URL(req.url).searchParams.get("period") || "30d";
    if (!(period in PERIOD_DAYS)) {
      return NextResponse.json(
        { error: `period must be one of: ${Object.keys(PERIOD_DAYS).join(", ")}` },
        { status: 400 }
      );
    }

    const { site } = resolved;
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
