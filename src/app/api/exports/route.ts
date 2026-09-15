import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getUserPlan, planHas } from "@/lib/plan";
import { isMissingSchema } from "@/lib/schema-guard";
import {
  checkDestination,
  deliver,
  runExport,
  signingSecret,
  type ExportDestination,
} from "@/lib/export";

/**
 * Les destinations d'export d'un site : lister, créer, tester, lancer,
 * activer, supprimer.
 *
 * Sortir des données brutes est une capacité de l'offre Growth et
 * au-delà — la même que l'API, dont c'est la version poussée plutôt
 * que tirée. La lecture reste ouverte pour que l'écran puisse proposer
 * l'offre au lieu de disparaître.
 */

const COLUMNS =
  "id, site_id, url, enabled, cursor, last_run_at, last_status, last_error, last_sent, created_at";

async function context() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET(req: NextRequest) {
  const { supabase, user } = await context();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const siteId = new URL(req.url).searchParams.get("site_id");
  if (!siteId) return NextResponse.json({ error: "site_id is required" }, { status: 400 });

  const plan = await getUserPlan(supabase, user.id);
  const { data, error } = await supabase
    .from("export_destinations")
    .select(COLUMNS)
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingSchema(error)) {
      return NextResponse.json({ migration_pending: true, file: "supabase/exports.sql", destinations: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    migration_pending: false,
    has_api: planHas(plan, "api"),
    // La RLS a déjà filtré : chaque clé renvoyée appartient à une
    // destination que l'appelant a le droit de gérer.
    destinations: (data ?? []).map((d) => ({ ...d, secret: signingSecret(d.id) })),
  });
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await context();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const plan = await getUserPlan(supabase, user.id);
  if (!planHas(plan, "api")) {
    return NextResponse.json({ error: "upgrade_required", feature: "api" }, { status: 402 });
  }

  const body = await req.json().catch(() => null);
  const action: string = body?.action ?? "create";

  if (action === "create") {
    const siteId: string | undefined = body?.site_id;
    const url: string = (body?.url ?? "").toString().trim();
    if (!siteId || !url) {
      return NextResponse.json({ error: "site_id and url are required" }, { status: 400 });
    }
    const check = await checkDestination(url);
    if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 400 });

    const { data, error } = await supabase
      .from("export_destinations")
      .insert({ site_id: siteId, url })
      .select(COLUMNS)
      .single();

    if (error) {
      if (isMissingSchema(error)) {
        return NextResponse.json({ error: "migration_pending" }, { status: 503 });
      }
      return NextResponse.json({ error: "create_failed" }, { status: 500 });
    }
    return NextResponse.json({ destination: { ...data, secret: signingSecret(data.id) } });
  }

  // Tester et lancer portent sur une destination existante, lue sous la
  // RLS de l'appelant : un tiers ne peut ni l'un ni l'autre.
  const id: string | undefined = body?.id;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { data: dest } = await supabase
    .from("export_destinations")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (!dest) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (action === "test") {
    const result = await deliver(
      dest,
      {
        test: true,
        site_id: dest.site_id,
        destination_id: dest.id,
        sent_at: new Date().toISOString(),
        events: [],
      },
      0
    );
    return NextResponse.json(result);
  }

  if (action === "run") {
    // Le passage lit les événements et met à jour le curseur : il faut le
    // service role, l'accès ayant été vérifié juste au-dessus.
    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const result = await runExport(service, dest as ExportDestination);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

export async function PATCH(req: NextRequest) {
  const { supabase, user } = await context();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.id || typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "id and enabled are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("export_destinations")
    .update({ enabled: body.enabled })
    .eq("id", body.id)
    .select(COLUMNS)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "update_failed" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ destination: { ...data, secret: signingSecret(data.id) } });
}

export async function DELETE(req: NextRequest) {
  const { supabase, user } = await context();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("export_destinations")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
