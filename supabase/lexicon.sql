-- ════════════════════════════════════════════════════════════════
-- Lexicon — the dictionary of event names a site actually sends.
--
-- Custom events are named by whoever wrote the call, and nothing stops
-- four people naming the same thing signup, Signup, sign_up and
-- user_signed_up. Left alone that turns into four half-populated lines
-- in every report. So this is governance, not analysis: what names
-- exist, how often each fires, what properties it carries, and a place
-- to write down what each one means so the next person does not invent
-- a fifth spelling.
--
-- Two objects:
--
--   event_lexicon      what a human wrote about a name — the only new
--                      state here. Names themselves are never stored;
--                      they are derived from the events, so a name that
--                      stops firing simply stops appearing.
--
--   site_event_lexicon aggregate over the events table. Postgres does
--                      this in one grouped pass; PostgREST cannot group
--                      at all, which is why it is a function.
--
-- Run this in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS event_lexicon (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id     uuid REFERENCES sites(id) ON DELETE CASCADE,
  -- The event name this note is about. Not a foreign key: the name
  -- lives in the event rows, and a note may outlive the last event
  -- that carried it or be written before the first one arrives.
  name        text NOT NULL,
  description text,
  -- Hidden events stay in the database and keep counting; they are
  -- just dropped from the Events screen by default. For the debug
  -- event someone left in production, not for hiding data from a
  -- teammate.
  hidden      boolean NOT NULL DEFAULT false,
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (site_id, name)
);

CREATE INDEX IF NOT EXISTS idx_event_lexicon_site ON event_lexicon(site_id);

ALTER TABLE event_lexicon ENABLE ROW LEVEL SECURITY;

-- Same access rule as every other site-scoped table: owner or an
-- active team member of that owner's account (has_account_access,
-- supabase/team.sql).
DROP POLICY IF EXISTS "Users manage their lexicon" ON event_lexicon;
CREATE POLICY "Users manage their lexicon"
  ON event_lexicon FOR ALL
  USING (site_id IN (SELECT id FROM sites WHERE has_account_access(sites.user_id)))
  WITH CHECK (site_id IN (SELECT id FROM sites WHERE has_account_access(sites.user_id)));

-- ── The inventory ──────────────────────────────────────────────
-- SECURITY INVOKER (the default) on purpose: the function is only ever
-- as visible as the caller's own RLS on events, so no ownership check
-- is needed here — a caller who cannot read the site's events gets
-- nothing back.
CREATE OR REPLACE FUNCTION site_event_lexicon(
  p_site UUID, p_since TIMESTAMPTZ
)
RETURNS TABLE (
  name       TEXT,
  volume     BIGINT,
  visitors   BIGINT,
  first_at   TIMESTAMPTZ,
  last_at    TIMESTAMPTZ,
  properties TEXT[]
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT
    e.event_name,
    count(*)::BIGINT,
    count(DISTINCT e.visitor_id)::BIGINT,
    min(e.created_at),
    max(e.created_at),
    -- Every property key this name has ever arrived with, in the
    -- window. Two calls sending different keys under one name is
    -- exactly the drift this screen exists to surface.
    COALESCE(
      (
        SELECT array_agg(DISTINCT k ORDER BY k)
        FROM events e2
        CROSS JOIN LATERAL jsonb_object_keys(
          COALESCE(e2.event_props, '{}'::jsonb)
        ) AS k
        WHERE e2.site_id = e.site_id
          AND e2.event_name = e.event_name
          AND e2.created_at >= p_since
      ),
      ARRAY[]::TEXT[]
    )
  FROM events e
  WHERE e.site_id = p_site
    AND e.type = 'event'
    AND e.event_name IS NOT NULL
    AND e.created_at >= p_since
  GROUP BY e.site_id, e.event_name
  ORDER BY count(*) DESC;
$$;

GRANT EXECUTE ON FUNCTION site_event_lexicon(UUID, TIMESTAMPTZ) TO authenticated;
