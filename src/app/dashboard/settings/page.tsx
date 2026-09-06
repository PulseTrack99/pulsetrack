import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { SettingsPanel } from "@/components/settings-panel";
import { getUserPlan, planHas } from "@/lib/plan";
import { resolveAccountOwner } from "@/lib/team";

const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

  // Owner vs member changes what the "Équipe" section shows — a
  // member sees who they're working under instead of an invite panel
  // (src/app/api/team is owner-only, see supabase/team.sql).
  const accountOwnerId = await resolveAccountOwner(supabase, user.id);
  let ownerEmail: string | null = null;
  if (accountOwnerId !== user.id) {
    const { data } = await serviceSupabase.auth.admin.getUserById(accountOwnerId);
    ownerEmail = data.user?.email ?? null;
  }

  return (
    // The panel reads ?tab= so the rail can link straight to a
    // section; useSearchParams needs a boundary around whatever reads it.
    <Suspense fallback={null}>
    <SettingsPanel
      user={user}
      // Resolved server-side: the panel used to read
      // window.location.origin while rendering the public share link,
      // which throws during SSR and dropped this page to client-only
      // rendering with a 500 in the logs.
      origin={process.env.NEXT_PUBLIC_SITE_URL ?? "https://pulsetrack.eu"}
      sites={sites || []}
      currentPlan={currentPlan}
      hasApiAccess={planHas(currentPlan, "api")}
      teamOwnerEmail={ownerEmail}
    />
    </Suspense>
  );
}
