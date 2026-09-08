"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSites } from "@/components/site-context";
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
  Video,
  Clock,
} from "lucide-react";
import { HeatmapCanvas, type Point } from "./heatmap-canvas";
import { PageWireframe, type SnapshotElement } from "./page-wireframe";
import { PageReplay } from "./page-replay";
import {
  FilterBar,
  SegmentedFilter,
  SearchableSelect,
  usePeriodOptions,
} from "@/components/filters";
import { useT } from "@/components/locale-context";

interface Site {
  id: string;
  name: string;
  domain: string;
}

interface Stats {
  site: { domain: string };
  path: string;
  device: string;
  devices: { device: string; count: number }[];
  geometry: { viewport_w: number; doc_h: number };
  snapshot: {
    elements: SnapshotElement[];
    // rrweb tree when the page has been captured in full.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dom: any | null;
    dom_bytes: number | null;
    captured_at: string;
  } | null;
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
  /** Les valeurs réellement présentes sur cette page, pour ne proposer
   *  que des filtres qui donnent quelque chose. */
  sources: string[];
  countries: string[];
  source: string | null;
  country: string | null;
  /** Le nuage n'affiche pas tous les points. Les chiffres, eux, sont
   *  exacts depuis que l'agrégation se fait en base. */
  points_capped: boolean;
  points_shown: number;
}

// No "all" option on purpose. An x ratio locates a different place on a
// 390px phone than on a 1440px desktop, so a map that stacks breakpoints
// corresponds to no layout that ever existed.
const DEVICE_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  Desktop: { label: "Desktop", icon: Monitor },
  Mobile: { label: "Mobile", icon: Smartphone },
  Tablet: { label: "Tablette", icon: Tablet },
};

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

interface ReplayRow {
  id: string;
  replay_id: string;
  path: string | null;
  device: string | null;
  started_at: string;
  duration_ms: number;
  has_rage: boolean;
}

export function HeatmapPanel() {
  const { sites, siteId: selected, setSiteId } = useSites();
  const { t, intl } = useT();
  const siteId = selected ?? "";

  // Arriving from "Heatmap de cette page" on a replay carries ?site= and
  // ?path=. The site part now points the rail's shared selection at that
  // site, so the whole app follows rather than just this panel.
  const initial = useSearchParams();
  const [path, setPath] = useState<string | null>(initial.get("path"));

  useEffect(() => {
    const linked = initial.get("site");
    if (linked && linked !== selected && sites.some((s) => s.id === linked)) {
      setSiteId(linked);
    }
    // Only when the link's own parameter changes — not on every selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, sites]);
  // null lets the server pick the breakpoint with the most data.
  const [device, setDevice] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const periodOptions = usePeriodOptions();
  const [period, setPeriod] = useState("30d");
  // Off by default: it only works when the domain is reachable and allows
  // framing, and a failed frame is more confusing than no frame.
  const [overlay, setOverlay] = useState(false);
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
        const params = new URLSearchParams({ site_id: siteId, period });
        if (device) params.set("device", device);
        if (path) params.set("path", path);
        if (source) params.set("source", source);
        if (country) params.set("country", country);

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
  }, [siteId, path, device, period, source, country]);

  // A short list of individual sessions on the same page — the pivot
  // from "here's the aggregate pattern" to "show me one person's actual
  // journey" that a heatmap alone can't give you.
  const [replays, setReplays] = useState<ReplayRow[]>([]);

  useEffect(() => {
    if (!siteId || !stats?.path) {
      setReplays([]);
      return;
    }
    let cancelled = false;

    const params = new URLSearchParams({
      site_id: siteId,
      path: stats.path,
      period,
      limit: "5",
    });

    fetch(`/api/replay/list?${params}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setReplays(data.replays ?? []);
      })
      .catch(() => {
        if (!cancelled) setReplays([]);
      });

    return () => {
      cancelled = true;
    };
  }, [siteId, stats?.path, period]);

  if (sites.length === 0) {
    return (
      <div className="app-card flex flex-col items-center justify-center py-16 text-center">
        <MousePointerClick className="h-7 w-7 text-muted-light" />
        <h2 className="mt-3 text-[15px] font-semibold">{t.screens.common.noSiteTitle}</h2>
        <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted">
          {t.screens.heatmaps.noSiteBody}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/dashboard/sites/new"
            className="rounded-[var(--app-radius-sm)] bg-primary px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
          >
            {t.screens.common.addSite}
          </Link>
          <Link
            href="/features/heatmaps"
            className="rounded-[var(--app-radius-sm)] border border-border px-3 py-2 text-[13px] font-medium transition-colors hover:bg-surface-hover"
          >
            {t.screens.common.howItWorks}
          </Link>
        </div>
      </div>
    );
  }

  if (locked) {
    return (
      <div className="rounded-lg border border-border bg-surface p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary-pale">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <h2 className="mt-4 text-lg font-medium">{t.screens.heatmaps.lockedTitle}</h2>
        <p className="mx-auto mt-2 max-w-sm text-[13.5px] text-muted">
          {t.screens.heatmaps.lockedBody}
        </p>
        <Link href="/dashboard/upgrade" className="btn btn-brand mt-6">
          {t.screens.common.seePlans}
        </Link>
      </div>
    );
  }

  const s = stats;
  const hasData = (s?.points.length ?? 0) > 0;

  // Width-to-height ratio of the page this breakpoint was captured at.
  const aspect =
    s && s.geometry.doc_h > 0 && s.geometry.viewport_w > 0
      ? s.geometry.viewport_w / s.geometry.doc_h
      : 0;

  // A tall sheet needs a wider brush, or the cloud reads as scattered
  // pinpricks rather than zones.
  const radius = aspect > 0 ? Math.max(14, Math.round(22 / aspect / 8)) : 22;

  // Density is what the colour ramp reads, so a page with ten clicks needs
  // far more weight per point than one with four thousand — otherwise a
  // small sample renders as invisible specks.
  const n = s?.points.length ?? 0;
  const intensity = n > 0 ? Math.min(0.5, Math.max(0.08, 2.2 / Math.sqrt(n))) : 0.2;

  return (
    <div className="space-y-5">
      <FilterBar>
        <SearchableSelect
          value={s?.path ?? ""}
          /* Source et pays sont propres à une page : les garder en
             changeant de page afficherait une carte vide sans dire
             pourquoi. */
          onChange={(v) => {
            setPath(v);
            setSource(null);
            setCountry(null);
          }}
          minWidth={220}
          placeholder={t.screens.heatmaps.choosePage}
          emptyLabel={t.screens.heatmaps.noPage}
          searchPlaceholder={t.screens.heatmaps.filterPages}
          options={(s?.pages ?? []).map((p) => ({
            value: p.path,
            label: p.path,
            hint: p.count.toLocaleString(intl),
          }))}
        />

        <SegmentedFilter
          ariaLabel="Appareil"
          value={s?.device ?? ""}
          onChange={setDevice}
          options={(s?.devices ?? []).map((d) => {
            const meta = DEVICE_META[d.device] ?? { label: d.device, icon: Layers };
            return {
              value: d.device,
              label: meta.label,
              icon: meta.icon,
              count: d.count,
            };
          })}
        />

        {/* « Segmentation par appareil, source ou pays » : seul
            l'appareil existait. Les valeurs proposées sont celles
            réellement présentes sur la page choisie. */}
        {(s?.sources?.length ?? 0) > 1 && (
          <SearchableSelect
            value={s?.source ?? ""}
            onChange={(v) => setSource(v || null)}
            minWidth={150}
            placeholder={t.screens.heatmaps.allSources}
            emptyLabel={t.screens.heatmaps.allSources}
            searchPlaceholder={t.screens.heatmaps.filterSources}
            options={[
              { value: "", label: t.screens.heatmaps.allSources },
              ...(s?.sources ?? []).map((v) => ({ value: v, label: v })),
            ]}
          />
        )}

        {(s?.countries?.length ?? 0) > 1 && (
          <SearchableSelect
            value={s?.country ?? ""}
            onChange={(v) => setCountry(v || null)}
            minWidth={150}
            placeholder={t.screens.heatmaps.allCountries}
            emptyLabel={t.screens.heatmaps.allCountries}
            searchPlaceholder={t.screens.heatmaps.filterCountries}
            options={[
              { value: "", label: t.screens.heatmaps.allCountries },
              ...(s?.countries ?? []).map((v) => ({ value: v, label: v })),
            ]}
          />
        )}

        <SegmentedFilter
          ariaLabel={t.filters.period}
          value={period}
          options={periodOptions}
          onChange={setPeriod}
        />
      </FilterBar>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label={t.screens.common.clicks} value={(s?.summary.clicks ?? 0).toLocaleString(intl)} icon={MousePointerClick} />
        <Metric label={t.screens.common.sessions} value={(s?.summary.sessions ?? 0).toLocaleString(intl)} icon={Users} />
        <Metric label={t.screens.heatmaps.avgScroll} value={`${s?.summary.avg_scroll ?? 0}%`} icon={ArrowDownToLine} />
        <Metric
          label={t.screens.heatmaps.rageClicks}
          value={(s?.summary.rage_clicks ?? 0).toLocaleString(intl)}
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
                {t.screens.heatmaps.loadLive}
              </label>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-light">
                <span>{t.screens.heatmaps.cold}</span>
                <span
                  className="h-1.5 w-14 rounded-full"
                  style={{
                    background: "linear-gradient(90deg,#3b82f6,#3ec88a,#f5d423,#ff9d2e,#ff3c00)",
                  }}
                />
                <span>{t.screens.heatmaps.hot}</span>
              </div>
            </div>
          </div>

          {/* The frame scrolls; the sheet inside carries the page's real
              proportions, so a 1440x6800 page renders tall rather than
              being squashed into a fixed box. */}
          <div className="relative max-h-[620px] overflow-y-auto bg-surface-sunken">
            {hasData && s && aspect > 0 ? (
              <div className="flex">
                {/* Depth ruler — makes a position readable without the
                    page underneath it. */}
                <div className="relative w-10 shrink-0 border-r border-border bg-surface">
                  {[0, 25, 50, 75, 100].map((d) => (
                    <span
                      key={d}
                      className="absolute right-1.5 -translate-y-1/2 text-[9px] tabular text-muted-light"
                      style={{ top: `${d}%` }}
                    >
                      {d}%
                    </span>
                  ))}
                </div>

                <div
                  className="relative flex-1 bg-white"
                  style={{ aspectRatio: `${aspect}` }}
                >
                  {/* The page as it was when the clicks happened.
                      rrweb replay when we have it, boxes otherwise. */}
                  {s.snapshot?.dom ? (
                    <PageReplay
                      dom={s.snapshot.dom}
                      viewportW={s.geometry.viewport_w}
                      docH={s.geometry.doc_h}
                    />
                  ) : (
                    s.snapshot && <PageWireframe elements={s.snapshot.elements} />
                  )}

                  {/* The live page, for anyone who wants the real thing and
                      whose site permits framing. */}
                  {overlay && site && s.path && (
                    <iframe
                      key={`${site.domain}${s.path}`}
                      src={`https://${site.domain}${s.path}`}
                      title="Page"
                      className="absolute inset-0 h-full w-full border-0 opacity-70"
                      sandbox="allow-same-origin"
                      loading="lazy"
                    />
                  )}

                  {[25, 50, 75].map((d) => (
                    <span
                      key={d}
                      className="pointer-events-none absolute inset-x-0 border-t border-dashed border-black/10"
                      style={{ top: `${d}%` }}
                    />
                  ))}

                  <HeatmapCanvas
                    points={s.points}
                    rage={s.rage_points}
                    radius={radius}
                    intensity={intensity}
                  />
                </div>
              </div>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center p-8 text-center">
                {loading ? (
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                ) : (
                  <div>
                    <MousePointerClick className="mx-auto h-7 w-7 text-muted-light" />
                    <p className="mt-3 text-[14px] font-medium">
                      {t.screens.heatmaps.noInteractionTitle}
                    </p>
                    <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted">
                      {t.screens.heatmaps.noInteractionBody}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {(overlay || s?.points_capped) && (
            <div className="space-y-1 border-t border-border px-4 py-2 text-[11px] text-muted-light">
              {overlay && (
                <p>
                  {t.screens.heatmaps.overlayNote}
                </p>
              )}
              {s?.snapshot ? (
                <p>
                  {t.screens.heatmaps.snapshotTaken}{" "}
                  {new Date(s.snapshot.captured_at).toLocaleDateString(intl)}{" "}
                  {t.screens.heatmaps.snapshotOn}{" "}
                  {s.device} — {s.geometry.viewport_w} × {s.geometry.doc_h} px,{" "}
                  {s.snapshot.elements.length} {t.screens.heatmaps.snapshotElements}.
                </p>
              ) : (
                s &&
                aspect > 0 && (
                  <p>
                    {t.screens.heatmaps.noSnapshot}
                  </p>
                )
              )}
              {s?.points_capped && (
                <p>
                  {t.screens.heatmaps.sampledNote1}{" "}
                  {s.points_shown.toLocaleString(intl)}{" "}
                  {t.screens.heatmaps.sampledNote2}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Side panels */}
        <div className="space-y-5">
          {/* Sessions on this page */}
          {replays.length > 0 && (
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="flex items-center gap-1.5 text-[13px] font-medium">
                <Video className="h-3.5 w-3.5 text-primary" />
                {t.screens.heatmaps.sessionsOnPage}
              </h3>
              <p className="mt-0.5 text-[11px] text-muted-light">
                {t.screens.heatmaps.sessionsOnPageBody}
              </p>
              <div className="mt-3 space-y-1">
                {replays.map((r) => (
                  <Link
                    key={r.id}
                    href={`/dashboard/replays?site=${siteId}&path=${encodeURIComponent(r.path ?? "")}`}
                    className="flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-[12px] transition-colors hover:bg-surface-hover"
                  >
                    <span className="flex items-center gap-1.5 text-muted">
                      <Clock className="h-3 w-3 text-muted-light" />
                      {Math.round(r.duration_ms / 1000)}s · {r.device ?? "—"}
                    </span>
                    {r.has_rage && (
                      <span title={t.screens.heatmaps.rageDetected}>
                        <AlertTriangle className="h-3 w-3 text-coral" />
                      </span>
                    )}
                  </Link>
                ))}
              </div>
              <Link
                href={`/dashboard/replays?site=${siteId}&path=${encodeURIComponent(stats?.path ?? "")}`}
                className="mt-3 block text-center text-[11.5px] text-primary hover:underline"
              >
                {t.screens.heatmaps.seeAllSessions}
              </Link>
            </div>
          )}

          {/* Scroll depth */}
          <div className="rounded-lg border border-border bg-surface p-4">
            <h3 className="text-[13px] font-medium">{t.screens.heatmaps.scrollDepth}</h3>
            <p className="mt-0.5 text-[11px] text-muted-light">
              {t.screens.heatmaps.scrollDepthBody}
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
                {t.screens.heatmaps.rageClicks}
              </h3>
              <p className="mt-0.5 text-[11px] text-muted">
                {t.screens.heatmaps.rageBody}
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
            <h3 className="text-[13px] font-medium">{t.screens.heatmaps.topElements}</h3>
            <div className="mt-3 space-y-2.5">
              {(s?.elements ?? []).length === 0 && (
                <p className="py-2 text-[12px] leading-relaxed text-muted-light">
                  {t.screens.heatmaps.topElementsEmpty}
                </p>
              )}
              {(s?.elements ?? []).map((el) => (
                <div key={el.selector}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[12px]">
                      {el.text || el.selector}
                      {!el.interactive && (
                        <span
                          className="ml-1.5 rounded-xs bg-coral-pale px-1 py-px text-[9px] text-coral"
                          title={t.screens.heatmaps.notClickable}
                        >
                          {t.screens.heatmaps.inert}
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
