import { createClient } from "@/lib/supabase/server";
import { RevenuePanel } from "@/components/revenue-panel";

export default async function RevenuePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get user's first site (or selected site from query params)
  const { data: sites } = await supabase
    .from("sites")
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(1);

  if (!sites || sites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted">
          Ajoute d&apos;abord un site pour utiliser le Revenue Tracking.
        </p>
        <a
          href="/dashboard/sites/new"
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          Ajouter un site
        </a>
      </div>
    );
  }

  return <RevenuePanel siteId={sites[0].id} />;
}
