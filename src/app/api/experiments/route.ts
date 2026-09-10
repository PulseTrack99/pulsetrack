import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchema } from "@/lib/schema-guard";
import { compare, type Arm, type Variant } from "@/lib/experiments";

/**
 * Les expériences : lire avec leurs résultats, créer, démarrer, arrêter.
 *
 * Les résultats viennent avec la liste plutôt que d'une seconde route.
 * Une expérience sans son chiffre n'apprend rien, et personne n'ouvre
 * la page pour lire des noms.
 */

const KEY_SHAPE = /^[a-z0-9][a-z0-9_-]{0,58}[a-z0-9]$/;
const STATUSES = ["draft", "running", "stopped"] as const;

const PERIODS: Record<string, number> = {
  "7d": 7, "30d": 30, "90d": 90, "180d": 180, "365d": 365,
};

interface Row {
  id: string;
  key: string;
  name: string;
  description: string | null;
  variants: Variant[];
  metric_event: string;
  status: string;
  started_at: string | null;
  stopped_at: string | null;
  created_at: string;
}

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

  const { data, error } = await supabase
    .from("experiments")
    .select("id, key, name, description, variants, metric_event, status, started_at, stopped_at, created_at")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingSchema(error)) {
      return NextResponse.json({
        migration_pending: true,
        file: "supabase/experiments.sql",
        experiments: [],
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Row[];

  /* Le résultat se compte depuis le démarrage, pas depuis la période
     choisie. Un test lancé il y a six semaines et lu sur trente jours
     perdrait ses deux premières semaines d'exposition, et l'écart
     changerait selon le filtre — le pire chiffre possible : un qui
     bouge sans que rien n'ait bougé. */
  const results = await Promise.all(
    rows.map(async (r) => {
      if (r.status === "draft") return null;
      const since =
        r.started_at ?? new Date(Date.now() - days * 86_400_000).toISOString();
      const { data: arms } = await supabase.rpc("experiment_results", {
        p_site: siteId,
        p_key: r.key,
        p_metric: r.metric_event,
        p_since: since,
      });
      // Les versions sans une seule exposition sont absentes du
      // résultat ; elles doivent quand même figurer, à zéro.
      const byVariant = new Map(
        ((arms ?? []) as Arm[]).map((a) => [a.variant, a])
      );
      const ordered: Arm[] = (r.variants ?? []).map((v) => ({
        variant: v.key,
        subjects: Number(byVariant.get(v.key)?.subjects ?? 0),
        conversions: Number(byVariant.get(v.key)?.conversions ?? 0),
      }));
      return compare(ordered);
    })
  );

  return NextResponse.json({
    migration_pending: false,
    experiments: rows.map((r, i) => ({ ...r, results: results[i] })),
  });
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
  const metric: string = (body?.metric_event ?? "").toString().trim();

  if (!siteId || !name || !metric) {
    return NextResponse.json(
      { error: "site_id, name and metric_event are required" },
      { status: 400 }
    );
  }
  if (!KEY_SHAPE.test(key)) {
    return NextResponse.json({ error: "invalid_key" }, { status: 400 });
  }

  const variants: Variant[] = Array.isArray(body?.variants) ? body.variants : [];
  const usable = variants.filter(
    (v) => typeof v?.key === "string" && v.key.trim() && Number(v.weight) > 0
  );
  /* Deux versions au minimum, sinon il n'y a rien à comparer — et la
     première est la référence, donc son ordre compte. */
  if (usable.length < 2) {
    return NextResponse.json({ error: "need_two_variants" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("experiments")
    .insert({
      site_id: siteId,
      key,
      name,
      description: body?.description?.toString().slice(0, 500) || null,
      variants: usable.map((v) => ({
        key: v.key.trim(),
        weight: Math.round(Number(v.weight)),
      })),
      metric_event: metric,
      // Comme un flag : une expérience naît à l'arrêt. On relit ses
      // versions avant d'exposer qui que ce soit.
      status: "draft",
    })
    .select("id, key, name, description, variants, metric_event, status, started_at, stopped_at, created_at")
    .single();

  if (error) {
    if (isMissingSchema(error)) {
      return NextResponse.json(
        { error: "migration_pending", file: "supabase/experiments.sql" },
        { status: 503 }
      );
    }
    if (error.code === "23505") {
      return NextResponse.json({ error: "duplicate_key" }, { status: 409 });
    }
    console.error("experiment create:", error);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }

  return NextResponse.json({ experiment: data });
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

  if (typeof body.status === "string") {
    if (!(STATUSES as readonly string[]).includes(body.status)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }
    patch.status = body.status;
    /* La date de démarrage n'est posée qu'une fois. Relancer une
       expérience arrêtée sans la reposer garderait ses anciennes
       expositions dans le résultat, et le nouveau test hériterait des
       chiffres de l'ancien. */
    if (body.status === "running") {
      patch.started_at = new Date().toISOString();
      patch.stopped_at = null;
    }
    if (body.status === "stopped") patch.stopped_at = new Date().toISOString();
  }

  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.description === "string") {
    patch.description = body.description.slice(0, 500) || null;
  }

  /* Ni la clé, ni les versions, ni la métrique après le démarrage :
     changer la répartition en cours de route redistribuerait les gens
     déjà exposés, et le résultat mélangerait deux expériences sous un
     seul nom. */

  const { data, error } = await supabase
    .from("experiments")
    .update(patch)
    .eq("id", id)
    .select("id, key, name, description, variants, metric_event, status, started_at, stopped_at, created_at")
    .maybeSingle();

  if (error) {
    console.error("experiment update:", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ experiment: data });
}
