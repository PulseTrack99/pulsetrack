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
  Activity,
} from "lucide-react";
import { RealtimePanel } from "@/components/realtime-panel";
import { useSites } from "@/components/site-context";
import { SegmentedFilter, PERIOD_OPTIONS } from "@/components/filters";

interface Site {
  id: string;
  name: string;
  domain: string;
}

interface Overview {
  visitors: number;
  sessions: number;
  pageviews: number;
  bounce_rate: number;
  avg_duration: number;
}

interface Stats extends Overview {
  previous: Overview;
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

/** Spelled out once in the toolbar, so the cards can stay bare numbers. */
const PERIOD_LABEL: Record<string, string> = {
  "24h": "24 heures précédentes",
  "7d": "7 jours précédents",
  "30d": "30 jours précédents",
  "90d": "90 jours précédents",
};

/** Period-over-period change, or null when there's nothing to compare
 *  against — a percentage off zero is either a divide-by-zero or a
 *  meaningless "+∞ %", and both are worse than saying nothing. */
function delta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function StatCard({
  label,
  value,
  change,
  hint,
  lowerIsBetter,
  icon: Icon,
}: {
  label: string;
  value: string;
  change?: number | null;
  /** One line saying what the metric actually counts. */
  hint: string;
  /** Bounce rate going down is good; everything else is the reverse. */
  lowerIsBetter?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const good = change === null || change === undefined
    ? null
    : lowerIsBetter
      ? change <= 0
      : change >= 0;

  return (
    <div className="app-card group">
      <div className="flex items-center justify-between">
        <span className="app-label" title={hint}>
          {label}
        </span>
        <Icon className="h-3.5 w-3.5 text-muted-light" />
      </div>
      {/* The comparison basis is written once, in the toolbar, so each
          card only carries the number — "vs période précédente" repeated
          five times wrapped onto two lines and got clipped. */}
      <div className="mt-1.5 flex items-baseline gap-2">
        <p className="app-metric">{value}</p>
        {change === null || change === undefined ? (
          <span
            className="text-[11px] text-muted-light"
            title="Aucune donnée sur la période précédente, il n'y a rien à comparer."
          >
            —
          </span>
        ) : (
          <span
            className={`flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[11px] font-medium tabular-nums ${
              good ? "text-emerald-600" : "text-coral"
            }`}
            title={`${change > 0 ? "+" : ""}${change}% par rapport à la période précédente`}
          >
            {change >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {change > 0 ? "+" : ""}
            {change}%
          </span>
        )}
      </div>
    </div>
  );
}

/** Rounds a max up to a readable axis top (1, 2, 5 × 10ⁿ) so the
 *  gridline labels are numbers a person would actually write down. */
function niceMax(value: number): number {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const scaled = value / magnitude;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return step * magnitude;
}

function shortDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

/**
 * Daily visitors.
 *
 * It used to be a bare row of divs: no axis, no scale, no dates, no way
 * to read a value. You could see that something went up without being
 * able to say when or by how much. This keeps the bar form — the right
 * one for a daily count — and adds the parts that make a chart a chart:
 * a labelled scale, gridlines, dates along the bottom, and the exact
 * figure on hover.
 */
function VisitorsChart({
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
  const [showForm, setShowForm] = useState(false);
  const [draftDate, setDraftDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [draftLabel, setDraftLabel] = useState("");
  const [hover, setHover] = useState<number | null>(null);

  const peak = Math.max(...data.map((d) => d.count), 0);
  const top = niceMax(peak);
  const total = data.reduce((s, d) => s + d.count, 0);

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

  // Four evenly spread dates along the bottom — enough to place a spike
  // in time without turning the axis into a wall of text.
  const tickEvery = Math.max(1, Math.floor((data.length - 1) / 3));

  return (
    <div className="app-card">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-[13.5px] font-semibold">Visiteurs par jour</h3>
          <p className="text-[11.5px] text-muted-light">
            {total.toLocaleString("fr-FR")} au total sur la période · pic à{" "}
            {peak.toLocaleString("fr-FR")}
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 text-[12px] text-muted transition-colors hover:text-foreground"
          title="Marquer un événement (lancement, campagne, déploiement…)"
        >
          <Plus className="h-3.5 w-3.5" />
          Annotation
        </button>
      </div>

      {showForm && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[var(--app-radius-sm)] border border-border bg-surface-sunken p-2.5">
          <input
            type="date"
            value={draftDate}
            onChange={(e) => setDraftDate(e.target.value)}
            className="rounded-[var(--app-radius-sm)] border border-border bg-surface px-2 py-1 text-[12px] outline-none focus:border-primary"
          />
          <input
            type="text"
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Ex. « Lancement early bird »"
            maxLength={140}
            className="min-w-0 flex-1 rounded-[var(--app-radius-sm)] border border-border bg-surface px-2 py-1 text-[12px] outline-none focus:border-primary"
          />
          <button
            onClick={submit}
            disabled={addBusy || !draftLabel.trim()}
            className="rounded-[var(--app-radius-sm)] bg-primary px-2.5 py-1 text-[12px] font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            Ajouter
          </button>
        </div>
      )}

      <div className="flex gap-2">
        {/* Y scale. Without it the bars had no unit at all. */}
        <div className="relative w-8 shrink-0" style={{ height: 148 }}>
          {[top, top / 2, 0].map((v, i) => (
            <span
              key={i}
              className="absolute right-0 -translate-y-1/2 text-[10px] tabular-nums text-muted-light"
              style={{ top: `${(i / 2) * 100}%` }}
            >
              {v.toLocaleString("fr-FR")}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height: 148 }}>
            {/* Gridlines, behind the bars. */}
            {[0, 0.5, 1].map((f) => (
              <div
                key={f}
                className="absolute inset-x-0 border-t border-border"
                style={{ top: `${f * 100}%` }}
              />
            ))}

            <div
              className="absolute inset-0 flex items-end gap-[2px]"
              onMouseLeave={() => setHover(null)}
            >
              {data.map((d, i) => (
                <div
                  key={d.date}
                  onMouseEnter={() => setHover(i)}
                  className="group/bar relative flex h-full flex-1 cursor-default items-end"
                >
                  {/* Full-height hit area so thin bars are still hoverable. */}
                  <div
                    className={`w-full rounded-t-[2px] transition-colors ${
                      hover === i ? "bg-primary" : "bg-primary/55"
                    }`}
                    style={{
                      height: top > 0 ? `${(d.count / top) * 100}%` : "0%",
                      minHeight: d.count > 0 ? 2 : 0,
                    }}
                  />
                </div>
              ))}
            </div>

            {hover !== null && (
              <div
                className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[var(--app-radius-sm)] border border-border bg-surface px-2 py-1 text-[11px] shadow-lg"
                style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}
              >
                <span className="font-medium tabular-nums">
                  {data[hover].count.toLocaleString("fr-FR")} visiteur
                  {data[hover].count > 1 ? "s" : ""}
                </span>
                <span className="text-muted-light"> · {shortDate(data[hover].date)}</span>
                {byDate.get(data[hover].date)?.map((a) => (
                  <span key={a.id} className="block text-coral">
                    {a.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Annotation markers — same flex-1-per-day layout as the bars,
              so a dot lines up under its exact day. */}
          <div className="mt-1 flex items-center gap-[2px]">
            {data.map((d) => (
              <div key={d.date} className="flex flex-1 justify-center">
                {byDate.get(d.date) && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-coral"
                    title={byDate.get(d.date)!.map((a) => a.label).join(" · ")}
                  />
                )}
              </div>
            ))}
          </div>

          {/* X scale. */}
          <div className="mt-1 flex gap-[2px]">
            {data.map((d, i) => (
              <div key={d.date} className="min-w-0 flex-1 text-center">
                {i % tickEvery === 0 && (
                  <span className="text-[10px] whitespace-nowrap text-muted-light">
                    {shortDate(d.date)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {annotations.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-border pt-3">
          {annotations.map((a) => (
            <li key={a.id} className="flex items-center justify-between text-[12px]">
              <span className="text-muted">
                <span className="tabular-nums text-muted-light">{shortDate(a.date)}</span>
                {" — "}
                {a.label}
              </span>
              <button
                onClick={() => onDelete(a.id)}
                disabled={deletingId === a.id}
                className="shrink-0 text-muted-light transition-colors hover:text-red-500 disabled:opacity-50"
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

  const total = data.reduce((s, d) => s + Number(d[valueKey]), 0);
  const rows = data.slice(0, 6);

  return (
    <div className="app-card">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-[13.5px] font-semibold">{title}</h3>
        {data.length > rows.length && (
          <span className="text-[11px] text-muted-light">
            top {rows.length} sur {data.length}
          </span>
        )}
      </div>

      {data.length === 0 ? (
        <p className="py-4 text-center text-[12px] leading-relaxed text-muted-light">
          {emptyHint}
        </p>
      ) : (
        <div className="space-y-1">
          {rows.map((item, i) => {
            const value = Number(item[valueKey]);
            return (
              <div
                key={i}
                className="relative flex items-center justify-between gap-3 rounded-[var(--app-radius-sm)] px-1.5 py-1"
              >
                {/* The bar sits behind the row rather than under it, the
                    way a ranked table reads in Mixpanel: the label stays
                    on the baseline and the length is still comparable. */}
                <div
                  className="absolute inset-y-0 left-0 rounded-[var(--app-radius-sm)] bg-primary/10"
                  style={{ width: `${(value / max) * 100}%` }}
                />
                <span className="relative truncate text-[12.5px]">
                  {String(item[labelKey])}
                </span>
                <span className="relative shrink-0 text-[12px] tabular-nums text-muted">
                  {value.toLocaleString("fr-FR")}
                  {total > 0 && (
                    <span className="ml-1.5 text-muted-light">
                      {Math.round((value / total) * 100)}%
                    </span>
                  )}
                </span>
              </div>
            );
          })}
          <p className="pt-1.5 text-[11px] text-muted-light">
            {total.toLocaleString("fr-FR")} {valueLabel} au total
          </p>
        </div>
      )}
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

  // Zeroes while the first request is in flight, so the layout is the
  // real one rather than a skeleton that reflows into it.
  const emptyOverview: Overview = {
    visitors: 0,
    sessions: 0,
    pageviews: 0,
    bounce_rate: 0,
    avg_duration: 0,
  };

  const displayStats: Stats = stats || {
    ...emptyOverview,
    previous: emptyOverview,
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
    <div className="space-y-3">
      {/* Period — the site is chosen once in the rail. */}
      <div className="app-toolbar justify-between">
        <SegmentedFilter
          ariaLabel="Période"
          value={period}
          options={PERIOD_OPTIONS}
          onChange={setPeriod}
        />

        <span className="text-[11.5px] text-muted-light">
          Les écarts comparent aux {PERIOD_LABEL[period]}
        </span>

        <button
          onClick={exportCsv}
          disabled={exporting || !selectedSite}
          className="ml-auto flex items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          {exporting ? "Export…" : "Export CSV"}
        </button>
      </div>

      {exportLocked && (
        <div className="flex items-center gap-2 rounded-[var(--app-radius)] border border-primary/30 bg-primary-pale px-3 py-2 text-[12.5px] text-primary">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          L&apos;export CSV est disponible sur l&apos;offre Business.
          <Link href="/dashboard/upgrade" className="font-medium underline">
            Voir les offres
          </Link>
        </div>
      )}

      {/* Proactive AI insights — only shown once a digest exists, so a
          site with nothing flagged yet stays quiet rather than showing
          an empty placeholder every week. */}
      {insightDigest && (
        <div className="rounded-[var(--app-radius)] border border-primary/20 bg-primary-pale/40 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <h3 className="text-[13px] font-semibold">
              Insights de la semaine du{" "}
              {new Date(insightDigest.week_start + "T00:00:00").toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
              })}
            </h3>
          </div>
          <p className="mt-2 whitespace-pre-line text-[12.5px] leading-relaxed text-muted">
            {insightDigest.summary}
          </p>
        </div>
      )}

      {/* Realtime panel */}
      {selectedSite && <RealtimePanel siteId={selectedSite} />}

      {/* Headline figures. Every one carries its change against the
          same-length window immediately before, which is the difference
          between a number and a number that means something. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Visiteurs"
          value={displayStats.visitors.toLocaleString("fr-FR")}
          change={delta(displayStats.visitors, displayStats.previous.visitors)}
          hint="Personnes distinctes, identifiées par un hash sans cookie."
          icon={Users}
        />
        <StatCard
          label="Sessions"
          value={displayStats.sessions.toLocaleString("fr-FR")}
          change={delta(displayStats.sessions, displayStats.previous.sessions)}
          hint="Visites : une même personne qui revient compte plusieurs fois."
          icon={Activity}
        />
        <StatCard
          label="Pages vues"
          value={displayStats.pageviews.toLocaleString("fr-FR")}
          change={delta(displayStats.pageviews, displayStats.previous.pageviews)}
          hint="Total des pages chargées sur la période."
          icon={Eye}
        />
        <StatCard
          label="Taux de rebond"
          value={`${displayStats.bounce_rate}%`}
          change={delta(displayStats.bounce_rate, displayStats.previous.bounce_rate)}
          hint="Part des sessions qui n'ont vu qu'une seule page."
          lowerIsBetter
          icon={MousePointerClick}
        />
        <StatCard
          label="Durée moy."
          value={`${Math.floor(displayStats.avg_duration / 60)}m ${displayStats.avg_duration % 60}s`}
          change={delta(displayStats.avg_duration, displayStats.previous.avg_duration)}
          hint="Temps moyen passé par session."
          icon={Clock}
        />
      </div>

      {/* Chart */}
      <VisitorsChart
        data={displayStats.visitors_chart}
        annotations={annotations}
        onAdd={addAnnotation}
        onDelete={deleteAnnotation}
        addBusy={addingAnnotation}
        deletingId={deletingAnnotationId}
      />

      {/* Rankings */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
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
