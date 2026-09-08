import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserPlan, planHas } from "@/lib/plan";
import { getSiteRevenue } from "@/lib/revenue";
import { sendEmail } from "@/lib/email";
import { sendWebhookDigest } from "@/lib/webhook-alert";

/**
 * Proactive AI insights — the assistant (src/app/api/assistant) has always
 * been reactive, the user has to ask. This is the other half: once a
 * week, scan funnels, revenue and bounce rate for real week-over-week
 * moves, and if anything crosses the threshold, ask Claude Haiku to
 * turn the flagged numbers into one short digest rather than firing a
 * separate mechanical alert per metric (which is what the existing
 * traffic-drop alert already does, and does well — this complements
 * it rather than duplicating it).
 *
 * Gated by the same "ai_copilot" plan capability as the reactive
 * copilot — no separate quota. At one Haiku call per site per week
 * with a compact prompt, the cost is negligible regardless of plan;
 * what actually limits this is the capability check itself.
 *
 * Delivered like the traffic-drop alert (email always, webhook if the
 * site already has one configured on its alert_rules row — reusing
 * that field rather than asking for a second Slack/Discord URL just
 * for this) and also stored (insight_digests) so the dashboard can
 * show the latest one without re-running the model.
 *
 * Runs weekly via Vercel Cron (vercel.json), same CRON_SECRET gate as
 * the other crons.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MODEL = "claude-haiku-4-5-20251001";

// Thresholds below which a move is just noise, not an insight.
const RATE_FLAG_POINTS = 10; // percentage-point move for bounce rate / funnel conversion
const REVENUE_FLAG_PCT = 15; // relative % move for revenue

interface Flag {
  metric: string;
  this_week: number;
  last_week: number;
  unit: "pp_rate" | "pct_change" | "currency";
}

function fmtEuros(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

async function buildDigest(apiKey: string, siteName: string, flags: Flag[]): Promise<string | null> {
  const lines = flags
    .map((f) => {
      if (f.unit === "currency") {
        return `- ${f.metric}: ${fmtEuros(f.this_week)} cette semaine vs ${fmtEuros(f.last_week)} la semaine dernière`;
      }
      if (f.unit === "pct_change") {
        return `- ${f.metric}: ${f.this_week}% de variation vs la semaine dernière (référence: ${fmtEuros(f.last_week)})`;
      }
      return `- ${f.metric}: ${f.this_week}% cette semaine vs ${f.last_week}% la semaine dernière`;
    })
    .join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      system:
        "Tu es l'assistant analytics de PulseTrack. On te donne une liste de métriques qui ont bougé significativement cette semaine par rapport à la semaine dernière pour un site. Rédige un résumé factuel de 2 à 4 phrases en français, sans inventer de cause que les chiffres ne montrent pas explicitement — décris ce qui a changé, pas pourquoi, sauf si une corrélation est évidente dans les données données. Termine par une suggestion d'action concrète et courte si c'est pertinent. Pas de salutation, pas de formule d'introduction, va droit au résumé.",
      messages: [
        {
          role: "user",
          content: `Site : ${siteName}\n\nMétriques qui ont bougé cette semaine :\n${lines}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error("weekly-insights: Anthropic API error", res.status, await res.text().catch(() => ""));
    return null;
  }

  const data = await res.json();
  const text = (data.content ?? []).find((b: { type: string }) => b.type === "text")?.text;
  return typeof text === "string" && text.trim() ? text.trim() : null;
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured" }, { status: 500 });
  }

  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 86_400_000);
  const weekBeforeStart = new Date(now.getTime() - 14 * 86_400_000);
  const weekStartDate = weekStart.toISOString().slice(0, 10);

  const summary = { sites_checked: 0, digests_sent: 0, skipped_no_flags: 0, errors: [] as string[] };

  const { data: sites, error: sitesError } = await supabase.from("sites").select("id, name, domain, user_id");
  if (sitesError) return NextResponse.json({ error: sitesError.message }, { status: 500 });

  for (const site of sites ?? []) {
    summary.sites_checked++;
    try {
      const plan = await getUserPlan(supabase, site.user_id);
      if (!planHas(plan, "ai_copilot")) continue;

      const flags: Flag[] = [];

      // Bounce rate.
      const [bounceThis, bounceLast] = await Promise.all([
        supabase.rpc("weekly_bounce_rate", {
          p_site: site.id,
          p_since: weekStart.toISOString(),
          p_until: now.toISOString(),
        }),
        supabase.rpc("weekly_bounce_rate", {
          p_site: site.id,
          p_since: weekBeforeStart.toISOString(),
          p_until: weekStart.toISOString(),
        }),
      ]);
      const bounceThisVal = Number(bounceThis.data ?? 0);
      const bounceLastVal = Number(bounceLast.data ?? 0);
      if (bounceLastVal > 0 && Math.abs(bounceThisVal - bounceLastVal) >= RATE_FLAG_POINTS) {
        flags.push({
          metric: "Taux de rebond",
          this_week: bounceThisVal,
          last_week: bounceLastVal,
          unit: "pp_rate",
        });
      }

      // Funnels — overall conversion (first step -> last step) per funnel.
      const { data: funnelsRaw } = await supabase
        .from("funnels")
        .select("id, name, funnel_steps(step_order, name, match_type, match_value)")
        .eq("site_id", site.id);

      for (const f of funnelsRaw ?? []) {
        const steps = ((f.funnel_steps ?? []) as { step_order: number; match_type: string; match_value: string }[])
          .sort((a, b) => a.step_order - b.step_order);
        if (steps.length < 2) continue;
        const stepsArg = steps.map((s) => ({ match_type: s.match_type, match_value: s.match_value }));

        const [thisWeek, lastWeek] = await Promise.all([
          supabase.rpc("funnel_results", {
            p_site: site.id,
            p_since: weekStart.toISOString(),
            p_steps: stepsArg,
            p_until: now.toISOString(),
          }),
          supabase.rpc("funnel_results", {
            p_site: site.id,
            p_since: weekBeforeStart.toISOString(),
            p_steps: stepsArg,
            p_until: weekStart.toISOString(),
          }),
        ]);

        // `visitors` depuis supabase/funnel-visitors.sql ; `sessions`
        // tant que cette migration n'a pas tourné.
        const rate = (
          rows: { step_index: number; visitors?: number; sessions?: number }[] | null
        ) => {
          const byStep = new Map(
            (rows ?? []).map((r) => [r.step_index, Number(r.visitors ?? r.sessions ?? 0)])
          );
          const first = byStep.get(0) ?? 0;
          const last = byStep.get(steps.length - 1) ?? 0;
          return first > 0 ? Math.round((last / first) * 100) : null;
        };
        const thisRate = rate(thisWeek.data);
        const lastRate = rate(lastWeek.data);
        if (thisRate !== null && lastRate !== null && Math.abs(thisRate - lastRate) >= RATE_FLAG_POINTS) {
          flags.push({
            metric: `Taux de conversion du funnel "${f.name}"`,
            this_week: thisRate,
            last_week: lastRate,
            unit: "pp_rate",
          });
        }
      }

      // Revenue — getSiteRevenue's "7d" period already compares this
      // window against the one immediately before it.
      if (planHas(plan, "revenue")) {
        const revenue = await getSiteRevenue(supabase, site.id, "7d");
        if (revenue.connected && revenue.overview) {
          const { total_revenue, revenue_growth } = revenue.overview;
          if (total_revenue > 0 && Math.abs(revenue_growth) >= REVENUE_FLAG_PCT) {
            const priorRevenue = Math.round(total_revenue / (1 + revenue_growth / 100));
            flags.push({
              metric: "Revenu",
              this_week: total_revenue,
              last_week: priorRevenue,
              unit: "currency",
            });
          }
        }
      }

      if (flags.length === 0) {
        summary.skipped_no_flags++;
        continue;
      }

      const digestText = await buildDigest(apiKey, site.name, flags);
      if (!digestText) {
        summary.errors.push(`${site.id}: Haiku digest failed`);
        continue;
      }

      await supabase
        .from("insight_digests")
        .upsert(
          { site_id: site.id, week_start: weekStartDate, summary: digestText, flagged: flags },
          { onConflict: "site_id,week_start" }
        );

      const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://pulsetrack.eu"}/dashboard`;

      const { data: owner } = await supabase.auth.admin.getUserById(site.user_id);
      const email = owner.user?.email;
      if (email) {
        try {
          await sendEmail({
            to: email,
            subject: `🔎 Vos insights de la semaine — ${site.name}`,
            html: `
              <p>${digestText.replace(/\n/g, "<br>")}</p>
              <p><a href="${dashboardUrl}">Voir le dashboard</a></p>
              <p style="color:#888;font-size:12px">Résumé automatique hebdomadaire — basé sur ${flags.length} métrique${flags.length > 1 ? "s" : ""} ayant significativement bougé cette semaine.</p>
            `,
          });
        } catch (err) {
          summary.errors.push(`${site.id}: email: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      const { data: rule } = await supabase
        .from("alert_rules")
        .select("webhook_url")
        .eq("site_id", site.id)
        .eq("type", "traffic_drop")
        .maybeSingle();
      if (rule?.webhook_url) {
        try {
          await sendWebhookDigest({
            webhookUrl: rule.webhook_url,
            siteName: site.name,
            summary: digestText,
            dashboardUrl,
          });
        } catch (err) {
          summary.errors.push(`${site.id}: webhook: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      summary.digests_sent++;
    } catch (err) {
      summary.errors.push(`${site.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json(summary);
}
