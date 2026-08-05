"use client";

import { useState } from "react";
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
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

const navItems = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: BarChart3 },
  { href: "/dashboard/funnels", label: "Funnels", icon: Filter },
  { href: "/dashboard/sites", label: "Mes sites", icon: Globe },
  { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
];

export function DashboardShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="flex h-screen bg-surface">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-background transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border px-6">
          <a href="/dashboard" className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">PulseTrack</span>
          </a>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Add site button */}
        <div className="p-4">
          <a
            href="/dashboard/sites/new"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4" />
            Ajouter un site
          </a>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </a>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.email}</p>
              <p className="text-xs text-muted">Plan Free</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-muted hover:text-foreground transition-colors"
              title="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center gap-4 border-b border-border bg-background px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Dashboard</h1>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
