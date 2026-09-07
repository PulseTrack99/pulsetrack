import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchema } from "@/lib/schema-guard";

/**
 * The blocks of a board.
 *
 * What gets stored for an insight block is the *question*, never its
 * answer: measure, split, filters, grain. A board that stored numbers
 * would be a screenshot with extra steps — reopening it a week later
 * has to show that week, not last week's figures.
 */

const KINDS = ["heading", "text", "insight"] as const;
const WIDTHS = ["full", "half"] as const;

/** Blocks are appended at the end; positions are sparse so a failed
 *  reorder cannot leave two blocks fighting over one slot. */
const STEP = 10;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: boardId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const kind = body?.kind;
  if (!(KINDS as readonly string[]).includes(kind)) {
    return NextResponse.json({ error: "unknown block kind" }, { status: 400 });
  }
  const width = (WIDTHS as readonly string[]).includes(body?.width) ? body.width : "full";

  const { data: last } = await supabase
    .from("board_blocks")
    .select("position")
    .eq("board_id", boardId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("board_blocks")
    .insert({
      board_id: boardId,
      kind,
      width,
      position: (last?.position ?? 0) + STEP,
      config: body?.config ?? {},
    })
    .select("id, position, kind, width, config")
    .single();

  if (error) {
    if (isMissingSchema(error)) return NextResponse.json({ error: "migration_pending" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ block: data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: boardId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();

  // Reordering sends the whole order rather than a pair of swaps: the
  // document is what the person sees, and sending it entire is the only
  // version that cannot end up half-applied.
  if (Array.isArray(body?.order)) {
    const ids: string[] = body.order.slice(0, 200);
    for (let i = 0; i < ids.length; i++) {
      const { error } = await supabase
        .from("board_blocks")
        .update({ position: (i + 1) * STEP })
        .eq("id", ids[i])
        .eq("board_id", boardId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const blockId: string | undefined = body?.block_id;
  if (!blockId) return NextResponse.json({ error: "block_id is required" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body?.config) patch.config = body.config;
  if ((WIDTHS as readonly string[]).includes(body?.width)) patch.width = body.width;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("board_blocks")
    .update(patch)
    .eq("id", blockId)
    .eq("board_id", boardId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: boardId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const blockId = new URL(req.url).searchParams.get("block_id");
  if (!blockId) return NextResponse.json({ error: "block_id is required" }, { status: 400 });

  const { error } = await supabase
    .from("board_blocks")
    .delete()
    .eq("id", blockId)
    .eq("board_id", boardId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
