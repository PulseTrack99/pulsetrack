import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// POST — Sync recent charges from connected Stripe and attribute to sessions
export async function POST(req: NextRequest) {
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

    // Get the Stripe connection
    const { data: connection } = await serviceSupabase
      .from("stripe_connections")
      .select("stripe_restricted_key, last_synced_at")
      .eq("site_id", site_id)
      .single();

    if (!connection) {
      return NextResponse.json(
        { error: "Stripe not connected" },
        { status: 400 }
      );
    }

    // Initialize Stripe with user's key
    const userStripe = new Stripe(connection.stripe_restricted_key, {
      apiVersion: "2026-07-29.dahlia",
    });

    // Fetch recent charges (last 30 days or since last sync)
    const sinceTimestamp = connection.last_synced_at
      ? Math.floor(new Date(connection.last_synced_at).getTime() / 1000) - 3600 // 1h overlap for safety
      : Math.floor(Date.now() / 1000) - 30 * 24 * 3600; // 30 days

    const charges = await userStripe.charges.list({
      created: { gte: sinceTimestamp },
      limit: 100,
      expand: ["data.customer"],
    });

    // Get all identified sessions for this site
    const { data: identities } = await serviceSupabase
      .from("session_identities")
      .select("session_id, email")
      .eq("site_id", site_id);

    const emailToSession = new Map<string, string>();
    if (identities) {
      for (const id of identities) {
        emailToSession.set(id.email.toLowerCase(), id.session_id);
      }
    }

    let synced = 0;
    let attributed = 0;

    for (const charge of charges.data) {
      // Skip failed/refunded charges
      if (charge.status !== "succeeded") continue;

      // Get customer email
      let customerEmail: string | null = null;
      const cust = charge.customer;
      if (typeof cust === "object" && cust && "email" in cust && cust.email) {
        customerEmail = cust.email.toLowerCase();
      } else if (charge.receipt_email) {
        customerEmail = charge.receipt_email.toLowerCase();
      } else if (charge.billing_details?.email) {
        customerEmail = charge.billing_details.email.toLowerCase();
      }

      // Try to match with a tracked session
      let matchedSessionId: string | null = null;
      let source = "Unattributed";
      let landingPage: string | null = null;
      let country: string | null = null;

      if (customerEmail && emailToSession.has(customerEmail)) {
        matchedSessionId = emailToSession.get(customerEmail)!;

        // Get the session's first pageview to find source and landing page
        const { data: sessionEvents } = await serviceSupabase
          .from("events")
          .select("source, path, country")
          .eq("site_id", site_id)
          .eq("session_id", matchedSessionId)
          .eq("type", "pageview")
          .order("created_at", { ascending: true })
          .limit(1);

        if (sessionEvents && sessionEvents.length > 0) {
          source = sessionEvents[0].source || "Direct";
          landingPage = sessionEvents[0].path;
          country = sessionEvents[0].country;
          attributed++;
        }
      }

      // Upsert revenue event
      await serviceSupabase.from("revenue_events").upsert(
        {
          site_id,
          stripe_charge_id: charge.id,
          amount: charge.amount,
          currency: charge.currency,
          customer_email: customerEmail,
          session_id: matchedSessionId,
          source,
          landing_page: landingPage,
          country,
          stripe_created_at: new Date(charge.created * 1000).toISOString(),
        },
        { onConflict: "site_id,stripe_charge_id" }
      );

      synced++;
    }

    // Update last synced timestamp
    await serviceSupabase
      .from("stripe_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("site_id", site_id);

    return NextResponse.json({
      ok: true,
      synced,
      attributed,
      total: charges.data.length,
    });
  } catch (err) {
    console.error("Revenue sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
