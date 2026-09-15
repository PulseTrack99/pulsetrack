import { protectedResourceHandler } from "mcp-handler";

/**
 * Métadonnées de ressource protégée (RFC 9728) du serveur MCP.
 *
 * `resource` doit être l'URL exacte du serveur MCP, chemin compris :
 * Claude.ai et ChatGPT comparent cette valeur à l'URL que l'utilisateur
 * a collée et abandonnent la connexion si elles diffèrent. Laisser
 * mcp-handler la déduire donnait « https://pulsetrack.eu » tout court.
 *
 * Servies à deux adresses : la racine historique, et la variante avec
 * le chemin de la ressource que la RFC 9728 fait construire aux clients
 * (« /.well-known/oauth-protected-resource/api/mcp »).
 */
const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pulsetrack.eu";

export const MCP_RESOURCE_URL = `${base}/api/mcp`;
export const MCP_METADATA_PATH = "/.well-known/oauth-protected-resource/api/mcp";

export const mcpMetadataHandler = protectedResourceHandler({
  authServerUrls: [base],
  resourceUrl: MCP_RESOURCE_URL,
});
