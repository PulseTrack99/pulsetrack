-- ════════════════════════════════════════════════════════════════
-- Security hardening — findings from Supabase's own advisor
-- (get_advisors, security), run 2026-09-02.
--
-- Two independent issues, both real but neither exploited so far:
--
-- 1. function_search_path_mutable (WARN) — 14 SECURITY INVOKER
--    functions (stats/realtime/behavioural-filter reads) had no fixed
--    search_path. These are all safe from data leakage regardless
--    (SECURITY INVOKER means the caller's own RLS still applies — an
--    anon caller reading through them gets nothing, since RLS checks
--    auth.uid() against site ownership and anon has none), but a
--    mutable search_path is still bad hygiene: fixed here with
--    ALTER FUNCTION ... SET search_path, which changes nothing about
--    behaviour, only closes the theoretical schema-shadowing angle.
--
-- 2. SECURITY DEFINER functions callable directly by anon/authenticated
--    via PostgREST, bypassing RLS by design — the real finding:
--      - current_plan, enforce_site_limit, enforce_funnel_limit: only
--        ever called internally by other functions/triggers, never by
--        the app. Locked to nobody external — internal calls are
--        unaffected, they run under the definer's own privileges.
--      - bump_usage, bump_replay_segment: only ever called by ingest
--        routes under the service role. Anyone with the public anon
--        key could otherwise call these directly with an arbitrary
--        p_user/p_site and corrupt someone else's usage counters or
--        replay metadata. Locked to service_role only.
--      - usage_summary, replays_this_month, copilot_queries_this_month:
--        genuine IDOR — took p_user as a bare parameter with no check
--        it matched the caller. Anyone with the anon key could pass
--        any user's UUID and read their plan, usage and quota
--        consumption. Fixed by requiring p_user = auth.uid() inside
--        the function itself, and revoking anon entirely (authenticated
--        keeps access — the app calls these only ever with the
--        caller's own id, verified against every call site in
--        src/lib/plan.ts and src/app/dashboard/upgrade/page.tsx).
--
-- Run this in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════

-- ── Fix 1: pin search_path on every SECURITY INVOKER read function ──
ALTER FUNCTION stats_overview(uuid, timestamptz) SET search_path = public;
ALTER FUNCTION stats_top_pages(uuid, timestamptz, int) SET search_path = public;
ALTER FUNCTION stats_top_sources(uuid, timestamptz, int) SET search_path = public;
ALTER FUNCTION stats_top_countries(uuid, timestamptz, int) SET search_path = public;
ALTER FUNCTION stats_devices(uuid, timestamptz) SET search_path = public;
ALTER FUNCTION stats_daily(uuid, timestamptz) SET search_path = public;
ALTER FUNCTION funnel_results(uuid, timestamptz, jsonb) SET search_path = public;
ALTER FUNCTION realtime_active(uuid, int) SET search_path = public;
ALTER FUNCTION realtime_pages(uuid, int, int) SET search_path = public;
ALTER FUNCTION realtime_sparkline(uuid, int) SET search_path = public;
ALTER FUNCTION list_session_replays(uuid, timestamptz, text, boolean, int, int, text, text[]) SET search_path = public;
ALTER FUNCTION sessions_low_scroll(uuid, timestamptz, int) SET search_path = public;
ALTER FUNCTION sessions_without_conversion(uuid, timestamptz) SET search_path = public;
ALTER FUNCTION funnel_dropoff_sessions(uuid, timestamptz, int) SET search_path = public;

-- ── Fix 2a: internal-only helpers — nobody external calls these ────
REVOKE EXECUTE ON FUNCTION current_plan(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION enforce_site_limit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION enforce_funnel_limit() FROM PUBLIC;

-- ── Fix 2b: ingest-only helpers — service role calls these, nobody else ──
REVOKE EXECUTE ON FUNCTION bump_usage(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION bump_usage(uuid, int) TO service_role;

REVOKE EXECUTE ON FUNCTION bump_replay_segment(uuid, text, int, int, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION bump_replay_segment(uuid, text, int, int, boolean) TO service_role;

-- ── Fix 2c: self-service quota reads — close the IDOR, keep the feature ──
-- Same bodies as before (supabase/quotas.sql, session-replays.sql,
-- replay-behavioral-filters.sql) with one added guard: p_user must be
-- the caller's own id. Every real call site already passes the
-- caller's own user.id under a signed-in session, so this changes
-- nothing for the app — it only stops someone else's UUID from
-- returning real data instead of nothing.
CREATE OR REPLACE FUNCTION usage_summary(p_user UUID)
RETURNS TABLE (
  plan          TEXT,
  events_used   BIGINT,
  events_limit  BIGINT,
  sites_used    BIGINT,
  sites_limit   INT,
  funnels_used  BIGINT,
  funnels_limit INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    current_plan(p_user),
    COALESCE((SELECT events FROM usage_counters
              WHERE user_id = p_user
                AND month = date_trunc('month', now())::DATE), 0),
    l.max_events_per_month,
    (SELECT count(*) FROM sites WHERE user_id = p_user),
    l.max_sites,
    (SELECT count(*) FROM funnels f JOIN sites s ON s.id = f.site_id
      WHERE s.user_id = p_user),
    l.max_funnels
  FROM plan_limits l
  WHERE l.plan = current_plan(p_user)
    AND p_user = auth.uid();
$$;

CREATE OR REPLACE FUNCTION replays_this_month(p_user UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::BIGINT
  FROM session_replays
  WHERE user_id = p_user
    AND user_id = auth.uid()
    AND created_at >= date_trunc('month', now());
$$;

CREATE OR REPLACE FUNCTION copilot_queries_this_month(p_user UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::BIGINT
  FROM copilot_queries
  WHERE user_id = p_user
    AND user_id = auth.uid()
    AND created_at >= date_trunc('month', now());
$$;

REVOKE EXECUTE ON FUNCTION usage_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION usage_summary(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION replays_this_month(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION replays_this_month(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION copilot_queries_this_month(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION copilot_queries_this_month(uuid) TO authenticated;
