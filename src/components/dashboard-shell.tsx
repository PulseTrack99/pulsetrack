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
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

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
  { href: "/dashboard", label: "Accueil", icon: BarChart3 },
  { href: "/dashboard/revenue", label: "Revenue", icon: DollarSign },
  { href: "/dashboard/funnels", label: "Funnels", icon: Filter },
  { href: "/dashboard/flows", label: "Flows", icon: Workflow },
  { href: "/dashboard/replays", label: "Session Replay", icon: Video },
  { href: "/dashboard/heatmaps", label: "Heatmaps", icon: MousePointerClick },
  { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
];

/** Longest matching href wins, so /dashboard/revenue doesn't also
 *  light up /dashboard. */
function currentItem(pathname: string) {
  return navItems
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

function useOutsideClose(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  return ref;
}

/* ── Site switcher ── */
function SiteSwitcher() {
  const { sites, site, ready, setSiteId } = useSites();
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
            {site?.name ?? "Aucun site"}
          </p>
          <p className="truncate text-[11px] leading-tight text-muted-light">
            {site?.domain ?? "Ajoutez votre premier site"}
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
              Gérer mes sites
            </a>
            <a
              href="/dashboard/sites/new"
              className="block px-2.5 py-1.5 text-[12.5px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              Ajouter un site
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Create menu ── */
function CreateMenu() {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(() => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
      >
        <Plus className="h-3.5 w-3.5" />
        Créer
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-lg">
          <a
            href="/dashboard/sites/new"
            className="block px-2.5 py-1.5 text-[12.5px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            Nouveau site
          </a>
          <a
            href="/dashboard/funnels"
            className="block px-2.5 py-1.5 text-[12.5px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            Nouveau funnel
          </a>
        </div>
      )}
    </div>
  );
}

/* ── Command palette (Ctrl/Cmd + K) ── */
function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { sites, setSiteId } = useSites();
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
  const pages = navItems.filter((i) => !q || i.label.toLowerCase().includes(q));
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
            placeholder="Aller à une page, changer de site…"
            className="flex-1 bg-transparent py-3 text-[13px] outline-none placeholder:text-muted-light"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-light">
            Échap
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-1.5">
          {pages.length > 0 && (
            <>
              <p className="app-label px-2 py-1.5">Pages</p>
              {pages.map((i) => (
                <a
                  key={i.href}
                  href={i.href}
                  className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                >
                  <i.icon className="h-4 w-4 shrink-0" />
                  {i.label}
                </a>
              ))}
            </>
          )}

          {matchedSites.length > 0 && (
            <>
              <p className="app-label px-2 py-1.5 pt-3">Sites</p>
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
        }`}
      >
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="min-w-0 flex-1">
            <SiteSwitcher />
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-1 shrink-0 text-muted lg:hidden"
            aria-label="Fermer le menu"
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
            <span className="flex-1 text-left">Rechercher</span>
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
                  {item.label}
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
            Passer à l&apos;offre supérieure
          </a>
        </div>

        {/* Utility row — the quiet controls, kept out of the navigation. */}
        <div className="flex items-center gap-1 border-t border-border px-3 py-2">
          <a
            href="/dashboard/settings"
            className="rounded p-1.5 text-muted-light transition-colors hover:bg-surface-hover hover:text-foreground"
            title="Paramètres"
          >
            <Settings className="h-4 w-4" />
          </a>
          <a
            href="/features/analytics"
            className="rounded p-1.5 text-muted-light transition-colors hover:bg-surface-hover hover:text-foreground"
            title="Aide"
          >
            <HelpCircle className="h-4 w-4" />
          </a>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded p-1.5 text-muted-light transition-colors hover:bg-surface-hover hover:text-foreground lg:hidden"
            title="Replier"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
          <div className="flex-1" />
          <button
            onClick={handleLogout}
            className="rounded p-1.5 text-muted-light transition-colors hover:bg-surface-hover hover:text-foreground"
            title={`Se déconnecter (${user.email})`}
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
              <p className="text-[11px] leading-tight text-muted-light">Plan {planName}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-muted hover:text-foreground lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          {/* Breadcrumb, like theirs: which site, then which screen. */}
          <BreadcrumbTitle label={active?.label ?? "Accueil"} />
        </header>

        <main className="flex-1 overflow-y-auto p-5">{children}</main>
      </div>
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
