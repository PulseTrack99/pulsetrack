import { createClient } from "@/lib/supabase/server";
import { SettingsPanel } from "@/components/settings-panel";

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

  return <SettingsPanel user={user} sites={sites || []} />;
}
