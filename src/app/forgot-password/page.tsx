"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Activity, ArrowRight, Loader2, MailCheck } from "lucide-react";

/**
 * Asking for a reset link.
 *
 * The product had a /login and a /signup and nothing between them, so a
 * customer who forgot their password had no recourse at all — recovery
 * meant somebody running a script with the service key.
 *
 * This page has to exist for a second reason that is easy to miss: the
 * browser client uses PKCE, so the link in the email can only be
 * completed by the browser that asked for it — the code verifier is
 * stored here when this form is submitted. A recovery mail triggered
 * from anywhere else lands on /login?error=auth however valid its token,
 * which is exactly what happens when you try to be helpful from a
 * terminal.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Whichever origin this page is served from, so the link comes
      // back to the same deployment instead of a hardcoded domain.
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Activity className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold">PulseTrack</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Mot de passe oublié</h1>
          <p className="mt-1 text-sm text-muted">
            On vous envoie un lien pour en choisir un nouveau.
          </p>
        </div>

        {sent ? (
          <div className="rounded-lg border border-border bg-surface p-5 text-center">
            <MailCheck className="mx-auto h-7 w-7 text-primary" />
            <p className="mt-3 text-sm font-medium">Lien envoyé</p>
            {/* Deliberately not "if this address has an account": the
                message is the same either way, so nobody can use this
                form to find out who is registered. */}
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              Si un compte existe pour <span className="font-medium">{email}</span>,
              un lien vient de partir. Il est valable une heure, et n&apos;est
              utilisable que depuis ce navigateur. Pensez aux indésirables.
            </p>
            <a
              href="/login"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              Retour à la connexion
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="vous@exemple.com"
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
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
                  Envoyer le lien
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted">
          Vous vous en souvenez ?{" "}
          <a href="/login" className="font-medium text-primary hover:underline">
            Se connecter
          </a>
        </p>
      </div>
    </div>
  );
}
