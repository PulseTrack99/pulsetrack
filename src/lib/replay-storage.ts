import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Session replay payloads live in Supabase Storage, not Postgres.
 *
 * A recording streams in as a series of flushes rather than one write, and
 * a full session can run to a few megabytes — too large and too shaped
 * like a stream to make a good jsonb column. Each flush is stored as its
 * own object; reading a session means listing its folder and
 * concatenating segments back into one ordered event array.
 *
 * Nothing here is ever reachable from the browser directly: the bucket is
 * private, and both read and write go through our own API routes under
 * the service role.
 */

const BUCKET = "replays";

// Keyed by replay_id — one recording per page load — not by session_id.
// See supabase/session-replays.sql for why a session cannot share one
// continuous rrweb stream across a real navigation or reload.
function prefix(siteId: string, replayId: string): string {
  return `${siteId}/${replayId}`;
}

export async function uploadSegment(
  supabase: SupabaseClient,
  siteId: string,
  replayId: string,
  seq: number,
  events: unknown[]
): Promise<{ bytes: number }> {
  const body = JSON.stringify(events);
  const path = `${prefix(siteId, replayId)}/${String(seq).padStart(6, "0")}.json`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: "application/json",
    upsert: true,
  });

  if (error) throw error;

  return { bytes: new TextEncoder().encode(body).length };
}

/**
 * All events for a session, in the order they were recorded.
 *
 * Segment filenames are zero-padded sequence numbers, so a plain
 * lexicographic sort already puts them back in order without needing to
 * parse each one's contents first.
 */
export async function downloadEvents(
  supabase: SupabaseClient,
  siteId: string,
  replayId: string
): Promise<unknown[]> {
  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET)
    .list(prefix(siteId, replayId), { sortBy: { column: "name", order: "asc" } });

  if (listError) throw listError;
  if (!files || files.length === 0) return [];

  const events: unknown[] = [];

  for (const file of files) {
    const path = `${prefix(siteId, replayId)}/${file.name}`;
    const { data: blob, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(path);

    if (downloadError || !blob) continue; // one bad segment should not sink the replay

    const text = await blob.text();
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) events.push(...parsed);
    } catch {
      // Corrupt segment — skip rather than fail the whole session.
    }
  }

  return events;
}

/** Removes every stored segment for one recording (deletion, GDPR erasure). */
export async function deleteSessionReplay(
  supabase: SupabaseClient,
  siteId: string,
  replayId: string
): Promise<void> {
  const { data: files } = await supabase.storage
    .from(BUCKET)
    .list(prefix(siteId, replayId));

  if (!files || files.length === 0) return;

  await supabase.storage
    .from(BUCKET)
    .remove(files.map((f) => `${prefix(siteId, replayId)}/${f.name}`));
}
