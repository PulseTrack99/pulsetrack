import { createHmac } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Envoyer les événements d'un site vers une URL du client.
 *
 * Trois choses rendent ce fichier plus prudent qu'un simple fetch.
 *
 * La signature. Chaque envoi porte un HMAC que le client vérifie avec
 * sa clé, pour savoir que c'est bien nous. Cette clé n'est stockée
 * nulle part : elle se dérive du secret serveur et de l'identifiant de
 * la destination, donc elle se recalcule à la demande.
 *
 * L'URL. Elle vient du client, et notre serveur va la contacter. Sans
 * garde-fou, « http://169.254.169.254/ » ou « https://localhost:5432 »
 * feraient de nous un relais vers un réseau qui n'est pas le sien — le
 * classique SSRF. On exige HTTPS, on résout le nom, et on refuse toute
 * adresse privée, de bouclage ou de lien local.
 *
 * Les redirections. Elles ne sont pas suivies : une URL publique qui
 * répond 302 vers une adresse interne contournerait la vérification
 * faite juste avant. Une redirection est traitée comme un échec.
 *
 * Reste une limite connue : entre la résolution DNS et la connexion,
 * un nom peut changer d'adresse (rebinding). La fenêtre est courte et
 * la cible doit déjà contrôler un domaine public ; c'est noté, pas
 * ignoré.
 */

export const EXPORT_BATCH = 1000;
/** Plafond par passage : un site très actif ne doit pas faire expirer
 *  la fonction. Ce qui reste part au passage suivant, depuis le curseur. */
export const EXPORT_MAX_BATCHES = 10;

const EVENT_COLUMNS =
  "id, type, path, referrer, title, source, utm_medium, utm_campaign, country, device, browser, screen_width, language, session_id, visitor_id, duration, event_name, event_props, created_at";

/* ── Signature ──────────────────────────────────────────────────── */

/** La clé de signature d'une destination, dérivée plutôt que stockée. */
export function signingSecret(destinationId: string): string {
  const root = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHmac("sha256", root).update(`export:${destinationId}`).digest("hex");
}

/** Ce que le client recalcule de son côté : HMAC(clé, "horodatage.corps").
 *  L'horodatage entre dans la signature pour qu'un envoi capturé ne
 *  puisse pas être rejoué tel quel des jours plus tard. */
export function sign(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

/* ── Garde-fou SSRF ─────────────────────────────────────────────── */

function privateV4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function privateV6(ip: string): boolean {
  const x = ip.toLowerCase();
  if (x === "::1" || x === "::") return true;
  if (x.startsWith("fc") || x.startsWith("fd")) return true;
  if (/^fe[89ab]/.test(x)) return true;
  const mapped = x.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return privateV4(mapped[1]);
  return false;
}

export type UrlCheck = { ok: true } | { ok: false; reason: "invalid_url" | "https_only" | "blocked_host" };

export async function checkDestination(raw: string): Promise<UrlCheck> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
  if (url.protocol !== "https:") return { ok: false, reason: "https_only" };
  if (url.username || url.password) return { ok: false, reason: "invalid_url" };

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return { ok: false, reason: "blocked_host" };
  }

  let addresses: string[];
  if (isIP(host)) {
    addresses = [host];
  } else {
    try {
      addresses = (await lookup(host, { all: true })).map((a) => a.address);
    } catch {
      return { ok: false, reason: "invalid_url" };
    }
  }

  // Toutes les adresses, pas la première : un nom qui en publie une
  // publique et une privée ne doit pas passer par la bonne.
  for (const ip of addresses) {
    if (isIP(ip) === 4 ? privateV4(ip) : privateV6(ip)) {
      return { ok: false, reason: "blocked_host" };
    }
  }
  return { ok: true };
}

/* ── Livraison ──────────────────────────────────────────────────── */

export interface Delivery {
  status: number | null;
  error: string | null;
}

export async function deliver(
  destination: { id: string; url: string },
  payload: Record<string, unknown>,
  eventCount: number
): Promise<Delivery> {
  // Revérifiée à chaque envoi : le nom a pu changer d'adresse depuis
  // l'enregistrement de la destination.
  const check = await checkDestination(destination.url);
  if (!check.ok) return { status: null, error: check.reason };

  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = sign(signingSecret(destination.id), timestamp, body);

  try {
    const res = await fetch(destination.url, {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "PulseTrack-Export/1",
        "X-PulseTrack-Timestamp": timestamp,
        "X-PulseTrack-Signature": `sha256=${signature}`,
        "X-PulseTrack-Event-Count": String(eventCount),
      },
      body,
    });
    if (res.status >= 300 && res.status < 400) {
      return { status: res.status, error: "redirect_refused" };
    }
    return { status: res.status, error: res.ok ? null : `http_${res.status}` };
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    return { status: null, error: name === "TimeoutError" ? "timeout" : "unreachable" };
  }
}

/* ── Un passage d'export ────────────────────────────────────────── */

export interface ExportDestination {
  id: string;
  site_id: string;
  url: string;
  cursor: string | null;
  created_at: string;
}

export interface RunResult {
  sent: number;
  batches: number;
  status: number | null;
  error: string | null;
  cursor: string | null;
}

/**
 * Envoie ce qui s'est passé depuis le curseur, par lots, et avance le
 * curseur après chaque lot accepté.
 *
 * Le découpage est le point délicat. Couper à mille lignes pile peut
 * tomber au milieu d'un groupe d'événements de même horodatage : la
 * requête suivante, qui reprend « après » le curseur, sauterait ceux
 * restés de l'autre côté. Un lot plein rend donc ses dernières lignes
 * à même horodatage, qui repartent au lot suivant.
 */
export async function runExport(
  service: SupabaseClient,
  dest: ExportDestination
): Promise<RunResult> {
  let cursor = dest.cursor ?? dest.created_at;
  let sent = 0;
  let batches = 0;
  let status: number | null = null;
  let error: string | null = null;

  while (batches < EXPORT_MAX_BATCHES) {
    const { data, error: readError } = await service
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("site_id", dest.site_id)
      .gt("created_at", cursor)
      .order("created_at", { ascending: true })
      .limit(EXPORT_BATCH);

    if (readError) {
      error = "read_failed";
      break;
    }

    let rows = (data ?? []) as unknown as { created_at: string }[];
    if (rows.length === 0) break;
    // Ce qui a été lu, avant de rendre les lignes à horodatage partagé :
    // c'est lui, et non le lot gardé, qui dit si la table est épuisée.
    const fetched = rows.length;

    if (rows.length === EXPORT_BATCH) {
      const last = rows[rows.length - 1].created_at;
      const trimmed = rows.filter((r) => r.created_at !== last);
      // Un lot entier au même horodatage à la microseconde n'arrive pas
      // en pratique ; s'il arrivait, on l'envoie tel quel plutôt que de
      // tourner en rond.
      if (trimmed.length > 0) rows = trimmed;
    }

    const result = await deliver(
      dest,
      {
        site_id: dest.site_id,
        destination_id: dest.id,
        sent_at: new Date().toISOString(),
        events: rows,
      },
      rows.length
    );

    status = result.status;
    error = result.error;
    if (result.error) break;

    cursor = rows[rows.length - 1].created_at;
    sent += rows.length;
    batches += 1;
    /* Juger sur le lu et non sur le gardé. Un lot plein dont on a rendu
       quelques lignes finales en garde moins de mille, et s'arrêter là
       croirait la table épuisée : un site actif ne livrerait qu'un lot
       par nuit et prendrait du retard sans fin. */
    if (fetched < EXPORT_BATCH) break;
  }

  await service
    .from("export_destinations")
    .update({
      cursor: sent > 0 ? cursor : dest.cursor,
      last_run_at: new Date().toISOString(),
      last_status: status,
      last_error: error,
      last_sent: sent,
    })
    .eq("id", dest.id);

  return { sent, batches, status, error, cursor: sent > 0 ? cursor : dest.cursor };
}
