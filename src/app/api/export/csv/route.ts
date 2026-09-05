import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, planHas } from "@/lib/plan";
import { getSiteStats, PERIOD_DAYS } from "@/lib/stats";

/**
 * CSV export of the same figures the dashboard overview shows —
 * getSiteStats is the single source both read, so the export can never
 * disagree with what the user already sees on screen.
 *
 * "Export CSV" has been on the pricing table (Business plan) since the
 * plans were first written, with nothing behind it — planHas(plan,
 * "csv_export") was never called anywhere. This is that feature, not a
 * new promise.
 */

// Quotes a field only when it needs it (contains a comma, quote or
// newline), doubling any internal quotes — minimal correct CSV escaping
// rather than a dependency for five columns of text and numbers.
function csvField(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvRow(values: (string | number)[]): string {
  return values.map(csvField).join(",") + "\r\n";
}

function csvSection(title: string, header: string[], rows: (string | number)[][]): string {
  let out = csvRow([title]);
  out += csvRow(header);
  for (const r of rows) out += csvRow(r);
  out += "\r\n";
  return out;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("site_id");
    const period = searchParams.get("period") || "30d";

    if (!siteId || !(period in PERIOD_DAYS)) {
      return NextResponse.json({ error: "site_id and a valid period are required" }, { status: 400 });
    }

    // No .eq("user_id", user.id) — RLS (has_account_access) already
    // scopes this to the caller's own sites or an owner's sites they
    // were added to as a team member.
    const { data: site } = await supabase
      .from("sites")
      .select("id, name, domain")
      .eq("id", siteId)
      .maybeSingle();

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const plan = await getUserPlan(supabase, user.id);
    if (!planHas(plan, "csv_export")) {
      return NextResponse.json(
        { error: "upgrade_required", plan, feature: "csv_export" },
        { status: 402 }
      );
    }

    const stats = await getSiteStats(supabase, siteId, period);

    // UTF-8 BOM so Excel (which guesses ANSI otherwise) renders accented
    // French labels correctly rather than mangling them.
    let csv = "﻿";
    csv += csvRow([`PulseTrack — export ${site.name} (${site.domain})`]);
    csv += csvRow(["Période", period]);
    csv += csvRow(["Généré le", new Date().toISOString()]);
    csv += "\r\n";

    csv += csvSection("Résumé", ["Métrique", "Valeur"], [
      ["Visiteurs", stats.visitors],
      ["Sessions", stats.sessions],
      ["Pages vues", stats.pageviews],
      ["Taux de rebond (%)", stats.bounce_rate],
      ["Durée moyenne (s)", stats.avg_duration],
    ]);

    csv += csvSection(
      "Pages populaires",
      ["Page", "Vues"],
      stats.top_pages.map((r) => [r.path, r.views])
    );

    csv += csvSection(
      "Sources de trafic",
      ["Source", "Visiteurs"],
      stats.top_sources.map((r) => [r.source, r.visitors])
    );

    csv += csvSection(
      "Pays",
      ["Pays", "Visiteurs"],
      stats.top_countries.map((r) => [r.country, r.visitors])
    );

    csv += csvSection(
      "Appareils",
      ["Appareil", "Sessions"],
      stats.devices.map((r) => [r.device, r.count])
    );

    csv += csvSection(
      "Visiteurs par jour",
      ["Date", "Visiteurs"],
      stats.visitors_chart.map((r) => [r.date, r.count])
    );

    const filename = `pulsetrack-${site.domain}-${period}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("CSV export error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
