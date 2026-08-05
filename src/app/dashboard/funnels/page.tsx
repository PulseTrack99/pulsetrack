import { createClient } from "@/lib/supabase/server";
import { FunnelsList } from "@/components/funnels-list";

export default async function FunnelsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get user's sites
  const { data: sites } = await supabase
    .from("sites")
    .select("id, name, domain")
    .order("created_at", { ascending: false });

  // Get all funnels with their steps
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

  return <FunnelsList sites={sites || []} funnels={funnels || []} />;
}
