import { existsSync, readdirSync, readFileSync } from "node:fs";

/**
 * Aucun lien du site public ne doit mener nulle part.
 *
 * Le pied de page a longtemps affiché « Confidentialité », « CGU » et
 * « Contact » vers « /# » : trois liens qui ramenaient en haut de page,
 * sur la page même qui demandait de faire confiance au produit. Et le
 * menu va s'étoffer page après page (fonctionnalités, comparatifs, cas
 * d'usage) : une entrée ajoutée avant sa page serait un lien mort.
 *
 * Vérifié ici, pour chaque lien du plan du site et des contenus :
 *  - /features/x, /compare/x, /use-cases/x : x figure dans la liste des
 *    pages de ce type ;
 *  - /#ancre : l'ancre existe sur la page d'accueil ;
 *  - tout autre chemin : une page existe à cet endroit dans src/app ;
 *  - « /# » et « # » seuls : refusés.
 *
 * Échoue fermé : ne trouver aucun lien veut dire que l'analyse ne
 * comprend plus les fichiers, pas que tout va bien.
 */

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");

const problems = [];

function slugs(file, constName) {
  const m = read(file).match(new RegExp(`export const ${constName} = \\[([\\s\\S]*?)\\]`));
  if (!m) {
    problems.push(`${file} : liste ${constName} introuvable.`);
    return [];
  }
  return [...m[1].matchAll(/"([a-z0-9-]+)"/g)].map((x) => x[1]);
}

const DYNAMIC = {
  features: slugs("src/content/features.ts", "FEATURE_SLUGS"),
  compare: slugs("src/content/compare.ts", "COMPARE_SLUGS"),
  "use-cases": slugs("src/content/use-cases.ts", "USE_CASE_SLUGS"),
};

// Les ancres de la page d'accueil : ses propres id et ceux des sections
// qu'elle affiche.
const anchorSources = [
  "src/app/page.tsx",
  ...readdirSync(new URL("src/components/marketing/", root)).map((f) => `src/components/marketing/${f}`),
];
const anchors = new Set(anchorSources.flatMap((f) => [...read(f).matchAll(/\bid="([a-z0-9-]+)"/g)].map((m) => m[1])));

const SOURCES = ["src/content/site-map.ts", "src/content/compare.ts", "src/content/use-cases.ts", "src/i18n/dictionaries.ts"];

let checked = 0;
for (const file of SOURCES) {
  for (const m of read(file).matchAll(/\bhref:\s*"([^"]*)"/g)) {
    const href = m[1];
    checked++;
    if (/^(https?:|mailto:)/.test(href)) continue;
    if (href === "/#" || href === "#" || href === "") {
      problems.push(`${file} : lien sans destination « ${href} ».`);
      continue;
    }
    const [path, anchor] = href.split("#");
    if (anchor !== undefined && (path === "/" || path === "")) {
      if (!anchors.has(anchor)) problems.push(`${file} : l'ancre #${anchor} n'existe pas sur la page d'accueil.`);
      continue;
    }
    const dyn = path.match(/^\/(features|compare|use-cases)\/([a-z0-9-]+)$/);
    if (dyn) {
      if (!DYNAMIC[dyn[1]].includes(dyn[2])) problems.push(`${file} : ${href} ne correspond à aucune page ${dyn[1]}.`);
      continue;
    }
    if (path === "/") continue;
    if (!existsSync(new URL(`src/app${path}/page.tsx`, root))) {
      problems.push(`${file} : aucune page pour ${href}.`);
    }
  }
}

if (checked === 0) problems.push("aucun lien trouvé — l'analyse ne comprend plus les fichiers.");

if (problems.length) {
  console.error("\n  Liens du site public invalides :\n");
  for (const p of problems) console.error(`   · ${p}`);
  console.error("");
  process.exit(1);
}

console.log(`  Liens du site cohérents — ${checked} liens vérifiés, aucun sans destination.`);
