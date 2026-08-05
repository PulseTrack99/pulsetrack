import { createClient } from "@/lib/supabase/server";
import { DashboardContent } from "@/components/dashboard-content";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch user's sites
  const { data: sites } = await supabase
    .from("sites")
    .select("*")
    .order("created_at", { ascending: false });

  return <DashboardContent sites={sites || []} />;
}
