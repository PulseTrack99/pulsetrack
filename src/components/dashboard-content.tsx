"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  Eye,
  MousePointerClick,
  Clock,
  TrendingUp,
  TrendingDown,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  ArrowRight,
  Plus,
} from "lucide-react";

interface Site {
  id: string;
  name: string;
  domain: string;
}

interface Stats {
  visitors: number;
  pageviews: number;
  bounce_rate: number;
  avg_duration: number;
  top_pages: { path: string; views: number }[];
  top_sources: { source: string; visitors: number }[];
  top_countries: { country: string; visitors: number }[];
  devices: { device: string; count: number }[];
  visitors_chart: { date: string; count: number }[];
}

function StatCard({
  label,
  value,
  change,
  icon: Icon,
}: {
  label: string;
  value: string;
  change?: number;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        <Icon className="h-4 w-4 text-muted" />
      </div>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {change !== undefined && (
        <div className="mt-1 flex items-center gap-1">
          {change >= 0 ? (
            <TrendingUp className="h-3 w-3 text-emerald-500" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-500" />
          )}
          <span
            className={`text-xs font-medium ${
              change >= 0 ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {change >= 0 ? "+" : ""}
            {change}%
          </span>
          <span className="text-xs text-muted">vs mois dernier</span>
        </div>
      )}
    </div>
  );
}

function MiniBarChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <h3 className="text-sm font-semibold mb-4">Visiteurs — 30 derniers jours</h3>
      <div className="flex items-end gap-[2px] h-32">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-gradient-to-t from-primary to-primary-light transition-all hover:from-primary-dark hover:to-primary cursor-pointer"
            style={{ height: `${(d.count / max) * 100}%`, minHeight: "2px" }}
            title={`${d.date}: ${d.count} visiteurs`}
          />
        ))}
      </div>
    </div>
  );
}

function RankingTable({
  title,
  data,
  labelKey,
  valueKey,
  valueLabel,
}: {
  title: string;
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  valueLabel: string;
}) {
  const max = Math.max(
    ...data.map((d) => Number(d[valueKey])),
    1
  );

  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      <div className="space-y-3">
        {data.length === 0 && (
          <p className="text-sm text-muted py-4 text-center">
            Pas encore de données
          </p>
        )}
        {data.slice(0, 5).map((item, i) => (
          <div key={i}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="truncate">{String(item[labelKey])}</span>
              <span className="text-muted ml-2 flex-shrink-0">
                {String(item[valueKey])} {valueLabel}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-primary/60"
                style={{
                  width: `${(Number(item[valueKey]) / max) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
        <Globe className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-xl font-bold">Ajoutez votre premier site</h2>
      <p className="mt-2 max-w-md text-sm text-muted">
        Pour commencer à tracker vos visiteurs, ajoutez votre site web et
        installez le script de tracking.
      </p>
      <a
        href="/dashboard/sites/new"
        className="mt-6 flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
      >
        <Plus className="h-4 w-4" />
        Ajouter un site
      </a>
    </div>
  );
}

export function DashboardContent({ sites }: { sites: Site[] }) {
  const [selectedSite, setSelectedSite] = useState<string | null>(
    sites[0]?.id || null
  );
  const [stats, setStats] = useState<Stats | null>(null);
  const [period, setPeriod] = useState("30d");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedSite) return;

    async function fetchStats() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/stats?site_id=${selectedSite}&period=${period}`
        );
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [selectedSite, period]);

  if (sites.length === 0) {
    return <EmptyState />;
  }

  // Fallback demo data when no real stats yet
  const displayStats: Stats = stats || {
    visitors: 0,
    pageviews: 0,
    bounce_rate: 0,
    avg_duration: 0,
    top_pages: [],
    top_sources: [],
    top_countries: [],
    devices: [],
    visitors_chart: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 86400000)
        .toISOString()
        .slice(0, 10),
      count: 0,
    })),
  };

  return (
    <div className="space-y-6">
      {/* Site selector + Period */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <select
          value={selectedSite || ""}
          onChange={(e) => setSelectedSite(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        >
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name} — {site.domain}
            </option>
          ))}
        </select>

        <div className="flex gap-1 rounded-lg border border-border bg-background p-0.5">
          {[
            { value: "24h", label: "24h" },
            { value: "7d", label: "7j" },
            { value: "30d", label: "30j" },
            { value: "90d", label: "90j" },
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                period === p.value
                  ? "bg-primary text-white"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Visiteurs uniques"
          value={displayStats.visitors.toLocaleString("fr-FR")}
          icon={Users}
        />
        <StatCard
          label="Pages vues"
          value={displayStats.pageviews.toLocaleString("fr-FR")}
          icon={Eye}
        />
        <StatCard
          label="Taux de rebond"
          value={`${displayStats.bounce_rate}%`}
          icon={MousePointerClick}
        />
        <StatCard
          label="Durée moy. session"
          value={`${Math.floor(displayStats.avg_duration / 60)}m ${displayStats.avg_duration % 60}s`}
          icon={Clock}
        />
      </div>

      {/* Chart */}
      <MiniBarChart data={displayStats.visitors_chart} />

      {/* Rankings */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <RankingTable
          title="Pages populaires"
          data={displayStats.top_pages}
          labelKey="path"
          valueKey="views"
          valueLabel="vues"
        />
        <RankingTable
          title="Sources de trafic"
          data={displayStats.top_sources}
          labelKey="source"
          valueKey="visitors"
          valueLabel="visiteurs"
        />
        <RankingTable
          title="Pays"
          data={displayStats.top_countries}
          labelKey="country"
          valueKey="visitors"
          valueLabel="visiteurs"
        />
      </div>
    </div>
  );
}
