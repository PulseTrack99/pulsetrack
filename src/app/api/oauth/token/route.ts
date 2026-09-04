import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  hashToken,
  verifyPkce,
  generateAccessToken,
  generateRefreshToken,
  resolveClientMetadata,
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
} from "@/lib/oauth";

/**
 * OAuth token endpoint — exchanges an authorization code (+ PKCE
 * verifier) for an access/refresh token pair, or rotates a refresh
 * token for a new pair. Public client, no secret (token_endpoint_
 * auth_methods_supported: ["none"] in the RFC 8414 metadata) — the
 * code_verifier is what proves this call comes from whoever started
 * the flow at /oauth/authorize, not client authentication.
 *
 * application/x-www-form-urlencoded per RFC 6749 — every MCP/OAuth
 * client sends it this way, so this route only accepts that.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function err(error: string, description?: string, status = 400) {
  return NextResponse.json({ error, error_description: description }, { status });
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return err("invalid_request", "Expected application/x-www-form-urlencoded body");
  }

  const grantType = form.get("grant_type");

  if (grantType === "authorization_code") {
    const code = form.get("code");
    const redirectUri = form.get("redirect_uri");
    const codeVerifier = form.get("code_verifier");
    if (
      typeof code !== "string" ||
      typeof redirectUri !== "string" ||
      typeof codeVerifier !== "string"
    ) {
      return err("invalid_request", "code, redirect_uri and code_verifier are required");
    }

    const { data: row } = await supabase
      .from("oauth_codes")
      .select("*")
      .eq("code_hash", hashToken(code))
      .maybeSingle();

    if (!row || row.used_at || new Date(row.expires_at) < new Date()) {
      return err("invalid_grant", "Unknown, already-used, or expired code");
    }
    if (row.redirect_uri !== redirectUri) {
      return err("invalid_grant", "redirect_uri does not match the one used at authorization");
    }
    if (!verifyPkce(codeVerifier, row.code_challenge)) {
      return err("invalid_grant", "code_verifier does not match code_challenge");
    }

    // Single-use, enforced before issuing anything — a retry with the
    // same code (e.g. a client racing two requests) fails closed.
    const { error: consumeError } = await supabase
      .from("oauth_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", row.id)
      .is("used_at", null);
    if (consumeError) {
      return err("invalid_grant", "Code already consumed");
    }

    const access = generateAccessToken();
    const refresh = generateRefreshToken();
    const now = Date.now();
    const client = await resolveClientMetadata(row.client_id);

    const { error: insertError } = await supabase.from("oauth_tokens").insert({
      access_token_hash: access.hash,
      refresh_token_hash: refresh.hash,
      user_id: row.user_id,
      site_id: row.site_id,
      client_id: row.client_id,
      client_name: client?.name ?? row.client_id,
      scope: row.scope,
      access_expires_at: new Date(now + ACCESS_TOKEN_TTL_MS).toISOString(),
      refresh_expires_at: new Date(now + REFRESH_TOKEN_TTL_MS).toISOString(),
    });
    if (insertError) {
      console.error("oauth token issuance failed:", insertError);
      return err("server_error", undefined, 500);
    }

    return NextResponse.json({
      access_token: access.plaintext,
      token_type: "Bearer",
      expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
      refresh_token: refresh.plaintext,
      scope: row.scope,
    });
  }

  if (grantType === "refresh_token") {
    const refreshToken = form.get("refresh_token");
    if (typeof refreshToken !== "string") {
      return err("invalid_request", "refresh_token is required");
    }

    const { data: row } = await supabase
      .from("oauth_tokens")
      .select("*")
      .eq("refresh_token_hash", hashToken(refreshToken))
      .maybeSingle();

    if (
      !row ||
      row.revoked_at ||
      !row.refresh_expires_at ||
      new Date(row.refresh_expires_at) < new Date()
    ) {
      return err("invalid_grant", "Unknown, revoked, or expired refresh token");
    }

    // Rotate both tokens in place — same row, new hashes. A refresh
    // token is single-use; reusing an old one after rotation fails
    // the hash lookup above on the next attempt.
    const access = generateAccessToken();
    const refresh = generateRefreshToken();
    const now = Date.now();

    const { error: updateError } = await supabase
      .from("oauth_tokens")
      .update({
        access_token_hash: access.hash,
        refresh_token_hash: refresh.hash,
        access_expires_at: new Date(now + ACCESS_TOKEN_TTL_MS).toISOString(),
        refresh_expires_at: new Date(now + REFRESH_TOKEN_TTL_MS).toISOString(),
      })
      .eq("id", row.id);
    if (updateError) {
      return err("server_error", undefined, 500);
    }

    return NextResponse.json({
      access_token: access.plaintext,
      token_type: "Bearer",
      expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
      refresh_token: refresh.plaintext,
      scope: row.scope,
    });
  }

  return err("unsupported_grant_type", `grant_type must be authorization_code or refresh_token, got "${grantType}"`);
}
