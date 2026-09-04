import { randomBytes, createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
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
    };
  } catch {
    return null;
  }
}
