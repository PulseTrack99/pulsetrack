"use client";

import { useEffect, useState } from "react";
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
  Code2,
  Plus,
  Ban,
  Users,
  Mail,
  Bell,
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useT } from "@/components/locale-context";
import { useSearchParams } from "next/navigation";

interface Site {
  id: string;
  name: string;
  domain: string;
  created_at: string;
  public_share_id: string | null;
}

const TABS = [
  { id: "compte", key: "account" },
  { id: "sites", key: "sites" },
  { id: "api", key: "api" },
  { id: "equipe", key: "team" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SettingsPanel({
  user,
  origin,
  sites: initialSites,
  currentPlan = "free",
  hasApiAccess = false,
  teamOwnerEmail = null,
}: {
  user: SupabaseUser;
  /** Resolved by the server page — see the note there. */
  origin: string;
  sites: Site[];
  currentPlan?: string;
  hasApiAccess?: boolean;
  teamOwnerEmail?: string | null;
}) {
  const { t } = useT();
  const [sites, setSites] = useState(initialSites);
  const params = useSearchParams();
  const asked = params.get("tab");
  const [tab, setTab] = useState<TabId>(
    TABS.some((x) => x.id === asked) ? (asked as TabId) : "compte"
  );

  /* Six unrelated sections used to be stacked in one column: account,
     password, team, sites, API keys and the delete-account zone, all
     scrolled past each other. Settings is the one screen where you
     arrive knowing what you came to change, so it is split the way
     Mixpanel splits theirs — a sub-navigation, one subject at a time. */
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-0.5 border-b border-border">
        {TABS.map((tab_) => (
          <button
            key={tab_.id}
            onClick={() => setTab(tab_.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-[13px] transition-colors ${
              tab === tab_.id
                ? "border-primary font-medium text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.settings.tabs[tab_.key]}
          </button>
        ))}
      </div>

      <div className="max-w-3xl space-y-4">
        {tab === "compte" && (
          <>
            <AccountSection user={user} plan={currentPlan} />
            <PasswordSection />
            <DangerZone />
          </>
        )}

        {tab === "sites" && (
          <SitesSection
            sites={sites}
            origin={origin}
            onSiteDeleted={(siteId) =>
              setSites(sites.filter((s) => s.id !== siteId))
            }
          />
        )}

        {tab === "api" && (
          <ApiKeysSection sites={sites} hasApiAccess={hasApiAccess} />
        )}

        {tab === "equipe" && (
          <TeamSection
            isMember={Boolean(teamOwnerEmail)}
            ownerEmail={teamOwnerEmail}
          />
        )}
      </div>
    </div>
  );
}

/* ─────────── ACCOUNT INFO ─────────── */
function AccountSection({ user, plan }: { user: SupabaseUser; plan: string }) {
  const { t, intl } = useT();
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  return (
    <section className="app-card">
      <div className="flex items-center gap-3 mb-4">
        <User className="h-4 w-4 text-primary" />
        <h2 className="text-[13.5px] font-semibold">{t.settings.account.title}</h2>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg bg-surface px-4 py-3">
          <span className="text-sm text-muted">{t.settings.account.email}</span>
          <span className="text-sm font-medium">{user.email}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-surface px-4 py-3">
          <span className="text-sm text-muted">{t.settings.account.plan}</span>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {planLabel}
            </span>
            {plan === "free" && (
              <a
                href="/dashboard/upgrade"
                className="text-xs text-primary font-medium hover:underline"
              >
                {t.settings.account.upgrade}
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-surface px-4 py-3">
          <span className="text-sm text-muted">{t.settings.account.memberSince}</span>
          <span className="text-sm font-medium">
            {new Date(user.created_at).toLocaleDateString(intl, {
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
  const { t } = useT();
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
        text: t.settings.password.mismatch,
      });
      return;
    }

    if (password.length < 8) {
      setMessage({
        type: "error",
        text: t.settings.password.tooShort,
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
          text: t.settings.password.changed,
        });
        setPassword("");
        setConfirm("");
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Erreur" });
      }
    } catch {
      setMessage({ type: "error", text: t.settings.password.networkError });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="app-card">
      <div className="flex items-center gap-3 mb-4">
        <Lock className="h-4 w-4 text-primary" />
        <h2 className="text-[13.5px] font-semibold">{t.settings.password.title}</h2>
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
            {t.settings.password.newPassword}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder={t.settings.password.minChars}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">
            {t.settings.password.confirm}
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            placeholder={t.settings.password.retype}
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
          {t.settings.password.submit}
        </button>
      </form>
    </section>
  );
}

/* ─────────── TEAM ─────────── */
interface TeamMember {
  id: string;
  label: string | null;
  status: "pending" | "active";
  email: string | null;
  invite_url: string | null;
  created_at: string;
}

function TeamSection({
  isMember,
  ownerEmail,
}: {
  isMember: boolean;
  ownerEmail: string | null;
}) {
  const { t } = useT();
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [inviting, setInviting] = useState(false);
  const [label, setLabel] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [revealUrl, setRevealUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (isMember) return;
    fetch("/api/team")
      .then((r) => r.json())
      .then((d) => setMembers(d.members ?? []));
  }, [isMember]);

  async function invite() {
    setInviting(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) return;
      setMembers((m) => [
        { id: data.id, label: data.label, status: "pending", email: null, invite_url: data.invite_url, created_at: data.created_at },
        ...(m ?? []),
      ]);
      setRevealUrl(data.invite_url);
      setShowForm(false);
      setLabel("");
    } finally {
      setInviting(false);
    }
  }

  async function remove(id: string) {
    setRemoving(id);
    try {
      const res = await fetch(`/api/team/${id}`, { method: "DELETE" });
      if (res.ok) setMembers((m) => (m ?? []).filter((x) => x.id !== id));
    } finally {
      setRemoving(null);
    }
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="app-card">
      <div className="flex items-center gap-3 mb-4">
        <Users className="h-4 w-4 text-primary" />
        <h2 className="text-[13.5px] font-semibold">{t.settings.team.title}</h2>
      </div>

      {isMember ? (
        <div className="flex items-center gap-2 rounded-lg bg-surface px-4 py-3 text-sm text-muted">
          <Mail className="h-4 w-4 shrink-0" />
          {t.settings.team.memberOf} <strong className="mx-1">{ownerEmail}</strong>{" "}
          {t.settings.team.memberOfSuffix}
        </div>
      ) : (
        <>
          <p className="text-xs text-muted mb-4">
            {t.settings.team.blurb}
          </p>

          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="mb-4 flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-hover transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              {t.settings.team.invite}
            </button>
          )}

          {showForm && (
            <div className="mb-4 flex items-center gap-2">
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t.settings.team.namePlaceholder}
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={invite}
                disabled={inviting}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
              >
                {inviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t.settings.team.generateLink}
              </button>
            </div>
          )}

          {revealUrl && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-900/20">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                {t.settings.team.shareLink}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 truncate rounded-md bg-white px-2.5 py-1.5 text-xs dark:bg-black/20">
                  {revealUrl}
                </code>
                <button
                  onClick={() => copyUrl(revealUrl)}
                  className="flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs font-medium hover:bg-surface-hover"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </button>
                <button
                  onClick={() => setRevealUrl(null)}
                  className="rounded-md border border-border px-2 py-1.5 text-xs font-medium hover:bg-surface-hover"
                >
                  OK
                </button>
              </div>
            </div>
          )}

          {members === null ? (
            <p className="text-xs text-muted-light">{t.settings.team.loading}</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">
              {t.settings.team.none}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-md bg-surface px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    {m.status === "active" ? (
                      <span className="font-medium">{m.email}</span>
                    ) : (
                      <span className="text-muted">
                        {t.settings.team.pending}{m.label ? ` (${m.label})` : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {m.status === "pending" && m.invite_url && (
                      <button
                        onClick={() => copyUrl(m.invite_url!)}
                        className="text-muted hover:text-foreground"
                        title={t.settings.team.copyLink}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => remove(m.id)}
                      disabled={removing === m.id}
                      className="flex items-center gap-1 text-red-500 hover:underline disabled:opacity-50"
                    >
                      {removing === m.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Ban className="h-3 w-3" />
                      )}
                      {m.status === "active" ? t.settings.team.removeMember : t.settings.team.cancel}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

/* ─────────── SITES MANAGEMENT ─────────── */
function SitesSection({
  sites,
  origin,
  onSiteDeleted,
}: {
  sites: Site[];
  origin: string;
  onSiteDeleted: (siteId: string) => void;
}) {
  const { t, intl } = useT();
  const [siteShareIds, setSiteShareIds] = useState<Record<string, string | null>>(
    Object.fromEntries(sites.map((s) => [s.id, s.public_share_id]))
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const [togglingShareId, setTogglingShareId] = useState<string | null>(null);
  interface AlertRuleState {
    enabled: boolean;
    threshold_pct: number;
    webhook_url: string | null;
  }
  const [alertRules, setAlertRules] = useState<Record<string, AlertRuleState>>({});
  const [savingAlertId, setSavingAlertId] = useState<string | null>(null);
  const [webhookDraft, setWebhookDraft] = useState<Record<string, string>>({});
  const [webhookError, setWebhookError] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      sites.map((s) =>
        fetch(`/api/alerts?site_id=${s.id}`)
          .then((r) => r.json())
          .then(
            (d) =>
              [s.id, d.rule ?? { enabled: false, threshold_pct: 50, webhook_url: null }] as const
          )
      )
    ).then((pairs) => {
      if (!cancelled) {
        setAlertRules(Object.fromEntries(pairs));
        setWebhookDraft(Object.fromEntries(pairs.map(([id, r]) => [id, r.webhook_url ?? ""])));
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sites.length]);

  async function saveAlert(siteId: string, next: Partial<AlertRuleState>) {
    const merged = {
      enabled: alertRules[siteId]?.enabled ?? false,
      threshold_pct: alertRules[siteId]?.threshold_pct ?? 50,
      webhook_url: alertRules[siteId]?.webhook_url ?? null,
      ...next,
    };
    setAlertRules((r) => ({ ...r, [siteId]: merged }));
    setSavingAlertId(siteId);
    setWebhookError((e) => ({ ...e, [siteId]: "" }));
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId, ...merged }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if ("webhook_url" in next) {
          setWebhookError((e) => ({ ...e, [siteId]: data.error || "Erreur" }));
        }
      }
    } finally {
      setSavingAlertId(null);
    }
  }

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
    const url = `${origin}/public/${shareId}`;
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
    <section className="app-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Globe className="h-4 w-4 text-primary" />
          <h2 className="text-[13.5px] font-semibold">{t.settings.sites.title}</h2>
        </div>
        <a
          href="/dashboard/sites/new"
          className="text-sm text-primary font-medium hover:underline"
        >
          {t.settings.sites.addSite}
        </a>
      </div>

      {sites.length === 0 ? (
        <p className="text-sm text-muted text-center py-6">
          {t.settings.sites.none}
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
                    title={t.settings.sites.copyScript}
                  >
                    {copiedId === site.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        {t.settings.sites.copied}
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        {t.settings.sites.script}
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
                        {t.settings.team.cancel}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(site.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 transition-colors"
                      title={t.settings.sites.confirmRemove}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t.settings.sites.remove}
                    </button>
                  )}
                </div>
              </div>
              {/* Public share section */}
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share2 className="h-3.5 w-3.5 text-muted" />
                    <span className="text-xs text-muted">{t.settings.sites.publicDashboard}</span>
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
                      {origin}/public/{siteShareIds[site.id]}
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

              {/* Traffic drop alert */}
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-3.5 w-3.5 text-muted" />
                    <span className="text-xs text-muted">{t.settings.sites.trafficAlert}</span>
                  </div>
                  <button
                    onClick={() => saveAlert(site.id, { enabled: !alertRules[site.id]?.enabled })}
                    disabled={savingAlertId === site.id}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      alertRules[site.id]?.enabled ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  >
                    {savingAlertId === site.id ? (
                      <Loader2 className="h-3 w-3 animate-spin mx-auto text-white" />
                    ) : (
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                          alertRules[site.id]?.enabled ? "translate-x-[18px]" : "translate-x-[3px]"
                        }`}
                      />
                    )}
                  </button>
                </div>
                {alertRules[site.id]?.enabled && (
                  <>
                    <label className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                      {t.settings.sites.alertIntro}
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={alertRules[site.id]?.threshold_pct ?? 50}
                        onChange={(e) =>
                          saveAlert(site.id, {
                            threshold_pct: Math.max(1, Math.min(99, Number(e.target.value))),
                          })
                        }
                        className="w-14 rounded-md border border-border bg-background px-1.5 py-1 text-xs outline-none focus:border-primary"
                      />
                      {t.settings.sites.vsLastWeek}
                    </label>

                    <div className="mt-2">
                      <label className="flex items-center gap-1.5 text-xs text-muted">
                        {t.settings.sites.webhook}
                      </label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="url"
                          placeholder="https://hooks.slack.com/services/…"
                          value={webhookDraft[site.id] ?? ""}
                          onChange={(e) =>
                            setWebhookDraft((d) => ({ ...d, [site.id]: e.target.value }))
                          }
                          onBlur={() => {
                            const value = webhookDraft[site.id] ?? "";
                            if (value !== (alertRules[site.id]?.webhook_url ?? "")) {
                              saveAlert(site.id, { webhook_url: value || null });
                            }
                          }}
                          className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary font-mono"
                        />
                      </div>
                      {webhookError[site.id] && (
                        <p className="mt-1 text-xs text-red-500">{webhookError[site.id]}</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              <p className="mt-2 text-xs text-muted">
                {t.settings.sites.addedOn}{" "}
                {new Date(site.created_at).toLocaleDateString(intl, {
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

/* ─────────── API KEYS ─────────── */
interface ApiKeyRow {
  id: string;
  name: string | null;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

function ApiKeysSection({
  sites,
  hasApiAccess,
}: {
  sites: Site[];
  hasApiAccess: boolean;
}) {
  const { t, intl } = useT();
  const [keysBySite, setKeysBySite] = useState<Record<string, ApiKeyRow[]>>({});
  const [loaded, setLoaded] = useState(false);
  const [creatingSite, setCreatingSite] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");
  const [busy, setBusy] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{ siteId: string; key: string; prefix: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [mcpUrlCopied, setMcpUrlCopied] = useState(false);
  const [personalUrlCopied, setPersonalUrlCopied] = useState(false);
  const mcpUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://pulsetrack.eu"}/api/mcp`;

  useEffect(() => {
    if (!hasApiAccess || sites.length === 0 || loaded) return;
    let cancelled = false;
    Promise.all(
      sites.map((s) =>
        fetch(`/api/keys?site_id=${s.id}`)
          .then((r) => r.json())
          .then((d) => [s.id, d.keys ?? []] as const)
      )
    ).then((pairs) => {
      if (cancelled) return;
      setKeysBySite(Object.fromEntries(pairs));
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasApiAccess, sites.length, loaded]);

  async function createKey(siteId: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId, name: keyName.trim() || null }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setKeysBySite((m) => ({
        ...m,
        [siteId]: [
          { id: data.id, name: data.name, key_prefix: data.key_prefix, created_at: data.created_at, last_used_at: null, revoked_at: null },
          ...(m[siteId] ?? []),
        ],
      }));
      setReveal({ siteId, key: data.key, prefix: data.key_prefix });
      setCreatingSite(null);
      setKeyName("");
    } finally {
      setBusy(false);
    }
  }

  async function revokeKey(siteId: string, keyId: string) {
    setRevoking(keyId);
    try {
      const res = await fetch(`/api/keys/${keyId}`, { method: "DELETE" });
      if (res.ok) {
        setKeysBySite((m) => ({
          ...m,
          [siteId]: (m[siteId] ?? []).map((k) =>
            k.id === keyId ? { ...k, revoked_at: new Date().toISOString() } : k
          ),
        }));
      }
    } finally {
      setRevoking(null);
    }
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="app-card">
      <div className="flex items-center gap-3 mb-4">
        <Code2 className="h-4 w-4 text-primary" />
        <h2 className="text-[13.5px] font-semibold">{t.settings.api.title}</h2>
      </div>

      {!hasApiAccess ? (
        <div className="rounded-lg bg-surface px-4 py-3 text-sm text-muted">
          {t.settings.api.availableFrom}{" "}
          <a href="/dashboard/upgrade" className="font-medium text-primary hover:underline">
            {t.settings.api.seePlans}
          </a>
        </div>
      ) : sites.length === 0 ? (
        <p className="text-sm text-muted text-center py-6">{t.settings.api.addSiteFirst}</p>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted">
            {t.settings.api.blurb}{" "}
            <code className="rounded bg-surface px-1 py-0.5">GET /api/v1/stats</code>{" "}
            {t.settings.api.blurbHeader}{" "}
            <code className="rounded bg-surface px-1 py-0.5">Authorization: Bearer &lt;key&gt;</code>.
            {" "}{t.settings.api.blurbBusiness1}
            <code className="rounded bg-surface px-1 py-0.5">GET /api/v1/events</code>
            {t.settings.api.blurbBusiness2}
          </p>

          <div className="rounded-lg border border-primary/20 bg-primary-pale/30 p-4">
            <p className="text-sm font-semibold">{t.settings.api.mcpTitle}</p>
            <p className="mt-1 text-xs text-muted">
              {t.settings.api.mcpBlurb}{" "}
              <span className="font-medium text-foreground">{t.settings.api.mcpNoPaste}</span>
              {t.settings.api.mcpBlurbTail}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 truncate rounded-md bg-background px-2.5 py-1.5 text-xs">
                {mcpUrl}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(mcpUrl);
                  setMcpUrlCopied(true);
                  setTimeout(() => setMcpUrlCopied(false), 2000);
                }}
                className="flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs font-medium hover:bg-surface-hover"
              >
                {mcpUrlCopied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
            <p className="mt-3 text-[11px] text-muted-light">
              {t.settings.api.mcpHeadless}
            </p>
          </div>

          <ConnectedAppsSection />

          {sites.map((site) => {
            const keys = keysBySite[site.id] ?? [];
            const active = keys.filter((k) => !k.revoked_at);
            return (
              <div key={site.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">{site.name}</h3>
                    <p className="text-xs text-muted mt-0.5">{site.domain}</p>
                  </div>
                  <button
                    onClick={() => setCreatingSite(creatingSite === site.id ? null : site.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-hover transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t.settings.api.newKey}
                  </button>
                </div>

                {creatingSite === site.id && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="text"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      placeholder={t.settings.api.keyNamePlaceholder}
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => createKey(site.id)}
                      disabled={busy}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t.settings.api.generate}
                    </button>
                  </div>
                )}

                {reveal?.siteId === site.id && (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-900/20">
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      {t.settings.api.copyNow}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="flex-1 truncate rounded-md bg-white px-2.5 py-1.5 text-xs dark:bg-black/20">
                        {reveal.key}
                      </code>
                      <button
                        onClick={() => copyKey(reveal.key)}
                        className="flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs font-medium hover:bg-surface-hover"
                      >
                        {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>

                    <p className="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      Pour Claude.ai, ChatGPT et autres — une seule URL à coller, rien d&apos;autre à
                      configurer :
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <code className="flex-1 truncate rounded-md bg-white px-2.5 py-1.5 text-xs dark:bg-black/20">
                        {mcpUrl}?key={reveal.key}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${mcpUrl}?key=${reveal.key}`);
                          setPersonalUrlCopied(true);
                          setTimeout(() => setPersonalUrlCopied(false), 2000);
                        }}
                        className="flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs font-medium hover:bg-surface-hover"
                      >
                        {personalUrlCopied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>

                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => setReveal(null)}
                        className="rounded-md border border-border px-2 py-1.5 text-xs font-medium hover:bg-surface-hover"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                )}

                {active.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {active.map((k) => (
                      <li
                        key={k.id}
                        className="flex items-center justify-between rounded-md bg-background px-3 py-1.5 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-mono text-muted">{k.key_prefix}…</span>
                          {k.name && <span className="ml-2 text-muted">{k.name}</span>}
                          <span className="ml-2 text-muted-light">
                            {k.last_used_at
                              ? `${t.settings.api.usedOn} ${new Date(k.last_used_at).toLocaleDateString(intl)}`
                              : t.settings.api.neverUsed}
                          </span>
                        </div>
                        <button
                          onClick={() => revokeKey(site.id, k.id)}
                          disabled={revoking === k.id}
                          className="flex shrink-0 items-center gap-1 text-red-500 hover:underline disabled:opacity-50"
                        >
                          {revoking === k.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Ban className="h-3 w-3" />
                          )}
                          {t.settings.api.revoke}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

interface Connection {
  id: string;
  client_name: string | null;
  scope: string;
  created_at: string;
  last_used_at: string | null;
  sites: { name: string; domain: string } | { name: string; domain: string }[] | null;
}

/** Apps connected via "Se connecter avec PulseTrack" (OAuth) — the
 *  companion list to ApiKeysSection's manual keys, so revoking access
 *  is never a hunt through a third-party app's own settings. */
function ConnectedAppsSection() {
  const { t, intl } = useT();
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/oauth/connections")
      .then((r) => r.json())
      .then((d) => setConnections(d.connections ?? []));
  }, []);

  async function revoke(id: string) {
    setRevoking(id);
    try {
      const res = await fetch(`/api/oauth/connections/${id}`, { method: "DELETE" });
      if (res.ok) setConnections((c) => (c ?? []).filter((x) => x.id !== id));
    } finally {
      setRevoking(null);
    }
  }

  if (!connections || connections.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium text-muted mb-1.5">{t.settings.api.connectedApps}</p>
      <ul className="space-y-1.5">
        {connections.map((c) => {
          const site = Array.isArray(c.sites) ? c.sites[0] : c.sites;
          return (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-xs"
            >
              <div className="min-w-0">
                <span className="font-medium">{c.client_name || "Application"}</span>
                {site && <span className="ml-2 text-muted">{site.name}</span>}
                <span className="ml-2 text-muted-light">
                  {c.last_used_at
                    ? `${t.settings.api.usedOn} ${new Date(c.last_used_at).toLocaleDateString(intl)}`
                    : t.settings.api.neverUsed}
                </span>
              </div>
              <button
                onClick={() => revoke(c.id)}
                disabled={revoking === c.id}
                className="flex shrink-0 items-center gap-1 text-red-500 hover:underline disabled:opacity-50"
              >
                {revoking === c.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Ban className="h-3 w-3" />
                )}
                {t.settings.api.revoke}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─────────── DANGER ZONE ─────────── */
function DangerZone() {
  const { t } = useT();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleDeleteAccount() {
    if (confirmText !== t.settings.danger.confirmWord) return;

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
    <section className="app-card border-coral/30">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-coral" />
        <h2 className="text-[13.5px] font-semibold text-coral">{t.settings.danger.title}</h2>
      </div>

      <p className="mb-3 text-[13px] leading-relaxed text-muted">
        {t.settings.danger.body}
      </p>

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 transition-colors"
        >
          {t.settings.danger.deleteAccount}
        </button>
      ) : (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-3">
            <strong>{t.settings.danger.confirmWord}</strong>{" "}
            {t.settings.danger.typeToConfirm}
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={t.settings.danger.confirmWord}
            className="w-full rounded-lg border border-red-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:bg-red-900/30 dark:border-red-700 mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={handleDeleteAccount}
              disabled={confirmText !== t.settings.danger.confirmWord || loading}
              className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {t.settings.danger.deletePermanently}
            </button>
            <button
              onClick={() => {
                setShowConfirm(false);
                setConfirmText("");
              }}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-hover transition-colors"
            >
              {t.settings.danger.cancel}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
