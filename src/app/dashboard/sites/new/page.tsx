"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resolveAccountOwner } from "@/lib/team";
import { Globe, Loader2, Lock } from "lucide-react";
import { SetupGuide } from "@/components/setup-guide";

/**
 * The site-count cap lives in a database trigger (supabase/quotas.sql),
 * not in application code — sites are inserted straight from the browser
 * with the user's own token, so a check here alone would be advisory
 * only. The trigger raises `site_limit_reached:<n>`, which this turns
 * into copy someone can act on.
 */
function readLimitError(message: string): number | null {
  const m = message.match(/site_limit_reached:(\d+)/);
  return m ? Number(m[1]) : null;
}

export default function NewSitePage() {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ id: string; domain: string } | null>(
    null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setLimitReached(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Vous devez être connecté.");
      setLoading(false);
      return;
    }

    // Clean domain (remove protocol, trailing slash)
    const cleanDomain = domain
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "")
      .toLowerCase();

    // A team member's new site belongs to the account that invited
    // them, not to their own otherwise-empty personal account — that
    // is what keeps it visible to the rest of the team and counted
    // against the right plan's site limit.
    const accountOwnerId = await resolveAccountOwner(supabase, user.id);

    const { data, error: insertError } = await supabase
      .from("sites")
      .insert({
        user_id: accountOwnerId,
        name,
        domain: cleanDomain,
      })
      .select()
      .single();

    if (insertError) {
      const limit = readLimitError(insertError.message);
      if (limit !== null) {
        setLimitReached(limit);
      } else {
        setError(insertError.message);
      }
      setLoading(false);
    } else {
      setCreated({ id: data.id, domain: cleanDomain });
      setLoading(false);
    }
  }

  // Success state — the guided install, which verifies itself rather
  // than handing over a snippet and wishing you luck.
  if (created) {
    return (
      <div className="mx-auto max-w-2xl py-6">
        <div className="mb-5">
          <h1 className="text-[17px] font-semibold">
            {created.domain} est prêt à recevoir des données
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            Trois étapes, dont la dernière se coche toute seule.
          </p>
        </div>

        <SetupGuide
          siteId={created.id}
          domain={created.domain}
          origin={process.env.NEXT_PUBLIC_SITE_URL ?? "https://pulsetrack.eu"}
        />
      </div>
    );
  }

  // Plan limit reached — this is not something retrying the form fixes.
  if (limitReached !== null) {
    return (
      <div className="mx-auto max-w-lg py-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Lock className="h-7 w-7 text-primary" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">
          Limite de {limitReached} site{limitReached > 1 ? "s" : ""} atteinte
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          Votre offre actuelle permet {limitReached} site
          {limitReached > 1 ? "s" : ""}. Passez à une offre supérieure pour en
          ajouter un nouveau.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <a
            href="/dashboard/upgrade"
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            Voir les offres
          </a>
          <a
            href="/dashboard"
            className="flex items-center justify-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-surface-hover"
          >
            Retour au dashboard
          </a>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="mx-auto max-w-lg py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Ajouter un site</h1>
        <p className="mt-2 text-sm text-muted">
          Entrez les informations de votre site web pour commencer le tracking.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1.5">
            Nom du site
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Mon super site"
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label htmlFor="domain" className="block text-sm font-medium mb-1.5">
            Domaine
          </label>
          <div className="flex items-center rounded-lg border border-border bg-surface overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <span className="pl-3.5 text-sm text-muted">https://</span>
            <input
              id="domain"
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
              placeholder="monsite.com"
              className="flex-1 bg-transparent px-1 py-2.5 text-sm outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Globe className="h-4 w-4" />
              Ajouter ce site
            </>
          )}
        </button>
      </form>
    </div>
  );
}
