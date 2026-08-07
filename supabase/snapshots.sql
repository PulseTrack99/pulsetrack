-- ════════════════════════════════════════════════════════════════
-- Page structure snapshots
--
-- A click map is meaningless without knowing what was under the click.
-- Framing the live page in an iframe fails in most real cases: the site
-- may send X-Frame-Options, the capture may have happened on a host the
-- dashboard cannot reach (localhost, staging, a domain typed differently
-- from the one configured), and the layout may have changed since.
--
-- So the tracker records the page's geometry at capture time — boxes and
-- kinds, no text content — and the dashboard redraws it as a wireframe
-- underneath the heat. One row per site + path + breakpoint, replaced as
-- newer captures arrive.
--
-- Run this in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS page_snapshots (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id     UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  path        TEXT NOT NULL,
  device      TEXT NOT NULL,

  -- Dimensions the boxes below are ratios of.
  viewport_w  INTEGER NOT NULL,
  doc_h       INTEGER NOT NULL,

  -- [{x,y,w,h,k,s}] with x/y/w/h as 0..1 ratios and k a one-letter kind:
  -- t text, b button or link, i image, f form field, c container.
  -- No text content is stored.
  elements    JSONB NOT NULL,

  captured_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (site_id, path, device)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_lookup
  ON page_snapshots (site_id, path, device);

ALTER TABLE page_snapshots ENABLE ROW LEVEL SECURITY;

-- Writes come from the ingest route via the service role, which bypasses
-- RLS. Owners may read their own sites' snapshots.
DROP POLICY IF EXISTS "Owners read their snapshots" ON page_snapshots;
CREATE POLICY "Owners read their snapshots" ON page_snapshots
  FOR SELECT
  USING (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()));
