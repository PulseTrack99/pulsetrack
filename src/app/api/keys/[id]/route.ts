import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Revoke an API key. Soft-delete (revoked_at) rather than removing the
 *  row, so past usage stays attributable and the key can never be
 *  reissued by re-inserting the same id. */
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

  // RLS (api_keys policy, joined through sites.user_id) is what actually
  // enforces ownership here — this update simply cannot match a row
  // belonging to another account.
  const { data, error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Query failed" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Key not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
