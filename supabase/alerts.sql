-- ════════════════════════════════════════════════════════════════
-- Alerts — PulseTrack tells you when something's wrong instead of
-- staying a dashboard you have to remember to check.
--
-- v1 scope: one alert type, traffic_drop — today's visitors (rolling
-- 24h) compared against the same 24h window one week earlier. The
-- table and route are built to add more types later (funnel drop-off
-- spikes, conversion crashes) without a redesign — 'type' is already
-- a column, not baked into the table's shape.
--
-- Run this in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS alert_rules (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id            uuid REFERENCES sites(id) ON DELETE CASCADE,
  type               text NOT NULL DEFAULT 'traffic_drop' CHECK (type IN ('traffic_drop')),
  threshold_pct      int NOT NULL DEFAULT 50 CHECK (threshold_pct BETWEEN 1 AND 99),
  enabled            boolean NOT NULL DEFAULT true,
  last_triggered_at  timestamptz,
  created_at         timestamptz DEFAULT now(),
  UNIQUE (site_id, type)
);

ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their alert rules" ON alert_rules;
CREATE POLICY "Users manage their alert rules"
  ON alert_rules FOR ALL
  USING (site_id IN (SELECT id FROM sites WHERE has_account_access(sites.user_id)))
  WITH CHECK (site_id IN (SELECT id FROM sites WHERE has_account_access(sites.user_id)));

-- Distinct-session visitor count in a window — same definition
-- top_sources/top_countries already use (count(DISTINCT session_id)),
-- kept as its own small function rather than reusing stats_overview,
-- which computes several other figures this doesn't need.
CREATE OR REPLACE FUNCTION visitor_count(p_site UUID, p_since TIMESTAMPTZ, p_until TIMESTAMPTZ)
RETURNS BIGINT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT count(DISTINCT session_id)
  FROM events
  WHERE site_id = p_site
    AND type = 'pageview'
    AND created_at >= p_since
    AND created_at < p_until
    AND session_id IS NOT NULL;
$$;

-- Supabase grants EXECUTE directly to anon/authenticated/service_role
-- on every new function in this schema, independent of the PUBLIC
-- pseudo-role — "REVOKE ... FROM PUBLIC" alone does not remove it
-- (confirmed here: it left anon still able to call this). The roles
-- have to be named explicitly.
REVOKE EXECUTE ON FUNCTION visitor_count(uuid, timestamptz, timestamptz) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION visitor_count(uuid, timestamptz, timestamptz) TO authenticated;
