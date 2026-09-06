"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSites } from "@/components/site-context";
import {
  Activity,
  BarChart3,
  Globe,
  Settings,
  LogOut,
  Menu,
  X,
  Plus,
  Filter,
  Crown,
  DollarSign,
  MousePointerClick,
  Video,
  Workflow,
  Search,
  Check,
  ChevronsUpDown,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Bell,
  Radio,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { AssistantPanel } from "@/components/assistant-panel";
// Shared with the filter controls so there is one implementation.
import { useOutsideClose } from "@/components/filters";
import { useT } from "@/components/locale-context";

/**
 * Rail structure follows Mixpanel's: the project (here, site)
 * switcher sits at the top and drives every screen, a single "create"
 * entry point below it, then a command palette, then the destinations
 * flat — not grouped into invented categories. Upgrade is separated
 * from navigation because it isn't a place to go, and a small utility
 * row closes the rail.
 *
 * Only controls that actually do something are here. A dead button
 * that exists for the resemblance is worse than no button.
 */

const navItems = [
  { href: "/dashboard", key: "home", icon: BarChart3 },
  { href: "/dashboard/revenue", key: "revenue", icon: DollarSign },
  { href: "/dashboard/funnels", key: "funnels", icon: Filter },
  { href: "/dashboard/flows", key: "flows", icon: Workflow },
  { href: "/dashboard/replays", key: "replays", icon: Video },
  { href: "/dashboard/heatmaps", key: "heatmaps", icon: MousePointerClick },
  { href: "/dashboard/settings", key: "settings", icon: Settings },
] as const;

/* Screens reached from the site switcher rather than the rail — they
   need a breadcrumb label like any other page, but no nav entry of
   their own. Without them /dashboard/sites falls back to the longest
   remaining match, /dashboard, and calls itself "Accueil". */
const secondaryItems = [
  { href: "/dashboard/sites/new", key: "addSite" },
  { href: "/dashboard/sites", key: "mySites" },
  { href: "/dashboard/upgrade", key: "plans" },
] as const;

/** Longest matching href wins, so /dashboard/revenue doesn't also
 *  light up /dashboard. */
function currentItem(pathname: string) {
  return [...navItems, ...secondaryItems]
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

/* ── Site switcher ── */
function SiteSwitcher() {
  const { sites, site, ready, setSiteId } = useSites();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(() => setOpen(false));

  // One frame before the stored choice is read. Naming a site here
  // would name the wrong one, so the shape is drawn without the text.
  if (!ready && sites.length > 0) {
    return (
      <div className="flex w-full items-center gap-2 px-2 py-1.5">
        <div className="h-6 w-6 shrink-0 animate-pulse rounded bg-surface-hover" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="h-2.5 w-24 animate-pulse rounded bg-surface-hover" />
          <div className="h-2 w-16 animate-pulse rounded bg-surface-hover" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-hover"
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-[11px] font-semibold text-primary">
          {(site?.name ?? "?").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-tight">
            {site?.name ?? t.shell.noSite}
          </p>
          <p className="truncate text-[11px] leading-tight text-muted-light">
            {site?.domain ?? t.shell.addFirstSite}
          </p>
        </div>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-light" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-surface shadow-lg">
          <div className="max-h-64 overflow-y-auto py-1">
            {sites.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSiteId(s.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-surface-hover"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium leading-tight">{s.name}</p>
                  <p className="truncate text-[11px] leading-tight text-muted-light">{s.domain}</p>
                </div>
                {site?.id === s.id && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
              </button>
            ))}
          </div>
          <div className="border-t border-border py-1">
            <a
              href="/dashboard/sites"
              className="block px-2.5 py-1.5 text-[12.5px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              {t.shell.manageSites}
            </a>
            <a
              href="/dashboard/sites/new"
              className="block px-2.5 py-1.5 text-[12.5px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              {t.shell.addSite}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Create menu ── */
function CreateMenu() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(() => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
      >
        <Plus className="h-3.5 w-3.5" />
        {t.shell.create}
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-lg">
          <a
            href="/dashboard/sites/new"
            className="block px-2.5 py-1.5 text-[12.5px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            {t.shell.newSite}
          </a>
          <a
            href="/dashboard/funnels"
            className="block px-2.5 py-1.5 text-[12.5px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            {t.shell.newFunnel}
          </a>
        </div>
      )}
    </div>
  );
}

/* ── Command palette (Ctrl/Cmd + K) ── */
function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { sites, setSiteId } = useSites();
  const { t } = useT();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const pages = navItems.filter(
    (i) => !q || t.shell.nav[i.key].toLowerCase().includes(q)
  );
  const matchedSites = sites.filter(
    (s) => q && (s.name.toLowerCase().includes(q) || s.domain.toLowerCase().includes(q))
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 pt-[12vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-light" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.shell.palette.placeholder}
            className="flex-1 bg-transparent py-3 text-[13px] outline-none placeholder:text-muted-light"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-light">
            Échap
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-1.5">
          {pages.length > 0 && (
            <>
              <p className="app-label px-2 py-1.5">{t.shell.palette.pages}</p>
              {pages.map((i) => (
                <a
                  key={i.href}
                  href={i.href}
                  className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                >
                  <i.icon className="h-4 w-4 shrink-0" />
                  {t.shell.nav[i.key]}
                </a>
              ))}
            </>
          )}

          {matchedSites.length > 0 && (
            <>
              <p className="app-label px-2 py-1.5 pt-3">{t.shell.palette.sites}</p>
              {matchedSites.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSiteId(s.id);
                    onClose();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                >
                  <Globe className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {s.name} <span className="text-muted-light">· {s.domain}</span>
                  </span>
                </button>
              ))}
            </>
          )}

          {pages.length === 0 && matchedSites.length === 0 && (
            <p className="px-2 py-6 text-center text-[12.5px] text-muted-light">
              Rien ne correspond à « {query} »
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function DashboardShell({
  user,
  planName,
  children,
}: {
  user: User;
  planName: string;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Collapsing the rail on a wide screen, not just closing the mobile
  // drawer — the two were the same control before, so there was no way
  // to reclaim the 240px on a laptop.
  const [railCollapsed, setRailCollapsed] = useState(false);
  // Open by default: an assistant you have to find first doesn't help
  // the person who most needs it. Remembered per browser afterwards.
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { t, locale, setLocale } = useT();
  const pathname = usePathname();
  const active = currentItem(pathname);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="app-scope flex h-screen bg-surface">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* ── Rail ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-border bg-background transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${railCollapsed ? "lg:hidden" : ""}`}
      >
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="min-w-0 flex-1">
            <SiteSwitcher />
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-1 shrink-0 text-muted lg:hidden"
            aria-label={t.shell.closeMenu}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3 pt-2">
          <CreateMenu />
        </div>

        <div className="px-3 pt-2">
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">{t.shell.search}</span>
            <kbd className="rounded border border-border px-1 py-px text-[10px] text-muted-light">
              ⌘K
            </kbd>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pt-2">
          <div className="space-y-px">
            {navItems.map((item) => {
              const isActive = active?.href === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors ${
                    isActive
                      ? "bg-primary-pale font-medium text-primary"
                      : "text-muted hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {t.shell.nav[item.key]}
                </a>
              );
            })}
          </div>
        </nav>

        <div className="px-3 pb-2">
          <a
            href="/dashboard/upgrade"
            className="flex items-center justify-center gap-1.5 rounded-md border border-amber/40 bg-amber/10 px-3 py-2 text-[12.5px] font-medium text-[#8a5a00] transition-colors hover:bg-amber/20"
          >
            <Crown className="h-3.5 w-3.5" />
            {t.shell.upgrade}
          </a>
        </div>

        {/* Utility row — the quiet controls, kept out of the navigation:
            settings, help, the assistant toggle, notifications, and the
            rail's own collapse, the way Mixpanel groups theirs. */}
        <div className="relative flex items-center gap-0.5 border-t border-border px-2 py-2">
          <a
            href="/dashboard/settings"
            className="rounded p-1.5 text-muted-light transition-colors hover:bg-surface-hover hover:text-foreground"
            title={t.shell.settings}
          >
            <Settings className="h-4 w-4" />
          </a>
          <a
            href="/features/analytics"
            className="rounded p-1.5 text-muted-light transition-colors hover:bg-surface-hover hover:text-foreground"
            title={t.shell.help}
          >
            <HelpCircle className="h-4 w-4" />
          </a>
          <button
            onClick={() => setAssistantOpen((v) => !v)}
            className={`rounded p-1.5 transition-colors hover:bg-surface-hover ${
              assistantOpen
                ? "bg-primary-pale text-primary"
                : "text-muted-light hover:text-foreground"
            }`}
            title={assistantOpen ? t.shell.closeAssistant : t.shell.openAssistant}
          >
            <Sparkles className="h-4 w-4" />
          </button>
          {/* Language. The dashboard was French-only while the marketing
              site was already bilingual, so a customer could switch to
              English on the landing page and land in a French app. */}
          <button
            onClick={() => setLocale(locale === "fr" ? "en" : "fr")}
            className="rounded px-1.5 py-1.5 text-[11px] font-semibold text-muted-light transition-colors hover:bg-surface-hover hover:text-foreground"
            title={t.shell.switchLanguage}
          >
            {locale.toUpperCase()}
          </button>
          <NotificationsButton
            open={notificationsOpen}
            onToggle={() => setNotificationsOpen((v) => !v)}
            onClose={() => setNotificationsOpen(false)}
          />

          <div className="flex-1" />

          <button
            onClick={() => setRailCollapsed(true)}
            className="hidden rounded p-1.5 text-muted-light transition-colors hover:bg-surface-hover hover:text-foreground lg:block"
            title={t.shell.collapseMenu}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded p-1.5 text-muted-light transition-colors hover:bg-surface-hover hover:text-foreground lg:hidden"
            title={t.shell.closeMenu}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
          <button
            onClick={handleLogout}
            className="rounded p-1.5 text-muted-light transition-colors hover:bg-surface-hover hover:text-foreground"
            title={`${t.shell.signOut} (${user.email})`}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        <div className="border-t border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] leading-tight">{user.email}</p>
              <p className="text-[11px] leading-tight text-muted-light">{t.shell.plan} {planName}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-muted hover:text-foreground lg:hidden"
            aria-label={t.shell.openMenu}
          >
            <Menu className="h-5 w-5" />
          </button>
          {/* Collapsing the rail has to leave a way back. */}
          {railCollapsed && (
            <button
              onClick={() => setRailCollapsed(false)}
              className="hidden text-muted transition-colors hover:text-foreground lg:block"
              title={t.shell.expandMenu}
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}
          {/* Breadcrumb, like theirs: which site, then which screen. */}
          <BreadcrumbTitle
            label={active ? t.shell.nav[active.key] : t.shell.nav.home}
          />

          <div className="flex-1" />

          {!assistantOpen && (
            <button
              onClick={() => setAssistantOpen(true)}
              className="flex items-center gap-1.5 rounded-sm border border-border px-2 py-1 text-[12px] text-muted transition-colors hover:text-foreground"
              title={t.shell.openAssistant}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t.shell.assistant}
            </button>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-5">
          <ConnectDataBanner />
          {children}
        </main>
      </div>

      {/* ── Assistant ── */}
      {assistantOpen && (
        <div className="hidden lg:flex">
          <AssistantPanel onClose={() => setAssistantOpen(false)} />
        </div>
      )}
    </div>
  );
}

/**
 * "Connectez vos données" — the banner Mixpanel keeps at the top of
 * every screen until data arrives, and the single most useful thing on
 * an empty account: every screen below it is going to be zeros, and
 * this says why and what to do about it.
 *
 * It disappears for good once the first event lands, so it never
 * becomes furniture.
 */
function ConnectDataBanner() {
  const { site, siteId } = useSites();
  const { t } = useT();
  const [silent, setSilent] = useState(false);

  useEffect(() => {
    if (!siteId) return;
    let current = true;
    fetch(`/api/sites/status?site_id=${siteId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (current) setSilent(Boolean(d) && !d.sites?.[0]?.last_event_at);
      })
      .catch(() => current && setSilent(false));
    return () => {
      current = false;
    };
  }, [siteId]);

  if (!silent) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-4 rounded-[var(--app-radius)] border border-primary/25 bg-primary-pale/50 px-4 py-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Radio className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold">{t.shell.connect.title}</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">
          {site?.name ?? ""} {t.shell.connect.body}
        </p>
      </div>
      <a
        href="/dashboard/sites"
        className="shrink-0 rounded-[var(--app-radius-sm)] bg-primary px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
      >
        {t.shell.connect.cta}
      </a>
    </div>
  );
}

/**
 * Notification centre. Deliberately fed only by things that already
 * exist and are true: whether this site's script has ever reported, and
 * the latest weekly insights digest. An empty bell that admits it is
 * empty is better than one inventing activity to look alive.
 */
function NotificationsButton({
  open,
  onToggle,
  onClose,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const { site, siteId } = useSites();
  const { t } = useT();
  const ref = useOutsideClose(onClose);
  const [silent, setSilent] = useState<boolean | null>(null);
  const [digest, setDigest] = useState<{ week_start: string; summary: string } | null>(
    null
  );

  useEffect(() => {
    if (!siteId) return;
    let current = true;

    fetch(`/api/sites/status?site_id=${siteId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (current) setSilent(d ? !d.sites?.[0]?.last_event_at : null);
      })
      .catch(() => current && setSilent(null));

    // 402 when the plan has no insights — treated as "nothing to show".
    fetch(`/api/insights?site_id=${siteId}`)
      .then((r) => (r.ok ? r.json() : { digest: null }))
      .then((d) => current && setDigest(d.digest ?? null))
      .catch(() => current && setDigest(null));

    return () => {
      current = false;
    };
  }, [siteId]);

  const count = (silent ? 1 : 0) + (digest ? 1 : 0);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={onToggle}
        className={`relative rounded p-1.5 transition-colors hover:bg-surface-hover ${
          open ? "bg-primary-pale text-primary" : "text-muted-light hover:text-foreground"
        }`}
        title={t.shell.notifications}
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-coral" />
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-1 w-[280px] overflow-hidden rounded-[var(--app-radius)] border border-border bg-surface shadow-lg">
          <p className="border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-light">
            {t.shell.notify.title}
          </p>

          {count === 0 ? (
            <p className="px-3 py-3 text-[12px] leading-relaxed text-muted-light">
              {t.shell.notify.nothing}
            </p>
          ) : (
            <ul className="max-h-72 divide-y divide-border overflow-y-auto">
              {silent && (
                <li className="px-3 py-2.5">
                  <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-amber-600">
                    <Radio className="h-3.5 w-3.5" />
                    {t.shell.notify.noData}
                  </p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
                    {t.shell.notify.noDataBody}
                  </p>
                  <a
                    href="/dashboard/sites"
                    className="mt-1 inline-block text-[11.5px] font-medium text-primary hover:underline"
                  >
                    {t.shell.notify.checkInstall}
                  </a>
                </li>
              )}
              {digest && (
                <li className="px-3 py-2.5">
                  <p className="flex items-center gap-1.5 text-[12.5px] font-medium">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    {t.shell.notify.insights}
                  </p>
                  <p className="mt-0.5 line-clamp-3 text-[11.5px] leading-relaxed text-muted">
                    {digest.summary}
                  </p>
                  <a
                    href="/dashboard"
                    className="mt-1 inline-block text-[11.5px] font-medium text-primary hover:underline"
                  >
                    {t.shell.notify.seeOnHome}
                  </a>
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function BreadcrumbTitle({ label }: { label: string }) {
  const { site } = useSites();
  return (
    <div className="flex items-center gap-1.5 text-[13px]">
      {site && (
        <>
          <span className="text-muted-light">{site.name}</span>
          <span className="text-muted-light">/</span>
        </>
      )}
      <span className="font-medium">{label}</span>
    </div>
  );
}
