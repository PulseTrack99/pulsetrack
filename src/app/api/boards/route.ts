import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchema } from "@/lib/schema-guard";

/** The boards of one site. RLS decides which site that may be. */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const siteId = new URL(req.url).searchParams.get("site_id");
  if (!siteId) return NextResponse.json({ error: "site_id is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("boards")
    .select("id, name, description, updated_at, board_blocks(id)")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingSchema(error)) return NextResponse.json({ migration_pending: true, boards: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    migration_pending: false,
    boards: (data ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      updated_at: b.updated_at,
      blocks: (b.board_blocks as { id: string }[] | null)?.length ?? 0,
    })),
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const siteId: string | undefined = body?.site_id;
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 120) : "";
  if (!siteId || !name) {
    return NextResponse.json({ error: "site_id and name are required" }, { status: 400 });
  }

  // RLS enforces ownership through the WITH CHECK on boards.
  const { data, error } = await supabase
    .from("boards")
    .insert({ site_id: siteId, name, description: body?.description?.slice(0, 300) || null })
    .select("id")
    .single();

  if (error) {
    if (isMissingSchema(error)) return NextResponse.json({ error: "migration_pending" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
