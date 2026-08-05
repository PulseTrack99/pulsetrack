-- Revenue Tracking tables
-- Run this in Supabase SQL Editor

-- Store connected Stripe accounts (the user's own Stripe, not ours)
CREATE TABLE IF NOT EXISTS stripe_connections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE UNIQUE,
  stripe_restricted_key text NOT NULL,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Map visitor sessions to identified emails
CREATE TABLE IF NOT EXISTS session_identities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  email text NOT NULL,
  identified_at timestamptz DEFAULT now(),
  UNIQUE(site_id, session_id)
);

-- Revenue events from connected Stripe accounts
CREATE TABLE IF NOT EXISTS revenue_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  stripe_charge_id text NOT NULL,
  amount integer NOT NULL,           -- in smallest currency unit (cents)
  currency text DEFAULT 'eur',
  customer_email text,
  session_id text,                    -- matched visitor session
  source text DEFAULT 'Direct',      -- attributed traffic source
  landing_page text,                 -- first page the visitor saw
  country text,
  stripe_created_at timestamptz,     -- when Stripe recorded the charge
  created_at timestamptz DEFAULT now(),
  UNIQUE(site_id, stripe_charge_id)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_session_identities_email ON session_identities(site_id, email);
CREATE INDEX IF NOT EXISTS idx_session_identities_session ON session_identities(site_id, session_id);
CREATE INDEX IF NOT EXISTS idx_revenue_events_site ON revenue_events(site_id, stripe_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_events_source ON revenue_events(site_id, source);

-- RLS policies
ALTER TABLE stripe_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_events ENABLE ROW LEVEL SECURITY;

-- stripe_connections: only site owner can read/write
CREATE POLICY "Users can manage their stripe connections"
  ON stripe_connections FOR ALL
  USING (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()));

-- session_identities: service role only (tracking script inserts)
-- No user-facing RLS needed

-- revenue_events: site owner can read
CREATE POLICY "Users can view their revenue events"
  ON revenue_events FOR SELECT
  USING (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()));
