import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { deleteSessionReplay } from "@/lib/replay-storage";
import { getUserPlan } from "@/lib/plan";
import { PLANS } from "@/lib/stripe";

/**
 * Enforces the retention window every plan advertises (30/90/180/365
 * days) — until now, retentionCutoff() existed in src/lib/plan.ts but
 * nothing ever called it: no query filtered by it, nothing ever
 * deleted anything, so every account's data was kept forever
 * regardless of plan. The same "promised, not built" gap this project
 * has closed for CSV export and API access, except this one sits
 * directly under the privacy-first claim the whole product is sold
 * on — a real, provable "your data is actually deleted" is something
 * Google Analytics cannot say about its own retention.
 *
 * Runs daily via Vercel Cron (vercel.json). Session replays get the
 * most care: their event payload lives in Storage, not just a DB row,
 * so it needs its own delete call (src/lib/replay-storage.ts) before
 * the row goes — leaving Storage segments behind would mean the most
 * sensitive data type in the whole system silently outliving every
 * other table's purge.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Cap per table per site per run — keeps one invocation bounded even
// if a site has years of backlog to work through; a daily cron simply
// catches up a bit more each run rather than needing to finish in one go.
const BATCH = 500;

// PostgREST doesn't support LIMIT on a DELETE, so these run unbounded
// per site — fine at this project's current data volumes; the
// session_replays loop below is the one that actually needs batching,
// since each expired replay costs a Storage call, not just a row.
async function deleteOlderThan(
  table: string,
  column: string,
  siteId: string,
  cutoff: string
): Promise<number> {
  const { data, error } = await supabase
    .from(table)
    .delete()
    .eq("site_id", siteId)
    .lt(column, cutoff)
    .select("id");
  if (error) throw new Error(`${table}: ${error.message}`);
  return data?.length ?? 0;
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = {
    sites_processed: 0,
    replays_deleted: 0,
    events_deleted: 0,
    interactions_deleted: 0,
    snapshots_deleted: 0,
    copilot_queries_deleted: 0,
    revenue_events_deleted: 0,
    session_identities_deleted: 0,
    errors: [] as string[],
  };

  const { data: sites, error: sitesError } = await supabase.from("sites").select("id, user_id");
  if (sitesError) {
    return NextResponse.json({ error: sitesError.message }, { status: 500 });
  }

  for (const site of sites ?? []) {
    try {
      const plan = await getUserPlan(supabase, site.user_id);
      const days = PLANS[plan].limits.retention_days;
      const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();

      const { data: expiredReplays, error: replayError } = await supabase
        .from("session_replays")
        .select("id, replay_id")
        .eq("site_id", site.id)
        .lt("started_at", cutoff)
        .limit(BATCH);
      if (replayError) throw new Error(`session_replays: ${replayError.message}`);

      for (const r of expiredReplays ?? []) {
        await deleteSessionReplay(supabase, site.id, r.replay_id);
        await supabase.from("session_replays").delete().eq("id", r.id);
        summary.replays_deleted++;
      }

      summary.events_deleted += await deleteOlderThan("events", "created_at", site.id, cutoff);
      summary.interactions_deleted += await deleteOlderThan("interactions", "created_at", site.id, cutoff);
      summary.snapshots_deleted += await deleteOlderThan("page_snapshots", "created_at", site.id, cutoff);
      summary.copilot_queries_deleted += await deleteOlderThan("copilot_queries", "created_at", site.id, cutoff);
      summary.revenue_events_deleted += await deleteOlderThan("revenue_events", "stripe_created_at", site.id, cutoff);
      summary.session_identities_deleted += await deleteOlderThan("session_identities", "identified_at", site.id, cutoff);

      summary.sites_processed++;
    } catch (err) {
      summary.errors.push(`${site.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Salts are only ever needed to hash the current day's visitors —
  // nothing ever reads an old day's salt back — so they can be purged
  // on a short, fixed window regardless of plan (formerly a one-off
  // statement in supabase/privacy.sql, now part of the recurring job).
  await supabase.from("daily_salts").delete().lt("day", new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10));

  return NextResponse.json(summary);
}
