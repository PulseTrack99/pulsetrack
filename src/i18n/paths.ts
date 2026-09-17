import type { Locale } from "./dictionaries";

/**
 * Les adresses des pages publiques, par langue.
 *
 * L'anglais vit à la racine (/features/revenue), le français sous /fr
 * (/fr/features/revenue). Une page publique a donc une adresse par
 * langue, ce que Google exige pour indexer les deux : avant, le même
 * /features/revenue servait l'une ou l'autre selon le navigateur, et
 * le robot, qui n'envoie pas de préférence, ne voyait que l'anglais.
 *
 * Le middleware (src/middleware.ts) sert /fr/... avec la même page que
 * /... en fixant la langue ; aucune page n'est dupliquée.
 *
 * Le tableau de bord, la connexion et les tableaux publics partagés ne
 * sont pas concernés : leur langue reste celle de la personne (cookie,
 * puis navigateur).
 */

export const FR_PREFIX = "/fr";

/** Un chemin public, sans préfixe de langue, a-t-il une version par langue ? */
export function isLocalizedPath(path: string): boolean {
  const clean = path.split(/[?#]/)[0] || "/";
  return clean === "/" || /^\/(features|docs|compare|use-cases)(\/|$)/.test(clean);
}

/** « /features/revenue » → « /fr/features/revenue » en français. */
export function localePath(locale: Locale, href: string): string {
  if (locale !== "fr" || !href.startsWith("/")) return href;
  if (href.startsWith(`${FR_PREFIX}/`) || href === FR_PREFIX) return href;
  if (href === "/") return FR_PREFIX;
  if (href.startsWith("/#") || href.startsWith("/?")) return FR_PREFIX + href.slice(1);
  return isLocalizedPath(href) ? FR_PREFIX + href : href;
}

/** Retire le préfixe /fr d'un chemin : « /fr/docs/mcp » → « /docs/mcp ». */
export function stripLocale(path: string): { locale: Locale; path: string } {
  if (path === FR_PREFIX) return { locale: "fr", path: "/" };
  if (path.startsWith(`${FR_PREFIX}/`)) return { locale: "fr", path: path.slice(FR_PREFIX.length) };
  return { locale: "en", path };
}

/**
 * Canonique et versions linguistiques d'une page, pour les métadonnées :
 * chaque langue se déclare canonique pour elle-même et pointe vers
 * l'autre ; l'anglais sert de version par défaut.
 */
export function languageAlternates(locale: Locale, path: string) {
  return {
    canonical: localePath(locale, path),
    languages: {
      en: path,
      fr: localePath("fr", path),
      "x-default": path,
    },
  };
}
