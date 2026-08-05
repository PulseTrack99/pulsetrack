-- =============================================
-- PulseTrack Funnels Schema
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Funnels table — stores funnel definitions
CREATE TABLE IF NOT EXISTS funnels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_funnels_site_id ON funnels(site_id);

ALTER TABLE funnels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage funnels for their sites"
  ON funnels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = funnels.site_id
      AND sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can read all funnels"
  ON funnels FOR SELECT
  USING (true);


-- 2. Funnel steps table — stores ordered steps in a funnel
CREATE TABLE IF NOT EXISTS funnel_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  match_type TEXT NOT NULL DEFAULT 'path',  -- 'path', 'event', 'path_contains'
  match_value TEXT NOT NULL,                 -- e.g. '/pricing', 'click_buy', '/blog'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(funnel_id, step_order)
);

CREATE INDEX idx_funnel_steps_funnel_id ON funnel_steps(funnel_id);

ALTER TABLE funnel_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage funnel steps for their funnels"
  ON funnel_steps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM funnels
      JOIN sites ON sites.id = funnels.site_id
      WHERE funnels.id = funnel_steps.funnel_id
      AND sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can read all funnel steps"
  ON funnel_steps FOR SELECT
  USING (true);
