import { metadataCorsOptionsRequestHandler } from "mcp-handler";
import { mcpMetadataHandler } from "@/lib/mcp-metadata";

/** La variante RFC 9728 avec le chemin de la ressource — même contenu. */
export { mcpMetadataHandler as GET };
export const OPTIONS = metadataCorsOptionsRequestHandler();
