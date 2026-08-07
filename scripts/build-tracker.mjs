/**
 * Builds the two scripts that run on customer pages.
 *
 *   tracker/t.src.js     -> public/t.js      core tracker, on every page
 *   tracker/snap.src.js  -> public/snap.js   rrweb DOM capture, on demand
 *
 * They are deliberately separate bundles. The core sits on every page, so
 * its transfer size is a product claim rather than a build detail; the
 * snapshot module is roughly ten times its weight and is fetched only when
 * the server has no recent capture of the page being viewed.
 *
 * Runs automatically via the `prebuild` npm hook.
 */

import { build } from "esbuild";
import { readFileSync, statSync } from "node:fs";
import { gzipSync, brotliCompressSync } from "node:zlib";

const TARGETS = [
  {
    name: "tracker",
    src: "tracker/t.src.js",
    out: "public/t.js",
    banner: "/* PulseTrack tracker — cookie-free. Source: tracker/t.src.js */",
  },
  {
    name: "snapshot",
    src: "tracker/snap.src.js",
    out: "public/snap.js",
    banner: "/* PulseTrack DOM capture (rrweb, MIT). Loaded on demand. */",
  },
];

const kb = (n) => (n / 1024).toFixed(1) + " KB";

for (const t of TARGETS) {
  await build({
    entryPoints: [t.src],
    outfile: t.out,
    bundle: true,
    minify: true,
    target: ["es2017"],
    format: "iife",
    legalComments: "none",
    banner: { js: t.banner },
  });

  const src = statSync(t.src).size;
  const out = readFileSync(t.out);

  console.log(
    `${t.name.padEnd(9)} ${kb(src).padStart(9)} source -> ${kb(out.length).padStart(9)} minified` +
      `, ${kb(gzipSync(out).length)} gzip, ${kb(brotliCompressSync(out).length)} brotli`
  );
}
