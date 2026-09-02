import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Remove a team member, or cancel a pending invite. Owner-only — RLS
 *  (owner_user_id = auth.uid()) makes this a clean no-op 404 for
 *  anyone else, same as every other ownership check in this app. */
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
    .from("team_members")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Query failed" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
