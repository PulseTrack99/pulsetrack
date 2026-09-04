import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Persistent rate limiting via the check_rate_limit() Postgres
 * function (supabase/rate-limits.sql) — a fixed-window counter that
 * survives across serverless invocations, unlike an in-memory Map
 * (which every route in this app used until now, and which resets
 * silently on every Vercel cold start / across every instance, so it
 * never reliably enforced anything under real traffic).
 *
 * `key` should namespace the caller — "apikey:<id>", "oauth:<token
 * id>", "ip:<address>" — so different call sites can't collide.
 * Returns true when the caller is still within the limit.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  key: string,
  limit: number,
  windowSeconds = 60
): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_window_seconds: windowSeconds,
    p_limit: limit,
  });
  // Fail open on an infra error — a rate limiter that itself takes
  // the app down defeats the purpose. The window is short (60s by
  // default), so a transient DB blip costs at most a brief lapse in
  // enforcement, not an outage.
  if (error) {
    console.error("check_rate_limit failed, allowing request:", error);
    return true;
  }
  return data === true;
}
