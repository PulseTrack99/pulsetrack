-- ════════════════════════════════════════════════════════════════
-- Saved cohorts — name and reuse a behavioural filter combination
-- instead of reconfiguring it every visit.
--
-- A cohort is just a saved snapshot of the filter state the session
-- replay panel already builds (behaviour + its parameters, device,
-- rage-only) — no new filtering logic, no new plan gate: reaching
-- this panel at all already requires session_replay (Starter+), and a
-- saved cohort can't do anything the manual controls couldn't already
-- do by hand.
--
-- Run this in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cohorts (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id     uuid REFERENCES sites(id) ON DELETE CASCADE,
  name        text NOT NULL,
  behavior    text CHECK (behavior IN ('no_conversion', 'low_scroll', 'funnel_dropoff')),
  scroll_max  int,
  funnel_id   uuid REFERENCES funnels(id) ON DELETE CASCADE,
  step        int,
  device      text,
  rage_only   boolean NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cohorts_site ON cohorts(site_id, created_at DESC);

ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;

-- Same access rule as every other site-scoped table: owner or an
-- active team member of that owner's account (has_account_access,
-- supabase/team.sql).
DROP POLICY IF EXISTS "Users manage their cohorts" ON cohorts;
CREATE POLICY "Users manage their cohorts"
  ON cohorts FOR ALL
  USING (site_id IN (SELECT id FROM sites WHERE has_account_access(sites.user_id)))
  WITH CHECK (site_id IN (SELECT id FROM sites WHERE has_account_access(sites.user_id)));
