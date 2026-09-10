import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

/**
 * Le poids du script annoncé sur le site doit être celui du script.
 *
 * Il a dérivé deux fois. Le tracker pèse ce qu'il pèse, et chaque
 * fonctionnalité ajoutée le fait grossir un peu — identify(), group(),
 * puis les feature flags — pendant que la page d'accueil continuait
 * d'annoncer le chiffre de la version d'avant. Personne ne pense à
 * relire une phrase marketing en ajoutant une méthode au tracker.
 *
 * Le chiffre est répété à onze endroits, dans deux langues, et il en
 * dépend un second : « 40× plus léger que Google Analytics » n'est vrai
 * que tant que 144 ÷ 3,6 fait 40. Corriger l'un sans l'autre remplace
 * une imprécision par une contradiction.
 *
 * Donc on mesure, et le build échoue plutôt que de publier un chiffre
 * faux. Lancé après build-tracker, qui vient de produire le fichier.
 *
 * ── Ce qui est toléré ────────────────────────────────────────────
 *
 * L'arrondi au dixième de kilo-octet, et lui seul. Annoncer 3,6 pour
 * 3,64 est un arrondi ; annoncer 3,4 pour 3,64 est une autre affaire.
 */

const FILES = [
  "src/i18n/dictionaries.ts",
  "src/content/features.ts",
  "src/components/marketing/feature-blocks.tsx",
];

const problems = [];
const fail = (m) => problems.push(m);

const read = (p) => {
  try {
    return readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  } catch {
    fail(`${p} est introuvable.`);
    return "";
  }
};

/* ── Ce que le script pèse vraiment ───────────────────────────── */

let measuredKb = null;
try {
  const bytes = gzipSync(readFileSync(new URL("../public/t.js", import.meta.url))).length;
  measuredKb = bytes / 1024;
} catch {
  fail("public/t.js est introuvable — lancez build:tracker d'abord.");
}

/* ── Ce que le site annonce ───────────────────────────────────── */

// Un chiffre à une décimale : « 3,6 Ko » et « 3.6 KB ». La référence
// GA4 (« 144 Ko ») n'en a pas, donc elle ne peut pas être confondue.
const SIZE = /\b(\d),(\d) Ko\b|\b(\d)\.(\d) KB\b/g;
const GA4 = /\b(\d{2,4})\s?(?:KB|Ko)\b/g;
/* Ancré sur l'affirmation elle-même, et pas sur « N× » tout court : la
   copie contient d'autres multiples sans rapport — « 4× votre moyenne »
   dans la démonstration de l'assistant, par exemple. */
const TIMES = /\b(\d{1,3})×\s*(?:lighter|plus léger)/g;

const claimedSizes = new Set();
const ga4Sizes = new Set();
const multiples = new Set();

for (const f of FILES) {
  const src = read(f);
  for (const m of src.matchAll(SIZE)) {
    claimedSizes.add(Number(`${m[1] ?? m[3]}.${m[2] ?? m[4]}`));
  }
  for (const m of src.matchAll(GA4)) ga4Sizes.add(Number(m[1]));
  for (const m of src.matchAll(TIMES)) multiples.add(Number(m[1]));
}

/* ── Verdicts ─────────────────────────────────────────────────── */

// Échouer fermé : ne rien trouver veut dire que l'analyseur ne
// comprend plus la copie, pas que tout va bien.
if (claimedSizes.size === 0) {
  fail("aucun poids de script trouvé dans la copie — l'analyseur ne la comprend plus.");
} else if (claimedSizes.size > 1) {
  fail(
    `la copie annonce plusieurs poids : ${[...claimedSizes].join(", ")} Ko. ` +
      `Un seul chiffre doit circuler.`
  );
}

const claimed = [...claimedSizes][0];

if (claimed !== undefined && measuredKb !== null) {
  const rounded = Math.round(measuredKb * 10) / 10;
  if (claimed !== rounded) {
    fail(
      `le script pèse ${measuredKb.toFixed(3)} Ko gzippé, soit ${rounded} Ko arrondi, ` +
        `mais la copie annonce ${claimed} Ko.`
    );
  }
}

if (ga4Sizes.size !== 1) {
  fail(
    `la référence Google Analytics devrait apparaître avec une seule valeur, ` +
      `trouvé : ${[...ga4Sizes].join(", ") || "aucune"}.`
  );
}

if (multiples.size === 0) {
  fail("aucun multiple « N× » trouvé — l'analyseur ne comprend plus la copie.");
} else if (multiples.size > 1) {
  fail(`la copie annonce plusieurs multiples : ${[...multiples].join(", ")}×.`);
} else if (claimed !== undefined && ga4Sizes.size === 1) {
  const ga4 = [...ga4Sizes][0];
  const expected = Math.round(ga4 / claimed);
  const stated = [...multiples][0];
  if (stated !== expected) {
    fail(
      `la copie annonce « ${stated}× plus léger », mais ${ga4} ÷ ${claimed} fait ${expected}.`
    );
  }
}

if (problems.length > 0) {
  console.error("\n  Le poids annoncé ne correspond plus au script :\n");
  for (const p of problems) console.error(`   · ${p}`);
  console.error(
    "\n  Le script fait foi. Alignez la copie dans src/i18n/dictionaries.ts," +
      "\n  src/content/features.ts et src/components/marketing/feature-blocks.tsx.\n"
  );
  process.exit(1);
}

console.log(
  `  Poids annoncé cohérent — ${measuredKb.toFixed(2)} Ko gzippé, ` +
    `annoncé ${claimed} Ko, ${[...multiples][0]}× plus léger que ${[...ga4Sizes][0]} Ko.`
);
