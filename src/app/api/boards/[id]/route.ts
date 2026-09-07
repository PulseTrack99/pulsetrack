import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchema } from "@/lib/schema-guard";

/** One board and everything on it, in reading order. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("boards")
    .select("id, site_id, name, description, board_blocks(id, position, kind, width, config)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (isMissingSchema(error)) return NextResponse.json({ migration_pending: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const blocks = (data.board_blocks ?? []) as {
    id: string;
    position: number;
    kind: string;
    width: string;
    config: Record<string, unknown>;
  }[];

  return NextResponse.json({
    migration_pending: false,
    board: {
      id: data.id,
      site_id: data.site_id,
      name: data.name,
      description: data.description,
      blocks: blocks.sort((a, b) => a.position - b.position),
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body?.name === "string") patch.name = body.name.trim().slice(0, 120) || "Sans titre";
  if ("description" in body) {
    patch.description =
      typeof body.description === "string" ? body.description.trim().slice(0, 300) || null : null;
  }

  const { error } = await supabase.from("boards").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // The blocks go with it: board_blocks references boards ON DELETE
  // CASCADE, so there is nothing to tidy up here.
  const { error } = await supabase.from("boards").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
