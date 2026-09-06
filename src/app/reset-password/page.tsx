"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Activity, ArrowRight, Loader2, ShieldAlert } from "lucide-react";

const MIN_LENGTH = 8;

/**
 * Choosing the new password, after the link from the email.
 *
 * By the time anyone gets here, /auth/callback has already exchanged
 * the recovery code for a session, so this page is just an authenticated
 * updateUser. The session is the proof of the link — which is why
 * arriving without one has to be a dead end rather than a form that
 * fails on submit.
 */
export default function ResetPasswordPage() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setReady(Boolean(data.session));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < MIN_LENGTH) {
      setError(`Le mot de passe doit faire au moins ${MIN_LENGTH} caractères.`);
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    window.location.href = "/dashboard";
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Activity className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold">PulseTrack</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Nouveau mot de passe</h1>
          <p className="mt-1 text-sm text-muted">
            Choisissez-en un, vous serez connecté dans la foulée.
          </p>
        </div>

        {ready === null ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-light" />
          </div>
        ) : !ready ? (
          <div className="rounded-lg border border-border bg-surface p-5 text-center">
            <ShieldAlert className="mx-auto h-7 w-7 text-amber" />
            <p className="mt-3 text-sm font-medium">Lien expiré ou déjà utilisé</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              Un lien de réinitialisation ne sert qu&apos;une fois, dure une heure,
              et ne fonctionne que dans le navigateur qui l&apos;a demandé.
              Redemandez-en un.
            </p>
            <a
              href="/forgot-password"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              Demander un nouveau lien
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
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                Nouveau mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                minLength={MIN_LENGTH}
                placeholder={`Au moins ${MIN_LENGTH} caractères`}
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium">
                Confirmation
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="Retapez le mot de passe"
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
                  Enregistrer et se connecter
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
