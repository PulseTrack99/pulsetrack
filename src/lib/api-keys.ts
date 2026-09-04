import { randomBytes, createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserPlan, planHas } from "@/lib/plan";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * API key generation, hashing, and shared resolution — used by both the
 * REST API (src/app/api/v1/stats/route.ts) and the MCP server (src/app/
 * api/mcp/route.ts), so the two never drift on what makes a key valid.
 *
 * Only the SHA-256 hash is ever persisted (supabase/api-keys.sql) — the
 * plaintext is returned once at creation time and cannot be recovered
 * afterwards. The prefix is stored separately so the settings UI can
 * still tell keys apart in a list without ever holding the full value.
 */

const PREFIX_LEN = 16; // "pt_live_" + 8 hex chars

export function generateApiKey(): { plaintext: string; prefix: string; hash: string } {
  const plaintext = `pt_live_${randomBytes(24).toString("hex")}`;
  return {
    plaintext,
    prefix: plaintext.slice(0, PREFIX_LEN),
    hash: hashApiKey(plaintext),
  };
}

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export interface ResolvedApiKey {
  keyId: string;
  site: { id: string; user_id: string; name: string; domain: string };
  plan: Awaited<ReturnType<typeof getUserPlan>>;
}

/**
 * Validates a plaintext key against the database and resolves the site
 * and current plan it grants access to. Returns null for anything that
 * shouldn't authenticate: unknown/revoked key, missing site, or a plan
 * that no longer includes API access (checked live, not just at issuance
 * — a downgrade takes effect immediately).
 */
export async function resolveApiKey(
  supabase: SupabaseClient,
  plaintext: string
): Promise<ResolvedApiKey | null> {
  const hash = hashApiKey(plaintext);

  const { data: key } = await supabase
    .from("api_keys")
    .select("id, site_id")
    .eq("key_hash", hash)
    .is("revoked_at", null)
    .maybeSingle();
  if (!key) return null;

  const { data: site } = await supabase
    .from("sites")
    .select("id, user_id, name, domain")
    .eq("id", key.site_id)
    .maybeSingle();
  if (!site) return null;

  const plan = await getUserPlan(supabase, site.user_id);
  if (!planHas(plan, "api")) return null;

  // Best-effort; a failed write here should never fail the request.
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", key.id)
    .then(() => {});

  return { keyId: key.id, site, plan };
}

// Persistent (supabase/rate-limits.sql) — survives across serverless
// invocations, unlike an in-memory Map. "apikey:" namespaces this
// counter apart from the MCP server's "oauth:" one (src/app/api/mcp/
// route.ts) so the two auth methods don't share a quota by accident,
// while both still cap at the same 60/min a client could reach via
// either the REST API or MCP.
const RATE_LIMIT = 60;
const RATE_WINDOW_SECONDS = 60;

export async function isApiKeyRateLimited(
  supabase: SupabaseClient,
  keyId: string
): Promise<boolean> {
  const withinLimit = await checkRateLimit(supabase, `apikey:${keyId}`, RATE_LIMIT, RATE_WINDOW_SECONDS);
  return !withinLimit;
}
