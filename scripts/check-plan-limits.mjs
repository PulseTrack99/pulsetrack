/**
 * Asserts the limits in the database match PLANS in src/lib/stripe.ts.
 *
 * The two exist for different reasons — the TypeScript object drives the
 * pricing page, the table drives the triggers that actually enforce —
 * and nothing stops them drifting apart. A plan that advertises three
 * sites while the trigger allows one is a support ticket nobody will
 * diagnose quickly.
 *
 *   node scripts/check-plan-limits.mjs
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// Read the limits out of the TypeScript source rather than importing it,
// which would need a build step for a check that should just run.
const src = readFileSync("src/lib/stripe.ts", "utf8");

function limitsFor(plan) {
  const block = src.split(`  ${plan}: {`)[1];
  if (!block) throw new Error(`plan "${plan}" not found in stripe.ts`);
  const limits = block.split("limits: {")[1].split("}")[0];
  const num = (key) => {
    const m = limits.match(new RegExp(`${key}:\\s*(-?\\d+)`));
    if (!m) throw new Error(`${plan}.${key} missing`);
    return Number(m[1]);
  };
  return {
    max_sites: num("sites"),
    max_events_per_month: num("events_per_month"),
    max_funnels: num("funnels"),
    retention_days: num("retention_days"),
    max_replays_per_month: num("replays_per_month"),
    max_ai_queries_per_month: num("ai_queries_per_month"),
  };
}

const { data: rows, error } = await supabase.from("plan_limits").select("*");
if (error) {
  console.error("could not read plan_limits:", error.message);
  console.error("→ run supabase/quotas.sql first");
  process.exit(1);
}

const byPlan = Object.fromEntries(rows.map((r) => [r.plan, r]));
const FIELDS = [
  "max_sites",
  "max_events_per_month",
  "max_funnels",
  "retention_days",
  "max_replays_per_month",
  "max_ai_queries_per_month",
];

let failed = 0;

for (const plan of ["free", "starter", "growth", "business"]) {
  const code = limitsFor(plan);
  const db = byPlan[plan];

  if (!db) {
    console.log(`FAIL  ${plan}: absent from plan_limits`);
    failed++;
    continue;
  }

  for (const f of FIELDS) {
    if (Number(db[f]) !== code[f]) {
      console.log(`FAIL  ${plan}.${f}: stripe.ts=${code[f]} database=${db[f]}`);
      failed++;
    }
  }
}

if (failed === 0) {
  console.log("plan limits agree between src/lib/stripe.ts and plan_limits");
}

process.exit(failed ? 1 : 0);
