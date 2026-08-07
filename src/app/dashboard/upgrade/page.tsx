import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { PricingCards } from "@/components/pricing-cards";
import { UsageSummary, type Usage } from "@/components/usage-summary";

export default async function UpgradePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: sub } = await serviceSupabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .single();

  const currentPlan = sub?.plan || "free";

  // Reads the same usage_summary the quota triggers enforce against, so
  // this can never disagree with what the limits actually do.
  const { data: usageRows } = await supabase.rpc("usage_summary", {
    p_user: user.id,
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
