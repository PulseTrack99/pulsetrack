// Seeds a small, deliberately-designed set of synthetic sessions to verify
// the three behavioural replay filters end-to-end (query logic + UI), the
// same way scripts/seed-heatmap.mjs seeds data to verify heatmap aggregation.
// All rows are tagged with session_id starting "seed-behavior-" so they are
// trivially identifiable and safe to delete afterwards (see cleanup at the
// bottom, commented out by default).
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const SITE_ID = "e6e0434a-e466-4618-827e-50cc08249152";

const iso = (d) => d.toISOString();
const minutes = (n) => n * 60_000;

async function main() {
  const { data: site, error: siteErr } = await sb
    .from("sites")
    .select("id, user_id")
    .eq("id", SITE_ID)
    .single();
  if (siteErr || !site) throw new Error("Site introuvable: " + siteErr?.message);

  const t0 = new Date(Date.now() - minutes(120));

  // session_id -> { idx: offset_min|null, about: offset_min|null,
  //                 other: offset_min|null, converted: bool,
  //                 scrollMax: number, device: string }
  const sessions = {
    "seed-behavior-1": { idx: 0, about: 3, converted: true, scrollMax: 85, device: "Desktop" },
    "seed-behavior-2": { idx: 10, about: 13, converted: false, scrollMax: 92, device: "Desktop" },
    "seed-behavior-3": { idx: 20, about: null, converted: false, scrollMax: 12, device: "Mobile" },
    "seed-behavior-4": { idx: 30, about: null, converted: false, scrollMax: 8, device: "Mobile" },
    "seed-behavior-5": { idx: null, about: null, other: 40, converted: false, scrollMax: 55, device: "Desktop" },
    "seed-behavior-6": { idx: 50, about: 53, converted: true, scrollMax: 70, device: "Tablet" },
  };

  const eventRows = [];
  const interactionRows = [];
  const revenueRows = [];
  const replayRows = [];

  for (const [sid, s] of Object.entries(sessions)) {
    const paths = [];
    if (s.idx != null) paths.push({ path: "/index.html", offset: s.idx });
    if (s.about != null) paths.push({ path: "/about.html", offset: s.about });
    if (s.other != null) paths.push({ path: "/other.html", offset: s.other });

    for (const p of paths) {
      eventRows.push({
        site_id: SITE_ID,
        type: "pageview",
        path: p.path,
        url: "https://example.com" + p.path,
        device: s.device,
        browser: "Chrome",
        country: "FR",
        session_id: sid,
        visitor_id: sid + "-visitor",
        created_at: iso(new Date(t0.getTime() + minutes(p.offset))),
      });
    }

    const firstOffset = paths[0].offset;

    interactionRows.push({
      site_id: SITE_ID,
      session_id: sid,
      visitor_id: sid + "-visitor",
      path: paths[0].path,
      type: "scroll",
      scroll_pct: s.scrollMax,
      device: s.device,
      created_at: iso(new Date(t0.getTime() + minutes(firstOffset) + 5_000)),
    });

    if (s.converted) {
      revenueRows.push({
        site_id: SITE_ID,
        stripe_charge_id: "seed_ch_" + sid,
        amount: 4900,
        currency: "eur",
        customer_email: sid + "@example.com",
        session_id: sid,
        source: "Direct",
        landing_page: paths[0].path,
        country: "FR",
        stripe_created_at: iso(new Date(t0.getTime() + minutes(firstOffset) + 60_000)),
      });
    }

    replayRows.push({
      site_id: SITE_ID,
      user_id: site.user_id,
      replay_id: randomUUID(),
      session_id: sid,
      visitor_id: sid + "-visitor",
      path: paths[0].path,
      device: s.device,
      browser: "Chrome",
      country: "FR",
      started_at: iso(new Date(t0.getTime() + minutes(firstOffset))),
      last_seen_at: iso(new Date(t0.getTime() + minutes(firstOffset) + 180_000)),
      duration_ms: 180_000,
      segment_count: 1,
      event_count: 50,
      size_bytes: 12_000,
      status: "complete",
    });
  }

  // A dummy stripe_connections row is required for the "no_conversion" UI
  // filter to even appear (the panel gates on the row's existence, not on
  // whether the key is real) — clearly a test-only value, never used to
  // call Stripe.
  const { error: stripeErr } = await sb
    .from("stripe_connections")
    .upsert(
      { site_id: SITE_ID, stripe_restricted_key: "rk_test_seed_behavior_dummy" },
      { onConflict: "site_id" }
    );
  if (stripeErr) throw new Error("stripe_connections: " + stripeErr.message);

  const { error: evErr } = await sb.from("events").insert(eventRows);
  if (evErr) throw new Error("events: " + evErr.message);

  const { error: intErr } = await sb.from("interactions").insert(interactionRows);
  if (intErr) throw new Error("interactions: " + intErr.message);

  const { error: revErr } = await sb.from("revenue_events").insert(revenueRows);
  if (revErr) throw new Error("revenue_events: " + revErr.message);

  const { error: replErr } = await sb.from("session_replays").insert(replayRows);
  if (replErr) throw new Error("session_replays: " + replErr.message);

  console.log(`Seedé: ${eventRows.length} events, ${interactionRows.length} interactions, ${revenueRows.length} revenue_events, ${replayRows.length} session_replays.`);
  console.log("stripe_connections: ligne factice posée pour activer le filtre 'Sans conversion' dans l'UI.");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
