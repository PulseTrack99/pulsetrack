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

    // Verify user owns the site
    const { data: site } = await supabase
      .from("sites")
      .select("id")
      .eq("id", funnel.site_id)
      .eq("user_id", user.id)
      .single();

    if (!site) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const periodStart = getPeriodStart(period);
    const steps = (funnel.funnel_steps || []).sort(
      (a, b) => a.step_order - b.step_order
    );

    // Get all events for this site in the period
    const { data: events } = await supabase
      .from("events")
      .select("session_id, path, type, event_name, created_at")
      .eq("site_id", funnel.site_id)
      .gte("created_at", periodStart)
      .order("created_at", { ascending: true });

    const allEvents = events || [];

    // Group events by session
    const sessionEvents = new Map<string, typeof allEvents>();
    allEvents.forEach((event) => {
      const existing = sessionEvents.get(event.session_id) || [];
      existing.push(event);
      sessionEvents.set(event.session_id, existing);
    });

    // For each step, count how many sessions match
    // A session matches step N if it matched all previous steps (in order)
    const stepResults = steps.map((step, stepIndex) => {
      let matchingSessionCount = 0;

      sessionEvents.forEach((sessionEvts) => {
        // Check if this session passes through all steps up to and including this one
        let lastMatchIndex = -1;
        let passedAllPreviousSteps = true;

        for (let s = 0; s <= stepIndex; s++) {
          const currentStep = steps[s];
          let foundMatch = false;

          // Search for a matching event AFTER the last matched event
          for (let e = lastMatchIndex + 1; e < sessionEvts.length; e++) {
            const evt = sessionEvts[e];
            let matches = false;

            switch (currentStep.match_type) {
              case "path":
                matches = evt.path === currentStep.match_value;
                break;
              case "path_contains":
                matches = evt.path?.includes(currentStep.match_value) || false;
                break;
              case "event":
                matches =
                  evt.type === "event" &&
                  evt.event_name === currentStep.match_value;
                break;
            }

            if (matches) {
              lastMatchIndex = e;
              foundMatch = true;
              break;
            }
          }

          if (!foundMatch) {
            passedAllPreviousSteps = false;
            break;
          }
        }

        if (passedAllPreviousSteps) {
          matchingSessionCount++;
        }
      });

      return {
        step_order: step.step_order,
        name: step.name,
        match_value: step.match_value,
        visitors: matchingSessionCount,
        conversion_rate: 0, // Calculated below
        drop_off_rate: 0, // Calculated below
      };
    });

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
