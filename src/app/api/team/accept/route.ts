import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * Accepts a team invite by token.
 *
 * The pending row has no member_user_id yet, so RLS ("Members see
 * their own membership") cannot find it for the accepting user — the
 * lookup has to go through the service role, gated entirely by
 * knowing the random token itself rather than by row ownership.
 */
const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : null;
  if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 });

  const { data: invite } = await serviceSupabase
    .from("team_members")
    .select("id, owner_user_id, status, member_user_id")
    .eq("invite_token", token)
    .maybeSingle();

  if (!invite || invite.status !== "pending" || invite.member_user_id) {
    return NextResponse.json({ error: "Invitation invalide ou déjà utilisée." }, { status: 404 });
  }

  if (invite.owner_user_id === user.id) {
    return NextResponse.json({ error: "Vous ne pouvez pas accepter votre propre invitation." }, { status: 400 });
  }

  // v1 keeps one account per person (supabase/team.sql) — block joining
  // a second team rather than silently switching which account
  // resolveAccountOwner returns for everything else this user does.
  const { data: existingMembership } = await serviceSupabase
    .from("team_members")
    .select("id")
    .eq("member_user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (existingMembership) {
    return NextResponse.json(
      { error: "Vous faites déjà partie d'une autre équipe PulseTrack." },
      { status: 409 }
    );
  }

  // Same reasoning: joining someone else's account would make this
  // person's own sites unreachable for as long as the membership is
  // active (every route resolves through the invited-into account
  // instead) — simplest safe v1 rule is to not let that situation
  // happen rather than build an account switcher.
  const { count: ownSiteCount } = await serviceSupabase
    .from("sites")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((ownSiteCount ?? 0) > 0) {
    return NextResponse.json(
      {
        error:
          "Ce compte a déjà ses propres sites. Utilisez un compte sans site existant pour rejoindre une équipe.",
      },
      { status: 409 }
    );
  }

  const { error: updateError } = await serviceSupabase
    .from("team_members")
    .update({ member_user_id: user.id, status: "active", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  if (updateError) {
    return NextResponse.json({ error: "Impossible d'accepter l'invitation." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
