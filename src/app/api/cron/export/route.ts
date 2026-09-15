import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPlanForSite, planHas } from "@/lib/plan";
import { runExport, type ExportDestination } from "@/lib/export";

/**
 * Le passage quotidien d'export (vercel.json).
 *
 * Chaque destination active reçoit ce qui s'est passé depuis son
 * curseur, par lots. Une destination en échec n'arrête pas les autres,
 * et son curseur ne bouge pas : elle reprendra au même endroit au
 * passage suivant.
 *
 * Même garde que les autres crons — CRON_SECRET — et l'offre du
 * propriétaire est revérifiée ici : un compte redescendu en Starter
 * cesse d'exporter sans qu'il faille supprimer ses destinations.
 */

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await service
    .from("export_destinations")
    .select("id, site_id, url, cursor, created_at")
    .eq("enabled", true);

  if (error) {
    console.error("export cron:", error.message);
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }

  const summary = { destinations: 0, sent: 0, failed: 0, skipped_plan: 0 };
  const planCache = new Map<string, boolean>();

  for (const dest of (data ?? []) as ExportDestination[]) {
    if (!planCache.has(dest.site_id)) {
      const plan = await getPlanForSite(service, dest.site_id);
      planCache.set(dest.site_id, planHas(plan, "api"));
    }
    if (!planCache.get(dest.site_id)) {
      summary.skipped_plan += 1;
      continue;
    }

    summary.destinations += 1;
    const result = await runExport(service, dest);
    summary.sent += result.sent;
    if (result.error) summary.failed += 1;
  }

  return NextResponse.json(summary);
}
