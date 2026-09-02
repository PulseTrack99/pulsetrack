-- ════════════════════════════════════════════════════════════════
-- Team members — invite coworkers into one account
--
-- The biggest gap found comparing PulseTrack to Mixpanel: an account
-- was strictly one Supabase auth user, with no way to add a coworker.
--
-- Deliberately minimal model for v1 (scoped with the user before
-- building): one flat "member" role with the same access as the owner
-- except billing and account deletion; unlimited seats on every plan;
-- invites are a copyable link, not an email (no email infra exists in
-- this project yet). A person is a member of at most one other
-- account at a time — no multi-team switcher. All of this can grow
-- later; it is not a promise cut, just where v1 draws the line.
--
-- The owner keeps being the single "account" everything is billed and
-- quota-limited against — a member's own auth.uid() never gets its
-- own subscription or its own sites. Every existing RLS policy that
-- checked "sites.user_id = auth.uid()" is rewritten to go through
-- has_account_access(), which is true for the owner AND for any
-- active member of that owner's team — same access, one extra path in.
--
-- Run this in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS team_members (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_user_id  uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- null until the invite is accepted
  invite_token    text UNIQUE,
  label           text,   -- optional note for the owner ("for Marie") — no email is ever sent
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  created_at      timestamptz DEFAULT now(),
  accepted_at     timestamptz,
  -- A given person can only have one membership row per owner, and
  -- (once accepted) can only be an active member of one account —
  -- enforced in application code at accept time, this just stops the
  -- same invite link being double-consumed by two different people.
  UNIQUE (owner_user_id, member_user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_owner ON team_members(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_member ON team_members(member_user_id);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Owners manage invites and memberships on their own team.
DROP POLICY IF EXISTS "Owners manage their team" ON team_members;
CREATE POLICY "Owners manage their team"
  ON team_members FOR ALL
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- A member can see their own membership row (to know which account
-- they belong to), but never anyone else's team roster.
DROP POLICY IF EXISTS "Members see their own membership" ON team_members;
CREATE POLICY "Members see their own membership"
  ON team_members FOR SELECT
  USING (member_user_id = auth.uid());

-- Pending invites have no member_user_id yet, so accepting one has to
-- go by token instead of RLS ownership — looked up with the service
-- role from /api/team/accept, which then does the UPDATE as the
-- accepting user's own session (covered by the member policy above
-- only after member_user_id is set, so the UPDATE itself also runs
-- under service role).

-- ── The actual access check every other policy now goes through ───
CREATE OR REPLACE FUNCTION has_account_access(target_owner UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT target_owner = auth.uid()
    OR EXISTS (
      SELECT 1 FROM team_members
      WHERE owner_user_id = target_owner
        AND member_user_id = auth.uid()
        AND status = 'active'
    );
$$;

REVOKE EXECUTE ON FUNCTION has_account_access(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION has_account_access(uuid) TO authenticated;

-- ── sites: the root of every other table's access check ───────────
DROP POLICY IF EXISTS "Users can view their own sites" ON sites;
CREATE POLICY "Users can view their own sites"
  ON sites FOR SELECT
  USING (has_account_access(user_id));

DROP POLICY IF EXISTS "Users can create their own sites" ON sites;
CREATE POLICY "Users can create their own sites"
  ON sites FOR INSERT
  WITH CHECK (has_account_access(user_id));

DROP POLICY IF EXISTS "Users can update their own sites" ON sites;
CREATE POLICY "Users can update their own sites"
  ON sites FOR UPDATE
  USING (has_account_access(user_id));

DROP POLICY IF EXISTS "Users can delete their own sites" ON sites;
CREATE POLICY "Users can delete their own sites"
  ON sites FOR DELETE
  USING (has_account_access(user_id));

-- ── Every table scoped through sites.user_id ───────────────────────
DROP POLICY IF EXISTS "Site owners can read their events" ON events;
CREATE POLICY "Site owners can read their events"
  ON events FOR SELECT
  USING (EXISTS (SELECT 1 FROM sites WHERE sites.id = events.site_id AND has_account_access(sites.user_id)));

DROP POLICY IF EXISTS "Users can manage funnels for their sites" ON funnels;
CREATE POLICY "Users can manage funnels for their sites"
  ON funnels FOR ALL
  USING (EXISTS (SELECT 1 FROM sites WHERE sites.id = funnels.site_id AND has_account_access(sites.user_id)));

DROP POLICY IF EXISTS "Users can manage funnel steps for their funnels" ON funnel_steps;
CREATE POLICY "Users can manage funnel steps for their funnels"
  ON funnel_steps FOR ALL
  USING (EXISTS (
    SELECT 1 FROM funnels JOIN sites ON sites.id = funnels.site_id
    WHERE funnels.id = funnel_steps.funnel_id AND has_account_access(sites.user_id)
  ));

DROP POLICY IF EXISTS "Owners read their interactions" ON interactions;
CREATE POLICY "Owners read their interactions"
  ON interactions FOR SELECT
  USING (site_id IN (SELECT id FROM sites WHERE has_account_access(sites.user_id)));

DROP POLICY IF EXISTS "Owners read their snapshots" ON page_snapshots;
CREATE POLICY "Owners read their snapshots"
  ON page_snapshots FOR SELECT
  USING (site_id IN (SELECT id FROM sites WHERE has_account_access(sites.user_id)));

DROP POLICY IF EXISTS "Users can view their revenue events" ON revenue_events;
CREATE POLICY "Users can view their revenue events"
  ON revenue_events FOR SELECT
  USING (site_id IN (SELECT id FROM sites WHERE has_account_access(sites.user_id)));

DROP POLICY IF EXISTS "Users can manage their stripe connections" ON stripe_connections;
CREATE POLICY "Users can manage their stripe connections"
  ON stripe_connections FOR ALL
  USING (site_id IN (SELECT id FROM sites WHERE has_account_access(sites.user_id)));

DROP POLICY IF EXISTS "Users manage their api keys" ON api_keys;
CREATE POLICY "Users manage their api keys"
  ON api_keys FOR ALL
  USING (site_id IN (SELECT id FROM sites WHERE has_account_access(sites.user_id)))
  WITH CHECK (site_id IN (SELECT id FROM sites WHERE has_account_access(sites.user_id)));

DROP POLICY IF EXISTS "Users manage their copilot queries" ON copilot_queries;
CREATE POLICY "Users manage their copilot queries"
  ON copilot_queries FOR ALL
  USING (site_id IN (SELECT id FROM sites WHERE has_account_access(sites.user_id)))
  WITH CHECK (site_id IN (SELECT id FROM sites WHERE has_account_access(sites.user_id)));

-- ── Tables keyed directly by user_id (not via sites) ───────────────
DROP POLICY IF EXISTS "Owners read their replays" ON session_replays;
CREATE POLICY "Owners read their replays"
  ON session_replays FOR SELECT
  USING (has_account_access(user_id));

DROP POLICY IF EXISTS "Users can read own subscription" ON subscriptions;
CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  USING (has_account_access(user_id));

DROP POLICY IF EXISTS "Users read their own usage" ON usage_counters;
CREATE POLICY "Users read their own usage"
  ON usage_counters FOR SELECT
  USING (has_account_access(user_id));
