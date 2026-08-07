/**
 * Minifies the tracking script.
 *
 *   tracker/t.src.js   the readable source — edit this one
 *   public/t.js        what visitors download — generated, do not edit
 *
 * The script sits on every customer page, so its transfer size is a
 * product claim, not just a build detail. Runs automatically via the
 * `prebuild` npm hook.
 */

import { build } from "esbuild";
import { readFileSync, statSync } from "node:fs";
import { gzipSync, brotliCompressSync } from "node:zlib";

const SRC = "tracker/t.src.js";
const OUT = "public/t.js";

await build({
  entryPoints: [SRC],
  outfile: OUT,
  minify: true,
  target: ["es2017"],
  format: "iife",
  legalComments: "none",
  banner: {
    js: "/* PulseTrack tracker — cookie-free. Source: tracker/t.src.js */",
  },
});

const src = statSync(SRC).size;
const out = readFileSync(OUT);
const gz = gzipSync(out).length;
const br = brotliCompressSync(out).length;

const kb = (n) => (n / 1024).toFixed(1) + " KB";

console.log(`tracker built  ${kb(src)} source -> ${kb(out.length)} minified`);
console.log(`               ${kb(gz)} gzip, ${kb(br)} brotli`);
