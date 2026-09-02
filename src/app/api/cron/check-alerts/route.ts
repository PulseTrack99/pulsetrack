import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";

/**
 * Turns PulseTrack from a dashboard someone has to remember to check
 * into something that tells them when it matters. v1: one alert type,
 * traffic_drop — today's visitors (rolling 24h) vs the same 24h window
 * one week earlier. A 24h cooldown (last_triggered_at) stops a
 * sustained drop from re-sending every single run.
 *
 * Runs daily via Vercel Cron (vercel.json), same CRON_SECRET gate as
 * purge-retention.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = { checked: 0, triggered: 0, errors: [] as string[] };
  const now = Date.now();

  const { data: rules, error: rulesError } = await supabase
    .from("alert_rules")
    .select("id, site_id, threshold_pct, last_triggered_at, sites(name, domain, user_id)")
    .eq("type", "traffic_drop")
    .eq("enabled", true);

  if (rulesError) {
    return NextResponse.json({ error: rulesError.message }, { status: 500 });
  }

  for (const rule of rules ?? []) {
    summary.checked++;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const site = rule.sites as any;
      if (!site) continue;

      const cooledDown =
        !rule.last_triggered_at || now - new Date(rule.last_triggered_at).getTime() > COOLDOWN_MS;
      if (!cooledDown) continue;

      const todayEnd = new Date(now).toISOString();
      const todayStart = new Date(now - 24 * 3600_000).toISOString();
      const lastWeekEnd = new Date(now - 7 * 24 * 3600_000).toISOString();
      const lastWeekStart = new Date(now - 8 * 24 * 3600_000).toISOString();

      const [today, lastWeek] = await Promise.all([
        supabase.rpc("visitor_count", { p_site: rule.site_id, p_since: todayStart, p_until: todayEnd }),
        supabase.rpc("visitor_count", { p_site: rule.site_id, p_since: lastWeekStart, p_until: lastWeekEnd }),
      ]);
      if (today.error) throw new Error(today.error.message);
      if (lastWeek.error) throw new Error(lastWeek.error.message);

      const todayCount = Number(today.data ?? 0);
      const lastWeekCount = Number(lastWeek.data ?? 0);

      // No baseline yet (a brand-new site) — nothing meaningful to
      // compare against, so never fire rather than alerting on noise.
      if (lastWeekCount === 0) continue;

      const dropPct = Math.round((1 - todayCount / lastWeekCount) * 100);
      if (dropPct < rule.threshold_pct) continue;

      const { data: owner } = await supabase.auth.admin.getUserById(site.user_id);
      const email = owner.user?.email;
      if (!email) continue;

      await sendEmail({
        to: email,
        subject: `⚠️ Chute de trafic sur ${site.name}`,
        html: `
          <p>Le trafic de <strong>${site.name}</strong> (${site.domain}) a chuté de <strong>${dropPct}%</strong> par rapport à la même période la semaine dernière.</p>
          <p>${todayCount} visiteurs sur les dernières 24h, contre ${lastWeekCount} la semaine précédente.</p>
          <p><a href="https://pulsetrack-sigma.vercel.app/dashboard">Voir le dashboard</a></p>
          <p style="color:#888;font-size:12px">Vous recevez cet email parce qu'une alerte de chute de trafic est activée sur ce site — réglable depuis Paramètres.</p>
        `,
      });

      await supabase.from("alert_rules").update({ last_triggered_at: new Date().toISOString() }).eq("id", rule.id);
      summary.triggered++;
    } catch (err) {
      summary.errors.push(`${rule.site_id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json(summary);
}
