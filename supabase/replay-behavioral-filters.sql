-- ════════════════════════════════════════════════════════════════
-- Behavioural filters for session replay
--
-- These are read-time filters over recordings that already exist —
-- nothing here changes what gets captured or which sessions the gate
-- (src/app/api/replay/gate) chooses to record. A session either was
-- recorded or it wasn't; these functions only help find the useful ones
-- among what is already there:
--
--   sessions_without_conversion  visited, but no matching Stripe charge
--   sessions_low_scroll          never scrolled past a given depth
--   funnel_dropoff_sessions      reached one funnel step, not the next
--
-- Each returns a plain set of session_id, composed with the existing
-- path/device/rage filters via list_session_replays' new p_session_ids
-- parameter — the route intersects when more than one is requested,
-- rather than every combination needing its own SQL function.
--
-- Run this in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════

-- ── Extend the list function with a session_id allow-list ─────
-- Same signature-change caveat as before: adding a parameter creates a
-- second, ambiguous overload unless the old one is dropped first.
DROP FUNCTION IF EXISTS list_session_replays(UUID, TIMESTAMPTZ, TEXT, BOOLEAN, INT, INT, TEXT);

CREATE OR REPLACE FUNCTION list_session_replays(
  p_site        UUID,
  p_since       TIMESTAMPTZ,
  p_device      TEXT DEFAULT NULL,
  p_rage_only   BOOLEAN DEFAULT false,
  p_limit       INT DEFAULT 50,
  p_offset      INT DEFAULT 0,
  p_path        TEXT DEFAULT NULL,
  p_session_ids TEXT[] DEFAULT NULL
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
      AND (p_session_ids IS NULL OR r.session_id = ANY(p_session_ids))
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

GRANT EXECUTE ON FUNCTION list_session_replays(UUID, TIMESTAMPTZ, TEXT, BOOLEAN, INT, INT, TEXT, TEXT[]) TO authenticated;

-- ── No matching Stripe charge ──────────────────────────────────
-- On a site with no Stripe connection at all, this trivially returns
-- every session — the dashboard only offers the filter once
-- stripe_connections has a row for the site, so that emptiness is never
-- shown as if it meant something.
CREATE OR REPLACE FUNCTION sessions_without_conversion(p_site UUID, p_since TIMESTAMPTZ)
RETURNS TABLE (session_id TEXT)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT e.session_id
  FROM events e
  WHERE e.site_id = p_site
    AND e.created_at >= p_since
    AND e.session_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM revenue_events r
      WHERE r.site_id = p_site AND r.session_id = e.session_id
    );
$$;

GRANT EXECUTE ON FUNCTION sessions_without_conversion(UUID, TIMESTAMPTZ) TO authenticated;

-- ── Never scrolled past a given depth ──────────────────────────
CREATE OR REPLACE FUNCTION sessions_low_scroll(
  p_site UUID, p_since TIMESTAMPTZ, p_max_pct INT DEFAULT 25
)
RETURNS TABLE (session_id TEXT)
LANGUAGE sql
STABLE
AS $$
  SELECT session_id
  FROM interactions
  WHERE site_id = p_site
    AND type = 'scroll'
    AND created_at >= p_since
    AND session_id IS NOT NULL
  GROUP BY session_id
  HAVING max(scroll_pct) < p_max_pct;
$$;

GRANT EXECUTE ON FUNCTION sessions_low_scroll(UUID, TIMESTAMPTZ, INT) TO authenticated;

-- ── Reached one funnel step, not the next ──────────────────────
-- Reuses the same dynamic-CTE-chain approach as funnel_results
-- (supabase/stats-functions.sql): step 0's CTE finds each session's
-- first matching event, step 1's finds the first match after that
-- timestamp among the sessions that survived, and so on up through the
-- step being asked about — so "reached this step" always respects the
-- order the funnel defines, not just "did these events happen at some
-- point in some order".
--
-- p_step_index is 0-based, matching how funnel_results already reports
-- steps back to the app. On the funnel's last step there is no "next
-- step" to have missed, so the function returns who *reached* it
-- instead — a completion list rather than a drop-off list, still a
-- meaningful set of sessions to watch.
CREATE OR REPLACE FUNCTION funnel_dropoff_sessions(
  p_funnel     UUID,
  p_since      TIMESTAMPTZ,
  p_step_index INT
)
RETURNS TABLE (session_id TEXT)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_site UUID;
  mtypes TEXT[];
  mvals  TEXT[];
  n      INT;
  i      INT;
  cond   TEXT;
  ctes   TEXT := '';
  sql    TEXT;
  upto   INT;
BEGIN
  SELECT f.site_id INTO v_site FROM funnels f WHERE f.id = p_funnel;
  IF v_site IS NULL THEN RETURN; END IF;

  SELECT array_agg(match_type ORDER BY step_order), array_agg(match_value ORDER BY step_order)
    INTO mtypes, mvals
    FROM funnel_steps WHERE funnel_id = p_funnel;

  n := COALESCE(array_length(mtypes, 1), 0);
  IF n = 0 OR p_step_index < 0 OR p_step_index >= n THEN RETURN; END IF;

  -- Chain through the step after the one being checked, when one exists —
  -- that is what "did not continue" is measured against.
  upto := LEAST(p_step_index + 1, n - 1);

  FOR i IN 0..upto LOOP
    cond := CASE mtypes[i + 1]
      WHEN 'path'          THEN format('e.path = %L', mvals[i + 1])
      WHEN 'path_contains' THEN format('e.path LIKE %L', '%' || mvals[i + 1] || '%')
      WHEN 'event'         THEN format('e.type = %L AND e.event_name = %L', 'event', mvals[i + 1])
      ELSE 'false'
    END;

    IF i = 0 THEN
      ctes := format(
        's0 AS (SELECT e.session_id, min(e.created_at) AS t FROM events e '
        || 'WHERE e.site_id = %L AND e.created_at >= %L AND %s GROUP BY e.session_id)',
        v_site, p_since, cond
      );
    ELSE
      ctes := ctes || format(
        ', s%s AS (SELECT e.session_id, min(e.created_at) AS t FROM events e '
        || 'JOIN s%s p ON p.session_id = e.session_id '
        || 'WHERE e.site_id = %L AND e.created_at > p.t AND %s GROUP BY e.session_id)',
        i, i - 1, v_site, cond
      );
    END IF;
  END LOOP;

  IF p_step_index + 1 < n THEN
    sql := format(
      'WITH %s SELECT session_id FROM s%s WHERE session_id NOT IN (SELECT session_id FROM s%s)',
      ctes, p_step_index, p_step_index + 1
    );
  ELSE
    sql := format('WITH %s SELECT session_id FROM s%s', ctes, p_step_index);
  END IF;

  RETURN QUERY EXECUTE sql;
END;
$$;

GRANT EXECUTE ON FUNCTION funnel_dropoff_sessions(UUID, TIMESTAMPTZ, INT) TO authenticated;
