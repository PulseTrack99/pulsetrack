-- ════════════════════════════════════════════════════════════════
-- AI Copilot — natural-language → behavioural filter
--
-- Mirrors Mixpanel's own "Spark AI query builder": a cheap, quota-capped
-- translation from a plain-language question to one of the behavioural
-- filters already built (supabase/replay-behavioral-filters.sql), never
-- a free-form chatbot with unbounded cost. The row this writes IS the
-- usage counter — same reasoning as session_replays for the replay
-- quota (supabase/session-replays.sql): counting real rows means the
-- number shown can never disagree with what actually happened.
--
-- Run this in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════

-- ── Quota column, same table as every other plan limit ─────────
ALTER TABLE plan_limits ADD COLUMN IF NOT EXISTS max_ai_queries_per_month INT NOT NULL DEFAULT 0;

UPDATE plan_limits SET max_ai_queries_per_month = 0    WHERE plan = 'free';
UPDATE plan_limits SET max_ai_queries_per_month = 50   WHERE plan = 'starter';
UPDATE plan_limits SET max_ai_queries_per_month = 200  WHERE plan = 'growth';
UPDATE plan_limits SET max_ai_queries_per_month = 1000 WHERE plan = 'business';

-- ── Every question asked, and what it resolved to ──────────────
-- Doubles as an audit log (useful for improving the prompt later) and
-- as the quota counter — never a separate number that could drift from
-- what was actually asked.
CREATE TABLE IF NOT EXISTS copilot_queries (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id           uuid REFERENCES sites(id) ON DELETE CASCADE,
  user_id           uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  question          text NOT NULL,
  resolved_filter   jsonb,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_copilot_queries_user_month
  ON copilot_queries(user_id, created_at DESC);

ALTER TABLE copilot_queries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their copilot queries" ON copilot_queries;
CREATE POLICY "Users manage their copilot queries"
  ON copilot_queries FOR ALL
  USING (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()))
  WITH CHECK (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()));

-- ── Monthly count for the quota gate ────────────────────────────
CREATE OR REPLACE FUNCTION copilot_queries_this_month(p_user UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::BIGINT
  FROM copilot_queries
  WHERE user_id = p_user
    AND created_at >= date_trunc('month', now());
$$;

GRANT EXECUTE ON FUNCTION copilot_queries_this_month(UUID) TO authenticated;
