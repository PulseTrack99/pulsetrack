-- ════════════════════════════════════════════════════════════════
-- Heatmaps: click maps, scroll depth, rage clicks
--
-- Interactions live in their own table rather than in `events` because
-- they arrive at a very different rate (dozens per pageview instead of
-- one) and are queried by path rather than by session.
--
-- Nothing here identifies a person: no IP, no cookie, and input values
-- are never captured — only the element a click landed on.
--
-- Run this in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS interactions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id     UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  session_id  TEXT,
  visitor_id  TEXT,
  path        TEXT NOT NULL,

  -- 'click' | 'rage' | 'scroll'
  type        TEXT NOT NULL,

  -- Click position. x is a 0..1 ratio of document width so it survives
  -- different window sizes; y is absolute from the document top, which
  -- is what a page-length heat overlay needs.
  x_ratio     REAL,
  y_px        INTEGER,

  -- Kept so the dashboard can bucket by breakpoint — a click map mixing
  -- phones and desktops is meaningless.
  viewport_w  INTEGER,
  viewport_h  INTEGER,
  doc_h       INTEGER,
  device      TEXT,

  -- Element-level attribution. More robust than coordinates when the
  -- layout changes, and it answers "which button is actually used".
  selector    TEXT,
  elem_text   TEXT,
  interactive BOOLEAN DEFAULT false,

  -- type='scroll' only: furthest depth reached, 0..100
  scroll_pct  SMALLINT,

  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Serves the main dashboard query: one page, one period.
CREATE INDEX IF NOT EXISTS idx_interactions_page
  ON interactions (site_id, path, created_at DESC);

-- Serves "which pages have heatmap data at all".
CREATE INDEX IF NOT EXISTS idx_interactions_site
  ON interactions (site_id, created_at DESC);

-- Serves the element ranking without scanning coordinates.
CREATE INDEX IF NOT EXISTS idx_interactions_selector
  ON interactions (site_id, path, selector)
  WHERE selector IS NOT NULL;

-- ── Row level security ─────────────────────────────────────────
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

-- Writes come from the ingest route using the service role, which
-- bypasses RLS. Owners may read their own sites' interactions.
DROP POLICY IF EXISTS "Owners read their interactions" ON interactions;
CREATE POLICY "Owners read their interactions" ON interactions
  FOR SELECT
  USING (
    site_id IN (SELECT id FROM sites WHERE user_id = auth.uid())
  );
