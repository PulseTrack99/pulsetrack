import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchema } from "@/lib/schema-guard";

/**
 * Les comptes, et qui les compose.
 *
 * Une seule route pour deux questions qui s'enchaînent : la liste des
 * comptes, puis — quand l'un d'eux inquiète — les personnes qui le
 * composent. Passer `group` bascule de l'une à l'autre plutôt que
 * d'ouvrir une seconde route dont le seul rôle serait de refaire la
 * même vérification d'accès.
 *
 * L'appartenance vient du client, qui appelle pulsetrack.group().
 * Rien n'est déduit d'un domaine d'e-mail : le pistage ne saurait pas
 * le faire, et une déduction fausse produirait des regroupements que
 * personne ne pourrait corriger.
 */

const PERIODS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "180d": 180,
  "365d": 365,
};

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("site_id");
  if (!siteId) {
    return NextResponse.json({ error: "site_id is required" }, { status: 400 });
  }

  const days = PERIODS[searchParams.get("period") ?? "30d"] ?? 30;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const group = searchParams.get("group");

  /* site_groups et group_members sont SECURITY DEFINER et vérifient
     l'accès dans leur corps — session_groups n'ayant aucune politique,
     une fonction INVOKER ne rendrait rien à personne. Un appelant sans
     accès obtient donc zéro ligne, pas une erreur qui lui apprendrait
     que le site existe. */
  const { data, error } = group
    ? await supabase.rpc("group_members", {
        p_site: siteId,
        p_group: group,
        p_since: since,
      })
    : await supabase.rpc("site_groups", { p_site: siteId, p_since: since });

  if (error) {
    if (isMissingSchema(error)) {
      return NextResponse.json({
        migration_pending: true,
        file: "supabase/groups.sql",
        groups: [],
        members: [],
      });
    }
    console.error("groups error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (group) {
    return NextResponse.json({
      migration_pending: false,
      members: (data ?? []) as unknown[],
    });
  }

  return NextResponse.json({
    migration_pending: false,
    groups: (data ?? []) as unknown[],
  });
}
