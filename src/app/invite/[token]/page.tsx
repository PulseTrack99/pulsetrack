import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { Users } from "lucide-react";
import { AcceptInviteButton } from "@/components/accept-invite-button";

const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Service role: this page has to be readable by someone who isn't
  // signed in yet, before any RLS-scoped identity exists for them.
  const { data: invite } = await serviceSupabase
    .from("team_members")
    .select("status, member_user_id, owner_user_id, label")
    .eq("invite_token", token)
    .maybeSingle();

  if (!invite || invite.status !== "pending" || invite.member_user_id) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-xl font-bold">Invitation invalide</h1>
        <p className="mt-2 text-sm text-muted">
          Ce lien d&apos;invitation n&apos;existe plus ou a déjà été utilisé.
        </p>
        <a href="/" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
          Retour à l&apos;accueil
        </a>
      </div>
    );
  }

  const { data: ownerData } = await serviceSupabase.auth.admin.getUserById(invite.owner_user_id);
  const ownerEmail = ownerData.user?.email ?? "ce compte";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-md py-16">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Users className="h-7 w-7 text-primary" />
        </div>
        <h1 className="mt-4 text-xl font-bold">Invitation PulseTrack</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          Vous êtes invité{invite.label ? ` (${invite.label})` : ""} à rejoindre le
          compte de <strong>{ownerEmail}</strong> — accès complet à ses sites,
          statistiques et outils.
        </p>
      </div>

      <div className="mt-8">
        {user ? (
          <AcceptInviteButton token={token} />
        ) : (
          <div className="rounded-lg border border-border bg-surface p-4 text-center">
            <p className="text-sm text-muted">
              Connectez-vous ou créez un compte, puis revenez sur ce lien pour
              l&apos;accepter.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <a
                href="/login"
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-hover"
              >
                Se connecter
              </a>
              <a
                href="/signup"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
              >
                Créer un compte
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
