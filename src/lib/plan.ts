import type { SupabaseClient } from "@supabase/supabase-js";
import { PLANS, type PlanKey } from "./stripe";

/**
 * Plan entitlement lookups.
 *
 * Everything the pricing table sells is decided here, so the limits in
 * src/lib/stripe.ts are the single source of truth rather than something
 * only the marketing copy knows about.
 */

export type Capability = keyof (typeof PLANS)["business"]["capabilities"];

function isPlanKey(v: string): v is PlanKey {
  return v in PLANS;
}

/** The plan a user is actually on. Anything not active falls back to free. */
export async function getUserPlan(
  supabase: SupabaseClient,
  userId: string
): Promise<PlanKey> {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return "free";

  // past_due and canceled subscriptions lose paid capabilities but keep
  // the account and its data intact.
  const live = data.status === "active" || data.status === "trialing";
  if (!live) return "free";

  return isPlanKey(data.plan) ? data.plan : "free";
}

/** The plan that owns a site — used by ingest routes, which have no session. */
export async function getPlanForSite(
  supabase: SupabaseClient,
  siteId: string
): Promise<PlanKey> {
  const { data: site } = await supabase
    .from("sites")
    .select("user_id")
    .eq("id", siteId)
    .maybeSingle();

  if (!site?.user_id) return "free";
  return getUserPlan(supabase, site.user_id);
}

export function planHas(plan: PlanKey, capability: Capability): boolean {
  return PLANS[plan].capabilities[capability];
}

export function planLimit(
  plan: PlanKey,
  limit: keyof (typeof PLANS)["free"]["limits"]
): number {
  return PLANS[plan].limits[limit];
}

/** -1 means unlimited, so every finite count is under it. */
export function isWithinLimit(limit: number, current: number): boolean {
  return limit === -1 || current < limit;
}

/** Oldest timestamp a plan is allowed to query back to. */
export function retentionCutoff(plan: PlanKey): Date {
  const days = PLANS[plan].limits.retention_days;
  return new Date(Date.now() - days * 86_400_000);
}

/**
 * Records an event against this month's allowance and says whether the
 * plan still has room.
 *
 * The counter is a single row per user per month, incremented and read
 * back in one round trip, so checking the cap never means counting the
 * event log.
 */
export async function recordEvent(
  supabase: SupabaseClient,
  userId: string,
  plan: PlanKey
): Promise<{ withinQuota: boolean; used: number; limit: number }> {
  const limit = PLANS[plan].limits.events_per_month;

  const { data, error } = await supabase.rpc("bump_usage", {
    p_user: userId,
    p_n: 1,
  });

  // If the counter is unreachable, keep collecting. Losing a customer's
  // analytics because a quota table hiccuped is the worse failure.
  if (error) {
    console.error("usage counter failed:", error.message);
    return { withinQuota: true, used: 0, limit };
  }

  const used = Number(data ?? 0);
  return { withinQuota: used <= limit, used, limit };
}

/** Owner of a site, for ingest routes that have no session. */
export async function getSiteOwner(
  supabase: SupabaseClient,
  siteId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("sites")
    .select("user_id")
    .eq("id", siteId)
    .maybeSingle();
  return data?.user_id ?? null;
}
