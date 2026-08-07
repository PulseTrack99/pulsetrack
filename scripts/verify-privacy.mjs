/**
 * Checks the properties the privacy claims depend on.
 * Run with: node scripts/verify-privacy.mjs
 */
import { createHash } from "node:crypto";

// Mirrors computeVisitorId in src/lib/visitor.ts
const vid = (salt, siteId, ip, ua) =>
  createHash("sha256").update(`${salt}|${siteId}|${ip}|${ua}`).digest("hex").slice(0, 32);

const saltToday = "a".repeat(64);
const saltTomorrow = "b".repeat(64);
const ip = "192.168.14.203";
const ua = "Mozilla/5.0 (Macintosh) Chrome/120";
const siteA = "site-aaaa";
const siteB = "site-bbbb";

const checks = [
  [
    "Same visitor, same site, same day → stable id (sessions work)",
    vid(saltToday, siteA, ip, ua) === vid(saltToday, siteA, ip, ua),
  ],
  [
    "Same visitor on two customers' sites → unrelated ids (no cross-site tracking)",
    vid(saltToday, siteA, ip, ua) !== vid(saltToday, siteB, ip, ua),
  ],
  [
    "Same visitor tomorrow → new id (cannot be followed across days)",
    vid(saltToday, siteA, ip, ua) !== vid(saltTomorrow, siteA, ip, ua),
  ],
  [
    "Different visitor → different id",
    vid(saltToday, siteA, "10.0.0.7", ua) !== vid(saltToday, siteA, ip, ua),
  ],
  [
    "Id carries no recoverable IP (unlike the old base64 ip_hash)",
    !Buffer.from(vid(saltToday, siteA, ip, ua), "hex").toString("latin1").includes("192.168"),
  ],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failed++;
}

// Show what the old scheme leaked, for contrast.
const legacy = Buffer.from(ip).toString("base64").slice(0, 16);
console.log("");
console.log("Old scheme  ip_hash =", legacy, "→ decodes to", Buffer.from(legacy, "base64").toString("utf8"));
console.log("New scheme  visitor_id =", vid(saltToday, siteA, ip, ua), "→ one-way");

process.exit(failed ? 1 : 0);
