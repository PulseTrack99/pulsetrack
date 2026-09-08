import { createClient } from "@/lib/supabase/server";
import { isMissingSchema } from "@/lib/schema-guard";
import { FunnelsList } from "@/components/funnels-list";

export const metadata = {
  title: "Funnels",
};

const SELECT = `
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
`;

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
  //
  // Archived funnels come down with the rest rather than being left
  // out: the screen lists them apart and restores one in place, which
  // it could not do without holding them.
  const withArchive = await supabase
    .from("funnels")
    .select(`${SELECT}, archived_at`)
    .order("created_at", { ascending: false });

  // supabase/funnel-archive.sql may not have run yet. Falling back to
  // the query without the column keeps the screen working exactly as
  // it did before, rather than emptying the list over a column.
  const { data: funnels } = isMissingSchema(withArchive.error)
    ? await supabase.from("funnels").select(SELECT).order("created_at", { ascending: false })
    : withArchive;

  return (
    <FunnelsList
      funnels={funnels || []}
      canArchive={!isMissingSchema(withArchive.error)}
    />
  );
}
