import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Dashboard annotations — mark a release, a campaign, a price change
 * on the visitors chart (src/components/dashboard-content.tsx). RLS
 * (supabase migration "annotations") scopes everything to sites the
 * caller owns or was added to as a team member.
 */

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("site_id");
  const since = searchParams.get("since"); // YYYY-MM-DD
  if (!siteId) return NextResponse.json({ error: "site_id is required" }, { status: 400 });

  let query = supabase
    .from("annotations")
    .select("id, date, label")
    .eq("site_id", siteId)
    .order("date", { ascending: true });
  if (since) query = query.gte("date", since);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Query failed" }, { status: 500 });
  return NextResponse.json({ annotations: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const siteId = typeof body.site_id === "string" ? body.site_id : null;
  const date = typeof body.date === "string" ? body.date : null;
  const label = typeof body.label === "string" ? body.label.trim() : "";

  if (!siteId || !date) {
    return NextResponse.json({ error: "site_id and date are required" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }
  if (!label || label.length > 140) {
    return NextResponse.json({ error: "label must be 1-140 characters" }, { status: 400 });
  }

  // RLS turns an attempt to annotate a foreign site into a clean failure.
  const { data, error } = await supabase
    .from("annotations")
    .insert({ site_id: siteId, date, label, created_by: user.id })
    .select("id, date, label")
    .single();

  if (error) return NextResponse.json({ error: "Could not save annotation" }, { status: 500 });
  return NextResponse.json({ annotation: data });
}
