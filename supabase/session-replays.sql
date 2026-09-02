-- ════════════════════════════════════════════════════════════════
-- Session replay
--
-- Replaces "reconstruct a page from captured click coordinates" with
-- what Mixpanel, Hotjar and Clarity actually ship: record the real
-- session (DOM + mutations + mouse movement + clicks + scroll) with
-- rrweb, then play it back. The aggregate click heatmap
-- (supabase/heatmaps.sql, still fed by the tracker's lightweight click
-- capture) keeps working underneath and can stay cross-linked from a
-- replay, matching Mixpanel's own "View Heatmap" button on a session.
--
-- Event payloads are large (tens of KB to a few MB per session) and
-- write in a stream, so they live in Supabase Storage rather than
-- Postgres — one object per flushed segment, concatenated on read.
-- Only session metadata sits in the database.
--
-- Run this in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════

-- ── Storage ────────────────────────────────────────────────────
-- Private bucket. Nothing here is ever served to the browser directly:
-- the ingest route writes with the service role and the dashboard reads
-- through our own API, which checks ownership and plan first. No bucket
-- policy is needed for that — a private bucket already refuses anon and
-- authenticated access, and the service role bypasses Storage RLS the
-- same way it bypasses table RLS.
INSERT INTO storage.buckets (id, name, public)
VALUES ('replays', 'replays', false)
ON CONFLICT (id) DO NOTHING;

-- ── Recording metadata ─────────────────────────────────────────
-- One row per PAGE LOAD, not per session. A full browser navigation or
-- reload restarts JavaScript execution, so rrweb cannot resume the same
-- event stream across one — there is no way to hand a running recording
-- from one page instance to the next. Each recording is its own full
-- snapshot plus its own incremental stream, addressed by `replay_id`, a
-- value the tracker generates fresh in memory for that page load and
-- never persists. `session_id` is kept as a plain (non-unique) column so
-- a recording can still be matched to the rage clicks and other events
-- the rest of the pipeline already attributes to that session.
CREATE TABLE IF NOT EXISTS session_replays (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id       UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  -- Denormalised from sites.user_id so the monthly cap can be counted
  -- with a plain index scan instead of a join on every ingest call.
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  replay_id     TEXT NOT NULL,      -- addresses the Storage folder
  session_id    TEXT NOT NULL,      -- groups recordings from one visit
  visitor_id    TEXT,
  path          TEXT,               -- page this recording is of
  device        TEXT,
  browser       TEXT,
  country       TEXT,

  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms   INTEGER NOT NULL DEFAULT 0,

  segment_count INTEGER NOT NULL DEFAULT 0,
  event_count   INTEGER NOT NULL DEFAULT 0,
  size_bytes    BIGINT  NOT NULL DEFAULT 0,

  -- 'recording' until a pagehide-triggered final segment arrives, or
  -- until it ages out; 'complete' once one does. Best-effort only — a
  -- visitor whose tab crashes never sends that final segment, so this
  -- is a label for the UI, not something else depends on it.
  status        TEXT NOT NULL DEFAULT 'recording',

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (site_id, replay_id)
);

CREATE INDEX IF NOT EXISTS idx_replays_list
  ON session_replays (site_id, started_at DESC);

-- Powers "other pages this visitor recorded in the same session".
CREATE INDEX IF NOT EXISTS idx_replays_session
  ON session_replays (site_id, session_id);

-- Powers the monthly cap check in the gate route.
CREATE INDEX IF NOT EXISTS idx_replays_owner_month
  ON session_replays (user_id, created_at DESC);

ALTER TABLE session_replays ENABLE ROW LEVEL SECURITY;

-- Denormalised user_id makes this a direct check with no join.
DROP POLICY IF EXISTS "Owners read their replays" ON session_replays;
CREATE POLICY "Owners read their replays" ON session_replays
  FOR SELECT USING (user_id = auth.uid());

-- No insert/update/delete policy for authenticated or anon: rows are
-- only ever written by the ingest route under the service role, which
-- bypasses RLS. A signed-in user cannot fabricate or edit a replay
-- record by calling PostgREST directly.

-- ── Plan limits ────────────────────────────────────────────────
-- supabase/quotas.sql already created plan_limits for sites/events/
-- funnels/retention. This adds the replay cap to the same table rather
-- than starting a second one, so a single row still describes a plan.
ALTER TABLE plan_limits ADD COLUMN IF NOT EXISTS max_replays_per_month INT NOT NULL DEFAULT 0;

UPDATE plan_limits SET max_replays_per_month = 0    WHERE plan = 'free';
UPDATE plan_limits SET max_replays_per_month = 500  WHERE plan = 'starter';
UPDATE plan_limits SET max_replays_per_month = 3000 WHERE plan = 'growth';
UPDATE plan_limits SET max_replays_per_month = 15000 WHERE plan = 'business';

-- ── Session list, with rage-click presence ────────────────────
-- Joins against interactions (supabase/heatmaps.sql) rather than
-- duplicating rage detection: the tracker's lightweight click capture
-- already flags rage clicks per session_id, so a replay can show "this
-- session rage-clicked" without recording anything twice.
CREATE OR REPLACE FUNCTION list_session_replays(
  p_site       UUID,
  p_since      TIMESTAMPTZ,
  p_device     TEXT DEFAULT NULL,
  p_rage_only  BOOLEAN DEFAULT false,
  p_limit      INT DEFAULT 50,
  p_offset     INT DEFAULT 0
)
RETURNS TABLE (
  id            UUID,
  replay_id     TEXT,
  session_id    TEXT,
  path          TEXT,
  device        TEXT,
  browser       TEXT,
  country       TEXT,
  started_at    TIMESTAMPTZ,
  duration_ms   INTEGER,
  event_count   INTEGER,
  status        TEXT,
  has_rage      BOOLEAN,
  total_count   BIGINT
)
LANGUAGE sql
STABLE
AS $$
  WITH base AS (
    SELECT r.*
    FROM session_replays r
    WHERE r.site_id = p_site
      AND r.started_at >= p_since
      AND (p_device IS NULL OR r.device = p_device)
  ),
  counted AS (
    SELECT count(*) AS n FROM base
  )
  SELECT
    b.id, b.replay_id, b.session_id, b.path, b.device, b.browser, b.country,
    b.started_at, b.duration_ms, b.event_count, b.status,
    EXISTS (
      SELECT 1 FROM interactions i
      WHERE i.site_id = b.site_id
        AND i.session_id = b.session_id
        AND i.type = 'rage'
    ) AS has_rage,
    (SELECT n FROM counted)
  FROM base b
  WHERE (
    NOT p_rage_only OR EXISTS (
      SELECT 1 FROM interactions i
      WHERE i.site_id = b.site_id
        AND i.session_id = b.session_id
        AND i.type = 'rage'
    )
  )
  ORDER BY b.started_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION list_session_replays(UUID, TIMESTAMPTZ, TEXT, BOOLEAN, INT, INT) TO authenticated;

-- ── Segment bookkeeping ────────────────────────────────────────
-- Called once per flushed batch, including the empty done=true closing
-- ping stopReplay() always sends — that one exists only to flip status
-- to 'complete' and should not count as a segment. Duration is
-- wall-clock (last segment's arrival minus the row's creation time)
-- rather than parsed from rrweb event timestamps — close enough for
-- "how long was this recording" and avoids the ingest route needing to
-- understand rrweb's event shape.
CREATE OR REPLACE FUNCTION bump_replay_segment(
  p_site   UUID,
  p_replay TEXT,
  p_events INT,
  p_bytes  INT,
  p_done   BOOLEAN DEFAULT false
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE session_replays
  SET
    event_count   = event_count + p_events,
    segment_count = segment_count + CASE WHEN p_events > 0 THEN 1 ELSE 0 END,
    size_bytes    = size_bytes + p_bytes,
    last_seen_at  = now(),
    duration_ms   = GREATEST(0, EXTRACT(EPOCH FROM (now() - started_at)) * 1000)::INT,
    status        = CASE WHEN p_done THEN 'complete' ELSE status END
  WHERE site_id = p_site AND replay_id = p_replay;
$$;

-- ── Monthly count for the recording gate ──────────────────────
CREATE OR REPLACE FUNCTION replays_this_month(p_user UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::BIGINT
  FROM session_replays
  WHERE user_id = p_user
    AND created_at >= date_trunc('month', now());
$$;
