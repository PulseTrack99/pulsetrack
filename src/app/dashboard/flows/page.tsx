import { createClient } from "@/lib/supabase/server";
import { FlowPanel } from "@/components/flow-panel";

export const metadata = {
  title: "Flows",
};

export default async function FlowsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: sites } = await supabase
    .from("sites")
    .select("id, name, domain")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-[-0.02em]">Flows</h1>
        <p className="mt-1 text-[13.5px] text-muted">
          Le parcours réel de vos visiteurs entre les pages — pas un funnel
          défini à l&apos;avance, ce qui se passe vraiment.
        </p>
      </div>

      <FlowPanel sites={sites ?? []} />
    </div>
  );
}
