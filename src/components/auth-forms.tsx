"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Activity, ArrowRight, Loader2, MailCheck, ShieldAlert } from "lucide-react";

/**
 * The four screens outside the app: signing in, signing up, asking for a
 * reset link, choosing the new password.
 *
 * They were the last French-only surface left after the dashboard was
 * translated, which is the worst place for it — someone arriving from an
 * English landing page hit a French form at the exact moment they were
 * deciding whether to trust the product.
 *
 * Their pages are server components that read the cookie and hand the
 * strings down, the same way the marketing pages do. That is also why
 * the forms live together here: four near-identical shells sharing one
 * label set, rather than four files each rebuilding the same card.
 */

export interface AuthLabels {
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  login: {
    title: string;
    subtitle: string;
    passwordPlaceholder: string;
    forgot: string;
    submit: string;
    noAccount: string;
    createAccount: string;
  };
  signup: {
    title: string;
    subtitle: string;
    passwordPlaceholder: string;
    submit: string;
    haveAccount: string;
    login: string;
  };
  forgot: {
    title: string;
    subtitle: string;
    submit: string;
    sentTitle: string;
    /** {email} is the address that was typed in. */
    sentBody: string;
    backToLogin: string;
    remember: string;
    login: string;
  };
  reset: {
    title: string;
    subtitle: string;
    newLabel: string;
    /** {n} is the minimum length. */
    newPlaceholder: string;
    confirmLabel: string;
    confirmPlaceholder: string;
    submit: string;
    mismatch: string;
    /** {n} is the minimum length. */
    tooShort: string;
    expiredTitle: string;
    expiredBody: string;
    askNew: string;
  };
}

const MIN_LENGTH = 8;

/** Only a same-origin relative path is accepted — a bare "/..." with no
 *  leading "//" (that second form is a protocol-relative URL and would
 *  silently send a logged-in user off-site). Anything else falls back
 *  to the dashboard. Used to return to /oauth/authorize after login
 *  (src/app/oauth/authorize/page.tsx) instead of always landing on
 *  /dashboard. */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Activity className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold">PulseTrack</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>
        {children}
        {footer && <p className="mt-6 text-center text-sm text-muted">{footer}</p>}
      </div>
    </div>
  );
}

const FIELD =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20";

const SUBMIT =
  "flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50";

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
      {children}
    </div>
  );
}

function Submit({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading} className={SUBMIT}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          {label}
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </button>
  );
}

/* ── Sign in ── */
export function LoginForm({ t }: { t: AuthLabels }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const next = safeNext(useSearchParams().get("next"));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      window.location.href = next;
    }
  }

  return (
    <AuthShell
      title={t.login.title}
      subtitle={t.login.subtitle}
      footer={
        <>
          {t.login.noAccount}{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            {t.login.createAccount}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBox>{error}</ErrorBox>}

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            {t.emailLabel}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder={t.emailPlaceholder}
            className={FIELD}
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <label htmlFor="password" className="block text-sm font-medium">
              {t.passwordLabel}
            </label>
            {/* The way back in. There was none: a customer who forgot
                their password had /login, /signup, and nothing else. */}
            <Link
              href="/forgot-password"
              className="text-[13px] text-muted transition-colors hover:text-primary"
            >
              {t.login.forgot}
            </Link>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder={t.login.passwordPlaceholder}
            className={FIELD}
          />
        </div>

        <Submit loading={loading} label={t.login.submit} />
      </form>
    </AuthShell>
  );
}

/* ── Sign up ── */
export function SignupForm({ t }: { t: AuthLabels }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      window.location.href = "/dashboard";
    }
  }

  return (
    <AuthShell
      title={t.signup.title}
      subtitle={t.signup.subtitle}
      footer={
        <>
          {t.signup.haveAccount}{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t.signup.login}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBox>{error}</ErrorBox>}

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            {t.emailLabel}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder={t.emailPlaceholder}
            className={FIELD}
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
            {t.passwordLabel}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder={t.signup.passwordPlaceholder}
            className={FIELD}
          />
        </div>

        <Submit loading={loading} label={t.signup.submit} />
      </form>
    </AuthShell>
  );
}

/* ── Ask for a reset link ── */
export function ForgotPasswordForm({ t }: { t: AuthLabels }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    // The browser client uses PKCE, so the link in the email can only be
    // completed by the browser that asked for it — the verifier is
    // stored here, on submit. A recovery mail triggered anywhere else
    // lands on /login?error=auth however valid its token.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
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
    <AuthShell
      title={t.forgot.title}
      subtitle={t.forgot.subtitle}
      footer={
        <>
          {t.forgot.remember}{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t.forgot.login}
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="rounded-lg border border-border bg-surface p-5 text-center">
          <MailCheck className="mx-auto h-7 w-7 text-primary" />
          <p className="mt-3 text-sm font-medium">{t.forgot.sentTitle}</p>
          {/* Deliberately conditional wording: the message is the same
              whether or not the address has an account, so the form
              cannot be used to find out who is registered. */}
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            {t.forgot.sentBody.replace("{email}", email)}
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            {t.forgot.backToLogin}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <ErrorBox>{error}</ErrorBox>}

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
              {t.emailLabel}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder={t.emailPlaceholder}
              className={FIELD}
            />
          </div>

          <Submit loading={loading} label={t.forgot.submit} />
        </form>
      )}
    </AuthShell>
  );
}

/* ── Choose the new password ── */
export function ResetPasswordForm({ t }: { t: AuthLabels }) {
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
      setError(t.reset.mismatch);
      return;
    }
    if (password.length < MIN_LENGTH) {
      setError(t.reset.tooShort.replace("{n}", String(MIN_LENGTH)));
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
    <AuthShell title={t.reset.title} subtitle={t.reset.subtitle}>
      {ready === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-light" />
        </div>
      ) : !ready ? (
        // /auth/callback exchanges the recovery code before anyone gets
        // here, so the session is the proof of the link. Arriving without
        // one has to be a dead end rather than a form that fails on save.
        <div className="rounded-lg border border-border bg-surface p-5 text-center">
          <ShieldAlert className="mx-auto h-7 w-7 text-amber" />
          <p className="mt-3 text-sm font-medium">{t.reset.expiredTitle}</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            {t.reset.expiredBody}
          </p>
          <Link
            href="/forgot-password"
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            {t.reset.askNew}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <ErrorBox>{error}</ErrorBox>}

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
              {t.reset.newLabel}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              minLength={MIN_LENGTH}
              placeholder={t.reset.newPlaceholder.replace("{n}", String(MIN_LENGTH))}
              className={FIELD}
            />
          </div>

          <div>
            <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium">
              {t.reset.confirmLabel}
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder={t.reset.confirmPlaceholder}
              className={FIELD}
            />
          </div>

          <Submit loading={loading} label={t.reset.submit} />
        </form>
      )}
    </AuthShell>
  );
}
