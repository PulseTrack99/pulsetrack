-- ════════════════════════════════════════════════════════════════
-- CRITICAL: pre-existing data leak, found while testing team access
-- with a genuinely unrelated throwaway account (2026-09-02).
--
-- Two separate RLS policies let far more than intended read rows:
--
-- 1. Four policies named "Service role can read all X" — on sites,
--    events, funnels, funnel_steps — were created with roles={public},
--    not restricted to service_role. Any authenticated (or anon)
--    caller with the public anon key could read every customer's
--    sites, events, funnels and funnel_steps, regardless of
--    ownership. service_role does not need a policy for this at all —
--    it has rolbypassrls = true in this project (verified via
--    pg_roles) and already bypasses RLS unconditionally. Dropped
--    outright: nothing legitimate was relying on the policy existing.
--
-- 2. "Anyone can read public sites" on sites (USING public_share_id IS
--    NOT NULL) exposed the *full* row — including user_id, the site
--    owner's real auth id — to anyone, for any site with public
--    sharing enabled. The actual public-dashboard feature
--    (src/app/api/public/[shareId]/route.ts) already reads through
--    the service role and never needed this policy either. Dropped.
--
-- Verified closed with a real JWT for an account with zero
-- relationship to the affected data: before this fix, `select * from
-- sites` returned another user's site; after, empty. The legitimate
-- public-dashboard route was re-verified working immediately after.
--
-- Run this in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Service role can read all sites" ON sites;
DROP POLICY IF EXISTS "Service role can read all events" ON events;
DROP POLICY IF EXISTS "Service role can read all funnels" ON funnels;
DROP POLICY IF EXISTS "Service role can read all funnel steps" ON funnel_steps;
DROP POLICY IF EXISTS "Anyone can read public sites" ON sites;
