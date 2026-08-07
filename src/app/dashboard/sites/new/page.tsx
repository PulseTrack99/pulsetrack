"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, Globe, Loader2, Copy, Check, Lock } from "lucide-react";

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
  const [copied, setCopied] = useState(false);

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

    const { data, error: insertError } = await supabase
      .from("sites")
      .insert({
        user_id: user.id,
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

  function getTrackingScript(siteId: string) {
    return `<script defer src="${window.location.origin}/t.js" data-site="${siteId}"></script>`;
  }

  async function copyScript() {
    if (!created) return;
    await navigator.clipboard.writeText(getTrackingScript(created.id));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Success state — show tracking script
  if (created) {
    return (
      <div className="mx-auto max-w-lg py-8">
        <div className="text-center mb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 mb-4">
            <Check className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold">Site ajouté !</h1>
          <p className="mt-2 text-sm text-muted">
            Copiez ce script et collez-le dans le{" "}
            <code className="rounded bg-surface px-1.5 py-0.5 text-xs font-mono">
              &lt;head&gt;
            </code>{" "}
            de votre site <strong>{created.domain}</strong>
          </p>
        </div>

        {/* Script to copy */}
        <div className="relative rounded-xl border border-border bg-surface p-4">
          <code className="block text-sm font-mono text-primary break-all leading-relaxed">
            {getTrackingScript(created.id)}
          </code>
          <button
            onClick={copyScript}
            className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg bg-background border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-hover"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                Copié !
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copier
              </>
            )}
          </button>
        </div>

        <div className="mt-8 flex gap-3">
          <a
            href="/dashboard"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            Aller au Dashboard
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
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
