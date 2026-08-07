"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  MousePointerClick,
  AlertTriangle,
  ArrowDownToLine,
  Users,
  Monitor,
  Smartphone,
  Tablet,
  Layers,
  ExternalLink,
  Lock,
} from "lucide-react";
import { HeatmapCanvas, type Point } from "./heatmap-canvas";

interface Site {
  id: string;
  name: string;
  domain: string;
}

interface Stats {
  site: { domain: string };
  path: string;
  pages: { path: string; count: number }[];
  summary: {
    clicks: number;
    rage_clicks: number;
    sessions: number;
    avg_scroll: number;
    dead_clicks: number;
  };
  points: Point[];
  rage_points: Point[];
  elements: {
    selector: string;
    text: string;
    clicks: number;
    share: number;
    interactive: boolean;
  }[];
  rage_spots: { selector: string; text: string; count: number }[];
  scroll_bands: { depth: number; reached: number; pct: number }[];
  sampled: boolean;
  sample_size: number;
}

const DEVICES = [
  { value: "all", label: "Tous", icon: Layers },
  { value: "Desktop", label: "Desktop", icon: Monitor },
  { value: "Mobile", label: "Mobile", icon: Smartphone },
  { value: "Tablet", label: "Tablette", icon: Tablet },
];

function Metric({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "warn";
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-muted">{label}</span>
        <Icon className={`h-4 w-4 ${tone === "warn" ? "text-coral" : "text-muted-light"}`} />
      </div>
      <p
        className={`tabular mt-1.5 text-2xl font-medium tracking-[-0.02em] ${
          tone === "warn" ? "text-coral" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function HeatmapPanel({ sites }: { sites: Site[] }) {
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [path, setPath] = useState<string | null>(null);
  const [device, setDevice] = useState("all");
  const [period, setPeriod] = useState("30d");
  const [overlay, setOverlay] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  const site = useMemo(() => sites.find((s) => s.id === siteId), [sites, siteId]);

  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLocked(false);
      try {
        const params = new URLSearchParams({ site_id: siteId, device, period });
        if (path) params.set("path", path);

        const res = await fetch(`/api/heatmap/stats?${params}`);
        if (cancelled) return;

        if (res.status === 402) {
          setLocked(true);
          setStats(null);
          return;
        }
        if (res.ok) setStats(await res.json());
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [siteId, path, device, period]);

  if (sites.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-12 text-center">
        <MousePointerClick className="mx-auto h-8 w-8 text-muted-light" />
        <h2 className="mt-4 text-lg font-medium">Ajoutez d&apos;abord un site</h2>
        <p className="mx-auto mt-2 max-w-sm text-[13.5px] text-muted">
          Les heatmaps se construisent à partir des interactions enregistrées par
          le script de tracking.
        </p>
        <Link href="/dashboard/sites/new" className="btn btn-brand mt-6">
          Ajouter un site
        </Link>
      </div>
    );
  }

  if (locked) {
    return (
      <div className="rounded-lg border border-border bg-surface p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary-pale">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <h2 className="mt-4 text-lg font-medium">Les heatmaps sont sur Starter</h2>
        <p className="mx-auto mt-2 max-w-sm text-[13.5px] text-muted">
          Passez sur Starter pour voir où vos visiteurs cliquent, jusqu&apos;où ils
          scrollent et sur quoi ils s&apos;acharnent en vain.
        </p>
        <Link href="/dashboard/upgrade" className="btn btn-brand mt-6">
          Voir les offres
        </Link>
      </div>
    );
  }

  const s = stats;
  const hasData = (s?.summary.clicks ?? 0) > 0;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {sites.length > 1 && (
          <select
            value={siteId}
            onChange={(e) => {
              setSiteId(e.target.value);
              setPath(null);
            }}
            className="rounded-sm border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
          >
            {sites.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={s?.path ?? ""}
          onChange={(e) => setPath(e.target.value)}
          className="min-w-[180px] rounded-sm border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
        >
          {(s?.pages ?? []).map((p) => (
            <option key={p.path} value={p.path}>
              {p.path} · {p.count}
            </option>
          ))}
          {(s?.pages ?? []).length === 0 && <option value="">Aucune page</option>}
        </select>

        <div className="flex gap-0.5 rounded-sm border border-border bg-surface p-0.5">
          {DEVICES.map((d) => (
            <button
              key={d.value}
              onClick={() => setDevice(d.value)}
              title={d.label}
              className={`flex items-center gap-1.5 rounded-xs px-2.5 py-1.5 text-[12px] transition-colors ${
                device === d.value
                  ? "bg-primary-pale text-primary"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <d.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{d.label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-0.5 rounded-sm border border-border bg-surface p-0.5">
          {["24h", "7d", "30d", "90d"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-xs px-2.5 py-1.5 text-[12px] transition-colors ${
                period === p ? "bg-primary-pale text-primary" : "text-muted hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Clics" value={(s?.summary.clicks ?? 0).toLocaleString("fr-FR")} icon={MousePointerClick} />
        <Metric label="Sessions" value={(s?.summary.sessions ?? 0).toLocaleString("fr-FR")} icon={Users} />
        <Metric label="Scroll moyen" value={`${s?.summary.avg_scroll ?? 0}%`} icon={ArrowDownToLine} />
        <Metric
          label="Clics de rage"
          value={(s?.summary.rage_clicks ?? 0).toLocaleString("fr-FR")}
          icon={AlertTriangle}
          tone={(s?.summary.rage_clicks ?? 0) > 0 ? "warn" : "default"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Map */}
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-2 text-[12px]">
              <span className="font-medium">{s?.path ?? "—"}</span>
              {site && (
                <a
                  href={`https://${site.domain}${s?.path ?? ""}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-light hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-muted">
                <input
                  type="checkbox"
                  checked={overlay}
                  onChange={(e) => setOverlay(e.target.checked)}
                  className="accent-[var(--primary)]"
                />
                Superposer la page
              </label>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-light">
                <span>Froid</span>
                <span
                  className="h-1.5 w-14 rounded-full"
                  style={{
                    background: "linear-gradient(90deg,#3b82f6,#3ec88a,#f5d423,#ff9d2e,#ff3c00)",
                  }}
                />
                <span>Chaud</span>
              </div>
            </div>
          </div>

          <div className="relative min-h-[520px] bg-surface-sunken">
            {overlay && site && s?.path && (
              <iframe
                key={`${site.domain}${s.path}`}
                src={`https://${site.domain}${s.path}`}
                title="Page"
                className="absolute inset-0 h-full w-full border-0 opacity-60"
                sandbox="allow-same-origin"
                loading="lazy"
              />
            )}

            {hasData && s && (
              <HeatmapCanvas points={s.points} rage={s.rage_points} />
            )}

            {!loading && !hasData && (
              <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
                <div>
                  <MousePointerClick className="mx-auto h-7 w-7 text-muted-light" />
                  <p className="mt-3 text-[14px] font-medium">Pas encore d&apos;interactions</p>
                  <p className="mx-auto mt-1.5 max-w-xs text-[13px] text-muted">
                    Les clics apparaissent ici dès que des visiteurs parcourent
                    cette page avec le script installé.
                  </p>
                </div>
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
              </div>
            )}
          </div>

          {(overlay || s?.sampled) && (
            <div className="space-y-1 border-t border-border px-4 py-2 text-[11px] text-muted-light">
              {overlay && (
                <p>
                  Certains sites refusent d&apos;être affichés dans un cadre. Si la
                  page reste vide, décochez la superposition — la carte reste
                  exacte.
                </p>
              )}
              {s?.sampled && (
                <p>
                  Carte et classement calculés sur les{" "}
                  {s.sample_size.toLocaleString("fr-FR")} interactions les plus
                  récentes. Les totaux ci-dessus portent sur la période entière.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Side panels */}
        <div className="space-y-5">
          {/* Scroll depth */}
          <div className="rounded-lg border border-border bg-surface p-4">
            <h3 className="text-[13px] font-medium">Profondeur de scroll</h3>
            <p className="mt-0.5 text-[11px] text-muted-light">
              Part des sessions atteignant chaque palier
            </p>
            <div className="mt-3 space-y-1.5">
              {(s?.scroll_bands ?? []).map((b) => (
                <div key={b.depth} className="flex items-center gap-2">
                  <span className="tabular w-8 text-right text-[11px] text-muted-light">
                    {b.depth}%
                  </span>
                  <div className="h-4 flex-1 overflow-hidden rounded-xs bg-surface-sunken">
                    <div
                      className="h-full rounded-xs transition-all duration-500"
                      style={{
                        width: `${b.pct}%`,
                        background:
                          b.pct > 60
                            ? "var(--primary)"
                            : b.pct > 25
                              ? "var(--amber)"
                              : "var(--coral)",
                      }}
                    />
                  </div>
                  <span className="tabular w-9 text-right text-[11px] text-muted">
                    {b.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Rage spots */}
          {(s?.rage_spots.length ?? 0) > 0 && (
            <div className="rounded-lg border border-coral/30 bg-coral-pale/40 p-4">
              <h3 className="flex items-center gap-1.5 text-[13px] font-medium text-coral">
                <AlertTriangle className="h-3.5 w-3.5" />
                Clics de rage
              </h3>
              <p className="mt-0.5 text-[11px] text-muted">
                Éléments non cliquables sur lesquels on insiste
              </p>
              <div className="mt-3 space-y-2">
                {s!.rage_spots.map((r) => (
                  <div key={r.selector} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium">
                        {r.text || r.selector}
                      </p>
                      <p className="truncate font-mono text-[10px] text-muted-light">
                        {r.selector}
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-[12px] font-medium text-coral">
                      {r.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Elements */}
          <div className="rounded-lg border border-border bg-surface p-4">
            <h3 className="text-[13px] font-medium">Éléments les plus cliqués</h3>
            <div className="mt-3 space-y-2.5">
              {(s?.elements ?? []).length === 0 && (
                <p className="py-2 text-[12px] text-muted-light">Aucune donnée</p>
              )}
              {(s?.elements ?? []).map((el) => (
                <div key={el.selector}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[12px]">
                      {el.text || el.selector}
                      {!el.interactive && (
                        <span
                          className="ml-1.5 rounded-xs bg-coral-pale px-1 py-px text-[9px] text-coral"
                          title="Cet élément n'est pas cliquable"
                        >
                          inerte
                        </span>
                      )}
                    </span>
                    <span className="tabular shrink-0 text-[11px] text-muted">
                      {el.share}%
                    </span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-sunken">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, el.share)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
