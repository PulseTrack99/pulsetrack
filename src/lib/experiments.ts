import { bucketOf } from "@/lib/flags";

/**
 * Affecter une version, puis dire si l'écart observé veut dire
 * quelque chose.
 *
 * La seconde moitié est la plus importante. Afficher « B gagne » sur
 * trente visiteurs est pire que ne rien afficher : la personne prend
 * une décision de produit sur du bruit, et l'outil lui a donné raison.
 */

export interface Variant {
  key: string;
  weight: number;
}

/**
 * La version d'une personne, par le même hachage que les flags.
 *
 * Les poids sont cumulés puis ramenés à cent : deux versions à 50/50
 * coupent à 50, trois à 34/33/33 coupent à 34 puis 67. Des poids qui ne
 * font pas cent sont donc traités comme des proportions plutôt que
 * rejetés — 1/1 vaut moitié-moitié.
 */
export function variantOf(
  experimentKey: string,
  variants: Variant[],
  id: string
): string | null {
  const usable = variants.filter((v) => v.key && v.weight > 0);
  if (usable.length === 0) return null;

  const total = usable.reduce((s, v) => s + v.weight, 0);
  const bucket = bucketOf(experimentKey, id);

  let seen = 0;
  for (const v of usable) {
    seen += (v.weight / total) * 100;
    if (bucket < seen) return v.key;
  }
  // Le dernier seau, que l'arrondi peut laisser dépasser.
  return usable[usable.length - 1].key;
}

/* ── Le verdict ─────────────────────────────────────────────────── */

/** Loi normale centrée réduite, par l'approximation d'Abramowitz et
 *  Stegun. Précision de l'ordre de 1e-7, largement au-delà de ce qu'une
 *  décision de produit demande. */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const p =
    d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z > 0 ? 1 - p : p;
}

export interface Arm {
  variant: string;
  subjects: number;
  conversions: number;
}

export interface Comparison {
  variant: string;
  subjects: number;
  conversions: number;
  rate: number;
  /** Écart relatif à la référence, en points de pourcentage de taux. */
  lift: number | null;
  pValue: number | null;
  significant: boolean;
  /** Sujets par version qu'il faudrait, à l'écart observé, pour trancher.
   *  Nul quand l'écart est déjà significatif ou encore indiscernable. */
  needed: number | null;
}

const Z_ALPHA = 1.959964; // bilatéral, 95 %
const Z_BETA = 0.8416212; // puissance 80 %

/**
 * Chaque version comparée à la première, qui sert de référence.
 *
 * Test z sur deux proportions. Il suppose des tirages indépendants et
 * une taille suffisante ; sous une trentaine de conversions par bras il
 * devient optimiste, d'où le garde-fou explicite plus bas plutôt qu'un
 * verdict rendu quand même.
 */
export function compare(arms: Arm[]): Comparison[] {
  if (arms.length === 0) return [];

  const rate = (a: Arm) => (a.subjects > 0 ? a.conversions / a.subjects : 0);
  const control = arms[0];
  const p1 = rate(control);

  return arms.map((a, i) => {
    const p2 = rate(a);
    const base: Comparison = {
      variant: a.variant,
      subjects: a.subjects,
      conversions: a.conversions,
      rate: Math.round(p2 * 1000) / 10,
      lift: null,
      pValue: null,
      significant: false,
      needed: null,
    };

    if (i === 0) return base;

    base.lift = Math.round((p2 - p1) * 1000) / 10;

    /* Sous cinq conversions d'un côté ou de l'autre, aucun test
       n'apprend rien : l'approximation normale ne tient plus et le
       résultat serait une opinion déguisée en statistique. */
    if (control.subjects < 1 || a.subjects < 1) return base;
    if (control.conversions + a.conversions < 5) return base;

    const pooled =
      (control.conversions + a.conversions) / (control.subjects + a.subjects);
    const se = Math.sqrt(
      pooled * (1 - pooled) * (1 / control.subjects + 1 / a.subjects)
    );
    if (se === 0) return base;

    const z = (p2 - p1) / se;
    base.pValue = Math.round(2 * (1 - normalCdf(Math.abs(z))) * 10000) / 10000;
    base.significant = base.pValue < 0.05;

    /* Combien il en faudrait encore. C'est une estimation à l'écart
       *observé aujourd'hui*, qui bouge tant que les données arrivent —
       l'écran le dit plutôt que de la présenter comme un objectif. */
    if (!base.significant && Math.abs(p2 - p1) > 1e-9) {
      const n =
        ((Z_ALPHA + Z_BETA) ** 2 * (p1 * (1 - p1) + p2 * (1 - p2))) /
        (p2 - p1) ** 2;
      if (Number.isFinite(n) && n > 0) base.needed = Math.ceil(n);
    }

    return base;
  });
}
