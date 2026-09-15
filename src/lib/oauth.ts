import { randomBytes, createHash } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getUserPlan, planHas } from "@/lib/plan";

/**
 * OAuth 2.1 + PKCE authorization-server primitives for the MCP
 * connector (src/app/oauth/authorize/page.tsx, src/app/api/oauth/
 * token/route.ts, src/app/api/mcp/route.ts). Mirrors src/lib/
 * api-keys.ts's hash-only-persisted pattern: codes and tokens are
 * generated here, only their SHA-256 hash ever reaches the database
 * (supabase/oauth.sql).
 */

export const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
export const REFRESH_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
export const AUTH_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes — spec recommends short-lived

function hash(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export function generateAuthCode(): { plaintext: string; hash: string } {
  const plaintext = `ptc_${randomBytes(32).toString("hex")}`;
  return { plaintext, hash: hash(plaintext) };
}

export function generateAccessToken(): { plaintext: string; hash: string } {
  const plaintext = `pta_${randomBytes(32).toString("hex")}`;
  return { plaintext, hash: hash(plaintext) };
}

export function generateRefreshToken(): { plaintext: string; hash: string } {
  const plaintext = `ptr_${randomBytes(32).toString("hex")}`;
  return { plaintext, hash: hash(plaintext) };
}

export function hashToken(plaintext: string): string {
  return hash(plaintext);
}

/**
 * PKCE (RFC 7636) verification — S256 only, "plain" is not accepted
 * (deprecated by OAuth 2.1). base64url(sha256(code_verifier)) must
 * equal the code_challenge presented at /oauth/authorize.
 */
export function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  if (!codeVerifier || !codeChallenge) return false;
  const computed = createHash("sha256")
    .update(codeVerifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return computed === codeChallenge;
}

export interface ResolvedOAuthToken {
  tokenId: string;
  site: { id: string; user_id: string; name: string; domain: string };
  plan: Awaited<ReturnType<typeof getUserPlan>>;
}

/**
 * Validates an OAuth access token ("pta_...", issued by /api/oauth/
 * token) the same way resolveApiKey (src/lib/api-keys.ts) validates a
 * manual "pt_live_..." key — src/app/api/mcp/route.ts tries this
 * first when the prefix matches, so both auth methods resolve to the
 * exact same shape and the same live plan check.
 */
export async function resolveOAuthToken(
  supabase: SupabaseClient,
  plaintext: string
): Promise<ResolvedOAuthToken | null> {
  const { data: token } = await supabase
    .from("oauth_tokens")
    .select("id, site_id, access_expires_at, revoked_at")
    .eq("access_token_hash", hashToken(plaintext))
    .maybeSingle();
  if (!token) return null;
  if (token.revoked_at) return null;
  if (new Date(token.access_expires_at) < new Date()) return null;

  const { data: site } = await supabase
    .from("sites")
    .select("id, user_id, name, domain")
    .eq("id", token.site_id)
    .maybeSingle();
  if (!site) return null;

  const plan = await getUserPlan(supabase, site.user_id);
  if (!planHas(plan, "api")) return null;

  supabase
    .from("oauth_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", token.id)
    .then(() => {});

  return { tokenId: token.id, site, plan };
}

export interface ClientMetadata {
  name: string;
  redirectUris: string[];
  /** Vrai pour une fiche CIMD : le nom est adossé à un domaine qui la
   *  publie. Faux pour un client enregistré dynamiquement : le nom est
   *  ce que l'application a bien voulu déclarer. */
  verified: boolean;
}

/** Préfixe des identifiants émis par /api/oauth/register. */
export const REGISTERED_CLIENT_PREFIX = "ptd_";

let serviceClient: SupabaseClient | null = null;
function service(): SupabaseClient {
  serviceClient ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  return serviceClient;
}

/**
 * Client ID Metadata Documents (CIMD) — the 2026-07-28 MCP spec's
 * replacement for Dynamic Client Registration. The client_id IS an
 * HTTPS URL serving its own metadata; no registration round-trip,
 * no admin approval queue. We fetch it once per /oauth/authorize
 * request (bounded size + timeout — this URL is attacker-influenced
 * input, never trust its size or availability) and validate the
 * caller-supplied redirect_uri is one the client actually declared,
 * which is the whole point: it stops an attacker registering an
 * arbitrary client_id and redirecting a stolen code to their own
 * server.
 */
export async function resolveClientMetadata(clientId: string): Promise<ClientMetadata | null> {
  // Un client enregistré dynamiquement (RFC 7591) : ses adresses de
  // retour sont en base, pas derrière une URL.
  if (clientId.startsWith(REGISTERED_CLIENT_PREFIX)) {
    const { data } = await service()
      .from("oauth_clients")
      .select("client_name, redirect_uris")
      .eq("client_id", clientId)
      .maybeSingle();
    if (!data) return null;
    return {
      name: data.client_name || "Application sans nom",
      redirectUris: data.redirect_uris ?? [],
      verified: false,
    };
  }

  let url: URL;
  try {
    url = new URL(clientId);
  } catch {
    return null;
  }

  const isLocalDev = process.env.NODE_ENV !== "production" && url.hostname === "localhost";
  if (url.protocol !== "https:" && !isLocalDev) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;

    // Bounded read — a malicious client_id could otherwise serve an
    // unbounded response body.
    const text = await res.text();
    if (text.length > 64_000) return null;

    const doc = JSON.parse(text);
    const redirectUris = Array.isArray(doc.redirect_uris)
      ? doc.redirect_uris.filter((u: unknown) => typeof u === "string")
      : [];
    if (redirectUris.length === 0) return null;

    return {
      name: typeof doc.client_name === "string" && doc.client_name.trim() ? doc.client_name.trim() : clientId,
      redirectUris,
      verified: true,
    };
  } catch {
    return null;
  }
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * L'adresse de retour demandée correspond-elle à l'une de celles que
 * l'application a déclarées ?
 *
 * Correspondance exacte, avec une seule exception, celle de la RFC 8252
 * (§7.3) : pour une adresse de bouclage en http, le port est ignoré. Un
 * outil en ligne de commande (Claude Code, par exemple) déclare
 * « http://localhost/callback » puis écoute sur un port choisi au
 * lancement ; exiger le port exact le bloquerait à chaque fois. Le
 * reste — schéma, hôte, chemin, paramètres — doit être identique.
 */
export function matchesRedirectUri(registered: string[], requested: string): boolean {
  if (registered.includes(requested)) return true;
  let req: URL;
  try {
    req = new URL(requested);
  } catch {
    return false;
  }
  if (req.protocol !== "http:" || !LOOPBACK_HOSTS.has(req.hostname)) return false;
  if (req.username || req.password || req.hash) return false;
  return registered.some((r) => {
    try {
      const reg = new URL(r);
      return (
        reg.protocol === "http:" &&
        reg.hostname === req.hostname &&
        reg.pathname === req.pathname &&
        reg.search === req.search
      );
    } catch {
      return false;
    }
  });
}

/** Vrai si l'adresse de retour reste sur l'ordinateur de l'utilisateur. */
export function isLoopbackRedirect(uri: string): boolean {
  try {
    const u = new URL(uri);
    return u.protocol === "http:" && LOOPBACK_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

/** Schémas qu'aucun client légitime n'utilise comme adresse de retour,
 *  et qui feraient exécuter ou lire quelque chose au navigateur. */
const FORBIDDEN_SCHEMES = new Set([
  "javascript:", "data:", "file:", "vbscript:", "blob:", "about:", "filesystem:",
  "ftp:", "ws:", "wss:", "mailto:", "tel:", "sms:", "chrome:", "chrome-extension:",
  "moz-extension:", "view-source:", "intent:",
]);

/**
 * Une adresse de retour qu'on accepte d'enregistrer (RFC 7591 + RFC 8252).
 *
 * - https : oui, c'est le cas des applications web (Notion, Gemini, Le Chat).
 * - http : seulement vers l'ordinateur de l'utilisateur (localhost,
 *   127.0.0.1, [::1]) — Gemini CLI, VS Code. Jamais vers un hôte distant,
 *   où le code circulerait en clair.
 * - un schéma propre à une application (cursor://, vscode://) : oui,
 *   c'est ainsi qu'un éditeur récupère le code, sauf les schémas de la
 *   liste ci-dessus.
 *
 * Pas de fragment, pas d'identifiants dans l'URL, 2000 caractères au plus.
 */
export function checkRegisteredRedirectUri(uri: string): boolean {
  if (uri.length > 2000) return false;
  let u: URL;
  try {
    u = new URL(uri);
  } catch {
    return false;
  }
  if (u.hash || u.username || u.password) return false;
  if (u.protocol === "https:") return Boolean(u.hostname);
  if (u.protocol === "http:") return LOOPBACK_HOSTS.has(u.hostname);
  if (FORBIDDEN_SCHEMES.has(u.protocol)) return false;
  return /^[a-z][a-z0-9+.-]*:$/.test(u.protocol);
}

/** Note qu'un client enregistré a servi, pour que la purge l'épargne. */
export async function touchRegisteredClient(clientId: string): Promise<void> {
  if (!clientId.startsWith(REGISTERED_CLIENT_PREFIX)) return;
  await service()
    .from("oauth_clients")
    .update({ last_used_at: new Date().toISOString() })
    .eq("client_id", clientId);
}
