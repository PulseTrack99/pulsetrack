import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * N'accepter un envoi du tracker que depuis le domaine du site.
 *
 * L'identifiant d'un site est public par nature : il est écrit dans le
 * script posé sur ses pages. Sans cette vérification, n'importe quelle
 * page pouvait envoyer des événements en son nom — fausser ses chiffres,
 * consommer son quota mensuel, remplir ses heatmaps de clics inventés.
 *
 * Ce que ça protège, et ce que ça ne protège pas. Un navigateur ne
 * laisse pas une page mentir sur son en-tête Origin : un autre site ne
 * peut donc plus écrire chez vous. Un script lancé hors navigateur peut,
 * lui, fabriquer n'importe quel en-tête — aucune analytics côté client
 * n'y échappe, et la limite de débit par IP reste la défense contre ça.
 *
 * Le domaine déclaré couvre ses sous-domaines et sa variante www : un
 * site « exemple.fr » accepte www.exemple.fr et boutique.exemple.fr.
 * En développement uniquement, localhost est accepté.
 *
 * Un refus n'est jamais silencieux : il est compté par origine
 * (supabase/ingest-origin-and-visitors.sql) et affiché sur l'écran des
 * sites, pour qu'un domaine mal saisi se voie au lieu de perdre des
 * données sans bruit.
 */

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** « https://www.Exemple.fr:443/page » → « exemple.fr ». */
export function normalizeHost(value: string | null | undefined): string | null {
  if (!value) return null;
  let raw = value.trim().toLowerCase();
  if (!raw || raw === "null") return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//.test(raw)) raw = `https://${raw}`;
  try {
    const host = new URL(raw).hostname.replace(/\.$/, "");
    return host.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/** L'hôte qui envoie : Origin, que tout POST inter-origine porte, sinon Referer. */
export function requestHost(headers: Headers): string | null {
  return normalizeHost(headers.get("origin")) ?? normalizeHost(headers.get("referer"));
}

export type OriginCheck = { ok: true } | { ok: false; origin: string };

export function checkOrigin(siteDomain: string | null | undefined, headers: Headers): OriginCheck {
  const host = requestHost(headers);
  if (!host) return { ok: false, origin: "(aucune origine)" };

  if (process.env.NODE_ENV !== "production" && LOCAL_HOSTS.has(host)) return { ok: true };

  const domain = normalizeHost(siteDomain);
  if (domain && (host === domain || host.endsWith(`.${domain}`))) return { ok: true };

  return { ok: false, origin: host };
}

/** Compte le refus ; ne fait jamais échouer la réponse. */
export async function recordRejection(supabase: SupabaseClient, siteId: string, origin: string): Promise<void> {
  try {
    await supabase.rpc("record_ingest_rejection", { p_site: siteId, p_origin: origin });
  } catch {
    // Compter est secondaire : le refus lui-même a déjà eu lieu.
  }
}
