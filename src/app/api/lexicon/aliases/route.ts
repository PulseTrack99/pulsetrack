import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchema } from "@/lib/schema-guard";

/**
 * The aliases alone — no aggregate, no period.
 *
 * The Lexicon screen already returns these, but it runs a grouped scan
 * over every event to do it. The screens that merely need to *display*
 * a name correctly should not pay for that, and they ask on every
 * render of a list.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const siteId = new URL(req.url).searchParams.get("site_id");
  if (!siteId) return NextResponse.json({ error: "site_id is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("event_lexicon")
    .select("name, display_name")
    .eq("site_id", siteId)
    .not("display_name", "is", null);

  if (error) {
    // No lexicon table yet simply means no aliases — the screens that
    // call this must keep working, showing raw names.
    if (isMissingSchema(error)) return NextResponse.json({ aliases: {} });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    aliases: Object.fromEntries(
      (data ?? []).map((r) => [r.name, r.display_name as string])
    ),
  });
}
