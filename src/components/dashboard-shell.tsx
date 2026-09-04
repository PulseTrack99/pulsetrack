"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

/**
 * Navigation grouped by what the user is trying to do, rather than a
 * flat list of nine links. Three short groups scan faster than one
 * long one, and the labels tell a first-time user what the tool is
 * actually made of.
 */
const navGroups = [
  {
    label: "Analyse",
    items: [
      { href: "/dashboard", label: "Vue d'ensemble", icon: BarChart3 },
      { href: "/dashboard/revenue", label: "Revenue", icon: DollarSign },
      { href: "/dashboard/funnels", label: "Funnels", icon: Filter },
      { href: "/dashboard/flows", label: "Flows", icon: Workflow },
    ],
  },
  {
    label: "Comportement",
    items: [
      { href: "/dashboard/replays", label: "Session Replay", icon: Video },
      { href: "/dashboard/heatmaps", label: "Heatmaps", icon: MousePointerClick },
    ],
  },
  {
    label: "Compte",
    items: [
      { href: "/dashboard/sites", label: "Mes sites", icon: Globe },
      { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
    ],
  },
];

const allItems = navGroups.flatMap((g) => g.items);

/** Longest matching href wins, so /dashboard/revenue doesn't also
 *  light up /dashboard. */
function currentItem(pathname: string) {
  return allItems
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];
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
  const pathname = usePathname();
  const active = currentItem(pathname);

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

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-border bg-background transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <a href="/dashboard" className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <span className="text-[15px] font-semibold tracking-tight">PulseTrack</span>
          </a>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-muted hover:text-foreground"
            aria-label="Fermer le menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3 py-3">
          <a
            href="/dashboard/sites/new"
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter un site
          </a>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-2">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="app-label px-2 pb-1.5">{group.label}</p>
              <div className="space-y-px">
                {group.items.map((item) => {
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
            </div>
          ))}
        </nav>

        {/* Upgrade sits apart from the navigation on purpose — it is
            the one thing on this rail that isn't a place to go. */}
        <div className="px-3 pb-2">
          <a
            href="/dashboard/upgrade"
            className="flex items-center justify-center gap-1.5 rounded-md border border-amber/40 bg-amber/10 px-3 py-2 text-[12.5px] font-medium text-[#8a5a00] transition-colors hover:bg-amber/20"
          >
            <Crown className="h-3.5 w-3.5" />
            Passer à l&apos;offre supérieure
          </a>
        </div>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[12px] font-semibold text-primary">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium">{user.email}</p>
              <p className="text-[11px] text-muted-light">Plan {planName}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-muted-light transition-colors hover:text-foreground"
              title="Se déconnecter"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* The bar names the page you're on, instead of repeating
            "Dashboard" on all eight of them. */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-muted hover:text-foreground lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-[15px] font-semibold tracking-tight">
            {active?.label ?? "Dashboard"}
          </h1>
        </header>

        <main className="flex-1 overflow-y-auto p-5">{children}</main>
      </div>
    </div>
  );
}
