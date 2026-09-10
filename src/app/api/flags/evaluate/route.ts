import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getDailySalt, computeVisitorId, getClientIp } from "@/lib/visitor";
import { evaluateAll, type Flag } from "@/lib/flags";

/**
 * Ce que cette personne doit voir, maintenant.
 *
 * Publique et sans session, comme l'ingestion : elle est appelée depuis
 * la page du client, dans le navigateur de son visiteur. C'est la
 * requête la plus chaude du produit après /api/track, d'où une seule
 * lecture — tous les flags vivants du site — et aucune écriture.
 *
 * ── La clé de répartition ────────────────────────────────────────
 *
 * Par ordre de préférence :
 *
 *   1. `uid`, l'identifiant que le client nous passe. C'est le sien,
 *      celui de sa propre authentification, et le seul qui soit stable
 *      d'une visite à l'autre. C'est ce qu'il faut utiliser dès qu'on
 *      déploie progressivement quelque chose qui compte.
 *
 *   2. à défaut, le visitor_id — un hachage salé d'attributs de
 *      requête, stable une journée puisque le sel est détruit chaque
 *      nuit. Un visiteur anonyme peut donc changer de groupe d'un jour
 *      à l'autre, et l'écran le dit plutôt que de le taire.
 *
 * Rien n'est enregistré : le verdict se recalcule d'un hachage à chaque
 * appel. Pas de table d'assignations qui grossit, et rien à effacer le
 * jour où quelqu'un invoque l'article 17.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: { ...CORS, "Access-Control-Allow-Methods": "POST, OPTIONS" },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const siteId: string | undefined = body?.site_id;
    if (!siteId) {
      return NextResponse.json(
        { error: "site_id is required" },
        { status: 400, headers: CORS }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("feature_flags")
      .select("key, enabled, rollout")
      .eq("site_id", siteId)
      .is("archived_at", null);

    if (error) {
      // Une panne de flags ne doit pas casser la page du client : tout
      // répond faux, donc son code reprend le chemin qu'il avait avant
      // d'ajouter le flag.
      console.error("flags evaluate:", error.message);
      return NextResponse.json({ flags: {} }, { headers: CORS });
    }

    const flags = (data ?? []) as Flag[];
    if (flags.length === 0) {
      return NextResponse.json({ flags: {} }, { headers: CORS });
    }

    let id: string | undefined =
      typeof body?.uid === "string" && body.uid.trim()
        ? body.uid.trim().slice(0, 200)
        : undefined;
    let stable = true;

    if (!id) {
      // Le repli : stable la journée, pas au-delà. Le drapeau remonte
      // pour que l'écran puisse le dire.
      const salt = await getDailySalt(supabase);
      id = computeVisitorId(
        salt,
        siteId,
        getClientIp(req.headers),
        req.headers.get("user-agent") ?? ""
      );
      stable = false;
    }

    return NextResponse.json(
      { flags: evaluateAll(flags, id), stable },
      { headers: CORS }
    );
  } catch (err) {
    console.error("flags evaluate error:", err);
    // Même posture : faux partout plutôt qu'une page cassée.
    return NextResponse.json({ flags: {} }, { headers: CORS });
  }
}
