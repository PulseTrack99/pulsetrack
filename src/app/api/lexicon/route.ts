import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * The event dictionary: what each name means, and what it actually does.
 *
 * The inventory half is derived (supabase/lexicon.sql,
 * site_event_lexicon) and the annotation half is stored (event_lexicon),
 * joined here rather than in SQL so a note can exist for a name that has
 * stopped firing — writing down what an event meant is worth keeping
 * after the event goes away.
 *
 * Both objects arrive by a migration the deployment has to run. Until it
 * has, this answers `migration_pending` instead of a 500, and the screen
 * says what to run — a feature that half-exists in the code and throws
 * in the browser is worse than one that explains itself.
 */

const PERIODS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

/** Undefined function, undefined table, and PostgREST's own "no such
 *  RPC" — all mean the same thing here: the migration has not run. */
function isMissingSchema(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return (
    err.code === "42883" ||
    err.code === "42P01" ||
    err.code === "PGRST202" ||
    /does not exist|schema cache/i.test(err.message ?? "")
  );
}

interface Entry {
  name: string;
  volume: number;
  visitors: number;
  first_at: string;
  last_at: string;
  properties: string[];
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("site_id");
  if (!siteId) return NextResponse.json({ error: "site_id is required" }, { status: 400 });

  const days = PERIODS[searchParams.get("period") ?? "30d"] ?? 30;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data: rows, error } = await supabase.rpc("site_event_lexicon", {
    p_site: siteId,
    p_since: since,
  });

  if (error) {
    if (isMissingSchema(error)) {
      return NextResponse.json({ migration_pending: true, entries: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: notes, error: notesError } = await supabase
    .from("event_lexicon")
    .select("name, description, hidden, display_name")
    .eq("site_id", siteId);

  if (notesError && isMissingSchema(notesError)) {
    return NextResponse.json({ migration_pending: true, entries: [] });
  }

  const noteByName = new Map(
    (notes ?? []).map((n) => [
      n.name,
      { description: n.description, hidden: n.hidden, display_name: n.display_name },
    ])
  );

  const entries = (rows ?? []).map((e: Entry) => ({
    ...e,
    description: noteByName.get(e.name)?.description ?? null,
    hidden: noteByName.get(e.name)?.hidden ?? false,
    display_name: noteByName.get(e.name)?.display_name ?? null,
  }));

  // A name nobody has sent lately but somebody documented still belongs
  // in a dictionary — that is the difference between a dictionary and a
  // leaderboard.
  const seen = new Set(entries.map((e: { name: string }) => e.name));
  for (const [name, note] of noteByName) {
    if (!seen.has(name)) {
      entries.push({
        name,
        volume: 0,
        visitors: 0,
        first_at: "",
        last_at: "",
        properties: [],
        description: note.description,
        hidden: note.hidden,
        display_name: note.display_name,
      });
    }
  }

  return NextResponse.json({ entries, migration_pending: false });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const siteId: string | undefined = body?.site_id;
  const name: string | undefined = body?.name;
  if (!siteId || !name) {
    return NextResponse.json({ error: "site_id and name are required" }, { status: 400 });
  }

  const patch: { description?: string | null; hidden?: boolean; display_name?: string | null } = {};
  if ("description" in body) {
    const d = typeof body.description === "string" ? body.description.trim() : "";
    patch.description = d.slice(0, 500) || null;
  }
  if ("hidden" in body) patch.hidden = Boolean(body.hidden);
  if ("display_name" in body) {
    // An empty alias means "go back to the real name", not "call it
    // nothing" — so it clears rather than storing a blank.
    const n = typeof body.display_name === "string" ? body.display_name.trim() : "";
    patch.display_name = n.slice(0, 80) || null;
  }

  // RLS on event_lexicon is what enforces ownership; a site the caller
  // has no access to fails the WITH CHECK rather than being written.
  const { error } = await supabase.from("event_lexicon").upsert(
    {
      site_id: siteId,
      name,
      ...patch,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "site_id,name" }
  );

  if (error) {
    if (isMissingSchema(error)) {
      return NextResponse.json({ error: "migration_pending" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
