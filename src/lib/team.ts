import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Team members — one flat "member" role, full access except billing
 * and account deletion (src/app/api/settings/delete-account,
 * src/app/api/stripe/*, left keyed to the literal owner on purpose).
 * A person is an active member of at most one other account at a
 * time — no multi-team switcher in v1 (supabase/team.sql).
 */

/**
 * Resolves which account a caller is acting under: their own, if they
 * are not a member of anyone else's team, or the account of whoever
 * invited them. Everything billing- and quota-related (getUserPlan,
 * site creation) goes through this, so a member's own auth.uid()
 * never needs a subscription or sites of its own — they are always
 * working inside the owner's account.
 */
export async function resolveAccountOwner(
  supabase: SupabaseClient,
  callerId: string
): Promise<string> {
  const { data } = await supabase
    .from("team_members")
    .select("owner_user_id")
    .eq("member_user_id", callerId)
    .eq("status", "active")
    .maybeSingle();

  return data?.owner_user_id ?? callerId;
}
