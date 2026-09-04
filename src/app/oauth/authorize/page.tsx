import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { resolveAccountOwner } from "@/lib/team";
import { resolveClientMetadata, generateAuthCode, AUTH_CODE_TTL_MS } from "@/lib/oauth";
import { Sparkles, ShieldCheck } from "lucide-react";

/**
 * The OAuth consent screen — "Se connecter avec PulseTrack". An MCP
 * client (Claude.ai's connector settings, ChatGPT, ...) lands here
 * after discovering this authorization server via the protected
 * resource metadata (src/app/.well-known/oauth-protected-resource)
 * and its own 401 challenge on /api/mcp.
 *
 * Server component: validates the request, requires login (redirects
 * to /login?next=... and back), resolves the client's identity via
 * CIMD (src/lib/oauth.ts), and lets the account owner pick which
 * site to grant access to. Approval is a server action so the
 * validated params travel via a bound closure, never re-trusted from
 * hidden form fields.
 */

interface Search {
  response_type?: string;
  client_id?: string;
  redirect_uri?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  state?: string;
  scope?: string;
}

function ErrorScreen({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
        <h1 className="text-lg font-semibold text-red-700 dark:text-red-400">{title}</h1>
        <p className="mt-2 text-sm text-red-600 dark:text-red-300">{body}</p>
      </div>
    </div>
  );
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const {
    response_type,
    client_id,
    redirect_uri,
    code_challenge,
    code_challenge_method,
    state,
    scope,
  } = params;

  // Malformed requests with no trustworthy redirect_uri yet are shown
  // an error directly — redirecting back to an unvalidated URL is
  // exactly the open-redirect this flow exists to prevent.
  if (!client_id || !redirect_uri) {
    return (
      <ErrorScreen
        title="Requête invalide"
        body="Il manque client_id ou redirect_uri. Cette page est destinée à être ouverte par un client MCP, pas visitée directement."
      />
    );
  }
  if (response_type !== "code") {
    return <ErrorScreen title="Requête invalide" body="response_type doit être 'code'." />;
  }
  if (!code_challenge || code_challenge_method !== "S256") {
    return (
      <ErrorScreen
        title="Requête invalide"
        body="PKCE (code_challenge avec code_challenge_method=S256) est requis."
      />
    );
  }

  const client = await resolveClientMetadata(client_id);
  if (!client || !client.redirectUris.includes(redirect_uri)) {
    return (
      <ErrorScreen
        title="Application non reconnue"
        body="Impossible de vérifier cette application, ou l'URL de redirection ne correspond pas à celle déclarée. Par sécurité, l'autorisation est refusée."
      />
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const here = `/oauth/authorize?${new URLSearchParams(
      params as Record<string, string>
    ).toString()}`;
    redirect(`/login?next=${encodeURIComponent(here)}`);
  }

  // RLS already scopes this to sites the caller owns or was added to
  // as a team member.
  const { data: sites } = await supabase.from("sites").select("id, name, domain");

  if (!sites || sites.length === 0) {
    return (
      <ErrorScreen
        title="Aucun site"
        body="Ajoutez d'abord un site depuis votre dashboard PulseTrack avant de connecter une application."
      />
    );
  }

  async function authorize(formData: FormData) {
    "use server";

    const siteId = formData.get("site_id") as string;
    const decision = formData.get("decision") as string;

    const redirectUrl = new URL(redirect_uri!);
    if (state) redirectUrl.searchParams.set("state", state);

    if (decision !== "allow") {
      redirectUrl.searchParams.set("error", "access_denied");
      redirect(redirectUrl.toString());
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Re-verify the chosen site is one this caller can actually
    // access — a tampered form field must not be able to name a
    // foreign site_id. RLS on `sites` is the real guard here.
    const { data: site } = await supabase.from("sites").select("id").eq("id", siteId).maybeSingle();
    if (!site) {
      redirectUrl.searchParams.set("error", "invalid_request");
      redirect(redirectUrl.toString());
    }

    const ownerId = await resolveAccountOwner(supabase, user.id);
    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const code = generateAuthCode();
    await service.from("oauth_codes").insert({
      code_hash: code.hash,
      user_id: ownerId,
      site_id: siteId,
      client_id: client_id!,
      redirect_uri: redirect_uri!,
      code_challenge: code_challenge!,
      scope: scope || "read",
      expires_at: new Date(Date.now() + AUTH_CODE_TTL_MS).toISOString(),
    });

    redirectUrl.searchParams.set("code", code.plaintext);
    redirect(redirectUrl.toString());
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-lg font-bold">PulseTrack</span>
        </div>

        <h1 className="mt-5 text-lg font-semibold leading-snug">
          <span className="text-primary">{client.name}</span> souhaite accéder à vos données
          PulseTrack
        </h1>
        <p className="mt-2 text-sm text-muted">
          Connecté en tant que <span className="font-medium">{user.email}</span>
        </p>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-background p-3 text-xs text-muted">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <span>
            Accès en lecture seule à un site de votre choix — pas de mot de passe ni de clé
            partagés, révocable à tout moment depuis Paramètres.
          </span>
        </div>

        <form action={authorize} className="mt-5 space-y-4">
          <div>
            <label htmlFor="site_id" className="block text-xs font-medium mb-1.5">
              Site à autoriser
            </label>
            <select
              id="site_id"
              name="site_id"
              defaultValue={sites[0].id}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.domain})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              name="decision"
              value="deny"
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface-hover"
            >
              Refuser
            </button>
            <button
              type="submit"
              name="decision"
              value="allow"
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              Autoriser
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
