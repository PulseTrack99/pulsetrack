import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, planHas } from "@/lib/plan";

/**
 * Where a site's data goes out, and who last took some.
 *
 * Every channel here is configured in Settings and stays configured
 * there — one place to change a thing is worth more than a second place
 * that looks like Mixpanel. What this adds instead is the view nobody
 * had: all the outbound channels at once, each with its live state and
 * its last activity.
 *
 * The last-activity part is the reason it earns a screen. api_keys and
 * oauth_tokens have carried last_used_at all along and nothing ever
 * displayed it, so "an AI client read my analytics this afternoon" was
 * a fact sitting in the database that no customer could see.
 *
 * Stripe is deliberately absent: money flows *in* from it. A screen
 * called Destinations that also lists a source teaches the wrong model.
 */

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const plan = await getUserPlan(supabase, user.id);

  // RLS scopes all four reads to sites the caller can access, so a
  // teammate sees the account's channels and nobody else's.
  const [sites, keys, tokens, rules] = await Promise.all([
    supabase.from("sites").select("id, name, domain, public_share_id"),
    supabase
      .from("api_keys")
      .select("id, site_id, name, key_prefix, last_used_at, revoked_at")
      .is("revoked_at", null),
    supabase
      .from("oauth_tokens")
      .select("client_name, scope, site_id, last_used_at, revoked_at")
      .is("revoked_at", null),
    supabase.from("alert_rules").select("site_id, enabled, threshold_pct, webhook_url, last_triggered_at"),
  ]);

  const siteRows = sites.data ?? [];
  const keyRows = keys.data ?? [];
  const tokenRows = tokens.data ?? [];
  const ruleRows = rules.data ?? [];

  /** The most recent of a set of timestamps, or null if none. */
  function latest(values: (string | null | undefined)[]): string | null {
    const real = values.filter(Boolean) as string[];
    return real.length ? real.sort().at(-1)! : null;
  }

  return NextResponse.json({
    plan,
    has_api: planHas(plan, "api"),
    has_csv: planHas(plan, "csv_export"),
    sites: siteRows.map((s) => ({
      id: s.id,
      name: s.name,
      domain: s.domain,
      public_share_id: s.public_share_id,
    })),
    mcp: tokenRows.map((t) => ({
      client_name: t.client_name,
      scope: t.scope,
      site_id: t.site_id,
      last_used_at: t.last_used_at,
    })),
    api_keys: keyRows.map((k) => ({
      id: k.id,
      site_id: k.site_id,
      name: k.name,
      key_prefix: k.key_prefix,
      last_used_at: k.last_used_at,
    })),
    alerts: ruleRows.map((r) => ({
      site_id: r.site_id,
      enabled: r.enabled,
      threshold_pct: r.threshold_pct,
      webhook_url: r.webhook_url,
      last_triggered_at: r.last_triggered_at,
    })),
    last_read: latest([
      ...keyRows.map((k) => k.last_used_at),
      ...tokenRows.map((t) => t.last_used_at),
    ]),
  });
}
