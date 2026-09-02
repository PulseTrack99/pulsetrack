-- ════════════════════════════════════════════════════════════════
-- API keys — programmatic read access to a site's aggregated stats
--
-- "API access" has been a capability flag in PLANS (Growth+) since the
-- pricing table was first written, advertised in the FAQ and on the
-- tarifs page, with nothing built behind it — no key generation, no
-- externally-callable route. This is that feature.
--
-- Scoped per-site rather than per-account: a leaked key only exposes
-- one site's stats, matching how every other feature in this app
-- (funnels, replays, heatmaps) already treats the site as the unit of
-- access. Only the SHA-256 hash is ever stored — the plaintext key is
-- shown once at creation and cannot be recovered afterwards, same
-- practice as Stripe/GitHub tokens.
--
-- Run this in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS api_keys (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id       uuid REFERENCES sites(id) ON DELETE CASCADE,
  name          text,
  key_prefix    text NOT NULL,   -- first chars of the plaintext, shown in the UI to tell keys apart
  key_hash      text NOT NULL UNIQUE,
  created_at    timestamptz DEFAULT now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_api_keys_site ON api_keys(site_id);
-- The public API route looks up by hash on every request (service role,
-- no session) — this is the lookup that has to stay fast as keys grow.
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash) WHERE revoked_at IS NULL;

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their api keys" ON api_keys;
CREATE POLICY "Users manage their api keys"
  ON api_keys FOR ALL
  USING (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()))
  WITH CHECK (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()));
