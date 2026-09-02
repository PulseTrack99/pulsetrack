-- ════════════════════════════════════════════════════════════════
-- Adds a path filter to the session replay list, and lets the caller
-- ask for fewer rows than the default page size — used to pull a short
-- "sessions on this page" list from the heatmap view without paging
-- through the full replay list.
--
-- Run this in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════

-- Adding a parameter changes the function's signature, so CREATE OR
-- REPLACE would not replace the six-parameter version below — it would
-- create a second, overloaded function alongside it, and PostgREST calls
-- would become ambiguous between the two. The old one has to go first.
DROP FUNCTION IF EXISTS list_session_replays(UUID, TIMESTAMPTZ, TEXT, BOOLEAN, INT, INT);

CREATE OR REPLACE FUNCTION list_session_replays(
  p_site       UUID,
  p_since      TIMESTAMPTZ,
  p_device     TEXT DEFAULT NULL,
  p_rage_only  BOOLEAN DEFAULT false,
  p_limit      INT DEFAULT 50,
  p_offset     INT DEFAULT 0,
  p_path       TEXT DEFAULT NULL
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
      AND (p_path IS NULL OR r.path = p_path)
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

GRANT EXECUTE ON FUNCTION list_session_replays(UUID, TIMESTAMPTZ, TEXT, BOOLEAN, INT, INT, TEXT) TO authenticated;
