import { NextResponse } from "next/server";
import { metadataCorsOptionsRequestHandler } from "mcp-handler";

/**
 * RFC 8414 Authorization Server Metadata. Hand-written — mcp-handler
 * only ships the resource-server half (protectedResourceHandler);
 * being our own authorization server means declaring this ourselves.
 * PKCE (S256) is mandatory (OAuth 2.1) and "token_endpoint_auth_methods"
 * is "none" because MCP clients are public clients (no client secret —
 * CIMD identifies them by their client_id URL instead).
 */
export async function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pulsetrack.eu";
  return NextResponse.json({
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/api/oauth/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["read"],
    client_id_metadata_document_supported: true,
  });
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
