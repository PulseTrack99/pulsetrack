import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchema } from "@/lib/schema-guard";

/**
 * Les flags d'un site : lire, créer, régler, archiver.
 *
 * Rien d'élevé ici — la RLS de feature_flags porte la même règle que
 * partout ailleurs, donc un équipier gère les flags comme le
 * propriétaire et un tiers ne voit rien. L'évaluation publique, elle,
 * vit dans /api/flags/evaluate et ne dépend pas de cette route.
 */

/** Ce que le client écrira dans son code : pas d'espace, pas d'accent,
 *  rien qui oblige à se demander comment on l'échappe. */
const KEY_SHAPE = /^[a-z0-9][a-z0-9_-]{0,58}[a-z0-9]$/;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const siteId = new URL(req.url).searchParams.get("site_id");
  if (!siteId) {
    return NextResponse.json({ error: "site_id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("feature_flags")
    .select("id, key, name, description, enabled, rollout, archived_at, created_at")
    .eq("site_id", siteId)
    .order("archived_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingSchema(error)) {
      return NextResponse.json({
        migration_pending: true,
        file: "supabase/feature-flags.sql",
        flags: [],
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ migration_pending: false, flags: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const siteId: string | undefined = body?.site_id;
  const key: string = (body?.key ?? "").toString().trim().toLowerCase();
  const name: string = (body?.name ?? "").toString().trim();

  if (!siteId || !name) {
    return NextResponse.json({ error: "site_id and name are required" }, { status: 400 });
  }
  if (!KEY_SHAPE.test(key)) {
    return NextResponse.json({ error: "invalid_key" }, { status: 400 });
  }

  /* Un flag naît éteint, quel que soit son pourcentage. Créer et
     déployer d'un même geste retire la seconde où l'on relit la clé
     avant d'exposer quiconque. */
  const { data, error } = await supabase
    .from("feature_flags")
    .insert({
      site_id: siteId,
      key,
      name,
      description: body?.description?.toString().slice(0, 500) || null,
      enabled: false,
      rollout: 100,
    })
    .select("id, key, name, description, enabled, rollout, archived_at, created_at")
    .single();

  if (error) {
    if (isMissingSchema(error)) {
      return NextResponse.json(
        { error: "migration_pending", file: "supabase/feature-flags.sql" },
        { status: 503 }
      );
    }
    // 23505 : deux flags de même clé sur un site ne sauraient pas
    // lequel des deux le code appelle.
    if (error.code === "23505") {
      return NextResponse.json({ error: "duplicate_key" }, { status: 409 });
    }
    console.error("flag create:", error);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }

  return NextResponse.json({ flag: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id: string | undefined = body?.id;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.description === "string") {
    patch.description = body.description.slice(0, 500) || null;
  }
  if (body.rollout !== undefined) {
    const r = Number(body.rollout);
    if (!Number.isFinite(r) || r < 0 || r > 100) {
      return NextResponse.json({ error: "invalid_rollout" }, { status: 400 });
    }
    patch.rollout = Math.round(r);
  }
  if (typeof body.archived === "boolean") {
    patch.archived_at = body.archived ? new Date().toISOString() : null;
  }

  // La clé n'est jamais modifiable : elle est écrite dans le code du
  // client, et la renommer ici éteindrait sa fonctionnalité sans que
  // rien ne le signale.
  const { data, error } = await supabase
    .from("feature_flags")
    .update(patch)
    .eq("id", id)
    .select("id, key, name, description, enabled, rollout, archived_at, created_at")
    .maybeSingle();

  if (error) {
    console.error("flag update:", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  // Zéro ligne touchée : la RLS a filtré. Indiscernable, volontairement,
  // d'un flag qui n'existe pas.
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ flag: data });
}
