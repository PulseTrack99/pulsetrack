"use client";

import Link from "next/link";
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
  Download,
  Lock,
  X,
  Sparkles,
} from "lucide-react";
import { RealtimePanel } from "@/components/realtime-panel";
import { useSites } from "@/components/site-context";

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

interface Annotation {
  id: string;
  date: string;
  label: string;
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
  icon: React.ComponentType<{ className?: string }>;
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

function MiniBarChart({
  data,
  annotations,
  onAdd,
  onDelete,
  addBusy,
  deletingId,
}: {
  data: { date: string; count: number }[];
  annotations: Annotation[];
  onAdd: (date: string, label: string) => void;
  onDelete: (id: string) => void;
  addBusy: boolean;
  deletingId: string | null;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const [showForm, setShowForm] = useState(false);
  const [draftDate, setDraftDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [draftLabel, setDraftLabel] = useState("");

  const byDate = new Map<string, Annotation[]>();
  for (const a of annotations) {
    const list = byDate.get(a.date) ?? [];
    list.push(a);
    byDate.set(a.date, list);
  }

  function submit() {
    const label = draftLabel.trim();
    if (!label) return;
    onAdd(draftDate, label);
    setDraftLabel("");
    setShowForm(false);
  }

  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Visiteurs — 30 derniers jours</h3>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
          title="Marquer un événement (lancement, campagne, déploiement…)"
        >
          <Plus className="h-3.5 w-3.5" />
          Annotation
        </button>
      </div>

      {showForm && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-2.5">
          <input
            type="date"
            value={draftDate}
            onChange={(e) => setDraftDate(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
          />
          <input
            type="text"
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Ex. « Lancement early bird »"
            maxLength={140}
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
          />
          <button
            onClick={submit}
            disabled={addBusy || !draftLabel.trim()}
            className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
          >
            Ajouter
          </button>
        </div>
      )}

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
      {/* Marker row — same flex-1-per-day layout as the bars above, so
          a dot lines up under its exact day without needing to know
          pixel widths. */}
      <div className="mt-1 flex items-center gap-[2px]">
        {data.map((d, i) => {
          const dayAnnotations = byDate.get(d.date);
          return (
            <div key={i} className="flex flex-1 justify-center">
              {dayAnnotations && (
                <span
                  className="h-1.5 w-1.5 rounded-full bg-coral"
                  title={dayAnnotations.map((a) => a.label).join(" · ")}
                />
              )}
            </div>
          );
        })}
      </div>

      {annotations.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-border pt-3">
          {annotations.map((a) => (
            <li key={a.id} className="flex items-center justify-between text-xs">
              <span className="text-muted">
                <span className="font-mono text-muted-light">
                  {new Date(a.date + "T00:00:00").toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>{" "}
                — {a.label}
              </span>
              <button
                onClick={() => onDelete(a.id)}
                disabled={deletingId === a.id}
                className="shrink-0 text-muted-light hover:text-red-500 disabled:opacity-50"
                title="Supprimer"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RankingTable({
  title,
  data,
  labelKey,
  valueKey,
  valueLabel,
  emptyHint,
}: {
  title: string;
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  valueLabel: string;
  /** What this card will show once there is data. Three cards all
   *  saying "Pas encore de données" told you nothing about what each
   *  one is for. */
  emptyHint: string;
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
          <p className="py-4 text-center text-[12px] leading-relaxed text-muted-light">
            {emptyHint}
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
    <div className="app-card flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-pale">
        <Globe className="h-5 w-5 text-primary" />
      </div>
      <h2 className="text-[15px] font-semibold">Ajoutez votre premier site</h2>
      <p className="mt-1 max-w-md text-[13px] leading-relaxed text-muted">
        Deux étapes : vous déclarez le domaine, puis vous collez une ligne de
        script dans vos pages. Les premières visites remontent en quelques
        secondes, sans cookie ni bandeau de consentement.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/dashboard/sites/new"
          className="flex items-center gap-1.5 rounded-[var(--app-radius-sm)] bg-primary px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter un site
        </Link>
        <Link
          href="/features/analytics"
          className="rounded-[var(--app-radius-sm)] border border-border px-3 py-2 text-[13px] font-medium transition-colors hover:bg-surface-hover"
        >
          Voir ce que PulseTrack mesure
        </Link>
      </div>
    </div>
  );
}

export function DashboardContent() {
  // Site selection lives in the rail now (src/components/site-context.tsx),
  // shared by every screen instead of one selector per page.
  const { sites, siteId: selectedSite } = useSites();
  const [stats, setStats] = useState<Stats | null>(null);
  const [period, setPeriod] = useState("30d");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportLocked, setExportLocked] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [insightDigest, setInsightDigest] = useState<{
    week_start: string;
    summary: string;
    flagged: unknown[];
  } | null>(null);
  const [addingAnnotation, setAddingAnnotation] = useState(false);
  const [deletingAnnotationId, setDeletingAnnotationId] = useState<string | null>(null);

  async function addAnnotation(date: string, label: string) {
    if (!selectedSite) return;
    setAddingAnnotation(true);
    try {
      const res = await fetch("/api/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: selectedSite, date, label }),
      });
      if (res.ok) {
        const { annotation } = await res.json();
        setAnnotations((a) => [...a, annotation].sort((x, y) => x.date.localeCompare(y.date)));
      }
    } finally {
      setAddingAnnotation(false);
    }
  }

  async function deleteAnnotation(id: string) {
    setDeletingAnnotationId(id);
    try {
      const res = await fetch(`/api/annotations/${id}`, { method: "DELETE" });
      if (res.ok) setAnnotations((a) => a.filter((x) => x.id !== id));
    } finally {
      setDeletingAnnotationId(null);
    }
  }

  async function exportCsv() {
    if (!selectedSite || exporting) return;
    setExporting(true);
    setExportLocked(false);
    try {
      const res = await fetch(
        `/api/export/csv?site_id=${selectedSite}&period=${period}`
      );
      if (res.status === 402) {
        setExportLocked(true);
        return;
      }
      if (!res.ok) return;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const a = document.createElement("a");
      a.href = url;
      a.download = match?.[1] || "pulsetrack-export.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  // Every fetch below is keyed on the selected site, so a response that
  // arrives after the user has switched away must be dropped — otherwise
  // a slow request for the previous site overwrites the numbers of the
  // one now named in the rail, and the screen shows one site's name
  // above another site's data.
  useEffect(() => {
    if (!selectedSite) return;
    let current = true;

    async function fetchStats() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/stats?site_id=${selectedSite}&period=${period}`
        );
        if (res.ok) {
          const data = await res.json();
          if (current) setStats(data);
        }
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        if (current) setLoading(false);
      }
    }

    fetchStats();
    return () => {
      current = false;
    };
  }, [selectedSite, period]);

  useEffect(() => {
    if (!selectedSite) return;
    let current = true;
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    fetch(`/api/annotations?site_id=${selectedSite}&since=${since}`)
      .then((r) => r.json())
      .then((d) => current && setAnnotations(d.annotations ?? []))
      .catch(() => current && setAnnotations([]));
    return () => {
      current = false;
    };
  }, [selectedSite]);

  useEffect(() => {
    if (!selectedSite) return;
    let current = true;
    fetch(`/api/insights?site_id=${selectedSite}`)
      .then((r) => (r.ok ? r.json() : { digest: null }))
      .then((d) => current && setInsightDigest(d.digest ?? null))
      .catch(() => current && setInsightDigest(null));
    return () => {
      current = false;
    };
  }, [selectedSite]);

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
    <div className="space-y-4">
      {/* Period — the site is chosen once in the rail. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

        <button
          onClick={exportCsv}
          disabled={exporting || !selectedSite}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          {exporting ? "Export…" : "Export CSV"}
        </button>
      </div>

      {exportLocked && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary-pale px-3.5 py-2.5 text-[13px] text-primary">
          <Lock className="h-4 w-4 shrink-0" />
          L&apos;export CSV est disponible sur l&apos;offre Business.
          <a href="/dashboard/upgrade" className="font-medium underline">
            Voir les offres
          </a>
        </div>
      )}

      {/* Proactive AI insights — only shown once a digest exists, so a
          site with nothing flagged yet stays quiet rather than showing
          an empty placeholder every week. */}
      {insightDigest && (
        <div className="rounded-xl border border-primary/20 bg-primary-pale/40 p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">
              Insights de la semaine du{" "}
              {new Date(insightDigest.week_start + "T00:00:00").toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
              })}
            </h3>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-muted whitespace-pre-line">
            {insightDigest.summary}
          </p>
        </div>
      )}

      {/* Realtime panel */}
      {selectedSite && <RealtimePanel siteId={selectedSite} />}

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
      <MiniBarChart
        data={displayStats.visitors_chart}
        annotations={annotations}
        onAdd={addAnnotation}
        onDelete={deleteAnnotation}
        addBusy={addingAnnotation}
        deletingId={deletingAnnotationId}
      />

      {/* Rankings */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <RankingTable
          title="Pages populaires"
          data={displayStats.top_pages}
          labelKey="path"
          valueKey="views"
          valueLabel="vues"
          emptyHint="Vos pages les plus consultées apparaîtront ici dès la première visite enregistrée."
        />
        <RankingTable
          title="Sources de trafic"
          data={displayStats.top_sources}
          labelKey="source"
          valueKey="visitors"
          valueLabel="visiteurs"
          emptyHint="D'où arrivent vos visiteurs : Google, réseaux sociaux, IA, ou accès direct."
        />
        <RankingTable
          title="Pays"
          data={displayStats.top_countries}
          labelKey="country"
          valueKey="visitors"
          valueLabel="visiteurs"
          emptyHint="La répartition géographique de vos visiteurs, déduite de leur IP sans la stocker."
        />
      </div>
    </div>
  );
}
