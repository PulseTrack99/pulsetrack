import { createClient } from "@/lib/supabase/server";
import { FunnelsList } from "@/components/funnels-list";

export const metadata = {
  title: "Funnels",
};

export default async function FunnelsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Sites come from the dashboard layout's SiteProvider — the rail's
  // switcher decides which one this screen shows. Only the funnels are
  // fetched here, for every site at once, then filtered client-side so
  // switching site is instant instead of a round trip.
  const { data: funnels } = await supabase
    .from("funnels")
    .select(`
      id,
      name,
      site_id,
      created_at,
      funnel_steps (
        id,
        step_order,
        name,
        match_type,
        match_value
      )
    `)
    .order("created_at", { ascending: false });

  return <FunnelsList funnels={funnels || []} />;
}
