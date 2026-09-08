import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchema } from "@/lib/schema-guard";

function getPeriodStart(period: string): string {
  const now = new Date();
  switch (period) {
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case "90d":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    case "30d":
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: funnelId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "30d";

    // Get funnel with steps
    const { data: funnel } = await supabase
      .from("funnels")
      .select(`
        id,
        name,
        site_id,
        funnel_steps (
          id,
          step_order,
          name,
          match_type,
          match_value
        )
      `)
      .eq("id", funnelId)
      .single();

    if (!funnel) {
      return NextResponse.json({ error: "Funnel not found" }, { status: 404 });
    }

    // Verify access — no .eq("user_id", user.id), RLS already scopes
    // this to sites the caller owns or was added to as a team member.
    const { data: site } = await supabase
      .from("sites")
      .select("id")
      .eq("id", funnel.site_id)
      .single();

    if (!site) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const periodStart = getPeriodStart(period);
    const steps = (funnel.funnel_steps || []).sort(
      (a, b) => a.step_order - b.step_order
    );

    // Step matching runs in Postgres. Doing it here meant reading the
    // period's whole event log, which PostgREST truncates at its max-rows
    // setting — so every funnel on a site past a thousand events was
    // computed from a fraction of the data, and silently under-reported.
    const { data: matched, error: funnelError } = await supabase.rpc(
      "funnel_results",
      {
        p_site: funnel.site_id,
        p_since: periodStart,
        p_steps: steps.map((s) => ({
          match_type: s.match_type,
          match_value: s.match_value,
        })),
      }
    );

    if (funnelError) {
      console.error("Funnel query error:", funnelError);
      return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    /* Steps nobody reached are absent from the result rather than zero.
     *
     * La colonne s'appelle `visitors` depuis supabase/funnel-visitors.sql,
     * qui a fait passer le comptage de session_id à visitor_id pour que
     * le mot affiché dise ce que le chiffre compte. Tant que cette
     * migration n'a pas tourné la fonction rend encore `sessions` : lire
     * les deux évite qu'un funnel affiche zéro partout entre le
     * déploiement et le passage en base. */
    const reached = new Map<number, number>();
    (
      (matched ?? []) as { step_index: number; visitors?: number; sessions?: number }[]
    ).forEach((r) =>
      reached.set(Number(r.step_index), Number(r.visitors ?? r.sessions ?? 0))
    );

    const stepResults = steps.map((step, stepIndex) => ({
      step_order: step.step_order,
      name: step.name,
      match_value: step.match_value,
      visitors: reached.get(stepIndex) ?? 0,
      conversion_rate: 0, // Calculated below
      drop_off_rate: 0, // Calculated below
    }));

    // Calculate conversion and drop-off rates
    const totalStart = stepResults[0]?.visitors || 0;
    stepResults.forEach((step, i) => {
      step.conversion_rate =
        totalStart > 0 ? Math.round((step.visitors / totalStart) * 100) : 0;

      if (i > 0) {
        const prev = stepResults[i - 1].visitors;
        step.drop_off_rate =
          prev > 0 ? Math.round(((prev - step.visitors) / prev) * 100) : 0;
      }
    });

    return NextResponse.json({
      funnel_id: funnel.id,
      funnel_name: funnel.name,
      period,
      steps: stepResults,
    });
  } catch (err) {
    console.error("Funnel results error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * Archiver un funnel, ou le sortir des archives.
 *
 * Pas de DELETE : les étapes, et surtout la lecture qu'on a pu faire
 * d'un funnel, valent mieux qu'une corbeille. Un funnel archivé quitte
 * la liste et cesse de consommer le plafond du plan, sans que rien ne
 * soit perdu. C'est ce qui rend l'offre Free vivable, où une faute de
 * frappe sur le premier funnel bloquait jusque-là le compte à vie.
 *
 * Le plafond est réappliqué à la restauration, en base
 * (supabase/funnel-archive.sql) plutôt qu'ici : le trigger couvre
 * l'UPDATE comme l'INSERT, donc aucun chemin d'écriture ne peut le
 * contourner. Cette route se contente de traduire son erreur.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: funnelId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (typeof body?.archived !== "boolean") {
      return NextResponse.json(
        { error: "archived must be a boolean" },
        { status: 400 }
      );
    }

    // La RLS de funnels passe par has_account_access : un équipier
    // archive comme le propriétaire, et un tiers ne touche à rien. Pas
    // de vérification d'accès en plus ici, elle ne dirait rien de neuf.
    const { data, error } = await supabase
      .from("funnels")
      .update({ archived_at: body.archived ? new Date().toISOString() : null })
      .eq("id", funnelId)
      .select("id, archived_at")
      .maybeSingle();

    if (error) {
      if (isMissingSchema(error)) {
        return NextResponse.json(
          { error: "migration_pending", file: "supabase/funnel-archive.sql" },
          { status: 503 }
        );
      }

      // Restaurer alors que le plan est plein : c'est une limite
      // d'offre, pas une panne, et l'écran propose de monter en gamme.
      const limit = error.message.match(/funnel_limit_reached:(\d+)/);
      if (limit) {
        return NextResponse.json(
          { error: "upgrade_required", feature: "funnels", limit: Number(limit[1]) },
          { status: 402 }
        );
      }

      console.error("Failed to archive funnel:", error);
      return NextResponse.json({ error: "Failed to update funnel" }, { status: 500 });
    }

    // Zéro ligne touchée = la RLS a filtré. Indiscernable, volontairement,
    // d'un funnel qui n'existe pas.
    if (!data) {
      return NextResponse.json({ error: "Funnel not found" }, { status: 404 });
    }

    return NextResponse.json({ id: data.id, archived_at: data.archived_at });
  } catch (err) {
    console.error("Funnel archive error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
