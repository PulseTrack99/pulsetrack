import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * "Applications connectées" — every non-revoked OAuth grant on the
 * account, for Settings (src/components/settings-panel.tsx). RLS
 * (has_account_access(user_id), supabase/oauth.sql) scopes this to
 * the caller's own account, owner or team member either way.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("oauth_tokens")
    .select("id, client_name, scope, created_at, last_used_at, sites(name, domain)")
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Query failed" }, { status: 500 });
  return NextResponse.json({ connections: data ?? [] });
}
