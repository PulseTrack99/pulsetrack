import { createClient } from "@supabase/supabase-js";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { resolveApiKey, isApiKeyRateLimited, type ResolvedApiKey } from "@/lib/api-keys";
import { resolveOAuthToken, type ResolvedOAuthToken } from "@/lib/oauth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSiteStats } from "@/lib/stats";
import { getSiteRevenue } from "@/lib/revenue";
import { planHas } from "@/lib/plan";
import { MCP_METADATA_PATH } from "@/lib/mcp-metadata";
import { runInsights, MEASURES, GRAINS, FORMULAS, PERIODS as INSIGHT_PERIODS } from "@/lib/insights";
import { collapseTail, type Row as FlowRow } from "@/lib/flow";
import { resultsFor, type Variant } from "@/lib/experiments";

/**
 * PulseTrack MCP server — the landing page's "AU PROGRAMME" promise
 * (src/content ... "Interrogez vos analytics depuis là où vous
 * travaillez déjà"), now built. Lets Claude, ChatGPT, Gemini or any
 * MCP-aware client query a site's analytics in natural language.
 *
 * Same trust model as the REST API (src/app/api/v1/stats/route.ts):
 * a Bearer API key IS the site — resolveApiKey decides which site a
 * call can ever touch, callers never supply a site_id, and the same
 * shared rate limiter/plan check applies (src/lib/api-keys.ts), so a
 * client can't get a bigger effective quota by using MCP instead of
 * the REST API.
 *
 * Stateless by design (mcp-handler serves the 2026-07-28 spec without
 * sessions) — a perfect fit for Vercel's serverless functions, and
 * matches how every other route in this app already runs.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AuthExtra {
  siteId: string;
  siteName: string;
  siteDomain: string;
  plan: ResolvedApiKey["plan"];
  /** « Lecture et modification » (OAuth) ou clé créée avec la modification. */
  canWrite: boolean;
  /** Propriétaire du site, auteur des annotations créées par l'assistant. */
  ownerId: string;
}

const periodSchema = z
  .enum(["7d", "30d", "90d"])
  .optional()
  .describe("Time window: 7d, 30d (default), or 90d.");

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pulsetrack.eu";

/**
 * Les indications que les assistants lisent avant d'appeler un outil.
 * Claude laisse passer un outil en lecture seule sans confirmation et en
 * demande une pour tout outil destructif ; les annuaires de Claude et de
 * ChatGPT refusent un serveur dont un outil n'en porte pas. Tous les
 * outils actuels lisent sans rien changer, sur le seul site du jeton —
 * d'où openWorldHint à false.
 */
const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

/**
 * Les outils qui créent ou changent quelque chose. destructiveHint fait
 * demander une confirmation à Claude avant chaque appel. Aucun outil ne
 * supprime : archiver un flag ou arrêter un A/B test est réversible
 * depuis le tableau de bord.
 */
const WRITE = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
} as const;

type ToolExtra = { http?: { authInfo?: { extra?: Record<string, unknown> } } };

function authOf(ctx: ToolExtra): AuthExtra | undefined {
  return ctx.http?.authInfo?.extra as AuthExtra | undefined;
}

function json(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function failure(message: string) {
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

const UNAUTHORIZED = failure("Unauthorized");

function sinceDays(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/** Un nom exact ou un identifiant — les assistants disposent des deux. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Même forme que les écrans Flags et Experiments : ce que le client
 *  écrit dans son code, sans espace ni accent. */
const KEY_SHAPE = /^[a-z0-9][a-z0-9_-]{0,58}[a-z0-9]$/;

const READ_ONLY_CONNECTION = failure(
  'This connection is read-only, so nothing was changed. To allow changes, reconnect PulseTrack and choose "Read and modify" on the consent screen, or use an API key created with "Allow changes through MCP".'
);

async function findBoard(siteId: string, board: string) {
  const query = supabase.from("boards").select("id, name").eq("site_id", siteId);
  const { data } = UUID.test(board)
    ? await query.eq("id", board).maybeSingle()
    : await query.eq("name", board).limit(1).maybeSingle();
  return data as { id: string; name: string } | null;
}

const baseHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      "get_stats",
      {
        title: "Get site stats",
        annotations: { title: "Get site stats", ...READ_ONLY },
        description:
          "Overview analytics for the authenticated site: visitors, pageviews, bounce rate, top pages, traffic sources, countries and devices. Privacy note: visitors are anonymised with an identifier that rotates every day, so a person returning on several days is counted once per day — a 30-day visitor figure is a sum of daily visitors, not a count of distinct people.",
        inputSchema: z.object({ period: periodSchema }),
      },
      async ({ period }, ctx) => {
        const auth = ctx.http?.authInfo?.extra as AuthExtra | undefined;
        if (!auth) {
          return { isError: true, content: [{ type: "text", text: "Unauthorized" }] };
        }
        const p = period ?? "30d";
        const stats = await getSiteStats(supabase, auth.siteId, p);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { site: { name: auth.siteName, domain: auth.siteDomain }, period: p, ...stats },
                null,
                2
              ),
            },
          ],
        };
      }
    );

    server.registerTool(
      "get_revenue",
      {
        title: "Get revenue attribution",
        annotations: { title: "Get revenue attribution", ...READ_ONLY },
        description:
          "Revenue tied back to traffic sources via the site's connected Stripe account: totals, revenue by source, revenue by landing page, and recent transactions. Requires the Growth plan or above.",
        inputSchema: z.object({ period: periodSchema }),
      },
      async ({ period }, ctx) => {
        const auth = ctx.http?.authInfo?.extra as AuthExtra | undefined;
        if (!auth) {
          return { isError: true, content: [{ type: "text", text: "Unauthorized" }] };
        }
        if (!planHas(auth.plan, "revenue")) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: "This site's plan does not include revenue tracking (Growth plan or above required).",
              },
            ],
          };
        }
        const revenue = await getSiteRevenue(supabase, auth.siteId, period ?? "30d");
        // L'e-mail des clients reste dans le tableau de bord : un assistant
        // n'en a pas besoin pour analyser le revenu, et il partirait chez
        // l'éditeur de l'assistant. JSON.stringify omet la clé undefined.
        return json({
          ...revenue,
          recent_transactions: revenue.recent_transactions?.map((t) => ({ ...t, email: undefined })),
        });
      }
    );

    server.registerTool(
      "list_funnels",
      {
        title: "List funnels",
        annotations: { title: "List funnels", ...READ_ONLY },
        description: "Lists the conversion funnels configured on the authenticated site, with their step names in order.",
        inputSchema: z.object({}),
      },
      async (_args, ctx) => {
        const auth = ctx.http?.authInfo?.extra as AuthExtra | undefined;
        if (!auth) {
          return { isError: true, content: [{ type: "text", text: "Unauthorized" }] };
        }
        const { data: funnels } = await supabase
          .from("funnels")
          .select("id, name, funnel_steps(step_order, name)")
          .eq("site_id", auth.siteId)
          .is("archived_at", null);
        const list = (funnels ?? []).map((f) => ({
          id: f.id,
          name: f.name,
          steps: ((f.funnel_steps ?? []) as { step_order: number; name: string }[])
            .sort((a, b) => a.step_order - b.step_order)
            .map((s) => s.name),
        }));
        return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
      }
    );

    server.registerTool(
      "get_funnel",
      {
        title: "Get funnel drop-off",
        annotations: { title: "Get funnel drop-off", ...READ_ONLY },
        description:
          "Drop-off results for one funnel on the authenticated site — visitors, conversion rate and drop-off rate at each step. Identify the funnel by its exact name (see list_funnels) or its id.",
        inputSchema: z.object({
          funnel: z.string().describe("Funnel name (exact match) or funnel id."),
          period: periodSchema,
        }),
      },
      async ({ funnel, period }, ctx) => {
        const auth = ctx.http?.authInfo?.extra as AuthExtra | undefined;
        if (!auth) {
          return { isError: true, content: [{ type: "text", text: "Unauthorized" }] };
        }

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(funnel);
        const query = supabase
          .from("funnels")
          .select("id, name, funnel_steps(step_order, name, match_type, match_value)")
          .eq("site_id", auth.siteId)
          .is("archived_at", null);
        const { data: found } = isUuid
          ? await query.eq("id", funnel).maybeSingle()
          : await query.eq("name", funnel).maybeSingle();

        if (!found) {
          return {
            isError: true,
            content: [{ type: "text", text: `No funnel named or with id "${funnel}" on this site. Use list_funnels to see available funnels.` }],
          };
        }

        const steps = (
          (found.funnel_steps ?? []) as {
            step_order: number;
            name: string;
            match_type: string;
            match_value: string;
          }[]
        ).sort((a, b) => a.step_order - b.step_order);

        const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        const { data: matched, error } = await supabase.rpc("funnel_results", {
          p_site: auth.siteId,
          p_since: since,
          p_steps: steps.map((s) => ({ match_type: s.match_type, match_value: s.match_value })),
        });
        if (error) {
          return { isError: true, content: [{ type: "text", text: `Query failed: ${error.message}` }] };
        }

        const reached = new Map<number, number>();
        // `visitors` depuis supabase/funnel-visitors.sql ; `sessions`
        // tant que cette migration n'a pas tourné.
        (
          (matched ?? []) as {
            step_index: number;
            visitors?: number;
            sessions?: number;
          }[]
        ).forEach((r) =>
          reached.set(Number(r.step_index), Number(r.visitors ?? r.sessions ?? 0))
        );
        const totalStart = reached.get(0) ?? 0;
        const stepResults = steps.map((step, i) => {
          const visitors = reached.get(i) ?? 0;
          const prevVisitors = i > 0 ? reached.get(i - 1) ?? 0 : visitors;
          return {
            step_order: step.step_order,
            name: step.name,
            visitors,
            conversion_rate: totalStart > 0 ? Math.round((visitors / totalStart) * 100) : 0,
            drop_off_rate: i > 0 && prevVisitors > 0 ? Math.round(((prevVisitors - visitors) / prevVisitors) * 100) : 0,
          };
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { funnel_id: found.id, funnel_name: found.name, period: period ?? "30d", steps: stepResults },
                null,
                2
              ),
            },
          ],
        };
      }
    );

    server.registerTool(
      "get_realtime",
      {
        title: "Get real-time visitors",
        annotations: { title: "Get real-time visitors", ...READ_ONLY },
        description: "Visitors currently active on the authenticated site (last 5 minutes) and which pages they're on.",
        inputSchema: z.object({}),
      },
      async (_args, ctx) => {
        const auth = ctx.http?.authInfo?.extra as AuthExtra | undefined;
        if (!auth) {
          return { isError: true, content: [{ type: "text", text: "Unauthorized" }] };
        }
        const [activeRes, pagesRes] = await Promise.all([
          supabase.rpc("realtime_active", { p_site: auth.siteId, p_minutes: 5 }),
          supabase.rpc("realtime_pages", { p_site: auth.siteId, p_minutes: 5, p_limit: 10 }),
        ]);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  active_visitors: Number(activeRes.data ?? 0),
                  active_pages: (pagesRes.data ?? []) as { path: string; visitors: number }[],
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );
    /* ── Découvrir les données ─────────────────────────────────────── */

    server.registerTool(
      "list_events",
      {
        title: "List events and properties",
        annotations: { title: "List events and properties", ...READ_ONLY },
        description:
          "What the authenticated site actually tracks: custom event names with their volume, and the custom property keys those events carry. Call this before query_insights to use exact event names (event_name) and property keys (breakdown or filter field \"prop:<key>\").",
        inputSchema: z.object({
          period: z.enum(["7d", "30d", "90d"]).optional().describe("Time window: 7d, 30d (default), or 90d."),
        }),
      },
      async ({ period }, ctx) => {
        const auth = authOf(ctx);
        if (!auth) return UNAUTHORIZED;
        const since = sinceDays(period === "7d" ? 7 : period === "90d" ? 90 : 30);
        const [names, keys] = await Promise.all([
          supabase.rpc("insights_values", { p_site: auth.siteId, p_since: since, p_field: "event_name", p_limit: 50 }),
          supabase.rpc("insights_property_keys", { p_site: auth.siteId, p_since: since, p_limit: 40 }),
        ]);
        if (names.error || keys.error) return failure(`Query failed: ${(names.error ?? keys.error)!.message}`);
        return json({
          period: period ?? "30d",
          events: ((names.data ?? []) as { value: string; hits: number }[]).map((r) => ({ name: r.value, count: Number(r.hits) })),
          property_keys: ((keys.data ?? []) as { key: string; hits: number }[]).map((r) => ({ key: r.key, count: Number(r.hits) })),
        });
      }
    );

    /* ── Insights ──────────────────────────────────────────────────── */

    server.registerTool(
      "query_insights",
      {
        title: "Query insights",
        annotations: { title: "Query insights", ...READ_ONLY },
        description:
          "Flexible analytics query, the same engine as the Insights screen. Pick a measure (pageviews, sessions, visitors, events = count of one custom event, event_visitors = visitors who fired it), optionally over time (grain) or split by a field (breakdown), filtered, compared with the previous period of the same length, or combined with a second measure (formula: ratio returns a percentage, difference, sum). Without grain, rows are a ranking over the whole period. Breakdown/filter fields: path, source, country, device, browser, language, utm_medium, utm_campaign, event_name, referrer, or prop:<key> for a custom property (see list_events). Visitors are counted per day (daily-rotating anonymous id): use period_totals, not a sum of rows, for a period figure.",
        inputSchema: z.object({
          measure: z.enum(MEASURES).optional().describe("Default pageviews."),
          event_name: z.string().max(120).optional().describe("Required for events / event_visitors."),
          grain: z.enum(GRAINS).optional().describe("day, week or month. Omit for a single ranking over the period."),
          breakdown: z.string().max(70).optional().describe("Field to split by, e.g. source, country, prop:plan."),
          filters: z
            .array(z.object({ field: z.string().max(70), value: z.string().max(300) }))
            .max(8)
            .optional()
            .describe("Exact-match filters, all combined with AND."),
          period: z.enum(Object.keys(INSIGHT_PERIODS) as [string, ...string[]]).optional().describe("24h, 7d, 30d (default), 90d, 180d or 365d."),
          compare: z.boolean().optional().describe("Also return the previous period of the same length."),
          formula: z.enum(FORMULAS).optional().describe("Combine measure (A) with measure_b (B): ratio = A/B in %, difference = A-B, sum = A+B."),
          measure_b: z.enum(MEASURES).optional(),
          event_name_b: z.string().max(120).optional(),
        }),
      },
      async (args, ctx) => {
        const auth = authOf(ctx);
        if (!auth) return UNAUTHORIZED;
        const params = new URLSearchParams();
        const set = (k: string, v: string | undefined) => {
          if (v) params.set(k, v);
        };
        set("measure", args.measure);
        set("event_name", args.event_name);
        set("grain", args.grain);
        set("breakdown", args.breakdown);
        set("period", args.period);
        set("formula", args.formula);
        set("measure_b", args.measure_b);
        set("event_name_b", args.event_name_b);
        if (args.filters?.length) params.set("filters", JSON.stringify(args.filters));
        if (args.compare) params.set("compare", "1");

        const outcome = await runInsights(supabase, auth.siteId, params);
        if (outcome.status !== 200) return failure(String(outcome.body.error ?? "Query failed"));
        return json(outcome.body);
      }
    );

    /* ── Rétention et parcours ─────────────────────────────────────── */

    server.registerTool(
      "get_retention",
      {
        title: "Get cohort retention",
        annotations: { title: "Get cohort retention", ...READ_ONLY },
        description:
          "Cohort retention over identified people (those the site names with identify()): for each cohort (the period of a person's first activity), how many were active again N periods later. rate is the share of the cohort still active at that period. Anonymous visitors cannot be followed across days by design, so they are not part of retention.",
        inputSchema: z.object({
          grain: z.enum(GRAINS).optional().describe("Cohort size: day, week (default) or month."),
          period: z.enum(["30d", "90d", "180d", "365d"]).optional().describe("How far back cohorts start. Default 180d."),
        }),
      },
      async ({ grain, period }, ctx) => {
        const auth = authOf(ctx);
        if (!auth) return UNAUTHORIZED;
        const days = { "30d": 30, "90d": 90, "180d": 180, "365d": 365 }[period ?? "180d"] ?? 180;
        const { data, error } = await supabase.rpc("retention_cohorts", {
          p_site: auth.siteId,
          p_since: sinceDays(days),
          p_grain: grain ?? "week",
        });
        if (error) return failure(`Query failed: ${error.message}`);
        const rows = (data ?? []) as { cohort: string; period_index: number; people: number }[];
        const size = new Map<string, number>();
        for (const r of rows) if (Number(r.period_index) === 0) size.set(r.cohort, Number(r.people));
        return json({
          grain: grain ?? "week",
          period: period ?? "180d",
          rows: rows.map((r) => {
            const base = size.get(r.cohort) ?? 0;
            return {
              cohort: r.cohort,
              period_index: Number(r.period_index),
              people: Number(r.people),
              rate: base > 0 ? Math.round((Number(r.people) / base) * 1000) / 10 : null,
            };
          }),
        });
      }
    );

    server.registerTool(
      "get_flows",
      {
        title: "Get user flows",
        annotations: { title: "Get user flows", ...READ_ONLY },
        description:
          "How sessions move from page to page, step by step (the Flows screen). Each row: at step N, sessions that went from from_path to to_path; to_path null means the session ended there. Beyond the 7 busiest pages per step, the rest are grouped as \"Autres\". Optionally start from a given page.",
        inputSchema: z.object({
          start_path: z.string().max(300).optional().describe("Only follow sessions starting on this path, e.g. /pricing."),
          depth: z.number().int().min(1).max(6).optional().describe("Steps to follow, 1 to 6. Default 4."),
          period: z.enum(["24h", "7d", "30d", "90d"]).optional().describe("Default 30d."),
        }),
      },
      async ({ start_path, depth, period }, ctx) => {
        const auth = authOf(ctx);
        if (!auth) return UNAUTHORIZED;
        const days = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 }[period ?? "30d"] ?? 30;
        const { data, error } = await supabase.rpc("flow_analysis", {
          p_site: auth.siteId,
          p_since: sinceDays(days),
          p_start_path: start_path || null,
          p_depth: depth ?? 4,
        });
        if (error) return failure(`Query failed: ${error.message}`);
        return json({ period: period ?? "30d", start_path: start_path ?? null, rows: collapseTail((data ?? []) as FlowRow[]) });
      }
    );

    /* ── Tableaux de bord ──────────────────────────────────────────── */

    server.registerTool(
      "list_boards",
      {
        title: "List dashboards",
        annotations: { title: "List dashboards", ...READ_ONLY },
        description: "The saved dashboards (boards) of the authenticated site, with how many tiles each holds.",
        inputSchema: z.object({}),
      },
      async (_args, ctx) => {
        const auth = authOf(ctx);
        if (!auth) return UNAUTHORIZED;
        const { data, error } = await supabase
          .from("boards")
          .select("id, name, description, updated_at, board_blocks(id)")
          .eq("site_id", auth.siteId)
          .order("created_at", { ascending: false });
        if (error) return failure(`Query failed: ${error.message}`);
        return json(
          (data ?? []).map((b) => ({
            id: b.id,
            name: b.name,
            description: b.description,
            updated_at: b.updated_at,
            tiles: (b.board_blocks as { id: string }[] | null)?.length ?? 0,
            url: `${SITE_URL}/dashboard/boards/${b.id}`,
          }))
        );
      }
    );

    server.registerTool(
      "get_board",
      {
        title: "Get dashboard",
        annotations: { title: "Get dashboard", ...READ_ONLY },
        description:
          "One dashboard and its tiles in reading order. Each tile's config holds the saved query (measure, breakdown, grain, filters, formula…): pass those fields to query_insights to get the tile's current numbers.",
        inputSchema: z.object({
          board: z.string().max(200).describe("Dashboard name (exact match) or id, see list_boards."),
        }),
      },
      async ({ board }, ctx) => {
        const auth = authOf(ctx);
        if (!auth) return UNAUTHORIZED;
        const query = supabase
          .from("boards")
          .select("id, name, description, board_blocks(id, position, kind, width, config)")
          .eq("site_id", auth.siteId);
        const { data, error } = UUID.test(board)
          ? await query.eq("id", board).maybeSingle()
          : await query.eq("name", board).limit(1).maybeSingle();
        if (error) return failure(`Query failed: ${error.message}`);
        if (!data) return failure(`No dashboard named or with id "${board}" on this site. Use list_boards.`);
        const blocks = ((data.board_blocks ?? []) as { id: string; position: number; kind: string; width: string; config: unknown }[])
          .sort((a, b) => a.position - b.position)
          .map(({ id, kind, width, config }) => ({ id, kind, width, config }));
        return json({ id: data.id, name: data.name, description: data.description, tiles: blocks, url: `${SITE_URL}/dashboard/boards/${data.id}` });
      }
    );

    /* ── Experiments et feature flags ──────────────────────────────── */

    server.registerTool(
      "list_experiments",
      {
        title: "List experiments with results",
        annotations: { title: "List experiments with results", ...READ_ONLY },
        description:
          "A/B experiments of the authenticated site with their results per variant: subjects, conversions, conversion rate, lift against the first (control) variant, p-value, whether the difference is statistically significant (95%), and how many subjects per variant would be needed to decide. Results count from the experiment's start, not from a chosen window. Draft experiments have no results.",
        inputSchema: z.object({}),
      },
      async (_args, ctx) => {
        const auth = authOf(ctx);
        if (!auth) return UNAUTHORIZED;
        const { data, error } = await supabase
          .from("experiments")
          .select("id, key, name, description, variants, metric_event, status, started_at, stopped_at, created_at")
          .eq("site_id", auth.siteId)
          .order("created_at", { ascending: false });
        if (error) return failure(`Query failed: ${error.message}`);
        const rows = (data ?? []) as {
          id: string; key: string; name: string; description: string | null; variants: Variant[];
          metric_event: string; status: string; started_at: string | null; stopped_at: string | null; created_at: string;
        }[];
        const results = await Promise.all(rows.map((r) => resultsFor(supabase, auth.siteId, r, 30)));
        return json(rows.map((r, i) => ({ ...r, results: results[i] })));
      }
    );

    server.registerTool(
      "list_feature_flags",
      {
        title: "List feature flags",
        annotations: { title: "List feature flags", ...READ_ONLY },
        description: "Feature flags of the authenticated site: key, name, whether it is on, and its rollout percentage. Archived flags are left out unless asked for.",
        inputSchema: z.object({
          include_archived: z.boolean().optional(),
        }),
      },
      async ({ include_archived }, ctx) => {
        const auth = authOf(ctx);
        if (!auth) return UNAUTHORIZED;
        let query = supabase
          .from("feature_flags")
          .select("key, name, description, enabled, rollout, archived_at, created_at")
          .eq("site_id", auth.siteId)
          .order("created_at", { ascending: false });
        if (!include_archived) query = query.is("archived_at", null);
        const { data, error } = await query;
        if (error) return failure(`Query failed: ${error.message}`);
        return json(data ?? []);
      }
    );

    /* ── Comptes et sessions ───────────────────────────────────────── */

    server.registerTool(
      "list_groups",
      {
        title: "List accounts (groups)",
        annotations: { title: "List accounts (groups)", ...READ_ONLY },
        description:
          "Accounts (companies, teams…) the site declares with group(): people, sessions, events, pageviews, first and last activity, and revenue in cents. Aggregates only — no personal data such as e-mail addresses is returned.",
        inputSchema: z.object({
          period: z.enum(["7d", "30d", "90d", "180d", "365d"]).optional().describe("Default 30d."),
        }),
      },
      async ({ period }, ctx) => {
        const auth = authOf(ctx);
        if (!auth) return UNAUTHORIZED;
        const days = { "7d": 7, "30d": 30, "90d": 90, "180d": 180, "365d": 365 }[period ?? "30d"] ?? 30;
        const { data, error } = await supabase.rpc("site_groups", { p_site: auth.siteId, p_since: sinceDays(days) });
        if (error) return failure(`Query failed: ${error.message}`);
        return json({ period: period ?? "30d", groups: data ?? [] });
      }
    );

    server.registerTool(
      "list_session_replays",
      {
        title: "List session replays",
        annotations: { title: "List session replays", ...READ_ONLY },
        description:
          "Recorded sessions of the authenticated site, newest first: landing path, device, browser, country, duration, number of recorded events, and whether the visitor rage-clicked. Watching a replay happens in the PulseTrack dashboard (url). Requires a plan with session replay.",
        inputSchema: z.object({
          period: z.enum(["7d", "30d", "90d"]).optional().describe("Default 30d."),
          path: z.string().max(300).optional().describe("Only sessions that started on this path."),
          device: z.enum(["desktop", "mobile", "tablet"]).optional(),
          rage_only: z.boolean().optional().describe("Only sessions with rage clicks."),
          limit: z.number().int().min(1).max(20).optional().describe("Default 10."),
        }),
      },
      async ({ period, path, device, rage_only, limit }, ctx) => {
        const auth = authOf(ctx);
        if (!auth) return UNAUTHORIZED;
        if (!planHas(auth.plan, "session_replay")) {
          return failure("This site's plan does not include session replay.");
        }
        const days = { "7d": 7, "30d": 30, "90d": 90 }[period ?? "30d"] ?? 30;
        const { data, error } = await supabase.rpc("list_session_replays", {
          p_site: auth.siteId,
          p_since: sinceDays(days),
          p_device: device ?? null,
          p_rage_only: rage_only ?? false,
          p_limit: limit ?? 10,
          p_offset: 0,
          p_path: path || null,
          p_session_ids: null,
        });
        if (error) return failure(`Query failed: ${error.message}`);
        const rows = (data ?? []) as {
          path: string | null; device: string | null; browser: string | null; country: string | null;
          started_at: string; duration_ms: number; event_count: number; has_rage: boolean; total_count: number;
        }[];
        return json({
          total: rows[0]?.total_count ? Number(rows[0].total_count) : 0,
          url: `${SITE_URL}/dashboard/replays?site=${auth.siteId}${path ? `&path=${encodeURIComponent(path)}` : ""}`,
          replays: rows.map((r) => ({
            started_at: r.started_at,
            path: r.path,
            device: r.device,
            browser: r.browser,
            country: r.country,
            duration_seconds: Math.round(Number(r.duration_ms) / 1000),
            events: Number(r.event_count),
            rage_clicks: r.has_rage,
          })),
        });
      }
    );
    /* ── Modification, sur autorisation ───────────────────────────── */

    server.registerTool(
      "create_board",
      {
        title: "Create dashboard",
        annotations: { title: "Create dashboard", ...WRITE },
        description:
          "Creates an empty dashboard on the authenticated site; add tiles to it with add_board_tile. Only works on a connection allowed to make changes.",
        inputSchema: z.object({
          name: z.string().trim().min(1).max(120),
          description: z.string().max(300).optional(),
        }),
      },
      async ({ name, description }, ctx) => {
        const auth = authOf(ctx);
        if (!auth) return UNAUTHORIZED;
        if (!auth.canWrite) return READ_ONLY_CONNECTION;
        const { data, error } = await supabase
          .from("boards")
          .insert({ site_id: auth.siteId, name, description: description?.trim() || null })
          .select("id, name")
          .single();
        if (error) return failure(`Could not create the dashboard: ${error.message}`);
        return json({ created: true, id: data.id, name: data.name, url: `${SITE_URL}/dashboard/boards/${data.id}` });
      }
    );

    server.registerTool(
      "update_board",
      {
        title: "Update dashboard",
        annotations: { title: "Update dashboard", ...WRITE },
        description: "Renames a dashboard of the authenticated site or changes its description. Only works on a connection allowed to make changes.",
        inputSchema: z.object({
          board: z.string().max(200).describe("Dashboard name (exact match) or id, see list_boards."),
          name: z.string().trim().min(1).max(120).optional(),
          description: z.string().max(300).optional().describe("An empty string removes the description."),
        }),
      },
      async ({ board, name, description }, ctx) => {
        const auth = authOf(ctx);
        if (!auth) return UNAUTHORIZED;
        if (!auth.canWrite) return READ_ONLY_CONNECTION;
        if (name === undefined && description === undefined) {
          return failure("Nothing to change: give a new name, a new description, or both.");
        }
        const found = await findBoard(auth.siteId, board);
        if (!found) return failure(`No dashboard named or with id "${board}" on this site. Use list_boards.`);
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (name !== undefined) patch.name = name;
        if (description !== undefined) patch.description = description.trim() || null;
        const { data, error } = await supabase
          .from("boards")
          .update(patch)
          .eq("id", found.id)
          .eq("site_id", auth.siteId)
          .select("id, name, description")
          .single();
        if (error) return failure(`Could not update the dashboard: ${error.message}`);
        return json({ updated: true, ...data, url: `${SITE_URL}/dashboard/boards/${data.id}` });
      }
    );

    server.registerTool(
      "add_board_tile",
      {
        title: "Add dashboard tile",
        annotations: { title: "Add dashboard tile", ...WRITE },
        description:
          "Appends a tile to a dashboard of the authenticated site: an insight (a saved query, same fields as query_insights, recomputed each time the dashboard is opened), a heading or a text. An insight query is run once to check it before the tile is saved. Only works on a connection allowed to make changes.",
        inputSchema: z.object({
          board: z.string().max(200).describe("Dashboard name (exact match) or id, see list_boards."),
          kind: z.enum(["insight", "heading", "text"]),
          title: z.string().max(120).optional().describe("Insight tiles: the tile's title."),
          text: z.string().max(2000).optional().describe("Heading and text tiles: their content."),
          width: z.enum(["full", "half"]).optional(),
          measure: z.enum(MEASURES).optional(),
          event_name: z.string().max(120).optional(),
          grain: z.enum(GRAINS).optional(),
          breakdown: z.string().max(70).optional(),
          filters: z.array(z.object({ field: z.string().max(70), value: z.string().max(300) })).max(8).optional(),
          formula: z.enum(FORMULAS).optional(),
          measure_b: z.enum(MEASURES).optional(),
          event_name_b: z.string().max(120).optional(),
        }),
      },
      async (args, ctx) => {
        const auth = authOf(ctx);
        if (!auth) return UNAUTHORIZED;
        if (!auth.canWrite) return READ_ONLY_CONNECTION;
        const found = await findBoard(auth.siteId, args.board);
        if (!found) return failure(`No dashboard named or with id "${args.board}" on this site. Use list_boards.`);

        let config: Record<string, unknown>;
        let width = args.width ?? "full";
        if (args.kind === "insight") {
          const query: Record<string, unknown> = { measure: args.measure ?? "pageviews" };
          for (const key of ["event_name", "grain", "breakdown", "formula", "measure_b", "event_name_b"] as const) {
            if (args[key]) query[key] = args[key];
          }
          if (args.filters?.length) query.filters = args.filters;

          // La tuile garde la question, jamais la réponse ; on vérifie
          // seulement que la question en a une avant de l'enregistrer.
          const params = new URLSearchParams({ period: "30d" });
          for (const [k, v] of Object.entries(query)) params.set(k, k === "filters" ? JSON.stringify(v) : String(v));
          const check = await runInsights(supabase, auth.siteId, params);
          if (check.status !== 200) return failure(`Invalid insight query, tile not added: ${String(check.body.error ?? "query failed")}`);

          config = { ...query, title: args.title?.trim() || String(query.measure) };
          if (!args.width) width = args.breakdown ? "full" : "half";
        } else {
          if (!args.text?.trim()) return failure(`A ${args.kind} tile needs a text.`);
          config = { text: args.text.trim() };
        }

        const { data: last } = await supabase
          .from("board_blocks")
          .select("position")
          .eq("board_id", found.id)
          .order("position", { ascending: false })
          .limit(1)
          .maybeSingle();
        const { data, error } = await supabase
          .from("board_blocks")
          .insert({ board_id: found.id, kind: args.kind, width, position: (last?.position ?? 0) + 10, config })
          .select("id, kind, width, config")
          .single();
        if (error) return failure(`Could not add the tile: ${error.message}`);
        return json({ created: true, board: found.name, tile: data, url: `${SITE_URL}/dashboard/boards/${found.id}` });
      }
    );

    server.registerTool(
      "create_annotation",
      {
        title: "Create annotation",
        annotations: { title: "Create annotation", ...WRITE },
        description: "Marks a date on the authenticated site's charts with a short label, such as a release, a campaign or a price change. Only works on a connection allowed to make changes.",
        inputSchema: z.object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("YYYY-MM-DD."),
          label: z.string().trim().min(1).max(140),
        }),
      },
      async ({ date, label }, ctx) => {
        const auth = authOf(ctx);
        if (!auth) return UNAUTHORIZED;
        if (!auth.canWrite) return READ_ONLY_CONNECTION;
        if (Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return failure(`"${date}" is not a valid date.`);
        const { data, error } = await supabase
          .from("annotations")
          .insert({ site_id: auth.siteId, date, label, created_by: auth.ownerId })
          .select("id, date, label")
          .single();
        if (error) return failure(`Could not create the annotation: ${error.message}`);
        return json({ created: true, ...data });
      }
    );

    server.registerTool(
      "create_funnel",
      {
        title: "Create funnel",
        annotations: { title: "Create funnel", ...WRITE },
        description:
          "Creates a conversion funnel of 2 to 10 steps on the authenticated site. Each step matches an exact path (path), a path containing a value (path_contains) or a custom event (event). The plan's funnel limit applies. Only works on a connection allowed to make changes.",
        inputSchema: z.object({
          name: z.string().trim().min(1).max(120),
          steps: z
            .array(
              z.object({
                name: z.string().trim().min(1).max(120),
                match_type: z.enum(["path", "path_contains", "event"]),
                match_value: z.string().trim().min(1).max(300),
              })
            )
            .min(2)
            .max(10),
        }),
      },
      async ({ name, steps }, ctx) => {
        const auth = authOf(ctx);
        if (!auth) return UNAUTHORIZED;
        if (!auth.canWrite) return READ_ONLY_CONNECTION;
        const { data: funnel, error } = await supabase
          .from("funnels")
          .insert({ site_id: auth.siteId, name })
          .select("id, name")
          .single();
        if (error) {
          const limit = error.message.match(/funnel_limit_reached:(\d+)/);
          if (limit) return failure(`This site's plan allows ${limit[1]} funnel(s); none was created.`);
          return failure(`Could not create the funnel: ${error.message}`);
        }
        const { error: stepsError } = await supabase.from("funnel_steps").insert(
          steps.map((s, i) => ({ funnel_id: funnel.id, step_order: i + 1, ...s }))
        );
        if (stepsError) {
          await supabase.from("funnels").delete().eq("id", funnel.id).eq("site_id", auth.siteId);
          return failure(`Could not create the funnel steps: ${stepsError.message}`);
        }
        return json({ created: true, id: funnel.id, name: funnel.name, steps: steps.map((s) => s.name), url: `${SITE_URL}/dashboard/funnels` });
      }
    );

    server.registerTool(
      "create_feature_flag",
      {
        title: "Create feature flag",
        annotations: { title: "Create feature flag", ...WRITE },
        description:
          "Creates a feature flag on the authenticated site. A new flag is always off; switch it on with update_feature_flag. The key is what the site's code checks and cannot be changed later. Only works on a connection allowed to make changes.",
        inputSchema: z.object({
          key: z.string().describe("Lowercase letters, digits, - and _, 2 to 60 characters, e.g. new-checkout."),
          name: z.string().trim().min(1).max(120),
          description: z.string().max(500).optional(),
        }),
      },
      async ({ key, name, description }, ctx) => {
        const auth = authOf(ctx);
        if (!auth) return UNAUTHORIZED;
        if (!auth.canWrite) return READ_ONLY_CONNECTION;
        const normalized = key.trim().toLowerCase();
        if (!KEY_SHAPE.test(normalized)) return failure(`"${key}" is not a valid flag key: use lowercase letters, digits, - and _, 2 to 60 characters.`);
        const { data, error } = await supabase
          .from("feature_flags")
          .insert({ site_id: auth.siteId, key: normalized, name, description: description?.trim() || null, enabled: false, rollout: 100 })
          .select("key, name, description, enabled, rollout")
          .single();
        if (error) {
          if (error.code === "23505") return failure(`A flag with the key "${normalized}" already exists on this site.`);
          return failure(`Could not create the flag: ${error.message}`);
        }
        return json({ created: true, flag: data });
      }
    );

    server.registerTool(
      "update_feature_flag",
      {
        title: "Update feature flag",
        annotations: { title: "Update feature flag", ...WRITE },
        description:
          "Changes a feature flag of the authenticated site: switch it on or off, set its rollout percentage, rename it, change its description, or archive/unarchive it. Switching a flag or its rollout takes effect for the site's visitors right away. Only works on a connection allowed to make changes.",
        inputSchema: z.object({
          key: z.string().max(60).describe("The flag's key, see list_feature_flags."),
          enabled: z.boolean().optional(),
          rollout: z.number().int().min(0).max(100).optional().describe("Share of visitors who get the flag when it is on, 0 to 100."),
          name: z.string().trim().min(1).max(120).optional(),
          description: z.string().max(500).optional(),
          archived: z.boolean().optional(),
        }),
      },
      async ({ key, enabled, rollout, name, description, archived }, ctx) => {
        const auth = authOf(ctx);
        if (!auth) return UNAUTHORIZED;
        if (!auth.canWrite) return READ_ONLY_CONNECTION;
        const patch: Record<string, unknown> = {};
        if (enabled !== undefined) patch.enabled = enabled;
        if (rollout !== undefined) patch.rollout = rollout;
        if (name !== undefined) patch.name = name;
        if (description !== undefined) patch.description = description.trim() || null;
        if (archived !== undefined) patch.archived_at = archived ? new Date().toISOString() : null;
        if (Object.keys(patch).length === 0) return failure("Nothing to change: give at least one of enabled, rollout, name, description, archived.");
        patch.updated_at = new Date().toISOString();

        const { data, error } = await supabase
          .from("feature_flags")
          .update(patch)
          .eq("site_id", auth.siteId)
          .eq("key", key.trim().toLowerCase())
          .select("key, name, description, enabled, rollout, archived_at")
          .maybeSingle();
        if (error) return failure(`Could not update the flag: ${error.message}`);
        if (!data) return failure(`No flag with the key "${key}" on this site. Use list_feature_flags.`);
        return json({ updated: true, flag: data });
      }
    );

    server.registerTool(
      "create_experiment",
      {
        title: "Create A/B test",
        annotations: { title: "Create A/B test", ...WRITE },
        description:
          "Creates an A/B test as a draft on the authenticated site: a key the site's code uses, 2 to 5 variants with weights (the first is the control), and the custom event counted as a conversion. Nobody is exposed until it is started with set_experiment_status. Only works on a connection allowed to make changes.",
        inputSchema: z.object({
          key: z.string().describe("Lowercase letters, digits, - and _, 2 to 60 characters."),
          name: z.string().trim().min(1).max(120),
          description: z.string().max(500).optional(),
          metric_event: z.string().trim().min(1).max(120).describe("Custom event counted as a conversion, see list_events."),
          variants: z
            .array(z.object({ key: z.string().trim().min(1).max(40), weight: z.number().int().min(1).max(100) }))
            .min(2)
            .max(5),
        }),
      },
      async ({ key, name, description, metric_event, variants }, ctx) => {
        const auth = authOf(ctx);
        if (!auth) return UNAUTHORIZED;
        if (!auth.canWrite) return READ_ONLY_CONNECTION;
        const normalized = key.trim().toLowerCase();
        if (!KEY_SHAPE.test(normalized)) return failure(`"${key}" is not a valid experiment key: use lowercase letters, digits, - and _, 2 to 60 characters.`);
        if (new Set(variants.map((v) => v.key)).size !== variants.length) return failure("Variant keys must be different.");
        const { data, error } = await supabase
          .from("experiments")
          .insert({
            site_id: auth.siteId,
            key: normalized,
            name,
            description: description?.trim() || null,
            variants,
            metric_event,
            status: "draft",
          })
          .select("key, name, description, variants, metric_event, status")
          .single();
        if (error) {
          if (error.code === "23505") return failure(`An experiment with the key "${normalized}" already exists on this site.`);
          return failure(`Could not create the experiment: ${error.message}`);
        }
        return json({ created: true, experiment: data });
      }
    );

    server.registerTool(
      "set_experiment_status",
      {
        title: "Start or stop A/B test",
        annotations: { title: "Start or stop A/B test", ...WRITE },
        description:
          "Starts (running) or stops (stopped) an A/B test of the authenticated site. Starting exposes the site's visitors to the variants right away and counts results from that moment. Only works on a connection allowed to make changes.",
        inputSchema: z.object({
          key: z.string().max(60).describe("The experiment's key, see list_experiments."),
          status: z.enum(["running", "stopped"]),
        }),
      },
      async ({ key, status }, ctx) => {
        const auth = authOf(ctx);
        if (!auth) return UNAUTHORIZED;
        if (!auth.canWrite) return READ_ONLY_CONNECTION;
        const normalized = key.trim().toLowerCase();
        const { data: current } = await supabase
          .from("experiments")
          .select("status")
          .eq("site_id", auth.siteId)
          .eq("key", normalized)
          .maybeSingle();
        if (!current) return failure(`No experiment with the key "${key}" on this site. Use list_experiments.`);
        if (current.status === status) return failure(`The experiment is already ${status}; nothing was changed.`);

        const now = new Date().toISOString();
        // Même règle que l'écran : un démarrage repose la date, pour ne
        // pas mêler les expositions d'un ancien essai au nouveau.
        const patch: Record<string, unknown> =
          status === "running"
            ? { status, started_at: now, stopped_at: null, updated_at: now }
            : { status, stopped_at: now, updated_at: now };
        const { data, error } = await supabase
          .from("experiments")
          .update(patch)
          .eq("site_id", auth.siteId)
          .eq("key", normalized)
          .select("key, name, status, started_at, stopped_at")
          .single();
        if (error) return failure(`Could not change the experiment: ${error.message}`);
        return json({ updated: true, experiment: data });
      }
    );
  },
  { serverInfo: { name: "pulsetrack", version: "1.2.0" } }
);

const handler = withMcpAuth(
  baseHandler,
  async (req, bearerToken) => {
    // Claude.ai, ChatGPT and friends sign in through OAuth and send a
    // "pta_" Bearer token; CLIs and scripts send an API key in the same
    // header. "?key=" is no longer handed out (the MCP spec forbids
    // tokens in the query string, and URLs end up in logs) but is still
    // read so URLs pasted before the change keep working.
    // X-API-Key : l'authentification « clé API » de Copilot Studio envoie
    // la clé brute dans un en-tête nommé, sans le préfixe Bearer.
    const plaintext =
      bearerToken?.trim() ||
      req.headers.get("x-api-key")?.trim() ||
      new URL(req.url).searchParams.get("key")?.trim();
    if (!plaintext) return undefined;

    // "pta_..." — issued by the OAuth flow (src/app/oauth/authorize,
    // src/app/api/oauth/token) after "Se connecter avec PulseTrack".
    // Anything else is a manually-generated "pt_live_..." key. Each
    // gets its own persistent counter ("oauth:"/"apikey:" namespaced,
    // src/lib/rate-limit.ts) so the two auth methods enforce the same
    // 60/min without sharing a quota by accident.
    let resolved: ResolvedApiKey | ResolvedOAuthToken | null;
    let clientId: string;
    if (plaintext.startsWith("pta_")) {
      resolved = await resolveOAuthToken(supabase, plaintext);
      if (!resolved) return undefined;
      clientId = (resolved as ResolvedOAuthToken).tokenId;
      if (!(await checkRateLimit(supabase, `oauth:${clientId}`, 60, 60))) return undefined;
    } else {
      resolved = await resolveApiKey(supabase, plaintext);
      if (!resolved) return undefined;
      const apiKeyResolved = resolved as ResolvedApiKey;
      if (await isApiKeyRateLimited(supabase, apiKeyResolved.keyId)) return undefined;
      clientId = apiKeyResolved.keyId;
    }

    const extra: AuthExtra = {
      siteId: resolved.site.id,
      siteName: resolved.site.name,
      siteDomain: resolved.site.domain,
      plan: resolved.plan,
      canWrite: resolved.canWrite,
      ownerId: resolved.site.user_id,
    };
    return {
      token: plaintext,
      clientId,
      scopes: resolved.canWrite ? ["read", "write"] : ["read"],
      extra: extra as unknown as Record<string, unknown>,
    };
  },
  { required: true, resourceMetadataPath: MCP_METADATA_PATH }
);

export { handler as GET, handler as POST };
