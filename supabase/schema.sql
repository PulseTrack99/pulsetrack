-- =============================================
-- PulseTrack Database Schema
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Sites table — stores websites that users want to track
CREATE TABLE IF NOT EXISTS sites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by user
CREATE INDEX idx_sites_user_id ON sites(user_id);

-- Enable Row Level Security (users can only see their own sites)
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sites"
  ON sites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sites"
  ON sites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sites"
  ON sites FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sites"
  ON sites FOR DELETE
  USING (auth.uid() = user_id);

-- Allow service role to read sites (for the tracking API validation)
CREATE POLICY "Service role can read all sites"
  ON sites FOR SELECT
  USING (true);


-- 2. Events table — stores all tracking events
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'pageview',       -- pageview, leave, event
  url TEXT,
  path TEXT NOT NULL,
  referrer TEXT,
  title TEXT,
  source TEXT,                                  -- Google, Facebook, Direct, etc.
  utm_medium TEXT,
  utm_campaign TEXT,
  country TEXT,
  device TEXT,                                  -- Desktop, Mobile, Tablet
  browser TEXT,                                 -- Chrome, Firefox, Safari, etc.
  screen_width INTEGER,
  language TEXT,
  session_id TEXT,
  duration INTEGER,                             -- in seconds (for leave events)
  event_name TEXT,                              -- custom event name
  event_props JSONB,                            -- custom event properties
  ip_hash TEXT,                                 -- hashed IP for uniqueness (GDPR friendly)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast analytics queries
CREATE INDEX idx_events_site_id ON events(site_id);
CREATE INDEX idx_events_site_type ON events(site_id, type);
CREATE INDEX idx_events_site_created ON events(site_id, created_at DESC);
CREATE INDEX idx_events_session ON events(session_id);

-- Enable RLS on events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Events can be inserted by anyone (the tracking script sends events from visitors)
CREATE POLICY "Anyone can insert events"
  ON events FOR INSERT
  WITH CHECK (true);

-- Only the site owner can read events (for the dashboard)
CREATE POLICY "Site owners can read their events"
  ON events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = events.site_id
      AND sites.user_id = auth.uid()
    )
  );

-- Service role can read all events (for the stats API)
CREATE POLICY "Service role can read all events"
  ON events FOR SELECT
  USING (true);
