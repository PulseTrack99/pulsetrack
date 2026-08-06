"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  BarChart3,
  MousePointerClick,
  Filter,
  DollarSign,
  Radio,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  CircleDot,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════
   Chart helpers
   ══════════════════════════════════════════════════════════════ */

/** Catmull-Rom → cubic bézier. Produces a smooth line through all points. */
function smoothPath(values: number[], w: number, h: number, pad = 0) {
  const max = Math.max(...values) * 1.12;
  const min = 0;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * w,
    h - pad - ((v - min) / (max - min)) * (h - pad * 2),
  ]);

  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2[0]} ${p2[1]}`;
  }
  return { d, pts };
}

/* ══════════════════════════════════════════════════════════════
   Shared chrome
   ══════════════════════════════════════════════════════════════ */

function PanelHeader({
  crumbs,
  action,
}: {
  crumbs: string[];
  action?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-light">
        {crumbs.map((c, i) => (
          <span key={c} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-black/15">/</span>}
            <span className={i === crumbs.length - 1 ? "text-foreground" : ""}>
              {c}
            </span>
          </span>
        ))}
      </div>
      {action && (
        <span className="rounded-sm border border-border px-2 py-0.5 text-[10px] text-muted">
          {action}
        </span>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  delta,
  positive = true,
}: {
  label: string;
  value: string;
  delta?: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-sm border border-border bg-surface px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-light">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="tabular text-lg font-medium tracking-[-0.02em]">
          {value}
        </span>
        {delta && (
          <span
            className={`flex items-center gap-0.5 text-[10px] font-medium ${
              positive ? "text-emerald" : "text-coral"
            }`}
          >
            {positive ? (
              <ArrowUpRight className="h-2.5 w-2.5" />
            ) : (
              <ArrowDownRight className="h-2.5 w-2.5" />
            )}
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Panel — Analytics
   ══════════════════════════════════════════════════════════════ */

const TRAFFIC = [180, 210, 195, 260, 240, 320, 300, 380, 355, 430, 470, 520];
const TRAFFIC_B = [120, 140, 135, 170, 160, 205, 195, 240, 225, 265, 290, 310];

function AnalyticsPanel({ t }: { t: Labels }) {
  const a = smoothPath(TRAFFIC, 560, 170, 12);
  const b = smoothPath(TRAFFIC_B, 560, 170, 12);
  const last = a.pts[a.pts.length - 1];

  return (
    <>
      <PanelHeader crumbs={["monblog.com", t.analytics]} action={t.last30} />
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2">
          <Metric label={t.visitors} value="48,291" delta="12.4%" />
          <Metric label={t.pageviews} value="127,540" delta="8.1%" />
          <Metric label={t.bounce} value="34.2%" delta="3.6%" positive={false} />
        </div>

        <div className="mt-3 rounded-sm border border-border bg-surface p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium">{t.visitorsOverTime}</span>
            <div className="flex items-center gap-3 text-[10px] text-muted">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {t.thisMonth}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-light" />
                {t.lastMonth}
              </span>
            </div>
          </div>

          <svg viewBox="0 0 560 170" className="h-[150px] w-full overflow-visible">
            <defs>
              <linearGradient id="ps-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0, 1, 2, 3].map((i) => (
              <line
                key={i}
                x1="0"
                x2="560"
                y1={12 + i * 48}
                y2={12 + i * 48}
                stroke="currentColor"
                className="text-black/[0.06]"
                strokeWidth="1"
              />
            ))}

            <path
              d={`${b.d} L 560 170 L 0 170 Z`}
              fill="var(--primary-light)"
              opacity="0.12"
            />
            <path
              d={b.d}
              fill="none"
              stroke="var(--primary-light)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />

            <path d={`${a.d} L 560 170 L 0 170 Z`} fill="url(#ps-fill)" />
            <path
              d={a.d}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.25"
              strokeLinecap="round"
            />

            <circle cx={last[0]} cy={last[1]} r="9" fill="var(--primary)" opacity="0.16" />
            <circle
              cx={last[0]}
              cy={last[1]}
              r="4"
              fill="var(--primary)"
              stroke="#fff"
              strokeWidth="2"
            />
          </svg>

          <div className="mt-1 flex justify-between px-1 text-[9px] text-muted-light">
            {["1", "5", "10", "15", "20", "25", "30"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   Panel — Heatmap
   ══════════════════════════════════════════════════════════════ */

const HEAT = [
  { x: 22, y: 16, r: 78, i: 0.9 },
  { x: 54, y: 30, r: 54, i: 0.62 },
  { x: 30, y: 50, r: 62, i: 0.78 },
  { x: 62, y: 62, r: 88, i: 1 },
  { x: 78, y: 40, r: 44, i: 0.5 },
  { x: 44, y: 80, r: 50, i: 0.66 },
];

function HeatmapPanel({ t }: { t: Labels }) {
  return (
    <>
      <PanelHeader
        crumbs={["monblog.com", "/pricing", t.heatmap]}
        action={t.clicks}
      />
      <div className="p-4">
        <div className="relative overflow-hidden rounded-sm border border-border bg-surface-sunken">
          {/* Mock page wireframe underneath */}
          <div className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <div className="h-2.5 w-20 rounded-xs bg-black/12" />
              <div className="flex gap-2">
                <div className="h-2 w-10 rounded-xs bg-black/8" />
                <div className="h-2 w-10 rounded-xs bg-black/8" />
                <div className="h-5 w-16 rounded-xs bg-black/20" />
              </div>
            </div>
            <div className="pt-5">
              <div className="h-4 w-3/5 rounded-xs bg-black/14" />
              <div className="mt-2 h-2 w-2/5 rounded-xs bg-black/8" />
            </div>
            <div className="grid grid-cols-3 gap-2.5 pt-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-xs border border-black/8 bg-white/70 p-3"
                >
                  <div className="h-2 w-10 rounded-xs bg-black/10" />
                  <div className="mt-2 h-5 w-14 rounded-xs bg-black/14" />
                  <div className="mt-3 space-y-1.5">
                    {[0, 1, 2].map((j) => (
                      <div key={j} className="h-1.5 w-full rounded-xs bg-black/6" />
                    ))}
                  </div>
                  <div
                    className={`mt-3 h-5 rounded-xs ${
                      i === 1 ? "bg-primary/80" : "bg-black/10"
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Heat blobs */}
          <div className="pointer-events-none absolute inset-0">
            {HEAT.map((h, i) => (
              <div
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full mix-blend-multiply"
                style={{
                  left: `${h.x}%`,
                  top: `${h.y}%`,
                  width: h.r,
                  height: h.r,
                  background: `radial-gradient(circle, rgba(255,60,0,${
                    0.55 * h.i
                  }) 0%, rgba(255,180,0,${0.4 * h.i}) 38%, rgba(60,200,120,${
                    0.22 * h.i
                  }) 66%, transparent 78%)`,
                  filter: "blur(7px)",
                }}
              />
            ))}
          </div>

          {/* Cursor trail */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 400 240"
            preserveAspectRatio="none"
          >
            <path
              d="M60 40 C 130 70, 180 55, 220 96 S 280 150, 250 158"
              fill="none"
              stroke="var(--coral)"
              strokeWidth="1.5"
              strokeDasharray="5 4"
              opacity="0.75"
              style={{ animation: "dash-flow 14s linear infinite" }}
            />
          </svg>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Metric label={t.totalClicks} value="8,412" />
          <Metric label={t.rageClicks} value="126" delta="18%" positive={false} />
          <Metric label={t.scrollDepth} value="68%" delta="5.2%" />
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   Panel — Funnels
   ══════════════════════════════════════════════════════════════ */

function FunnelsPanel({ t }: { t: Labels }) {
  const steps = [
    { label: t.step1, v: 12480, pct: 100 },
    { label: t.step2, v: 7104, pct: 57 },
    { label: t.step3, v: 3390, pct: 27.2 },
    { label: t.step4, v: 1842, pct: 14.8 },
  ];

  return (
    <>
      <PanelHeader crumbs={["monblog.com", t.funnels]} action={t.last30} />
      <div className="p-4">
        <div className="rounded-sm border border-border bg-surface p-4">
          <div className="space-y-3.5">
            {steps.map((s, i) => {
              const drop = i > 0 ? steps[i - 1].pct - s.pct : 0;
              return (
                <div key={s.label}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="flex items-center gap-2 text-[11px]">
                      <span className="flex h-4 w-4 items-center justify-center rounded-xs bg-surface-sunken text-[9px] text-muted">
                        {i + 1}
                      </span>
                      {s.label}
                    </span>
                    <span className="flex items-baseline gap-2">
                      <span className="tabular text-[11px] font-medium">
                        {s.v.toLocaleString("en-US")}
                      </span>
                      <span className="tabular text-[10px] text-muted-light">
                        {s.pct}%
                      </span>
                    </span>
                  </div>
                  <div className="h-7 overflow-hidden rounded-xs bg-surface-sunken">
                    <div
                      className="h-full rounded-xs transition-all duration-700"
                      style={{
                        width: `${s.pct}%`,
                        background: `linear-gradient(90deg, var(--primary) 0%, ${
                          i === 3 ? "var(--coral)" : "var(--primary-light)"
                        } 100%)`,
                      }}
                    />
                  </div>
                  {drop > 0 && (
                    <p className="mt-1 text-[10px] text-coral">
                      −{drop.toFixed(1)}% {t.dropoff}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Metric label={t.conversion} value="14.8%" delta="2.1%" />
          <Metric label={t.avgTime} value="4m 12s" />
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   Panel — Revenue
   ══════════════════════════════════════════════════════════════ */

function RevenuePanelMock({ t }: { t: Labels }) {
  const rows = [
    { src: "Google", amt: "€4,280", pct: 42, c: "var(--emerald)" },
    { src: "Product Hunt", amt: "€2,150", pct: 21, c: "var(--primary)" },
    { src: "Twitter / X", amt: "€1,890", pct: 18, c: "var(--sky)" },
    { src: "Newsletter", amt: "€1,430", pct: 14, c: "var(--amber)" },
    { src: "Reddit", amt: "€680", pct: 5, c: "var(--coral)" },
  ];

  const bars = [42, 55, 38, 68, 52, 79, 64, 88, 72, 95, 84, 100];

  return (
    <>
      <PanelHeader crumbs={["monblog.com", t.revenue]} action="Stripe" />
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2">
          <Metric label={t.totalRevenue} value="€10,430" delta="23.8%" />
          <Metric label={t.transactions} value="187" delta="14.2%" />
          <Metric label={t.aov} value="€55.78" delta="4.1%" />
        </div>

        <div className="mt-3 grid grid-cols-5 gap-2">
          <div className="col-span-3 rounded-sm border border-border bg-surface p-3">
            <p className="mb-2.5 text-[11px] font-medium">{t.revenueBySource}</p>
            <div className="space-y-2.5">
              {rows.map((r) => (
                <div key={r.src}>
                  <div className="mb-1 flex items-center justify-between text-[10px]">
                    <span className="text-muted">{r.src}</span>
                    <span className="tabular font-medium text-foreground">
                      {r.amt}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${r.pct}%`, background: r.c }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-2 rounded-sm border border-border bg-surface p-3">
            <p className="mb-2.5 text-[11px] font-medium">{t.dailyRevenue}</p>
            <div className="flex h-[124px] items-end gap-[3px]">
              {bars.map((b, i) => (
                <div
                  key={i}
                  className="flex-1 origin-bottom rounded-t-[2px]"
                  style={{
                    height: `${b}%`,
                    background:
                      i === bars.length - 1
                        ? "var(--emerald)"
                        : "var(--emerald-pale)",
                    border: `1px solid ${
                      i === bars.length - 1
                        ? "var(--emerald)"
                        : "rgba(15,169,104,0.25)"
                    }`,
                    animation: `grow-bar 0.5s cubic-bezier(0.22,1,0.36,1) ${
                      i * 45
                    }ms both`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   Panel — Live
   ══════════════════════════════════════════════════════════════ */

const CITIES = [
  { x: 20, y: 34, n: 42 },
  { x: 26, y: 44, n: 18 },
  { x: 47, y: 30, n: 96 },
  { x: 50, y: 27, n: 61 },
  { x: 52, y: 44, n: 27 },
  { x: 68, y: 38, n: 74 },
  { x: 78, y: 33, n: 55 },
  { x: 82, y: 62, n: 21 },
  { x: 33, y: 62, n: 33 },
  { x: 45, y: 55, n: 14 },
];

function LivePanel({ t }: { t: Labels }) {
  const [n, setN] = useState(847);

  useEffect(() => {
    const id = setInterval(
      () => setN((v) => Math.max(780, Math.min(910, v + (Math.random() * 14 - 7) | 0))),
      2200
    );
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <PanelHeader crumbs={["monblog.com", t.live]} action={t.updating} />
      <div className="p-4">
        <div className="flex items-center gap-3 rounded-sm border border-border bg-surface px-4 py-3">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald" />
          </span>
          <span className="tabular text-2xl font-medium tracking-[-0.03em]">
            {n}
          </span>
          <span className="text-[11px] text-muted">{t.visitorsNow}</span>
        </div>

        <div className="mt-3 grid grid-cols-5 gap-2">
          <div className="col-span-3 overflow-hidden rounded-sm border border-border bg-surface p-3">
            <p className="mb-2 text-[11px] font-medium">{t.byLocation}</p>
            <div className="relative h-[152px] rounded-xs bg-surface-sunken">
              <svg viewBox="0 0 100 70" className="h-full w-full">
                {/* Abstract landmass silhouettes */}
                <g fill="currentColor" className="text-black/[0.07]">
                  <ellipse cx="22" cy="32" rx="13" ry="11" />
                  <ellipse cx="28" cy="50" rx="6" ry="12" />
                  <ellipse cx="49" cy="28" rx="8" ry="7" />
                  <ellipse cx="51" cy="46" rx="8" ry="13" />
                  <ellipse cx="70" cy="34" rx="17" ry="13" />
                  <ellipse cx="82" cy="60" rx="6" ry="5" />
                </g>
                {CITIES.map((c, i) => (
                  <g key={i}>
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r={1.6 + (c.n / 96) * 2.6}
                      fill="var(--primary)"
                      opacity="0.16"
                    />
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r="1.15"
                      fill="var(--primary)"
                      style={{
                        animation: `pulse-dot 2.2s ease-in-out ${i * 240}ms infinite`,
                      }}
                    />
                  </g>
                ))}
              </svg>
            </div>
          </div>

          <div className="col-span-2 rounded-sm border border-border bg-surface p-3">
            <p className="mb-2 text-[11px] font-medium">{t.activePages}</p>
            <div className="space-y-1.5">
              {[
                { p: "/pricing", n: 214 },
                { p: "/", n: 186 },
                { p: "/blog/analytics", n: 142 },
                { p: "/features", n: 98 },
                { p: "/docs/install", n: 71 },
              ].map((r) => (
                <div
                  key={r.p}
                  className="flex items-center justify-between border-b border-border pb-1.5 text-[10px] last:border-0"
                >
                  <span className="truncate text-muted">{r.p}</span>
                  <span className="tabular font-medium">{r.n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   AI side rail
   ══════════════════════════════════════════════════════════════ */

function AiRail({ prompt, answer, follow }: { prompt: string; answer: string; follow: string }) {
  return (
    <div className="flex h-full flex-col border-r border-border bg-surface-sunken/60">
      <div className="flex items-center gap-1.5 border-b border-border px-3.5 py-2.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-medium">PulseTrack AI</span>
      </div>

      <div className="flex-1 space-y-2.5 p-3">
        <div className="ml-4 rounded-sm rounded-tr-none bg-primary-pale px-2.5 py-2 text-[10.5px] leading-relaxed text-foreground">
          {prompt}
        </div>
        <div className="rounded-sm rounded-tl-none border border-border bg-surface px-2.5 py-2 text-[10.5px] leading-relaxed text-muted">
          {answer}
        </div>
        <button className="flex w-full items-center justify-between rounded-sm border border-border bg-surface px-2.5 py-2 text-left text-[10px] text-primary transition-colors hover:bg-primary-pale/50">
          {follow}
          <span aria-hidden>→</span>
        </button>
      </div>

      <div className="border-t border-border p-2.5">
        <div className="flex items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 py-2">
          <Plus className="h-3 w-3 text-muted-light" />
          <span className="text-[10px] text-muted-light">Ask anything…</span>
          <CircleDot className="ml-auto h-3 w-3 text-muted-light" />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Showcase shell
   ══════════════════════════════════════════════════════════════ */

export interface Labels {
  tabLive: string;
  tabAnalytics: string;
  tabHeatmap: string;
  tabFunnels: string;
  tabRevenue: string;

  analytics: string;
  heatmap: string;
  funnels: string;
  revenue: string;
  live: string;

  last30: string;
  clicks: string;
  updating: string;

  visitors: string;
  pageviews: string;
  bounce: string;
  visitorsOverTime: string;
  thisMonth: string;
  lastMonth: string;

  totalClicks: string;
  rageClicks: string;
  scrollDepth: string;

  step1: string;
  step2: string;
  step3: string;
  step4: string;
  dropoff: string;
  conversion: string;
  avgTime: string;

  totalRevenue: string;
  transactions: string;
  aov: string;
  revenueBySource: string;
  dailyRevenue: string;

  visitorsNow: string;
  byLocation: string;
  activePages: string;

  ai: {
    live: [string, string, string];
    analytics: [string, string, string];
    heatmap: [string, string, string];
    funnels: [string, string, string];
    revenue: [string, string, string];
  };
}

const TAB_KEYS = ["live", "analytics", "heatmap", "funnels", "revenue"] as const;
type TabKey = (typeof TAB_KEYS)[number];

export function ProductShowcase({ t }: { t: Labels }) {
  const [tab, setTab] = useState<TabKey>("analytics");
  const [auto, setAuto] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  // Cycle tabs until the visitor takes over.
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => {
      setTab((cur) => TAB_KEYS[(TAB_KEYS.indexOf(cur) + 1) % TAB_KEYS.length]);
    }, 5200);
    return () => clearInterval(id);
  }, [auto]);

  const tabs: { key: TabKey; label: string; icon: typeof Radio }[] = [
    { key: "live", label: t.tabLive, icon: Radio },
    { key: "analytics", label: t.tabAnalytics, icon: BarChart3 },
    { key: "heatmap", label: t.tabHeatmap, icon: MousePointerClick },
    { key: "funnels", label: t.tabFunnels, icon: Filter },
    { key: "revenue", label: t.tabRevenue, icon: DollarSign },
  ];

  const panels: Record<TabKey, React.ReactNode> = {
    live: <LivePanel t={t} />,
    analytics: <AnalyticsPanel t={t} />,
    heatmap: <HeatmapPanel t={t} />,
    funnels: <FunnelsPanel t={t} />,
    revenue: <RevenuePanelMock t={t} />,
  };

  const rail = t.ai[tab];

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
      style={{ boxShadow: "var(--shadow-xl)" }}
    >
      {/* Tab bar */}
      <div
        className="flex items-center gap-0.5 overflow-x-auto border-b border-border bg-surface-sunken/70 px-2"
        role="tablist"
      >
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              setAuto(false);
            }}
            className={`relative flex shrink-0 items-center gap-1.5 px-3.5 py-2.5 text-[11.5px] font-medium transition-colors ${
              tab === key
                ? "text-foreground"
                : "text-muted-light hover:text-muted"
            }`}
          >
            <Icon
              className={`h-3.5 w-3.5 ${tab === key ? "text-primary" : ""}`}
            />
            {label}
            {tab === key && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-t-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="grid min-h-[430px] grid-cols-1 md:grid-cols-[210px_1fr]">
        <div className="hidden md:block">
          <AiRail prompt={rail[0]} answer={rail[1]} follow={rail[2]} />
        </div>
        <div key={tab} className="animate-fade">
          {panels[tab]}
        </div>
      </div>
    </div>
  );
}
