import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Steps nobody reached are absent from the result rather than zero.
    const reached = new Map<number, number>();
    ((matched ?? []) as { step_index: number; sessions: number }[]).forEach((r) =>
      reached.set(Number(r.step_index), Number(r.sessions))
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
