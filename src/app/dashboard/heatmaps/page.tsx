import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { HeatmapPanel } from "@/components/heatmap-panel";

export const metadata = {
  title: "Heatmaps",
};

export default async function HeatmapsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // No .eq("user_id", user.id) — RLS already scopes this to sites the
  // caller owns or was added to as a team member.
  const { data: sites } = await supabase
    .from("sites")
    .select("id, name, domain")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-[-0.02em]">Heatmaps</h1>
        <p className="mt-1 text-[13.5px] text-muted">
          Où vos visiteurs cliquent, jusqu&apos;où ils scrollent, et ce sur quoi
          ils s&apos;acharnent sans résultat.
        </p>
      </div>

      {/* useSearchParams (for the ?site=&path= cross-link from a replay)
          requires a Suspense boundary around whatever reads it. */}
      <Suspense fallback={null}>
        <HeatmapPanel sites={sites ?? []} />
      </Suspense>
    </div>
  );
}
