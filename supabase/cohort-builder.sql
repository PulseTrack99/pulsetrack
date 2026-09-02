-- ════════════════════════════════════════════════════════════════
-- General cohort builder — combine multiple conditions with AND/OR,
-- matching what Mixpanel's behavioral cohort builder does, scoped to
-- what's actually buildable on PulseTrack's session-based (not
-- persistent-identity) data model.
--
-- Replaces the fixed-shape cohorts (behavior/scroll_max/funnel_id/...)
-- with a JSONB condition list — the three quick-filter buttons
-- (low_scroll, no_conversion, funnel_dropoff) keep working exactly as
-- before, they just become one-condition arrays under the hood. No
-- real cohorts exist yet (feature shipped this session), so the old
-- columns are dropped rather than migrated.
--
-- A condition: {"field": "...", "operator": "...", "value": ...}
-- plus "funnel_id"/"step" for the funnel_step field. Supported fields:
--   duration        gt|gte|lt|lte   seconds
--   pageview_count   gt|gte|lt|lte   number
--   scroll_pct       gt|gte|lt|lte   percentage
--   rage_click       exists|not_exists
--   converted        exists|not_exists
--   device           eq              Desktop|Mobile|Tablet
--   source           eq|contains     text
--   country          eq              ISO code
--   funnel_step      reached|dropped funnel_id + step (0-based)
--
-- Every field/operator combination is matched against a fixed
-- CASE/WHEN whitelist in resolve_cohort_sessions — no user-supplied
-- string ever reaches SQL as anything but a %L-quoted or explicitly
-- cast (::numeric/::uuid/::int) value, same discipline as
-- funnel_dropoff_sessions already uses.
--
-- Run this in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE cohorts DROP COLUMN IF EXISTS behavior;
ALTER TABLE cohorts DROP COLUMN IF EXISTS scroll_max;
ALTER TABLE cohorts DROP COLUMN IF EXISTS funnel_id;
ALTER TABLE cohorts DROP COLUMN IF EXISTS step;
ALTER TABLE cohorts DROP COLUMN IF EXISTS device;
ALTER TABLE cohorts DROP COLUMN IF EXISTS rage_only;

ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS conditions JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS match TEXT NOT NULL DEFAULT 'AND' CHECK (match IN ('AND', 'OR'));

CREATE OR REPLACE FUNCTION resolve_cohort_sessions(
  p_site       UUID,
  p_since      TIMESTAMPTZ,
  p_conditions JSONB,
  p_match      TEXT DEFAULT 'AND'
)
RETURNS TABLE (session_id TEXT)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  cond   JSONB;
  op_sql TEXT;
  frag   TEXT;
  parts  TEXT[] := '{}';
  sql    TEXT;
BEGIN
  IF p_conditions IS NULL OR jsonb_typeof(p_conditions) <> 'array' OR jsonb_array_length(p_conditions) = 0 THEN
    RETURN;
  END IF;

  FOR cond IN SELECT * FROM jsonb_array_elements(p_conditions) LOOP
    op_sql := CASE cond->>'operator'
      WHEN 'gt'  THEN '>' WHEN 'gte' THEN '>=' WHEN 'lt' THEN '<' WHEN 'lte' THEN '<=' ELSE NULL
    END;

    frag := CASE cond->>'field'

      WHEN 'duration' THEN
        format('SELECT session_id FROM session_replays WHERE site_id = %L AND started_at >= %L AND duration_ms %s (%L::numeric * 1000)',
          p_site, p_since, op_sql, (cond->>'value')::numeric)

      WHEN 'pageview_count' THEN
        format('SELECT session_id FROM events WHERE site_id = %L AND created_at >= %L AND type = ''pageview'' AND session_id IS NOT NULL GROUP BY session_id HAVING count(*) %s %L',
          p_site, p_since, op_sql, (cond->>'value')::numeric)

      WHEN 'scroll_pct' THEN
        format('SELECT session_id FROM interactions WHERE site_id = %L AND created_at >= %L AND type = ''scroll'' AND session_id IS NOT NULL GROUP BY session_id HAVING max(scroll_pct) %s %L',
          p_site, p_since, op_sql, (cond->>'value')::numeric)

      WHEN 'rage_click' THEN
        CASE cond->>'operator'
          WHEN 'exists' THEN
            format('SELECT DISTINCT session_id FROM interactions WHERE site_id = %L AND created_at >= %L AND type = ''rage'' AND session_id IS NOT NULL',
              p_site, p_since)
          ELSE
            format('SELECT DISTINCT e.session_id FROM events e WHERE e.site_id = %L AND e.created_at >= %L AND e.session_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM interactions i WHERE i.site_id = %L AND i.session_id = e.session_id AND i.type = ''rage'')',
              p_site, p_since, p_site)
        END

      WHEN 'converted' THEN
        CASE cond->>'operator'
          WHEN 'exists' THEN
            format('SELECT DISTINCT session_id FROM revenue_events WHERE site_id = %L AND session_id IS NOT NULL',
              p_site)
          ELSE
            format('SELECT DISTINCT e.session_id FROM events e WHERE e.site_id = %L AND e.created_at >= %L AND e.session_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM revenue_events r WHERE r.site_id = %L AND r.session_id = e.session_id)',
              p_site, p_since, p_site)
        END

      WHEN 'device' THEN
        format('SELECT DISTINCT session_id FROM session_replays WHERE site_id = %L AND started_at >= %L AND device = %L',
          p_site, p_since, cond->>'value')

      WHEN 'source' THEN
        CASE cond->>'operator'
          WHEN 'contains' THEN
            format('SELECT DISTINCT session_id FROM events WHERE site_id = %L AND created_at >= %L AND session_id IS NOT NULL AND source ILIKE %L',
              p_site, p_since, '%' || (cond->>'value') || '%')
          ELSE
            format('SELECT DISTINCT session_id FROM events WHERE site_id = %L AND created_at >= %L AND session_id IS NOT NULL AND source = %L',
              p_site, p_since, cond->>'value')
        END

      WHEN 'country' THEN
        format('SELECT DISTINCT session_id FROM events WHERE site_id = %L AND created_at >= %L AND session_id IS NOT NULL AND country = %L',
          p_site, p_since, cond->>'value')

      -- Reuses funnel_dropoff_sessions as-is: at a non-final step this
      -- means "reached this step, not the next"; at the funnel's last
      -- step it means "reached it" — same semantics the quick-filter
      -- button already has, not a new meaning to learn.
      WHEN 'funnel_step' THEN
        format('SELECT session_id FROM funnel_dropoff_sessions(%L::uuid, %L::timestamptz, %L::int)',
          (cond->>'funnel_id')::uuid, p_since, (cond->>'step')::int)

      ELSE NULL
    END;

    IF frag IS NOT NULL THEN
      parts := array_append(parts, frag);
    END IF;
  END LOOP;

  IF array_length(parts, 1) IS NULL THEN RETURN; END IF;

  sql := array_to_string(parts, CASE WHEN p_match = 'OR' THEN ' UNION ' ELSE ' INTERSECT ' END);

  RETURN QUERY EXECUTE sql;
END;
$$;

REVOKE EXECUTE ON FUNCTION resolve_cohort_sessions(uuid, timestamptz, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_cohort_sessions(uuid, timestamptz, jsonb, text) TO authenticated;
