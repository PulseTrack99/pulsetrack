-- ════════════════════════════════════════════════════════════════
-- Privacy-correct visitor identification
--
-- Replaces two things that made the "cookie-free, no personal data"
-- position untrue:
--
--   1. events.ip_hash held base64 of the raw IP. Base64 is an encoding,
--      not a hash — the address was recoverable, and an IP is personal
--      data under GDPR. The column is dropped, which also destroys the
--      addresses already collected.
--
--   2. The browser wrote a session id into sessionStorage. ePrivacy
--      Art. 5(3) covers storing or reading information on the user's
--      device regardless of the mechanism, so that alone required
--      consent. Identification now happens entirely server-side.
--
-- Run this in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════

-- ── Daily rotating salt ────────────────────────────────────────
-- One salt per UTC day, shared by every serverless instance. Once a
-- day's salt is deleted its hashes can no longer be re-derived from an
-- IP, which is what makes visitor_id irreversible in practice.
CREATE TABLE IF NOT EXISTS daily_salts (
  day        DATE PRIMARY KEY,
  salt       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE daily_salts ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: only the service role (which bypasses RLS)
-- may touch salts. Leaking one would allow re-deriving that day's ids.

-- ── Anonymous visitor id ───────────────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS visitor_id TEXT;

-- ── Remove the recoverable IP data ─────────────────────────────
ALTER TABLE events DROP COLUMN IF EXISTS ip_hash;

-- ── Session resolution lookup ──────────────────────────────────
-- Serves "most recent event for this visitor on this site".
CREATE INDEX IF NOT EXISTS idx_events_visitor_recent
  ON events (site_id, visitor_id, created_at DESC);

-- ── Retention ──────────────────────────────────────────────────
DELETE FROM daily_salts WHERE day < CURRENT_DATE - INTERVAL '2 days';
