import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, planHas } from "@/lib/plan";
import { generateApiKey } from "@/lib/api-keys";

/** List and create API keys for a site the signed-in user owns. */

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const siteId = new URL(req.url).searchParams.get("site_id");
  if (!siteId) return NextResponse.json({ error: "site_id is required" }, { status: 400 });

  const { data: site } = await supabase
    .from("sites")
    .select("id")
    .eq("id", siteId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  // RLS already scopes this to the caller's own sites; the explicit
  // ownership check above is what turns a foreign site_id into a clean
  // 404 instead of a silently empty list.
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, created_at, last_used_at, revoked_at")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Query failed" }, { status: 500 });
  return NextResponse.json({ keys: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const siteId = typeof body.site_id === "string" ? body.site_id : null;
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : null;
  if (!siteId) return NextResponse.json({ error: "site_id is required" }, { status: 400 });

  const { data: site } = await supabase
    .from("sites")
    .select("id")
    .eq("id", siteId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const plan = await getUserPlan(supabase, user.id);
  if (!planHas(plan, "api")) {
    return NextResponse.json({ error: "upgrade_required", plan, feature: "api" }, { status: 402 });
  }

  const { plaintext, prefix, hash } = generateApiKey();

  const { data, error } = await supabase
    .from("api_keys")
    .insert({ site_id: siteId, name, key_prefix: prefix, key_hash: hash })
    .select("id, name, key_prefix, created_at")
    .single();

  if (error) return NextResponse.json({ error: "Could not create key" }, { status: 500 });

  // The only moment the plaintext ever leaves the server.
  return NextResponse.json({ ...data, key: plaintext });
}
