import { createClient } from "@/lib/supabase/server";
import { SettingsPanel } from "@/components/settings-panel";
import { getUserPlan, planHas } from "@/lib/plan";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get user's sites
  const { data: sites } = await supabase
    .from("sites")
    .select("id, name, domain, created_at, public_share_id")
    .order("created_at", { ascending: false });

  // getUserPlan (not a raw subscriptions read) so a canceled or
  // past_due subscription correctly falls back to free here too —
  // this page used to read the row directly and would keep showing a
  // lapsed plan's label and capabilities.
  const currentPlan = await getUserPlan(supabase, user.id);

  return (
    <SettingsPanel
      user={user}
      sites={sites || []}
      currentPlan={currentPlan}
      hasApiAccess={planHas(currentPlan, "api")}
    />
  );
}
