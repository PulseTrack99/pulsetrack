/**
 * Regenerates src/components/brand/integration-logos.ts from the official
 * brand artwork shipped in the `simple-icons` package.
 *
 * Run with:  node scripts/gen-logos.mjs
 *
 * `simple-icons` is a devDependency — the generated file inlines the path
 * data, so nothing ships to the browser except the paths actually used.
 */

import { writeFileSync, mkdirSync, statSync } from "node:fs";
import * as si from "simple-icons";

/** simple-icons slug → the name we want rendered in the strip. */
const WANT = [
  ["nextdotjs", "Next.js"],
  ["wordpress", "WordPress"],
  ["shopify", "Shopify"],
  ["webflow", "Webflow"],
  ["framer", "Framer"],
  ["react", "React"],
  ["stripe", "Stripe"],
  ["astro", "Astro"],
  ["ghost", "Ghost"],
  ["squarespace", "Squarespace"],
  ["vercel", "Vercel"],
];

const entries = WANT.map(([slug, name]) => {
  const key = "si" + slug.charAt(0).toUpperCase() + slug.slice(1);
  const icon = si[key];
  if (!icon) throw new Error(`simple-icons has no entry for "${slug}"`);
  return [
    "  {",
    `    name: ${JSON.stringify(name)},`,
    `    hex: ${JSON.stringify("#" + icon.hex)},`,
    `    path:`,
    `      ${JSON.stringify(icon.path)},`,
    "  },",
  ].join("\n");
}).join("\n");

const header = [
  "/**",
  " * Official brand marks for the platforms PulseTrack installs on.",
  " *",
  " * GENERATED FILE — do not edit by hand.",
  " * Regenerate with: node scripts/gen-logos.mjs",
  " *",
  " * Path data comes from the simple-icons package (a devDependency), so the",
  " * artwork is the vendors' own rather than an approximation, and the runtime",
  " * carries no dependency for it.",
  " *",
  " * Marks are shown to indicate compatibility. They remain the trademarks of",
  " * their respective owners and imply no partnership or endorsement.",
  " */",
  "",
  "export interface Integration {",
  "  name: string;",
  "  /** Official brand colour. */",
  "  hex: string;",
  "  /** Single-path glyph on a 24x24 viewBox. */",
  "  path: string;",
  "}",
  "",
  "export const INTEGRATIONS: Integration[] = [",
].join("\n");

const out = `${header}\n${entries}\n];\n`;

mkdirSync("src/components/brand", { recursive: true });
writeFileSync("src/components/brand/integration-logos.ts", out);

const bytes = statSync("src/components/brand/integration-logos.ts").size;
console.log(
  `wrote src/components/brand/integration-logos.ts — ${WANT.length} marks, ${bytes} bytes`
);
