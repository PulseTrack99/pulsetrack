import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Revoke a connected app. Soft-delete (revoked_at), same pattern as
 *  src/app/api/keys/[id]/route.ts — RLS is what actually enforces
 *  that this can't touch another account's row. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data, error } = await supabase
    .from("oauth_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Query failed" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
