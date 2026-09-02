-- ════════════════════════════════════════════════════════════════
-- Flows — the actual paths visitors take, not a funnel defined ahead
-- of time. Answers "starting from X, where do people actually go
-- next?" (or "where does everyone enter and go?" with no starting
-- page), step by step, including "left the site" as an outcome.
--
-- Run this in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION flow_analysis(
  p_site       UUID,
  p_since      TIMESTAMPTZ,
  p_start_path TEXT DEFAULT NULL,  -- NULL = anchor on each session's actual first pageview
  p_depth      INT DEFAULT 4
)
RETURNS TABLE (
  step      INT,
  from_path TEXT,
  to_path   TEXT,    -- NULL = session had no further pageview ("left")
  sessions  BIGINT
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH pv AS (
    SELECT session_id, path, created_at,
           row_number() OVER (PARTITION BY session_id ORDER BY created_at) AS rn
    FROM events
    WHERE site_id = p_site
      AND type = 'pageview'
      AND created_at >= p_since
      AND session_id IS NOT NULL
  ),
  anchor AS (
    SELECT session_id, MIN(rn) AS anchor_rn
    FROM pv
    WHERE p_start_path IS NULL OR path = p_start_path
    GROUP BY session_id
  ),
  anchored AS (
    SELECT pv.session_id, pv.path, pv.rn - anchor.anchor_rn AS step
    FROM pv
    JOIN anchor ON anchor.session_id = pv.session_id
    WHERE pv.rn >= anchor.anchor_rn
      AND pv.rn - anchor.anchor_rn <= p_depth
  )
  SELECT
    a.step,
    a.path AS from_path,
    b.path AS to_path,
    count(DISTINCT a.session_id) AS sessions
  FROM anchored a
  LEFT JOIN anchored b ON b.session_id = a.session_id AND b.step = a.step + 1
  WHERE a.step < p_depth
  GROUP BY a.step, a.path, b.path
  ORDER BY a.step, sessions DESC;
$$;

REVOKE EXECUTE ON FUNCTION flow_analysis(uuid, timestamptz, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION flow_analysis(uuid, timestamptz, text, int) TO authenticated;
