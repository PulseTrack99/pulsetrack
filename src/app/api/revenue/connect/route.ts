import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getUserPlan, planHas } from "@/lib/plan";

// POST — Connect user's Stripe account (save restricted key)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { site_id, stripe_key } = await req.json();

    if (!site_id || !stripe_key) {
      return NextResponse.json(
        { error: "Missing site_id or stripe_key" },
        { status: 400 }
      );
    }

    // Verify the user owns the site
    const { data: site } = await supabase
      .from("sites")
      .select("id")
      .eq("id", site_id)
      .single();

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    // Revenue attribution is a Growth-and-above capability. The stats and
    // sync routes are already scoped to this connection, so refusing it
    // here is what actually keeps a Free account off the feature.
    const plan = await getUserPlan(supabase, user.id);
    if (!planHas(plan, "revenue")) {
      return NextResponse.json(
        { error: "upgrade_required", plan, feature: "revenue" },
        { status: 402 }
      );
    }

    // Validate the Stripe key by trying to fetch balance
    try {
      const testStripe = new Stripe(stripe_key, {
        apiVersion: "2026-07-29.dahlia",
      });
      await testStripe.balance.retrieve();
    } catch {
      return NextResponse.json(
        { error: "Invalid Stripe API key" },
        { status: 400 }
      );
    }

    // Save the connection using service role
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await serviceSupabase.from("stripe_connections").upsert(
      {
        site_id,
        stripe_restricted_key: stripe_key,
        created_at: new Date().toISOString(),
      },
      { onConflict: "site_id" }
    );

    if (error) {
      console.error("Failed to save Stripe connection:", error);
      return NextResponse.json(
        { error: "Failed to save connection" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, connected: true });
  } catch (err) {
    console.error("Revenue connect error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE — Disconnect Stripe account
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { site_id } = await req.json();

    // Verify ownership
    const { data: site } = await supabase
      .from("sites")
      .select("id")
      .eq("id", site_id)
      .single();

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Delete connection and related data
    await serviceSupabase
      .from("revenue_events")
      .delete()
      .eq("site_id", site_id);

    await serviceSupabase
      .from("stripe_connections")
      .delete()
      .eq("site_id", site_id);

    return NextResponse.json({ ok: true, connected: false });
  } catch (err) {
    console.error("Revenue disconnect error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
