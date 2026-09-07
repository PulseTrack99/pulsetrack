import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { deleteSessionReplay } from "@/lib/replay-storage";

/**
 * Erasure — the obligation that comes with the promise.
 *
 * PulseTrack sells itself as GDPR-native, and Article 17 is not
 * optional for the customers who resell that promise: when one of their
 * users asks to be forgotten, they need a way to honour it. Until now
 * there was none. The retention cron deletes everything past a window
 * (src/app/api/cron/purge-retention) and account deletion removes the
 * lot, but nothing could remove one person.
 *
 * Two modes, both irreversible:
 *
 *   person      everything tied to an email — the sessions it was
 *               identified in, their events, interactions, recordings
 *               (blobs included), and its payments.
 *
 *   event_name  every event carrying one name, for the day somebody
 *               instruments a field they should not have captured.
 *
 * Anonymous visitors are deliberately not addressable here. Their id is
 * a hash of a salt destroyed nightly, so there is no way to find "this
 * person's" rows — which is also why they are not personal data to
 * begin with, and why an erasure request cannot reach them.
 */

interface Result {
  events: number;
  interactions: number;
  replays: number;
  revenue: number;
  identities: number;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const siteId: string | undefined = body?.site_id;
  const mode: string | undefined = body?.mode;
  if (!siteId || (mode !== "person" && mode !== "event_name")) {
    return NextResponse.json({ error: "site_id and a valid mode are required" }, { status: 400 });
  }

  // Ownership through the caller's own RLS, before anything elevated.
  const { data: site } = await supabase
    .from("sites")
    .select("id")
    .eq("id", siteId)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const deleted: Result = { events: 0, interactions: 0, replays: 0, revenue: 0, identities: 0 };

  if (mode === "event_name") {
    const name: string | undefined = body?.name;
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const { data, error } = await service
      .from("events")
      .delete()
      .eq("site_id", siteId)
      .eq("event_name", name)
      .select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    deleted.events = data?.length ?? 0;

    return NextResponse.json({ deleted });
  }

  const email: string | undefined = body?.email;
  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });

  // The only bridge from an address to any behaviour at all.
  const { data: ids } = await service
    .from("session_identities")
    .select("session_id")
    .eq("site_id", siteId)
    .eq("email", email);

  const sessionIds = [...new Set((ids ?? []).map((r) => r.session_id as string))];

  if (sessionIds.length > 0) {
    /* Recordings first, and one at a time: each has blobs in storage
       that no cascade reaches. A row deleted without its blob would
       leave the recording on disk while the dashboard swore it was
       gone — the worst possible outcome for an erasure. */
    const { data: replays } = await service
      .from("session_replays")
      .select("id, replay_id")
      .eq("site_id", siteId)
      .in("session_id", sessionIds);

    for (const r of replays ?? []) {
      await deleteSessionReplay(service, siteId, r.replay_id as string);
    }
    if ((replays ?? []).length > 0) {
      const { data } = await service
        .from("session_replays")
        .delete()
        .eq("site_id", siteId)
        .in("session_id", sessionIds)
        .select("id");
      deleted.replays = data?.length ?? 0;
    }

    for (const [table, key] of [
      ["events", "events"],
      ["interactions", "interactions"],
    ] as const) {
      const { data } = await service
        .from(table)
        .delete()
        .eq("site_id", siteId)
        .in("session_id", sessionIds)
        .select("id");
      deleted[key] = data?.length ?? 0;
    }
  }

  const { data: rev } = await service
    .from("revenue_events")
    .delete()
    .eq("site_id", siteId)
    .eq("customer_email", email)
    .select("id");
  deleted.revenue = rev?.length ?? 0;

  // The identities last: they are the index, and losing it before the
  // rows it points at would strand everything else.
  const { data: idRows } = await service
    .from("session_identities")
    .delete()
    .eq("site_id", siteId)
    .eq("email", email)
    .select("id");
  deleted.identities = idRows?.length ?? 0;

  return NextResponse.json({ deleted });
}
