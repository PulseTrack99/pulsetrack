import { protectedResourceHandler, metadataCorsOptionsRequestHandler } from "mcp-handler";

/**
 * RFC 9728 Protected Resource Metadata — tells an MCP client where
 * the MCP server (src/app/api/mcp/route.ts) lives and which
 * authorization server issues tokens for it. PulseTrack is both the
 * resource server and the authorization server (same origin), so
 * this just points back at itself.
 */
const handler = protectedResourceHandler({
  authServerUrls: [process.env.NEXT_PUBLIC_SITE_URL ?? "https://pulsetrack.eu"],
});

export { handler as GET };
export const OPTIONS = metadataCorsOptionsRequestHandler();
