"use client";

import { useState } from "react";
import {
  User,
  Lock,
  Globe,
  Trash2,
  AlertTriangle,
  Loader2,
  Check,
  Copy,
  Share2,
  Link,
  ExternalLink,
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Site {
  id: string;
  name: string;
  domain: string;
  created_at: string;
  public_share_id: string | null;
}

export function SettingsPanel({
  user,
  sites: initialSites,
}: {
  user: SupabaseUser;
  sites: Site[];
}) {
  const [sites, setSites] = useState(initialSites);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="mt-1 text-sm text-muted">
          Gérez votre compte et vos sites.
        </p>
      </div>

      {/* Account info */}
      <AccountSection user={user} />

      {/* Change password */}
      <PasswordSection />

      {/* Sites management */}
      <SitesSection
        sites={sites}
        onSiteDeleted={(siteId) =>
          setSites(sites.filter((s) => s.id !== siteId))
        }
      />

      {/* Danger zone */}
      <DangerZone />
    </div>
  );
}

/* ─────────── ACCOUNT INFO ─────────── */
function AccountSection({ user }: { user: SupabaseUser }) {
  return (
    <section className="rounded-xl border border-border bg-background p-6">
      <div className="flex items-center gap-3 mb-4">
        <User className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Compte</h2>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg bg-surface px-4 py-3">
          <span className="text-sm text-muted">Email</span>
          <span className="text-sm font-medium">{user.email}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-surface px-4 py-3">
          <span className="text-sm text-muted">Plan</span>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Free
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-surface px-4 py-3">
          <span className="text-sm text-muted">Membre depuis</span>
          <span className="text-sm font-medium">
            {new Date(user.created_at).toLocaleDateString("fr-FR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
      </div>
    </section>
  );
}

/* ─────────── PASSWORD ─────────── */
function PasswordSection() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (password !== confirm) {
      setMessage({
        type: "error",
        text: "Les mots de passe ne correspondent pas",
      });
      return;
    }

    if (password.length < 8) {
      setMessage({
        type: "error",
        text: "Le mot de passe doit contenir au moins 8 caractères",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/settings/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setMessage({
          type: "success",
          text: "Mot de passe modifié avec succès",
        });
        setPassword("");
        setConfirm("");
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Erreur" });
      }
    } catch {
      setMessage({ type: "error", text: "Erreur réseau" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-background p-6">
      <div className="flex items-center gap-3 mb-4">
        <Lock className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Changer le mot de passe</h2>
      </div>

      <form onSubmit={handleChangePassword} className="space-y-4">
        {message && (
          <div
            className={`rounded-lg border p-3 text-sm ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"
                : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Nouveau mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Minimum 8 caractères"
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Confirmer le mot de passe
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            placeholder="Retapez le mot de passe"
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Modifier le mot de passe
        </button>
      </form>
    </section>
  );
}

/* ─────────── SITES MANAGEMENT ─────────── */
function SitesSection({
  sites,
  onSiteDeleted,
}: {
  sites: Site[];
  onSiteDeleted: (siteId: string) => void;
}) {
  const [siteShareIds, setSiteShareIds] = useState<Record<string, string | null>>(
    Object.fromEntries(sites.map((s) => [s.id, s.public_share_id]))
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const [togglingShareId, setTogglingShareId] = useState<string | null>(null);

  async function handleDeleteSite(siteId: string) {
    setDeletingId(siteId);
    try {
      const res = await fetch(`/api/sites/${siteId}`, { method: "DELETE" });
      if (res.ok) {
        onSiteDeleted(siteId);
        setConfirmDeleteId(null);
      }
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleShare(siteId: string) {
    setTogglingShareId(siteId);
    try {
      const currentShareId = siteShareIds[siteId];
      if (currentShareId) {
        // Disable sharing
        const res = await fetch(`/api/sites/${siteId}/share`, { method: "DELETE" });
        if (res.ok) {
          setSiteShareIds({ ...siteShareIds, [siteId]: null });
        }
      } else {
        // Enable sharing
        const res = await fetch(`/api/sites/${siteId}/share`, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          setSiteShareIds({ ...siteShareIds, [siteId]: data.share_id });
        }
      }
    } catch {
      // silent
    } finally {
      setTogglingShareId(null);
    }
  }

  function copyShareLink(shareId: string) {
    const url = `${window.location.origin}/public/${shareId}`;
    navigator.clipboard.writeText(url);
    setCopiedShareId(shareId);
    setTimeout(() => setCopiedShareId(null), 2000);
  }

  function copyScript(siteId: string, domain: string) {
    const script = `<script defer data-site="${siteId}" src="https://pulsetrack-pulsetrack99s-projects.vercel.app/t.js"></script>`;
    navigator.clipboard.writeText(script);
    setCopiedId(siteId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <section className="rounded-xl border border-border bg-background p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Mes sites</h2>
        </div>
        <a
          href="/dashboard/sites/new"
          className="text-sm text-primary font-medium hover:underline"
        >
          + Ajouter un site
        </a>
      </div>

      {sites.length === 0 ? (
        <p className="text-sm text-muted text-center py-6">
          Aucun site ajouté.
        </p>
      ) : (
        <div className="space-y-3">
          {sites.map((site) => (
            <div
              key={site.id}
              className="rounded-lg border border-border bg-surface p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">{site.name}</h3>
                  <p className="text-xs text-muted mt-0.5">{site.domain}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyScript(site.id, site.domain)}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-hover transition-colors"
                    title="Copier le script de tracking"
                  >
                    {copiedId === site.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        Copié
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Script
                      </>
                    )}
                  </button>

                  {confirmDeleteId === site.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDeleteSite(site.id)}
                        disabled={deletingId === site.id}
                        className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        {deletingId === site.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Confirmer"
                        )}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-hover"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(site.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 transition-colors"
                      title="Supprimer ce site"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
              {/* Public share section */}
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share2 className="h-3.5 w-3.5 text-muted" />
                    <span className="text-xs text-muted">Dashboard public</span>
                  </div>
                  <button
                    onClick={() => toggleShare(site.id)}
                    disabled={togglingShareId === site.id}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      siteShareIds[site.id]
                        ? "bg-primary"
                        : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  >
                    {togglingShareId === site.id ? (
                      <Loader2 className="h-3 w-3 animate-spin mx-auto text-white" />
                    ) : (
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                          siteShareIds[site.id]
                            ? "translate-x-[18px]"
                            : "translate-x-[3px]"
                        }`}
                      />
                    )}
                  </button>
                </div>
                {siteShareIds[site.id] && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 rounded-md bg-background border border-border px-2.5 py-1.5 text-xs text-muted truncate font-mono">
                      {window.location.origin}/public/{siteShareIds[site.id]}
                    </div>
                    <button
                      onClick={() => copyShareLink(siteShareIds[site.id]!)}
                      className="flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs font-medium hover:bg-surface-hover transition-colors"
                    >
                      {copiedShareId === siteShareIds[site.id] ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Link className="h-3 w-3" />
                      )}
                    </button>
                    <a
                      href={`/public/${siteShareIds[site.id]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center rounded-md border border-border px-2 py-1.5 text-xs hover:bg-surface-hover transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              <p className="mt-2 text-xs text-muted">
                Ajouté le{" "}
                {new Date(site.created_at).toLocaleDateString("fr-FR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ─────────── DANGER ZONE ─────────── */
function DangerZone() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleDeleteAccount() {
    if (confirmText !== "SUPPRIMER") return;

    setLoading(true);
    try {
      const res = await fetch("/api/settings/delete-account", {
        method: "DELETE",
      });

      if (res.ok) {
        window.location.href = "/";
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-red-200 bg-background p-6 dark:border-red-800">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="h-5 w-5 text-red-500" />
        <h2 className="text-lg font-semibold text-red-500">Zone danger</h2>
      </div>

      <p className="text-sm text-muted mb-4">
        La suppression de votre compte est irréversible. Toutes vos données,
        sites et analytics seront définitivement supprimés.
      </p>

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 transition-colors"
        >
          Supprimer mon compte
        </button>
      ) : (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-3">
            Tapez <strong>SUPPRIMER</strong> pour confirmer la suppression
            définitive de votre compte.
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="SUPPRIMER"
            className="w-full rounded-lg border border-red-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:bg-red-900/30 dark:border-red-700 mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={handleDeleteAccount}
              disabled={confirmText !== "SUPPRIMER" || loading}
              className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Supprimer définitivement
            </button>
            <button
              onClick={() => {
                setShowConfirm(false);
                setConfirmText("");
              }}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-hover transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
