import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, planHas, canUseCopilot } from "@/lib/plan";

/**
 * Translates a plain-language question into one of the behavioural
 * filters already built (supabase/replay-behavioral-filters.sql) —
 * the same "Spark AI query builder" pattern Mixpanel ships, not a
 * free-form chatbot. A single short, cheap call (Haiku, forced tool
 * use, ~400 tokens round trip) rather than an open-ended conversation,
 * and every call is counted against a hard monthly quota per plan
 * (src/lib/stripe.ts) — the cost this can ever cost an account is
 * bounded before the call is even made, not hoped for afterwards.
 */

const MODEL = "claude-haiku-4-5-20251001";

const TOOL = {
  name: "apply_filter",
  description:
    "Choose which behavioural filter, if any, answers the user's question about their recorded sessions.",
  input_schema: {
    type: "object" as const,
    properties: {
      behavior: {
        type: "string",
        enum: ["no_conversion", "low_scroll", "funnel_dropoff"],
        description:
          "Omit entirely if the question does not match any available filter.",
      },
      scroll_max: {
        type: "number",
        description:
          "Only when behavior is low_scroll: the scroll-depth percentage threshold implied by the question (1-99). Default 25 if the question doesn't give a number.",
      },
      funnel_id: {
        type: "string",
        description:
          "Only when behavior is funnel_dropoff: the id of the matching funnel from the list given in the system prompt. Must be one of those ids exactly.",
      },
      step: {
        type: "number",
        description:
          "Only when behavior is funnel_dropoff: the 0-based index of the step the question refers to.",
      },
      device: {
        type: "string",
        enum: ["Desktop", "Mobile", "Tablet"],
        description: "Only if the question specifically mentions a device type.",
      },
      rage_only: {
        type: "boolean",
        description: "True only if the question specifically asks about rage clicks / frustration clicks.",
      },
      explanation: {
        type: "string",
        description:
          "One short sentence in French explaining what was applied, to show the user directly. If no filter matched, explain briefly why and suggest rephrasing.",
      },
    },
    required: ["explanation"],
  },
};

interface FunnelInfo {
  id: string;
  name: string;
  steps: { step_order: number; name: string }[];
}

function systemPrompt(funnels: FunnelInfo[], hasRevenue: boolean): string {
  const funnelList =
    funnels.length > 0
      ? funnels
          .map(
            (f) =>
              `  - id="${f.id}" name="${f.name}" steps=[${f.steps
                .map((s, i) => `${i}:${s.name}`)
                .join(", ")}]`
          )
          .join("\n")
      : "  (aucun funnel sur ce site)";

  return `Tu aides un utilisateur de PulseTrack (analytics web) à filtrer ses enregistrements de session (session replay). Réponds uniquement en appelant l'outil apply_filter, jamais en texte libre.

Filtres disponibles :
- low_scroll : sessions qui n'ont presque pas scrollé (scroll_max = seuil en %)
- funnel_dropoff : sessions bloquées à une étape d'un funnel, ou au contraire qui l'ont atteinte (funnel_id + step)
${hasRevenue ? "- no_conversion : sessions qui n'ont pas généré de vente Stripe" : "- no_conversion n'est PAS disponible sur ce site (pas de connexion Stripe) — ne le propose jamais"}

Funnels existants sur ce site :
${funnelList}

Si la question ne correspond à aucun filtre disponible (ex: demande hors sujet, ou no_conversion demandé sans Stripe connecté), n'inclus pas de champ "behavior" et explique brièvement pourquoi dans "explanation".

Important : dès que tu renseignes funnel_id, step ou scroll_max, tu dois aussi renseigner le champ "behavior" correspondant (funnel_dropoff ou low_scroll) — jamais l'un sans l'autre.`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const siteId = typeof body.site_id === "string" ? body.site_id : null;
    const question = typeof body.question === "string" ? body.question.trim() : "";

    if (!siteId || !question) {
      return NextResponse.json(
        { error: "site_id and question are required" },
        { status: 400 }
      );
    }
    if (question.length > 300) {
      return NextResponse.json({ error: "Question trop longue" }, { status: 400 });
    }

    const { data: site } = await supabase
      .from("sites")
      .select("id")
      .eq("id", siteId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

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
        {
          error: "quota_exceeded",
          used: quota.used,
          limit: quota.limit,
        },
        { status: 402 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY is not configured");
      return NextResponse.json({ error: "Copilote non configuré" }, { status: 500 });
    }

    const [{ data: funnelsRaw }, { data: stripeConn }] = await Promise.all([
      supabase
        .from("funnels")
        .select("id, name, funnel_steps(step_order, name)")
        .eq("site_id", siteId),
      supabase.from("stripe_connections").select("id").eq("site_id", siteId).maybeSingle(),
    ]);

    const funnels: FunnelInfo[] = (funnelsRaw ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      steps: (f.funnel_steps ?? []).sort(
        (a: { step_order: number }, b: { step_order: number }) => a.step_order - b.step_order
      ),
    }));
    const hasRevenue = Boolean(stripeConn);

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: systemPrompt(funnels, hasRevenue),
        messages: [{ role: "user", content: question }],
        tools: [TOOL],
        tool_choice: { type: "tool", name: "apply_filter" },
      }),
    });

    if (!aiRes.ok) {
      const errBody = await aiRes.text().catch(() => "");
      console.error("Anthropic API error:", aiRes.status, errBody);
      return NextResponse.json({ error: "Le copilote n'a pas pu répondre" }, { status: 502 });
    }

    const aiData = await aiRes.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolUse = (aiData.content ?? []).find((b: any) => b.type === "tool_use");

    if (!toolUse) {
      return NextResponse.json({ error: "Réponse inattendue du copilote" }, { status: 502 });
    }

    const input = toolUse.input as {
      behavior?: string;
      scroll_max?: number;
      funnel_id?: string;
      step?: number;
      device?: string;
      rage_only?: boolean;
      explanation: string;
    };

    // Never trust the model's own judgement of what's available — the
    // same defensive posture as every other filter in this app: drop
    // anything that doesn't line up with what's actually on this site,
    // rather than letting a hallucinated funnel_id reach the query.
    const VALID_BEHAVIORS = ["no_conversion", "low_scroll", "funnel_dropoff"];
    let behavior: string | null = VALID_BEHAVIORS.includes(input.behavior ?? "")
      ? (input.behavior as string)
      : null;

    // Observed in testing: the model sometimes fills funnel_id/step (or
    // scroll_max) while leaving the sibling "behavior" field out of its
    // own tool call — the intent is still unambiguous from which other
    // field is present, so infer it rather than silently dropping a
    // filter the explanation text already promised the user.
    if (!behavior && input.funnel_id) behavior = "funnel_dropoff";
    else if (!behavior && input.scroll_max != null) behavior = "low_scroll";

    let funnelId: string | null = null;
    let step = 0;

    if (behavior === "no_conversion" && !hasRevenue) {
      behavior = null;
    }
    if (behavior === "funnel_dropoff") {
      const match = funnels.find((f) => f.id === input.funnel_id);
      if (!match) {
        behavior = null;
      } else {
        funnelId = match.id;
        step = Math.max(0, Math.min(match.steps.length - 1, Math.round(input.step ?? 0)));
      }
    }

    const filter = {
      behavior,
      scroll_max:
        behavior === "low_scroll"
          ? Math.max(1, Math.min(99, Math.round(input.scroll_max ?? 25)))
          : null,
      funnel_id: funnelId,
      step,
      device: ["Desktop", "Mobile", "Tablet"].includes(input.device ?? "")
        ? input.device
        : null,
      rage_only: Boolean(input.rage_only),
    };

    // Log + count in the same write — copilot_queries_this_month reads
    // this table directly, so the quota can never drift from what was
    // actually asked.
    await supabase.from("copilot_queries").insert({
      site_id: siteId,
      user_id: user.id,
      question,
      resolved_filter: filter,
    });

    return NextResponse.json({
      filter,
      explanation: input.explanation,
      used: quota.used + 1,
      limit: quota.limit,
    });
  } catch (err) {
    console.error("Copilot error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
