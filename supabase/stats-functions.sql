-- ════════════════════════════════════════════════════════════════
-- Stats aggregation in SQL
--
-- The dashboard used to pull every event of the period into Node and
-- count them there. PostgREST caps a response at its max-rows setting
-- (1000 by default) and .limit() does not raise it, so any site busier
-- than a thousand events was silently undercounted on every figure —
-- visitors, pageviews, bounce rate, sources, countries.
--
-- Aggregating in the database removes the ceiling, transfers a handful
-- of rows instead of thousands, and lets the indexes do the work.
--
-- SECURITY INVOKER (the default) is deliberate: these run as the calling
-- user, so the row-level policy on `events` still decides what they can
-- see. The API route checks ownership as well.
--
-- Run this in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════

-- Serves every function below.
CREATE INDEX IF NOT EXISTS idx_events_site_type_time
  ON events (site_id, type, created_at DESC);

-- ── Headline figures ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION stats_overview(p_site UUID, p_since TIMESTAMPTZ)
RETURNS TABLE (
  visitors    BIGINT,
  pageviews   BIGINT,
  bounce_rate INT,
  avg_duration INT
)
LANGUAGE sql
STABLE
AS $$
  WITH pv AS (
    SELECT session_id
    FROM events
    WHERE site_id = p_site AND type = 'pageview' AND created_at >= p_since
  ),
  sess AS (
    SELECT session_id, count(*) AS n FROM pv GROUP BY session_id
  ),
  dur AS (
    SELECT avg(duration) AS d
    FROM events
    WHERE site_id = p_site
      AND type = 'leave'
      AND created_at >= p_since
      AND duration > 0
  )
  SELECT
    (SELECT count(*) FROM sess)::BIGINT,
    (SELECT count(*) FROM pv)::BIGINT,
    -- A bounce is a session that saw exactly one page.
    COALESCE(
      (SELECT round(100.0 * count(*) FILTER (WHERE n = 1) / NULLIF(count(*), 0))
       FROM sess), 0
    )::INT,
    COALESCE((SELECT round(d) FROM dur), 0)::INT;
$$;

-- ── Top pages, by views ────────────────────────────────────────
CREATE OR REPLACE FUNCTION stats_top_pages(
  p_site UUID, p_since TIMESTAMPTZ, p_limit INT DEFAULT 10
)
RETURNS TABLE (path TEXT, views BIGINT)
LANGUAGE sql
STABLE
AS $$
  SELECT path, count(*)::BIGINT
  FROM events
  WHERE site_id = p_site AND type = 'pageview' AND created_at >= p_since
  GROUP BY path
  ORDER BY 2 DESC
  LIMIT p_limit;
$$;

-- ── Top sources, by visitors ───────────────────────────────────
-- Counts distinct sessions, not events. The previous implementation
-- counted pageviews while labelling them visitors, which inflated any
-- source that sent people who browsed more than one page.
CREATE OR REPLACE FUNCTION stats_top_sources(
  p_site UUID, p_since TIMESTAMPTZ, p_limit INT DEFAULT 10
)
RETURNS TABLE (source TEXT, visitors BIGINT)
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(source, ''), 'Direct'), count(DISTINCT session_id)::BIGINT
  FROM events
  WHERE site_id = p_site AND type = 'pageview' AND created_at >= p_since
  GROUP BY 1
  ORDER BY 2 DESC
  LIMIT p_limit;
$$;

-- ── Top countries, by visitors ─────────────────────────────────
CREATE OR REPLACE FUNCTION stats_top_countries(
  p_site UUID, p_since TIMESTAMPTZ, p_limit INT DEFAULT 10
)
RETURNS TABLE (country TEXT, visitors BIGINT)
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(country, ''), 'Unknown'), count(DISTINCT session_id)::BIGINT
  FROM events
  WHERE site_id = p_site AND type = 'pageview' AND created_at >= p_since
  GROUP BY 1
  ORDER BY 2 DESC
  LIMIT p_limit;
$$;

-- ── Devices, by visitors ───────────────────────────────────────
CREATE OR REPLACE FUNCTION stats_devices(p_site UUID, p_since TIMESTAMPTZ)
RETURNS TABLE (device TEXT, count BIGINT)
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(device, ''), 'Unknown'), count(DISTINCT session_id)::BIGINT
  FROM events
  WHERE site_id = p_site AND type = 'pageview' AND created_at >= p_since
  GROUP BY 1
  ORDER BY 2 DESC;
$$;

-- ── Daily visitors ─────────────────────────────────────────────
-- Only days with traffic come back; the route fills the gaps so the
-- chart keeps a fixed number of bars.
CREATE OR REPLACE FUNCTION stats_daily(p_site UUID, p_since TIMESTAMPTZ)
RETURNS TABLE (day DATE, visitors BIGINT)
LANGUAGE sql
STABLE
AS $$
  SELECT created_at::DATE, count(DISTINCT session_id)::BIGINT
  FROM events
  WHERE site_id = p_site AND type = 'pageview' AND created_at >= p_since
  GROUP BY 1
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION stats_overview(UUID, TIMESTAMPTZ)              TO authenticated, anon;
GRANT EXECUTE ON FUNCTION stats_top_pages(UUID, TIMESTAMPTZ, INT)        TO authenticated, anon;
GRANT EXECUTE ON FUNCTION stats_top_sources(UUID, TIMESTAMPTZ, INT)      TO authenticated, anon;
GRANT EXECUTE ON FUNCTION stats_top_countries(UUID, TIMESTAMPTZ, INT)    TO authenticated, anon;
GRANT EXECUTE ON FUNCTION stats_devices(UUID, TIMESTAMPTZ)               TO authenticated, anon;
GRANT EXECUTE ON FUNCTION stats_daily(UUID, TIMESTAMPTZ)                 TO authenticated, anon;

-- ════════════════════════════════════════════════════════════════
-- Funnel step matching
--
-- Same ceiling problem: matching steps in Node meant reading the whole
-- period's events, which PostgREST truncated at a thousand rows.
--
-- Rather than looping over sessions, this narrows the set once per step:
-- step 1 finds each session's first matching event, step 2 finds the
-- first match *after* that timestamp among the sessions that survived,
-- and so on. That is a handful of set-based queries — one per step —
-- instead of one per session.
--
-- The step list is dynamic, so the chain is assembled with format() and
-- every value goes through %L. Nothing from the caller is interpolated
-- unquoted.
-- ════════════════════════════════════════════════════════════════

-- ⚠ Cette définition n'est plus celle qui tourne. supabase/funnel-visitors.sql
-- la remplace : le comptage est passé de session_id à visitor_id et la
-- colonne de sortie s'appelle désormais `visitors`, pour que le mot
-- affiché à l'écran dise ce que le chiffre compte. La version ci-dessous
-- est conservée telle quelle comme point de départ de cette migration.
CREATE OR REPLACE FUNCTION funnel_results(
  p_site  UUID,
  p_since TIMESTAMPTZ,
  -- [{"match_type":"path|path_contains|event","match_value":"..."}]
  p_steps JSONB
)
RETURNS TABLE (step_index INT, sessions BIGINT)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  n        INT := jsonb_array_length(p_steps);
  i        INT;
  mtype    TEXT;
  mval     TEXT;
  cond     TEXT;
  ctes     TEXT := '';
  selects  TEXT := '';
  sql      TEXT;
BEGIN
  IF n IS NULL OR n = 0 THEN
    RETURN;
  END IF;

  FOR i IN 0..n - 1 LOOP
    mtype := p_steps -> i ->> 'match_type';
    mval  := p_steps -> i ->> 'match_value';

    cond := CASE mtype
      WHEN 'path'          THEN format('e.path = %L', mval)
      WHEN 'path_contains' THEN format('e.path LIKE %L', '%' || mval || '%')
      WHEN 'event'         THEN format('e.type = %L AND e.event_name = %L', 'event', mval)
      -- An unknown match type matches nothing, rather than everything.
      ELSE 'false'
    END;

    IF i = 0 THEN
      ctes := format(
        's0 AS (SELECT e.session_id, min(e.created_at) AS t FROM events e '
        || 'WHERE e.site_id = %L AND e.created_at >= %L AND %s GROUP BY e.session_id)',
        p_site, p_since, cond
      );
    ELSE
      ctes := ctes || format(
        ', s%s AS (SELECT e.session_id, min(e.created_at) AS t FROM events e '
        || 'JOIN s%s p ON p.session_id = e.session_id '
        || 'WHERE e.site_id = %L AND e.created_at > p.t AND %s GROUP BY e.session_id)',
        i, i - 1, p_site, cond
      );
    END IF;

    IF i > 0 THEN
      selects := selects || ' UNION ALL ';
    END IF;
    selects := selects || format('SELECT %s::INT, count(*)::BIGINT FROM s%s', i, i);
  END LOOP;

  sql := 'WITH ' || ctes || ' ' || selects || ' ORDER BY 1';
  RETURN QUERY EXECUTE sql;
END;
$$;

GRANT EXECUTE ON FUNCTION funnel_results(UUID, TIMESTAMPTZ, JSONB) TO authenticated;

-- ════════════════════════════════════════════════════════════════
-- Realtime
--
-- Narrower windows than the dashboard, but the same ceiling: a site
-- serving more than a thousand events in five minutes would have had its
-- live counter capped. The live feed itself already asks for twenty rows
-- and stays in the route.
-- ════════════════════════════════════════════════════════════════

-- ⚠ Les trois fonctions ci-dessous ne sont plus celles qui tournent.
-- supabase/realtime-visitors.sql les remplace : elles comptaient
-- count(DISTINCT session_id) sous une colonne nommée `visitors`, donc
-- une personne à deux onglets comptait pour deux. Signatures et noms
-- de colonnes inchangés ; seul le calcul l'est. Les versions ci-dessous
-- sont conservées comme point de départ de cette migration.

-- Active visitors and the pages they are on, in one pass.
CREATE OR REPLACE FUNCTION realtime_pages(
  p_site UUID, p_minutes INT DEFAULT 5, p_limit INT DEFAULT 10
)
RETURNS TABLE (path TEXT, visitors BIGINT)
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(path, ''), '/'), count(DISTINCT session_id)::BIGINT
  FROM events
  WHERE site_id = p_site
    AND created_at >= now() - make_interval(mins => p_minutes)
  GROUP BY 1
  ORDER BY 2 DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION realtime_active(p_site UUID, p_minutes INT DEFAULT 5)
RETURNS BIGINT
LANGUAGE sql
STABLE
AS $$
  SELECT count(DISTINCT session_id)::BIGINT
  FROM events
  WHERE site_id = p_site
    AND created_at >= now() - make_interval(mins => p_minutes);
$$;

-- Per-minute distinct sessions. Only minutes with traffic come back; the
-- route pads the series so the sparkline keeps a fixed width.
CREATE OR REPLACE FUNCTION realtime_sparkline(p_site UUID, p_minutes INT DEFAULT 30)
RETURNS TABLE (minute TIMESTAMPTZ, visitors BIGINT)
LANGUAGE sql
STABLE
AS $$
  SELECT date_trunc('minute', created_at), count(DISTINCT session_id)::BIGINT
  FROM events
  WHERE site_id = p_site
    AND created_at >= now() - make_interval(mins => p_minutes)
  GROUP BY 1
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION realtime_pages(UUID, INT, INT)   TO authenticated;
GRANT EXECUTE ON FUNCTION realtime_active(UUID, INT)       TO authenticated;
GRANT EXECUTE ON FUNCTION realtime_sparkline(UUID, INT)    TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- Applied as migration `stats_overview_bounded_window_and_visitors`.
-- Kept here so this file still describes the live schema.
--
-- Two changes: a bounded window (p_until) so the dashboard can ask for
-- the *previous* period and show a period-over-period delta, and a real
-- visitor count — "visitors" used to return the session count, which is
-- why the card labelled "Visiteurs uniques" read high.
--
-- CREATE OR REPLACE with an extra parameter creates a SECOND overload
-- rather than replacing, and the two-argument call then becomes
-- ambiguous, so the old signature must be dropped explicitly.
DROP FUNCTION IF EXISTS public.stats_overview(uuid, timestamptz);

CREATE FUNCTION public.stats_overview(
  p_site  uuid,
  p_since timestamptz,
  p_until timestamptz DEFAULT NULL
)
RETURNS TABLE(
  visitors     bigint,
  sessions     bigint,
  pageviews    bigint,
  bounce_rate  integer,
  avg_duration integer
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  WITH bounds AS (
    SELECT p_since AS lo, COALESCE(p_until, now()) AS hi
  ),
  pv AS (
    SELECT session_id, visitor_id
    FROM events, bounds
    WHERE site_id = p_site
      AND type = 'pageview'
      AND created_at >= bounds.lo
      AND created_at <  bounds.hi
  ),
  sess AS (
    SELECT session_id, count(*) AS n FROM pv GROUP BY session_id
  ),
  dur AS (
    SELECT avg(duration) AS d
    FROM events, bounds
    WHERE site_id = p_site
      AND type = 'leave'
      AND created_at >= bounds.lo
      AND created_at <  bounds.hi
      AND duration > 0
  )
  SELECT
    (SELECT count(DISTINCT visitor_id) FROM pv)::BIGINT,
    (SELECT count(*) FROM sess)::BIGINT,
    (SELECT count(*) FROM pv)::BIGINT,
    -- A bounce is a session that saw exactly one page.
    COALESCE(
      (SELECT round(100.0 * count(*) FILTER (WHERE n = 1) / NULLIF(count(*), 0))
       FROM sess), 0
    )::INT,
    COALESCE((SELECT round(d) FROM dur), 0)::INT;
$function$;

-- anon is required by the public share view (/public/[shareId]).
GRANT EXECUTE ON FUNCTION public.stats_overview(uuid, timestamptz, timestamptz)
  TO authenticated, anon;

-- ─────────────────────────────────────────────────────────────
-- Migration `breakdowns_count_visitors_not_sessions`.
-- Kept here so this file still describes the live schema.
--
-- The same mislabel as stats_overview had, in the three breakdowns
-- that survived that fix: "Sources de trafic", "Pays" and the daily
-- chart all say *visiteurs* in the UI while these functions returned
-- count(DISTINCT session_id). Once stats_overview started counting
-- visitor_id, the two disagreed — a site with 4 visitors could show a
-- single source with 5 "visitors", which is how this was spotted.
--
-- Signatures are unchanged, so CREATE OR REPLACE really does replace
-- here; no second overload to drop, and the existing grants carry over.
--
-- stats_devices is deliberately not in this list: its column is named
-- `count`, and its only consumer is the device filter's option list.

CREATE OR REPLACE FUNCTION public.stats_top_sources(
  p_site UUID, p_since TIMESTAMPTZ, p_limit INT DEFAULT 10
)
RETURNS TABLE (source TEXT, visitors BIGINT)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(NULLIF(source, ''), 'Direct'), count(DISTINCT visitor_id)::BIGINT
  FROM events
  WHERE site_id = p_site AND type = 'pageview' AND created_at >= p_since
  GROUP BY 1
  ORDER BY 2 DESC
  LIMIT p_limit;
$function$;

CREATE OR REPLACE FUNCTION public.stats_top_countries(
  p_site UUID, p_since TIMESTAMPTZ, p_limit INT DEFAULT 10
)
RETURNS TABLE (country TEXT, visitors BIGINT)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(NULLIF(country, ''), 'Unknown'), count(DISTINCT visitor_id)::BIGINT
  FROM events
  WHERE site_id = p_site AND type = 'pageview' AND created_at >= p_since
  GROUP BY 1
  ORDER BY 2 DESC
  LIMIT p_limit;
$function$;

CREATE OR REPLACE FUNCTION public.stats_daily(p_site UUID, p_since TIMESTAMPTZ)
RETURNS TABLE (day DATE, visitors BIGINT)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT created_at::DATE, count(DISTINCT visitor_id)::BIGINT
  FROM events
  WHERE site_id = p_site AND type = 'pageview' AND created_at >= p_since
  GROUP BY 1
  ORDER BY 1;
$function$;
