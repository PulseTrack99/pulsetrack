import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

/**
 * Team roster + invites. Owner-only by design (RLS on team_members —
 * supabase/team.sql — only lets the literal owner_user_id manage
 * these rows): inviting/removing teammates reads as account
 * administration, closer to billing than to day-to-day analytics
 * work, so it stays out of the "full access" a member otherwise gets.
 */

const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // RLS-scoped: only returns rows if the caller is the literal owner —
  // a team member gets an empty roster here, not an error, since they
  // simply have nothing to administer.
  const { data: rows, error } = await supabase
    .from("team_members")
    .select("id, label, status, invite_token, created_at, accepted_at, member_user_id")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Query failed" }, { status: 500 });

  // Emails live in auth.users, which RLS can't reach — resolved with
  // the service role only for the rows this owner is already allowed
  // to see, never as a lookup path of its own.
  const memberIds = (rows ?? [])
    .map((r) => r.member_user_id)
    .filter((id): id is string => Boolean(id));

  const emailById = new Map<string, string>();
  await Promise.all(
    memberIds.map(async (id) => {
      const { data } = await serviceSupabase.auth.admin.getUserById(id);
      if (data.user?.email) emailById.set(id, data.user.email);
    })
  );

  const origin = new URL(req.url).origin;

  return NextResponse.json({
    members: (rows ?? []).map((r) => ({
      id: r.id,
      label: r.label,
      status: r.status,
      created_at: r.created_at,
      accepted_at: r.accepted_at,
      email: r.member_user_id ? (emailById.get(r.member_user_id) ?? null) : null,
      invite_url: r.status === "pending" ? `${origin}/invite/${r.invite_token}` : null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const label = typeof body.label === "string" ? body.label.trim().slice(0, 60) || null : null;

  const token = randomBytes(24).toString("base64url");

  // owner_user_id = user.id, enforced again by RLS's WITH CHECK — a
  // team member's own auth.uid() never matches an owner_user_id they
  // don't own, so this fails cleanly for them rather than creating a
  // confusing sub-invite.
  const { data, error } = await supabase
    .from("team_members")
    .insert({ owner_user_id: user.id, invite_token: token, label })
    .select("id, label, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Seul le propriétaire du compte peut inviter des coéquipiers." },
      { status: 403 }
    );
  }

  const origin = new URL(req.url).origin;

  return NextResponse.json({
    id: data.id,
    label: data.label,
    created_at: data.created_at,
    invite_url: `${origin}/invite/${token}`,
  });
}
