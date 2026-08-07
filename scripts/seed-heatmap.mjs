/**
 * Fills a site with synthetic interactions so the heatmap view can be
 * checked without waiting for real traffic.
 *
 *   node scripts/seed-heatmap.mjs <SITE_ID> [path] [count]
 *   node scripts/seed-heatmap.mjs 3f2a…  /pricing  1200
 *
 * Clicks are drawn around a few hot spots rather than uniformly, because a
 * uniform scatter renders as flat noise and tells you nothing about
 * whether the density pass works.
 *
 * Writes with the service role key, so it bypasses RLS. Local use only.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ── env ────────────────────────────────────────────────────────
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

// ── args ───────────────────────────────────────────────────────
const [siteId, path = "/", countArg = "900"] = process.argv.slice(2);
const count = parseInt(countArg, 10);

if (!siteId) {
  console.error("usage: node scripts/seed-heatmap.mjs <SITE_ID> [path] [count]");
  process.exit(1);
}

// ── shape of the fake page ─────────────────────────────────────
// x, y are ratios; weight decides how much of the traffic lands there.
const HOTSPOTS = [
  { x: 0.5, y: 0.14, spread: 0.05, weight: 30, sel: "a.btn.btn-primary", text: "Bouton principal", interactive: true },
  { x: 0.62, y: 0.14, spread: 0.04, weight: 14, sel: "button.btn.btn-ghost", text: "Bouton secondaire", interactive: true },
  { x: 0.88, y: 0.03, spread: 0.03, weight: 18, sel: "a.btn.btn-brand", text: "Commencer", interactive: true },
  { x: 0.22, y: 0.42, spread: 0.07, weight: 12, sel: "div.card:nth-of-type(1)", text: "Carte A", interactive: false },
  { x: 0.5, y: 0.42, spread: 0.07, weight: 7, sel: "div.card:nth-of-type(2)", text: "Carte B", interactive: false },
  { x: 0.5, y: 0.68, spread: 0.05, weight: 11, sel: "a.btn.btn-brand:nth-of-type(2)", text: "Convertir", interactive: true },
  { x: 0.3, y: 0.03, spread: 0.04, weight: 8, sel: "nav>a", text: "Fonctionnalités", interactive: true },
];

const DEAD = { x: 0.77, y: 0.14, spread: 0.02, sel: "span.fake-btn", text: "Faux bouton" };

const DEVICES = [
  ["Desktop", 0.62, 1440, 900, 4200],
  ["Mobile", 0.31, 390, 844, 6800],
  ["Tablet", 0.07, 820, 1180, 5200],
];

// Box–Muller: clusters need a normal distribution, not a uniform one.
function gauss(mean, sd) {
  const u = Math.random() || 1e-9;
  const v = Math.random() || 1e-9;
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function pick(list, weightOf) {
  const total = list.reduce((s, i) => s + weightOf(i), 0);
  let r = Math.random() * total;
  for (const item of list) {
    r -= weightOf(item);
    if (r <= 0) return item;
  }
  return list[list.length - 1];
}

function device() {
  const d = pick(DEVICES, (x) => x[1]);
  return { name: d[0], w: d[2], h: d[3], docH: d[4] };
}

const rows = [];
const sessions = Math.max(20, Math.round(count / 8));

// ── clicks ─────────────────────────────────────────────────────
for (let i = 0; i < count; i++) {
  const spot = pick(HOTSPOTS, (s) => s.weight);
  const dev = device();
  const session = `seed-${Math.floor(Math.random() * sessions)}`;

  rows.push({
    site_id: siteId,
    session_id: session,
    visitor_id: `seed-v-${Math.floor(Math.random() * sessions)}`,
    path,
    type: "click",
    x_ratio: Math.min(1, Math.max(0, gauss(spot.x, spot.spread))),
    y_px: Math.round(Math.min(1, Math.max(0, gauss(spot.y, spot.spread))) * dev.docH),
    viewport_w: dev.w,
    viewport_h: dev.h,
    doc_h: dev.docH,
    device: dev.name,
    selector: spot.sel,
    elem_text: spot.text,
    interactive: spot.interactive,
  });
}

// ── rage clicks on the dead control ────────────────────────────
const rageCount = Math.max(4, Math.round(count * 0.02));
for (let i = 0; i < rageCount; i++) {
  const dev = device();
  rows.push({
    site_id: siteId,
    session_id: `seed-${Math.floor(Math.random() * sessions)}`,
    visitor_id: `seed-v-${Math.floor(Math.random() * sessions)}`,
    path,
    type: "rage",
    x_ratio: Math.min(1, Math.max(0, gauss(DEAD.x, DEAD.spread))),
    y_px: Math.round(Math.min(1, Math.max(0, gauss(DEAD.y, DEAD.spread))) * dev.docH),
    viewport_w: dev.w,
    viewport_h: dev.h,
    doc_h: dev.docH,
    device: dev.name,
    selector: DEAD.sel,
    elem_text: DEAD.text,
    interactive: false,
  });
}

// ── scroll depths ──────────────────────────────────────────────
// Most people stop early; a tail reaches the bottom. That skew is what
// makes the depth chart worth looking at.
for (let i = 0; i < sessions; i++) {
  const dev = device();
  const r = Math.random();
  const depth =
    r < 0.34 ? 10 + Math.random() * 25 :
    r < 0.68 ? 35 + Math.random() * 30 :
    r < 0.9  ? 65 + Math.random() * 20 :
               85 + Math.random() * 15;

  rows.push({
    site_id: siteId,
    session_id: `seed-${i}`,
    visitor_id: `seed-v-${i}`,
    path,
    type: "scroll",
    viewport_w: dev.w,
    viewport_h: dev.h,
    doc_h: dev.docH,
    device: dev.name,
    scroll_pct: Math.round(depth),
  });
}

// ── insert ─────────────────────────────────────────────────────
console.log(`seeding ${rows.length} interactions on ${path}…`);

for (let i = 0; i < rows.length; i += 500) {
  const chunk = rows.slice(i, i + 500);
  const { error } = await supabase.from("interactions").insert(chunk);
  if (error) {
    console.error("insert failed:", error.message);
    if (error.message.includes("does not exist")) {
      console.error("→ run supabase/heatmaps.sql first");
    }
    process.exit(1);
  }
  process.stdout.write(".");
}

console.log("\ndone.");
console.log(`  ${count} clicks, ${rageCount} rage clicks, ${sessions} scroll depths`);
console.log(`  open /dashboard/heatmaps and pick ${path}`);
console.log("");
console.log("To remove afterwards:");
console.log(`  delete from interactions where session_id like 'seed-%';`);
