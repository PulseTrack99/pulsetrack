import { createClient } from "@/lib/supabase/server";
import { PricingCards } from "@/components/pricing-cards";
import { UsageSummary, type Usage } from "@/components/usage-summary";
import { getUserPlan } from "@/lib/plan";
import { resolveAccountOwner } from "@/lib/team";

export default async function UpgradePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // getUserPlan (not a raw subscriptions read) so a canceled/past_due
  // subscription correctly falls back to free, and so a team member
  // sees the account they were invited into rather than "free" for
  // having no subscription of their own.
  const currentPlan = await getUserPlan(supabase, user.id);

  // usage_summary rows are keyed by the account owner's id, not
  // whichever team member is looking — same reasoning as
  // canRecordReplay/canUseCopilot in src/lib/plan.ts.
  const accountOwnerId = await resolveAccountOwner(supabase, user.id);
  const { data: usageRows } = await supabase.rpc("usage_summary", {
    p_user: accountOwnerId,
  });
  const usage = (usageRows?.[0] ?? null) as Usage | null;

  return (
    <div className="space-y-6">
      {usage && (
        <div className="mx-auto max-w-lg">
          <UsageSummary usage={usage} />
        </div>
      )}
      <PricingCards currentPlan={currentPlan} />
    </div>
  );
}
