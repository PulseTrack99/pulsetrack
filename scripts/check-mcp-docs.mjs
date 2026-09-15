import { readFileSync } from "node:fs";

/**
 * La documentation MCP doit décrire le serveur tel qu'il est.
 *
 * Deux vérifications, qui font échouer le build :
 *
 * 1. Chaque outil enregistré dans src/app/api/mcp/route.ts figure dans
 *    src/content/mcp-docs.ts, et inversement. Un outil ajouté sans être
 *    documenté est invisible ; un outil documenté mais retiré est une
 *    fausse promesse.
 *
 * 2. Chaque outil porte ses annotations (readOnlyHint ou
 *    destructiveHint). Les annuaires de Claude et de ChatGPT rejettent un
 *    serveur dont un seul outil en manque, et les assistants s'en servent
 *    pour décider quand demander une confirmation.
 */

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

const route = read("src/app/api/mcp/route.ts");
const docs = read("src/content/mcp-docs.ts");

const problems = [];

const blocks = route.split("server.registerTool(").slice(1);
const registered = blocks.map((b) => b.match(/^\s*"([a-z_]+)"/)?.[1]).filter(Boolean);
const documented = [...docs.matchAll(/\{\s*name:\s*"([a-z_]+)"/g)].map((m) => m[1]);

for (const name of registered) {
  if (!documented.includes(name)) problems.push(`L'outil ${name} existe dans le serveur mais pas dans la documentation.`);
}
for (const name of documented) {
  if (!registered.includes(name)) problems.push(`La documentation décrit ${name}, qui n'existe pas dans le serveur.`);
}

for (const [i, block] of blocks.entries()) {
  const config = block.slice(0, block.indexOf("async ("));
  if (!/annotations:/.test(config) || !/readOnlyHint|destructiveHint|READ_ONLY|WRITE/.test(config)) {
    problems.push(`L'outil ${registered[i] ?? `#${i + 1}`} n'a pas d'annotations readOnlyHint / destructiveHint.`);
  }
}

if (problems.length) {
  console.error("✗ Documentation MCP incohérente :");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(`✓ Documentation MCP cohérente — ${registered.length} outils, tous documentés et annotés.`);
