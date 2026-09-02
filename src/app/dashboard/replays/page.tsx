import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SessionReplayPanel } from "@/components/session-replay-panel";

export const metadata = {
  title: "Session Replay",
};

export default async function ReplaysPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: sites } = await supabase
    .from("sites")
    .select("id, name, domain")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-[-0.02em]">Session Replay</h1>
        <p className="mt-1 text-[13.5px] text-muted">
          Regardez vos visiteurs naviguer réellement sur votre site — chaque
          clic, chaque scroll, chaque hésitation.
        </p>
      </div>

      {/* useSearchParams (for the ?site=&path= cross-link from the
          heatmap view) requires a Suspense boundary around whatever
          reads it. */}
      <Suspense fallback={null}>
        <SessionReplayPanel sites={sites ?? []} />
      </Suspense>
    </div>
  );
}
