-- ════════════════════════════════════════════════════════════════
-- Plan limits, enforced in the database
--
-- The pricing table sells caps that nothing checked: a free account
-- could create any number of sites and funnels and send events forever.
--
-- Sites and funnels are created straight from the browser with the
-- user's own token, so an application-level check would be advisory at
-- best — anyone could call PostgREST directly and skip it. The limits
-- therefore live in triggers, where they hold regardless of how the row
-- arrives.
--
-- Event volume is different: events only ever enter through our ingest
-- route with the service role, so that one is counted and capped there.
--
-- Run this in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════

-- ── The limits themselves ──────────────────────────────────────
-- Kept in a table rather than inline in each trigger so there is one
-- place to change them. Must stay in step with PLANS in
-- src/lib/stripe.ts — scripts/check-plan-limits.mjs asserts they match.
CREATE TABLE IF NOT EXISTS plan_limits (
  plan                 TEXT PRIMARY KEY,
  max_sites            INT    NOT NULL,
  max_events_per_month BIGINT NOT NULL,
  max_funnels          INT    NOT NULL,  -- -1 means unlimited
  retention_days       INT    NOT NULL
);

INSERT INTO plan_limits (plan, max_sites, max_events_per_month, max_funnels, retention_days)
VALUES
  ('free',      1,    5000,   1,  30),
  ('starter',   3,   50000,   5,  90),
  ('growth',   10,  200000,  20, 180),
  ('business', 50, 1000000,  -1, 365)
ON CONFLICT (plan) DO UPDATE SET
  max_sites            = EXCLUDED.max_sites,
  max_events_per_month = EXCLUDED.max_events_per_month,
  max_funnels          = EXCLUDED.max_funnels,
  retention_days       = EXCLUDED.retention_days;

ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;

-- The limits are not secret; the upgrade page shows them.
DROP POLICY IF EXISTS "Anyone can read plan limits" ON plan_limits;
CREATE POLICY "Anyone can read plan limits" ON plan_limits
  FOR SELECT USING (true);

-- ── Which plan a user is actually on ───────────────────────────
-- Anything not live falls back to free, so a lapsed subscription loses
-- the higher caps without losing the account.
CREATE OR REPLACE FUNCTION current_plan(p_user UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT plan FROM subscriptions
      WHERE user_id = p_user
        AND status IN ('active', 'trialing')
      LIMIT 1),
    'free'
  );
$$;

-- ── Site limit ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION enforce_site_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim INT;
  cnt INT;
BEGIN
  SELECT max_sites INTO lim
  FROM plan_limits WHERE plan = current_plan(NEW.user_id);

  -- An unknown plan gets the most restrictive treatment, never none.
  IF lim IS NULL THEN lim := 1; END IF;
  IF lim < 0 THEN RETURN NEW; END IF;

  SELECT count(*) INTO cnt FROM sites WHERE user_id = NEW.user_id;

  IF cnt >= lim THEN
    RAISE EXCEPTION 'site_limit_reached:%', lim
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_site_limit ON sites;
CREATE TRIGGER trg_site_limit
  BEFORE INSERT ON sites
  FOR EACH ROW EXECUTE FUNCTION enforce_site_limit();

-- ── Funnel limit ───────────────────────────────────────────────
-- Counted across every site the user owns, matching how the pricing
-- table reads ("5 funnels", not "5 per site").
CREATE OR REPLACE FUNCTION enforce_funnel_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner UUID;
  lim   INT;
  cnt   INT;
BEGIN
  SELECT user_id INTO owner FROM sites WHERE id = NEW.site_id;
  IF owner IS NULL THEN
    RAISE EXCEPTION 'unknown_site' USING ERRCODE = 'foreign_key_violation';
  END IF;

  SELECT max_funnels INTO lim
  FROM plan_limits WHERE plan = current_plan(owner);

  IF lim IS NULL THEN lim := 1; END IF;
  IF lim < 0 THEN RETURN NEW; END IF;

  SELECT count(*) INTO cnt
  FROM funnels f JOIN sites s ON s.id = f.site_id
  WHERE s.user_id = owner;

  IF cnt >= lim THEN
    RAISE EXCEPTION 'funnel_limit_reached:%', lim
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_funnel_limit ON funnels;
CREATE TRIGGER trg_funnel_limit
  BEFORE INSERT ON funnels
  FOR EACH ROW EXECUTE FUNCTION enforce_funnel_limit();

-- ── Monthly event volume ───────────────────────────────────────
-- A single row per user per month, so counting a month's usage never
-- means scanning the event log.
CREATE TABLE IF NOT EXISTS usage_counters (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month   DATE NOT NULL,
  events  BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, month)
);

ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their own usage" ON usage_counters;
CREATE POLICY "Users read their own usage" ON usage_counters
  FOR SELECT USING (user_id = auth.uid());

-- Increments and returns the new total in one round trip, so the ingest
-- route can decide whether to keep the event without a second query.
CREATE OR REPLACE FUNCTION bump_usage(p_user UUID, p_n INT DEFAULT 1)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total BIGINT;
BEGIN
  INSERT INTO usage_counters (user_id, month, events)
  VALUES (p_user, date_trunc('month', now())::DATE, p_n)
  ON CONFLICT (user_id, month)
  DO UPDATE SET events = usage_counters.events + p_n
  RETURNING events INTO total;

  RETURN total;
END;
$$;

-- Current month's usage next to the plan's cap, for the dashboard.
CREATE OR REPLACE FUNCTION usage_summary(p_user UUID)
RETURNS TABLE (
  plan          TEXT,
  events_used   BIGINT,
  events_limit  BIGINT,
  sites_used    BIGINT,
  sites_limit   INT,
  funnels_used  BIGINT,
  funnels_limit INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    current_plan(p_user),
    COALESCE((SELECT events FROM usage_counters
              WHERE user_id = p_user
                AND month = date_trunc('month', now())::DATE), 0),
    l.max_events_per_month,
    (SELECT count(*) FROM sites WHERE user_id = p_user),
    l.max_sites,
    (SELECT count(*) FROM funnels f JOIN sites s ON s.id = f.site_id
      WHERE s.user_id = p_user),
    l.max_funnels
  FROM plan_limits l
  WHERE l.plan = current_plan(p_user);
$$;

GRANT EXECUTE ON FUNCTION current_plan(UUID)     TO authenticated;
GRANT EXECUTE ON FUNCTION usage_summary(UUID)    TO authenticated;
-- bump_usage is only ever called by the ingest route with the service
-- role, which does not need a grant.
