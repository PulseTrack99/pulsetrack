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
const docEntries = [...docs.matchAll(/\{\s*name:\s*"([a-z_]+)"([^\n]*)/g)].map((m) => ({ name: m[1], write: /write:\s*true/.test(m[2]) }));
const documented = docEntries.map((e) => e.name);

for (const name of registered) {
  if (!documented.includes(name)) problems.push(`L'outil ${name} existe dans le serveur mais pas dans la documentation.`);
}
for (const name of documented) {
  if (!registered.includes(name)) problems.push(`La documentation décrit ${name}, qui n'existe pas dans le serveur.`);
}

let writes = 0;
for (const [i, block] of blocks.entries()) {
  const name = registered[i] ?? `#${i + 1}`;
  const config = block.slice(0, block.indexOf("async ("));
  if (!/annotations:/.test(config) || !/readOnlyHint|destructiveHint|READ_ONLY|WRITE/.test(config)) {
    problems.push(`L'outil ${name} n'a pas d'annotations readOnlyHint / destructiveHint.`);
    continue;
  }
  // Un outil qui modifie doit se présenter comme tel, au serveur comme
  // dans la documentation : c'est ce qui déclenche la confirmation.
  const isWrite = /\.\.\.WRITE\b|destructiveHint:\s*true/.test(config);
  if (isWrite) writes++;
  const doc = docEntries.find((e) => e.name === name);
  if (doc && doc.write !== isWrite) {
    problems.push(`L'outil ${name} est ${isWrite ? "une modification" : "en lecture"} dans le serveur mais ${doc.write ? "une modification" : "en lecture"} dans la documentation.`);
  }
}

if (problems.length) {
  console.error("✗ Documentation MCP incohérente :");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(`✓ Documentation MCP cohérente — ${registered.length} outils (${registered.length - writes} lecture, ${writes} modification), tous documentés et annotés.`);
