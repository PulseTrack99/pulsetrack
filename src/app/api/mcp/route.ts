import { createClient } from "@supabase/supabase-js";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { resolveApiKey, isApiKeyRateLimited, type ResolvedApiKey } from "@/lib/api-keys";
import { resolveOAuthToken, type ResolvedOAuthToken } from "@/lib/oauth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSiteStats } from "@/lib/stats";
import { getSiteRevenue } from "@/lib/revenue";
import { planHas } from "@/lib/plan";

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
}

const periodSchema = z
  .enum(["7d", "30d", "90d"])
  .optional()
  .describe("Time window: 7d, 30d (default), or 90d.");

const baseHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      "get_stats",
      {
        title: "Get site stats",
        description:
          "Overview analytics for the authenticated site: unique visitors, pageviews, bounce rate, top pages, traffic sources, countries and devices.",
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
        return { content: [{ type: "text", text: JSON.stringify(revenue, null, 2) }] };
      }
    );

    server.registerTool(
      "list_funnels",
      {
        title: "List funnels",
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
          .eq("site_id", auth.siteId);
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
          .eq("site_id", auth.siteId);
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
        ((matched ?? []) as { step_index: number; sessions: number }[]).forEach((r) =>
          reached.set(Number(r.step_index), Number(r.sessions))
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
  },
  { serverInfo: { name: "pulsetrack", version: "1.0.0" } }
);

const handler = withMcpAuth(
  baseHandler,
  async (req, bearerToken) => {
    // Most MCP clients (Claude.ai's "Add custom connector", ChatGPT, ...)
    // just want a single URL to paste — no header field, no config file.
    // A "?key=" query param lets the settings page hand out one
    // ready-to-paste personalized URL instead of asking a non-technical
    // user to edit JSON. The header still works for clients that do
    // support one (mcp-remote, Claude Code's .mcp.json, curl, ...).
    const plaintext = bearerToken?.trim() || new URL(req.url).searchParams.get("key")?.trim();
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
    };
    return {
      token: plaintext,
      clientId,
      scopes: ["read"],
      extra: extra as unknown as Record<string, unknown>,
    };
  },
  { required: true, resourceMetadataPath: "/.well-known/oauth-protected-resource" }
);

export { handler as GET, handler as POST };
