import { randomBytes, createHash } from "crypto";

/**
 * API key generation and hashing.
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
