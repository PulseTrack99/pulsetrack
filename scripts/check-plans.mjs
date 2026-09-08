import { readFileSync } from "node:fs";

/**
 * La grille tarifaire existe en quatre exemplaires. Ce script vérifie
 * qu'ils disent la même chose, et fait échouer le build sinon.
 *
 *   src/lib/stripe.ts        PLANS — la source de vérité, celle que
 *                            src/lib/plan.ts applique réellement.
 *   supabase/quotas.sql      plan_limits — ce que les triggers font
 *                            respecter en base.
 *   src/i18n/dictionaries.ts pricing.plans — ce que le site vend, en
 *                            français et en anglais.
 *
 * Le premier écart est le seul qui compte vraiment : si la base fait
 * respecter un plafond différent de celui vendu, un client paie pour
 * une limite qu'il n'a pas, ou en obtient une qu'il n'a pas payée.
 * Les deux autres sont des promesses commerciales : une page qui
 * annonce 200 000 événements quand le compteur en accorde 50 000
 * produit une réclamation légitime.
 *
 * Ce que ce script NE couvre pas : src/content/assistant-faq.ts porte
 * les mêmes nombres en toutes lettres, au fil de réponses rédigées
 * (« Growth, 29€/mois, 200 000 events/mois »). Les vérifier
 * mécaniquement demanderait de deviner quelle phrase parle de quelle
 * offre, et un contrôle qui devine finit par se tromper. Ils restent
 * donc à relire à la main quand un tarif bouge — l'assistant du site,
 * lui, lit désormais PLANS directement (src/app/api/ask), donc c'est
 * la banque de secours et elle seule qui peut vieillir.
 *
 * ── Pourquoi lire le texte plutôt qu'importer ────────────────────
 *
 * Importer stripe.ts exigerait d'instancier le SDK Stripe, donc une
 * clé secrète, dans un script qui ne fait que compter. Les fichiers
 * sont les nôtres et leur forme est stable ; ce qu'il faut éviter,
 * c'est qu'un analyseur devenu aveugle laisse tout passer en silence.
 *
 * Donc il échoue fermé : ne pas trouver les quatre offres, ou une
 * dimension attendue, est une erreur au même titre qu'un écart. Un
 * garde-fou qui ne comprend plus ce qu'il lit doit le dire.
 *
 * Lancé par `npm run check:plans`, et par `prebuild` — donc un déploiement
 * Vercel échoue plutôt que de publier deux grilles qui se contredisent.
 */

const PLAN_KEYS = ["free", "starter", "growth", "business"];
const LIMIT_KEYS = ["sites", "events_per_month", "funnels", "retention_days"];

const problems = [];
const fail = (msg) => problems.push(msg);

const read = (p) => {
  try {
    return readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  } catch {
    fail(`${p} est introuvable.`);
    return "";
  }
};

/* ── 1. La source de vérité ───────────────────────────────────── */

function parsePlans(src) {
  const out = {};
  for (const key of PLAN_KEYS) {
    // Le bloc d'une offre, de son nom jusqu'à `capabilities`.
    const block = src.match(
      new RegExp(`\\n  ${key}: \\{([\\s\\S]*?)\\n    capabilities:`)
    );
    if (!block) {
      fail(`stripe.ts : offre « ${key} » introuvable.`);
      continue;
    }
    const body = block[1];

    const price = body.match(/\n    price: (\d+),/);
    if (!price) {
      fail(`stripe.ts : prix de « ${key} » introuvable.`);
      continue;
    }

    const limits = {};
    for (const lk of LIMIT_KEYS) {
      const m = body.match(new RegExp(`\\n      ${lk}: (-?\\d+),`));
      if (!m) {
        fail(`stripe.ts : limite « ${lk} » introuvable pour « ${key} ».`);
        continue;
      }
      limits[lk] = Number(m[1]);
    }
    out[key] = { price: Number(price[1]), limits };
  }
  return out;
}

const plans = parsePlans(read("src/lib/stripe.ts"));

/* ── 2. Ce que la base fait respecter ─────────────────────────── */

function parseQuotas(src) {
  const out = {};
  for (const key of PLAN_KEYS) {
    // ('free', 1, 5000, 1, 30)
    const m = src.match(
      new RegExp(`\\('${key}',\\s*(-?\\d+),\\s*(-?\\d+),\\s*(-?\\d+),\\s*(-?\\d+)\\)`)
    );
    if (!m) {
      fail(`quotas.sql : ligne plan_limits de « ${key} » introuvable.`);
      continue;
    }
    out[key] = {
      sites: Number(m[1]),
      events_per_month: Number(m[2]),
      funnels: Number(m[3]),
      retention_days: Number(m[4]),
    };
  }
  return out;
}

const quotas = parseQuotas(read("supabase/quotas.sql"));

for (const key of PLAN_KEYS) {
  const a = plans[key]?.limits;
  const b = quotas[key];
  if (!a || !b) continue;
  for (const lk of LIMIT_KEYS) {
    if (a[lk] !== b[lk]) {
      fail(
        `« ${key} » · ${lk} : stripe.ts dit ${a[lk]}, quotas.sql fait respecter ${b[lk]}.`
      );
    }
  }
}

/* ── 3. Ce que le site vend ───────────────────────────────────── */

/** 5000 → « 5K », 1000000 → « 1M ». La forme employée par la grille. */
const compact = (n) =>
  n >= 1_000_000 ? `${n / 1_000_000}M` : `${n / 1000}K`;

function parsePricingTables(src) {
  // Une entrée par locale, dans l'ordre où elles apparaissent (en, fr).
  const tables = [];
  const re = /pricing: \{[\s\S]*?\n    plans: \[([\s\S]*?)\n    \],/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const entries = [...m[1].matchAll(
      /\{\s*\n\s*name: "([^"]+)",\s*\n\s*price: "(\d+)",[\s\S]*?features: \[([\s\S]*?)\],/g
    )].map((e) => ({
      name: e[1],
      price: Number(e[2]),
      features: [...e[3].matchAll(/"([^"]*)"/g)].map((f) => f[1]),
    }));
    tables.push(entries);
  }
  return tables;
}

const tables = parsePricingTables(read("src/i18n/dictionaries.ts"));

if (tables.length !== 2) {
  fail(
    `dictionaries.ts : ${tables.length} grille(s) tarifaire(s) trouvée(s), 2 attendues (en, fr).`
  );
}

tables.forEach((table, i) => {
  const which = `dictionaries.ts grille ${i + 1}`;
  if (table.length !== PLAN_KEYS.length) {
    fail(`${which} : ${table.length} offres trouvées, ${PLAN_KEYS.length} attendues.`);
    return;
  }

  table.forEach((tier, idx) => {
    const key = PLAN_KEYS[idx];
    const p = plans[key];
    if (!p) return;
    const all = tier.features.join(" | ");
    const has = (re) => re.test(all);

    if (tier.price !== p.price) {
      fail(`${which} · « ${tier.name} » : prix ${tier.price} €, stripe.ts dit ${p.price} €.`);
    }

    if (!has(new RegExp(`\\b${p.limits.sites}\\b`))) {
      fail(`${which} · « ${tier.name} » : ${p.limits.sites} site(s) attendu(s), absent de « ${all} ».`);
    }

    const ev = compact(p.limits.events_per_month);
    if (!has(new RegExp(`\\b${ev}\\b`))) {
      fail(`${which} · « ${tier.name} » : « ${ev} » événements attendus, absent de « ${all} ».`);
    }

    if (p.limits.funnels < 0) {
      if (!has(/unlimited|illimit/i)) {
        fail(`${which} · « ${tier.name} » : funnels illimités attendus, absents de « ${all} ».`);
      }
    } else if (!has(new RegExp(`\\b${p.limits.funnels}\\b[^|]*funnel`, "i"))) {
      fail(`${which} · « ${tier.name} » : ${p.limits.funnels} funnel(s) attendu(s), absent de « ${all} ».`);
    }

    // 30 et 90 s'écrivent en jours, 180 et 365 en mois : la grille
    // change d'unité au-delà du trimestre.
    const d = p.limits.retention_days;
    const months = { 180: 6, 365: 12 }[d];
    const expected = months ? String(months) : String(d);
    if (!has(new RegExp(`\\b${expected}\\b[^|]*(retention|rétention)|(retention|rétention)[^|]*\\b${expected}\\b`, "i"))) {
      fail(
        `${which} · « ${tier.name} » : rétention de ${d} jours attendue (« ${expected} »), absente de « ${all} ».`
      );
    }
  });
});

/* ── Verdict ──────────────────────────────────────────────────── */

if (problems.length > 0) {
  console.error("\n  La grille tarifaire ne concorde pas :\n");
  for (const p of problems) console.error(`   · ${p}`);
  console.error(
    "\n  src/lib/stripe.ts fait foi. Alignez supabase/quotas.sql (et relancez-le" +
      "\n  dans l'éditeur SQL) puis src/i18n/dictionaries.ts.\n"
  );
  process.exit(1);
}

console.log(
  `  Grille tarifaire cohérente — ${PLAN_KEYS.length} offres × ` +
    `${LIMIT_KEYS.length} limites, en base et sur les deux grilles du site.`
);
