import { metadataCorsOptionsRequestHandler } from "mcp-handler";
import { mcpMetadataHandler } from "@/lib/mcp-metadata";

/**
 * RFC 9728 Protected Resource Metadata — tells an MCP client where
 * the MCP server (src/app/api/mcp/route.ts) lives and which
 * authorization server issues tokens for it. PulseTrack is both the
 * resource server and the authorization server (same origin). The
 * path-suffixed twin lives in ./api/mcp/route.ts.
 */
export { mcpMetadataHandler as GET };
export const OPTIONS = metadataCorsOptionsRequestHandler();
