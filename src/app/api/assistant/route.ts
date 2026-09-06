import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, planHas, canUseCopilot } from "@/lib/plan";
import { resolveAccountOwner } from "@/lib/team";
import { getSiteStats } from "@/lib/stats";
import { getSiteRevenue } from "@/lib/revenue";

/**
 * The dashboard assistant — the one in the right-hand rail.
 *
 * It replaces two things that used to sit on the same screen: a
 * predefined-answer panel that knew nothing about the customer's data
 * (that one belongs on the marketing site, where the visitor has no
 * account yet), and the Session Replay copilot, which could do exactly
 * one thing — pick a behavioural filter — from a cramped box in a
 * column. One assistant, in the big panel, that can actually read the
 * account it is looking at.
 *
 * Cost control, unchanged from the copilot it absorbs:
 *
 *  - the same monthly quota per plan (canUseCopilot), counted in the
 *    same table, so the number of questions a plan allows has not moved;
 *  - one quota unit per question asked, whatever the assistant has to
 *    read to answer it;
 *  - Haiku, a hard cap on tool rounds, and a bounded max_tokens, so a
 *    single question cannot spiral into an open-ended agent loop.
 *
 * Each question does cost more than the old copilot's single forced
 * tool call, because it now does real work. The ceiling per account is
 * still the plan's query count, which is what bounds the bill.
 */

const MODEL = "claude-haiku-4-5-20251001";
/** Enough for read → maybe a second read → answer. Beyond this the
 *  assistant answers with what it already has. */
const MAX_ROUNDS = 4;
const MAX_QUESTION_CHARS = 500;
/** Keeps a long conversation from growing the prompt without bound. */
const MAX_HISTORY = 8;

type Period = "7d" | "30d" | "90d";

function periodOf(value: unknown): Period {
  return value === "7d" || value === "90d" ? value : "30d";
}

const TOOLS = [
  {
    name: "get_stats",
    description:
      "Traffic overview for the site: visitors, sessions, pageviews, bounce rate, average duration, top pages, traffic sources, countries, devices, and daily visitors. Also returns the same figures for the previous period so you can describe a trend.",
    input_schema: {
      type: "object" as const,
      properties: {
        period: { type: "string", enum: ["7d", "30d", "90d"] },
      },
    },
  },
  {
    name: "get_realtime",
    description:
      "Who is on the site right now (last 5 minutes) and which pages they are on.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "list_funnels",
    description:
      "The conversion funnels configured on this site, with their step names in order. Call this before get_funnel.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_funnel",
    description:
      "Drop-off results for one funnel: visitors, conversion rate and drop-off rate at each step.",
    input_schema: {
      type: "object" as const,
      properties: {
        funnel_id: { type: "string", description: "Id from list_funnels." },
        period: { type: "string", enum: ["7d", "30d", "90d"] },
      },
      required: ["funnel_id"],
    },
  },
  {
    name: "get_revenue",
    description:
      "Revenue tied back to traffic sources through the site's connected Stripe account: totals, revenue by source, revenue by landing page, recent transactions. Only works if Stripe is connected.",
    input_schema: {
      type: "object" as const,
      properties: {
        period: { type: "string", enum: ["7d", "30d", "90d"] },
      },
    },
  },
  {
    name: "open_session_replay",
    description:
      "Open the Session Replay screen filtered to a behaviour, when the visitor asks to *watch* or *see* the sessions behind a number. Do not use it to answer a question about figures — answer those from get_stats.",
    input_schema: {
      type: "object" as const,
      properties: {
        behavior: {
          type: "string",
          enum: ["low_scroll", "no_conversion", "funnel_dropoff"],
        },
        scroll_max: {
          type: "number",
          description: "Only with low_scroll: the scroll percentage (1-99).",
        },
        funnel_id: { type: "string", description: "Only with funnel_dropoff." },
        step: { type: "number", description: "Only with funnel_dropoff: 0-based step index." },
        device: { type: "string", enum: ["Desktop", "Mobile", "Tablet"] },
        rage_only: { type: "boolean" },
      },
    },
  },
];

function systemPrompt(site: { name: string; domain: string }, locale: string) {
  const lang = locale === "en" ? "English" : "French";
  return `You are the assistant inside PulseTrack, a privacy-first web analytics product. You are helping the owner of the site "${site.name}" (${site.domain}).

Answer in ${lang}. Be brief and concrete: this is a side panel, not an essay. Two or three sentences is usually right, and a short list when you are comparing several things.

Write plain text only. The panel renders exactly what you send, so markdown asterisks or hashes would show up as literal characters — no **bold**, no headings, no bullet syntax. For a short list, use one item per line.

You can read this site's own analytics with the tools provided. Use them rather than guessing — never invent a figure. When you give a number, say which period it covers.

If the data needed isn't there (no Stripe connected, no funnel configured, no traffic yet), say so plainly and say what the person would have to do, rather than apologising at length.

You can also answer questions about how PulseTrack works — installing the script, what a metric counts, plans, privacy, the MCP connector — from your own knowledge of the product. PulseTrack is cookie-free and stores no personal data in the browser, needs no consent banner on that basis, records sessions with rrweb, builds heatmaps from clicks and scroll depth, ties revenue to traffic sources through a read-only Stripe key plus pulsetrack.identify(email), and exposes an MCP connector so an AI assistant can query the same data.

open_session_replay does not navigate anywhere by itself: it puts a button under your answer that the person can click. So describe what that button will show them ("the button below opens the sessions that scrolled less than 25%") — never say the screen is already filtered, because it is not until they click.

Never claim to have changed a setting or created anything: you can read, and you can offer that one button. That is all.`;
}

/** One tool call, run against this site with the caller's own RLS. */
async function runTool(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  siteId: string,
  plan: string,
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: any
): Promise<{ text: string; action?: unknown }> {
  switch (name) {
    case "get_stats": {
      const stats = await getSiteStats(supabase, siteId, periodOf(input?.period));
      return { text: JSON.stringify({ period: periodOf(input?.period), ...stats }) };
    }

    case "get_realtime": {
      const [active, pages] = await Promise.all([
        supabase.rpc("realtime_active", { p_site: siteId, p_minutes: 5 }),
        supabase.rpc("realtime_pages", { p_site: siteId, p_minutes: 5, p_limit: 10 }),
      ]);
      return {
        text: JSON.stringify({
          active_visitors: Number(active.data ?? 0),
          active_pages: pages.data ?? [],
        }),
      };
    }

    case "list_funnels": {
      const { data } = await supabase
        .from("funnels")
        .select("id, name, funnel_steps(step_order, name)")
        .eq("site_id", siteId);
      const list = (data ?? []).map(
        (f: { id: string; name: string; funnel_steps: { step_order: number; name: string }[] }) => ({
          id: f.id,
          name: f.name,
          steps: (f.funnel_steps ?? [])
            .sort((a, b) => a.step_order - b.step_order)
            .map((s) => s.name),
        })
      );
      return { text: JSON.stringify(list) };
    }

    case "get_funnel": {
      const { data: funnel } = await supabase
        .from("funnels")
        .select("id, name, funnel_steps(step_order, name, match_type, match_value)")
        .eq("site_id", siteId)
        .eq("id", input?.funnel_id ?? "")
        .maybeSingle();

      if (!funnel) {
        return { text: JSON.stringify({ error: "No funnel with that id on this site." }) };
      }

      const steps = ((funnel.funnel_steps ?? []) as {
        step_order: number;
        name: string;
        match_type: string;
        match_value: string;
      }[]).sort((a, b) => a.step_order - b.step_order);

      const period = periodOf(input?.period);
      const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
      const since = new Date(Date.now() - days * 86_400_000).toISOString();

      const { data: rows } = await supabase.rpc("funnel_results", {
        p_site: siteId,
        p_since: since,
        p_steps: steps.map((s) => ({
          step_order: s.step_order,
          match_type: s.match_type,
          match_value: s.match_value,
        })),
      });

      return { text: JSON.stringify({ funnel: funnel.name, period, steps: rows ?? [] }) };
    }

    case "get_revenue": {
      if (!planHas(plan as never, "revenue")) {
        return {
          text: JSON.stringify({
            error: "Revenue tracking is on the Growth plan and above; this account's plan doesn't include it.",
          }),
        };
      }
      const revenue = await getSiteRevenue(supabase, siteId, periodOf(input?.period));
      return { text: JSON.stringify(revenue) };
    }

    case "open_session_replay": {
      // The model is never trusted with a funnel id: an id that isn't on
      // this site is dropped rather than passed through to a query.
      const valid = ["low_scroll", "no_conversion", "funnel_dropoff"];
      let behavior: string | null = valid.includes(input?.behavior) ? input.behavior : null;

      let funnelId: string | null = null;
      let step = 0;
      if (behavior === "funnel_dropoff") {
        const { data: f } = await supabase
          .from("funnels")
          .select("id, funnel_steps(step_order)")
          .eq("site_id", siteId)
          .eq("id", input?.funnel_id ?? "")
          .maybeSingle();
        if (!f) behavior = null;
        else {
          funnelId = f.id;
          const count = (f.funnel_steps ?? []).length;
          step = Math.max(0, Math.min(Math.max(0, count - 1), Math.round(input?.step ?? 0)));
        }
      }

      const action = {
        type: "session_filter" as const,
        behavior,
        scroll_max:
          behavior === "low_scroll"
            ? Math.max(1, Math.min(99, Math.round(input?.scroll_max ?? 25)))
            : null,
        funnel_id: funnelId,
        step,
        device: ["Desktop", "Mobile", "Tablet"].includes(input?.device) ? input.device : null,
        rage_only: Boolean(input?.rage_only),
      };

      return {
        text: JSON.stringify({ opened: true, filter: action }),
        action,
      };
    }

    default:
      return { text: JSON.stringify({ error: `Unknown tool ${name}` }) };
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const siteId: string | undefined = body?.site_id;
    const question: string = String(body?.question ?? "").trim();
    const history: { role: string; text: string }[] = Array.isArray(body?.history)
      ? body.history.slice(-MAX_HISTORY)
      : [];
    const locale: string = body?.locale === "en" ? "en" : "fr";

    if (!siteId) return NextResponse.json({ error: "site_id is required" }, { status: 400 });
    if (!question) return NextResponse.json({ error: "Question manquante" }, { status: 400 });
    if (question.length > MAX_QUESTION_CHARS) {
      return NextResponse.json({ error: "Question trop longue" }, { status: 400 });
    }

    // RLS scopes this to sites the caller owns or was added to.
    const { data: site } = await supabase
      .from("sites")
      .select("id, name, domain")
      .eq("id", siteId)
      .maybeSingle();
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const plan = await getUserPlan(supabase, user.id);
    if (!planHas(plan, "ai_copilot")) {
      return NextResponse.json(
        { error: "upgrade_required", plan, feature: "ai_copilot" },
        { status: 402 }
      );
    }

    const quota = await canUseCopilot(supabase, user.id, plan);
    if (!quota.allowed) {
      return NextResponse.json(
        { error: "quota_exceeded", used: quota.used, limit: quota.limit },
        { status: 402 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY is not configured");
      return NextResponse.json({ error: "Assistant non configuré" }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [
      ...history.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      })),
      { role: "user", content: question },
    ];

    let answer = "";
    let action: unknown = null;

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 700,
          system: systemPrompt(site, locale),
          messages,
          tools: TOOLS,
          // On the last round, force a written answer rather than
          // another read the loop has no budget left to satisfy.
          ...(round === MAX_ROUNDS - 1 ? { tool_choice: { type: "none" } } : {}),
        }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error("Anthropic API error:", res.status, detail);
        return NextResponse.json(
          { error: "L'assistant n'a pas pu répondre" },
          { status: 502 }
        );
      }

      const data = await res.json();
      const blocks = data.content ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolUses = blocks.filter((b: any) => b.type === "tool_use");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const text = blocks.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
      if (text) answer = text;

      if (toolUses.length === 0) break;

      messages.push({ role: "assistant", content: blocks });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: any[] = [];
      for (const call of toolUses) {
        const out = await runTool(supabase, siteId, plan, call.name, call.input);
        if (out.action) action = out.action;
        results.push({
          type: "tool_result",
          tool_use_id: call.id,
          // Truncated: a large stats payload is the one thing that could
          // make a single question expensive.
          content: out.text.slice(0, 6000),
        });
      }
      messages.push({ role: "user", content: results });
    }

    // Logged in the same table the quota counts, so the two can never
    // drift apart — one row per question, exactly as before.
    const accountOwnerId = await resolveAccountOwner(supabase, user.id);
    await supabase.from("copilot_queries").insert({
      site_id: siteId,
      user_id: accountOwnerId,
      question,
      resolved_filter: action ?? {},
    });

    return NextResponse.json({
      answer: answer || "…",
      action,
      used: quota.used + 1,
      limit: quota.limit,
    });
  } catch (err) {
    console.error("Assistant error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
