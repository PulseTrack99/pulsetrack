"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Users,
  Eye,
  MousePointerClick,
  Clock,
  ExternalLink,
} from "lucide-react";

interface PublicStats {
  site: { name: string; domain: string };
  period: string;
  visitors: number;
  pageviews: number;
  bounce_rate: number;
  avg_duration: number;
  top_pages: { path: string; views: number }[];
  top_sources: { source: string; visitors: number }[];
  top_countries: { country: string; visitors: number }[];
  visitors_chart: { date: string; count: number }[];
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        <Icon className="h-4 w-4 text-muted" />
      </div>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function MiniBarChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <h3 className="text-sm font-semibold mb-4">Visiteurs par jour</h3>
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
  const max = Math.max(...data.map((d) => Number(d[valueKey])), 1);
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

export function PublicDashboard({ shareId }: { shareId: string }) {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [period, setPeriod] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/public/${shareId}?period=${period}`);
        if (res.ok) {
          setStats(await res.json());
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [shareId, period]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted">
          <Activity className="h-5 w-5 animate-pulse text-primary" />
          <span>Chargement du dashboard...</span>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-10 w-10 text-muted mx-auto mb-4" />
          <h1 className="text-xl font-bold">Dashboard introuvable</h1>
          <p className="mt-2 text-sm text-muted">
            Ce dashboard public n&apos;existe pas ou a été désactivé.
          </p>
          <a
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            Découvrir PulseTrack
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <span className="font-bold">PulseTrack</span>
            </a>
            <span className="text-xs text-muted bg-surface px-2 py-1 rounded-md">
              Dashboard public
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`https://${stats.site.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
            >
              {stats.site.domain}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        {/* Site name + period selector */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{stats.site.name}</h1>
            <p className="text-sm text-muted">{stats.site.domain}</p>
          </div>
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
            /* Pas « uniques » : l'identifiant de visiteur vient d'un sel
               détruit chaque nuit, donc au-delà de 24 h le chiffre compte
               des visiteurs-jours, pas des personnes. Le tableau privé dit
               déjà « Visiteurs » — les deux vues doivent s'accorder. */
            label="Visiteurs"
            value={stats.visitors.toLocaleString("fr-FR")}
            icon={Users}
          />
          <StatCard
            label="Pages vues"
            value={stats.pageviews.toLocaleString("fr-FR")}
            icon={Eye}
          />
          <StatCard
            label="Taux de rebond"
            value={`${stats.bounce_rate}%`}
            icon={MousePointerClick}
          />
          <StatCard
            label="Durée moy. session"
            value={`${Math.floor(stats.avg_duration / 60)}m ${stats.avg_duration % 60}s`}
            icon={Clock}
          />
        </div>

        {/* Chart */}
        <MiniBarChart data={stats.visitors_chart} />

        {/* Rankings */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <RankingTable
            title="Pages populaires"
            data={stats.top_pages}
            labelKey="path"
            valueKey="views"
            valueLabel="vues"
          />
          <RankingTable
            title="Sources de trafic"
            data={stats.top_sources}
            labelKey="source"
            valueKey="visitors"
            valueLabel="visiteurs"
          />
          <RankingTable
            title="Pays"
            data={stats.top_countries}
            labelKey="country"
            valueKey="visitors"
            valueLabel="visiteurs"
          />
        </div>

        {/* CTA footer */}
        <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 p-6 text-center">
          <p className="text-sm font-medium">
            Ce dashboard est propulsé par{" "}
            <a
              href="/"
              className="text-primary font-semibold hover:underline"
            >
              PulseTrack
            </a>
          </p>
          <p className="text-xs text-muted mt-1">
            Analytics simple, cookieless et RGPD-friendly.{" "}
            <a href="/signup" className="text-primary hover:underline">
              Créez votre compte gratuitement →
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
