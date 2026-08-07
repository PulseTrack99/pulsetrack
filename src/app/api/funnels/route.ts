import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST — Create a new funnel with steps
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, site_id, steps } = await req.json();

    if (!name || !site_id || !steps || steps.length < 2) {
      return NextResponse.json(
        { error: "Name, site_id, and at least 2 steps are required" },
        { status: 400 }
      );
    }

    // Verify user owns this site
    const { data: site } = await supabase
      .from("sites")
      .select("id")
      .eq("id", site_id)
      .eq("user_id", user.id)
      .single();

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    // Create funnel
    const { data: funnel, error: funnelError } = await supabase
      .from("funnels")
      .insert({ site_id, name })
      .select()
      .single();

    if (funnelError) {
      // The cap lives in a database trigger (supabase/quotas.sql) rather
      // than here, since it must hold regardless of which code path
      // inserts a row. It raises funnel_limit_reached:<n>.
      const limitMatch = funnelError.message.match(/funnel_limit_reached:(\d+)/);
      if (limitMatch) {
        return NextResponse.json(
          { error: "upgrade_required", feature: "funnels", limit: Number(limitMatch[1]) },
          { status: 402 }
        );
      }

      console.error("Failed to create funnel:", funnelError);
      return NextResponse.json({ error: "Failed to create funnel" }, { status: 500 });
    }

    // Create steps
    const stepsToInsert = steps.map(
      (step: { name: string; match_type: string; match_value: string }, i: number) => ({
        funnel_id: funnel.id,
        step_order: i + 1,
        name: step.name,
        match_type: step.match_type,
        match_value: step.match_value,
      })
    );

    const { data: createdSteps, error: stepsError } = await supabase
      .from("funnel_steps")
      .insert(stepsToInsert)
      .select();

    if (stepsError) {
      console.error("Failed to create steps:", stepsError);
      // Clean up the funnel
      await supabase.from("funnels").delete().eq("id", funnel.id);
      return NextResponse.json({ error: "Failed to create steps" }, { status: 500 });
    }

    return NextResponse.json({
      ...funnel,
      funnel_steps: createdSteps,
    });
  } catch (err) {
    console.error("Funnel creation error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
