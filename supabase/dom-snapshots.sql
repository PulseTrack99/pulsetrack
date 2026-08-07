-- ════════════════════════════════════════════════════════════════
-- Full-fidelity DOM snapshots (rrweb)
--
-- The wireframe built from bounding boxes told you roughly where things
-- sat, but not what they were. rrweb serialises the actual document —
-- markup, inlined stylesheets, structure — so the dashboard can rebuild
-- the real page underneath the heat.
--
-- `dom` is the rrweb tree; `elements` stays as the lightweight fallback
-- for pages captured before this, or where rrweb declined to serialise.
--
-- Postgres TOASTs and compresses large jsonb values automatically, so a
-- multi-hundred-kilobyte tree costs far less at rest than it does on the
-- wire.
--
-- Run this in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE page_snapshots ADD COLUMN IF NOT EXISTS dom JSONB;
ALTER TABLE page_snapshots ADD COLUMN IF NOT EXISTS dom_bytes INTEGER;

-- `elements` was NOT NULL when it was the only way to draw a page. An
-- rrweb capture carries no bounding boxes, so it must be allowed to be
-- absent.
ALTER TABLE page_snapshots ALTER COLUMN elements DROP NOT NULL;

-- Serves "is there a recent capture for this page and breakpoint", which
-- the tracker asks before deciding whether to download rrweb at all.
CREATE INDEX IF NOT EXISTS idx_snapshots_freshness
  ON page_snapshots (site_id, path, device, captured_at DESC);
