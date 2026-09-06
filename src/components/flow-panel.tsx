"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Workflow, LogOut, ArrowRight } from "lucide-react";
import { useSites } from "@/components/site-context";
import {
  FilterBar,
  SegmentedFilter,
  SearchableSelect,
  usePeriodOptions,
} from "@/components/filters";
import { useT } from "@/components/locale-context";

interface Row {
  step: number;
  from_path: string;
  to_path: string | null;
  sessions: number;
}

interface Node {
  path: string;
  sessions: number;
  share: number;
  y: number;
  h: number;
  exit: boolean;
}

/* Geometry. Node height is proportional to volume, but clamped at both
   ends: below MIN the label doesn't fit, and above MAX a dominant page
   turns the diagram into a wall of flat colour with one number in it —
   which is exactly what made this screen unreadable. Volume still reads
   through the ribbon thickness and the printed share. */
const COL_W = 190;
const COL_GAP = 92;
const NODE_MIN_H = 48;
const NODE_MAX_H = 128;
const HEADER_H = 34;

function label(path: string, otherLabel: string): string {
  if (path === "Autres") return otherLabel;
  return path || "/";
}

function layoutColumn(
  entries: { path: string; sessions: number; exit?: boolean }[],
  columnTotal: number,
  maxSessions: number
): Node[] {
  let y = HEADER_H;
  return entries.map((e) => {
    const h = Math.min(
      NODE_MAX_H,
      Math.max(NODE_MIN_H, (e.sessions / maxSessions) * NODE_MAX_H)
    );
    const node: Node = {
      path: e.path,
      sessions: e.sessions,
      share: columnTotal > 0 ? e.sessions / columnTotal : 0,
      y,
      h,
      exit: Boolean(e.exit),
    };
    y += h + 12;
    return node;
  });
}

function edgePath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

export function FlowPanel() {
  // Site comes from the rail's switcher (src/components/site-context.tsx).
  const { siteId, ready } = useSites();
  const { t, intl } = useT();
  const periodOptions = usePeriodOptions();
  const [period, setPeriod] = useState("30d");
  const [startPath, setStartPath] = useState<string | null>(null);
  const [depth, setDepth] = useState(4);
  const [topPaths, setTopPaths] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<{ step: number; path: string } | null>(null);

  // Populate the "starting page" dropdown from what the site's own
  // stats already know are its most-visited pages.
  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    fetch(`/api/stats?site_id=${siteId}&period=${period}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setTopPaths((d.top_pages ?? []).map((p: { path: string }) => p.path));
      });
    return () => {
      cancelled = true;
    };
  }, [siteId, period]);

  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ site_id: siteId, period, depth: String(depth) });
    if (startPath) params.set("start_path", startPath);
    fetch(`/api/flow?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setRows(d.rows ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [siteId, period, startPath, depth]);

  const { columns, totals } = useMemo(() => {
    if (!rows || rows.length === 0) {
      return { columns: [] as Node[][], totals: [] as number[] };
    }

    const numCols = depth + 1;
    const entriesTotal = rows
      .filter((r) => r.step === 0)
      .reduce((sum, r) => sum + r.sessions, 0);
    const maxSessions = Math.max(entriesTotal, 1);

    const cols: Node[][] = [];
    const colTotals: number[] = [];

    for (let step = 0; step < numCols; step++) {
      const byPath = new Map<string, { sessions: number; exit: boolean }>();

      if (step === 0) {
        for (const r of rows.filter((x) => x.step === 0)) {
          const cur = byPath.get(r.from_path) ?? { sessions: 0, exit: false };
          cur.sessions += r.sessions;
          byPath.set(r.from_path, cur);
        }
      } else {
        for (const r of rows.filter((x) => x.step === step - 1)) {
          const key = r.to_path ?? "Sortie";
          const cur = byPath.get(key) ?? { sessions: 0, exit: r.to_path === null };
          cur.sessions += r.sessions;
          byPath.set(key, cur);
        }
      }

      const total = [...byPath.values()].reduce((s, v) => s + v.sessions, 0);
      const entries = [...byPath.entries()]
        // Exits sink to the bottom of the column so the pages people
        // actually continued to stay together at the top.
        .sort((a, b) => (a[1].exit ? 1 : 0) - (b[1].exit ? 1 : 0) || b[1].sessions - a[1].sessions)
        .map(([path, v]) => ({ path, sessions: v.sessions, exit: v.exit }));

      cols.push(layoutColumn(entries, total, maxSessions));
      colTotals.push(total);
    }

    // A depth deeper than the data actually goes leaves empty trailing
    // columns, which pad the diagram with dead horizontal scroll.
    while (cols.length > 1 && cols[cols.length - 1].length === 0) {
      cols.pop();
      colTotals.pop();
    }

    return { columns: cols, totals: colTotals };
  }, [rows, depth]);

  const edges = useMemo(() => {
    if (!rows) return [];
    const out: {
      step: number;
      from: string;
      to: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      sessions: number;
    }[] = [];
    for (let step = 0; step < columns.length - 1; step++) {
      const fromCol = columns[step];
      const toCol = columns[step + 1];
      for (const r of rows.filter((x) => x.step === step)) {
        const fromNode = fromCol.find((n) => n.path === r.from_path);
        const toKey = r.to_path ?? "Sortie";
        const toNode = toCol.find((n) => n.path === toKey);
        if (!fromNode || !toNode) continue;
        out.push({
          step,
          from: r.from_path,
          to: toKey,
          x1: step * (COL_W + COL_GAP) + COL_W,
          y1: fromNode.y + fromNode.h / 2,
          x2: (step + 1) * (COL_W + COL_GAP),
          y2: toNode.y + toNode.h / 2,
          sessions: r.sessions,
        });
      }
    }
    return out;
  }, [rows, columns]);

  const maxEdge = Math.max(...edges.map((e) => e.sessions), 1);

  /** An edge is lit when the hovered node is one of its two ends. */
  function edgeLit(e: (typeof edges)[number]): boolean {
    if (!hovered) return true;
    if (hovered.step === e.step && hovered.path === e.from) return true;
    if (hovered.step === e.step + 1 && hovered.path === e.to) return true;
    return false;
  }

  /** The hovered node and its direct neighbours, so hovering a page
   *  shows where its traffic came from and where it went next. */
  function nodeLit(step: number, path: string): boolean {
    if (!hovered) return true;
    if (hovered.step === step && hovered.path === path) return true;
    return edges.some(
      (e) =>
        (hovered.step === e.step &&
          hovered.path === e.from &&
          step === e.step + 1 &&
          path === e.to) ||
        (hovered.step === e.step + 1 &&
          hovered.path === e.to &&
          step === e.step &&
          path === e.from)
    );
  }

  const diagramH = Math.max(
    260,
    ...columns.map((col) =>
      col.length === 0 ? 0 : col[col.length - 1].y + col[col.length - 1].h + 8
    )
  );

  if (!ready) return null;

  if (!siteId) {
    return (
      <div className="app-card flex flex-col items-center justify-center py-16 text-center">
        <Workflow className="h-7 w-7 text-muted-light" />
        <h2 className="mt-3 text-[15px] font-semibold">{t.screens.common.noSiteTitle}</h2>
        <p className="mt-1 max-w-sm text-[13px] text-muted">
          {t.screens.flows.noSiteBody}
        </p>
        <Link href="/dashboard/sites/new" className="btn btn-brand mt-4">
          {t.screens.common.addSite}
        </Link>
      </div>
    );
  }

  const empty = columns.length === 0 || columns.every((c) => c.length === 0);

  return (
    <div className="space-y-3">
      <FilterBar>
        <SegmentedFilter
          ariaLabel={t.filters.period}
          value={period}
          options={periodOptions}
          onChange={setPeriod}
        />

        <SearchableSelect
          value={startPath ?? ""}
          placeholder={t.screens.flows.allEntries}
          minWidth={200}
          options={[
            { value: "", label: t.screens.flows.allEntries },
            ...topPaths.map((p) => ({
              value: p,
              label: `${t.screens.flows.fromPage} ${p || "/"}`,
            })),
          ]}
          onChange={(v) => setStartPath(v || null)}
        />

        <label className="flex items-center gap-1.5 text-[12px] text-muted">
          {t.screens.flows.depth}
          <input
            type="number"
            min={1}
            max={6}
            value={depth}
            onChange={(e) => setDepth(Math.max(1, Math.min(6, Number(e.target.value))))}
            className="w-12 rounded-sm border border-border bg-surface px-1.5 py-1 text-[12px] outline-none focus:border-primary"
          />
        </label>
      </FilterBar>

      {/* The legend sits above the diagram, not buried under it: you need
          to know how to read the picture before you look at it. */}
      {!loading && !empty && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs border border-primary/50 bg-primary-pale" />
            {t.screens.flows.legendPage}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs border border-coral/50 bg-coral-pale" />
            {t.screens.flows.legendExit}
          </span>
          <span className="flex items-center gap-1.5">
            <ArrowRight className="h-3 w-3" />
            {t.screens.flows.legendThick}
          </span>
          <span className="text-muted-light">
            {t.screens.flows.legendHover}
          </span>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-surface p-5">
        {loading ? (
          <div className="flex h-[320px] items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          </div>
        ) : empty ? (
          <div className="flex h-[320px] flex-col items-center justify-center px-6 text-center">
            <Workflow className="h-7 w-7 text-muted-light" />
            <h3 className="mt-3 text-[15px] font-semibold">
              {t.screens.flows.emptyTitle}
            </h3>
            <p className="mt-1.5 max-w-md text-[13px] text-muted">
              {t.screens.flows.emptyBody1}{" "}
              <strong>{t.screens.flows.emptyBodyStrong}</strong>{" "}
              {t.screens.flows.emptyBody2}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setPeriod("90d")}
                className="rounded-[var(--app-radius-sm)] bg-primary px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
              >
                {t.screens.flows.widen}
              </button>
              <Link
                href="/dashboard/settings"
                className="rounded-[var(--app-radius-sm)] border border-border px-3 py-2 text-[13px] font-medium transition-colors hover:bg-surface-hover"
              >
                {t.screens.flows.checkScript}
              </Link>
            </div>
          </div>
        ) : (
          <svg
            width={columns.length * (COL_W + COL_GAP) - COL_GAP}
            height={diagramH}
            className="min-w-full"
            onMouseLeave={() => setHovered(null)}
          >
            {/* Column headers: which step, and how many sessions reached it. */}
            {columns.map((col, step) =>
              col.length === 0 ? null : (
                <g key={`h-${step}`} transform={`translate(${step * (COL_W + COL_GAP)}, 0)`}>
                  <text
                    x={0}
                    y={11}
                    className="fill-muted-light text-[10px] font-semibold uppercase"
                    style={{ letterSpacing: "0.05em" }}
                  >
                    {step === 0 ? t.screens.flows.entry : `${t.screens.flows.step} ${step}`}
                  </text>
                  <text x={0} y={25} className="fill-muted text-[11px]">
                    {totals[step]} {t.screens.flows.sessionsCount}
                  </text>
                </g>
              )
            )}

            {edges.map((e, i) => (
              <path
                key={i}
                d={edgePath(e.x1, e.y1, e.x2, e.y2)}
                fill="none"
                stroke="var(--primary)"
                strokeOpacity={edgeLit(e) ? 0.18 + 0.42 * (e.sessions / maxEdge) : 0.05}
                strokeWidth={Math.max(1.5, (e.sessions / maxEdge) * 14)}
                className="transition-opacity"
              />
            ))}

            {columns.map((col, step) =>
              col.map((n) => {
                const active = hovered?.step === step && hovered.path === n.path;
                return (
                  <g
                    key={`${step}-${n.path}`}
                    transform={`translate(${step * (COL_W + COL_GAP)}, ${n.y})`}
                    opacity={nodeLit(step, n.path) ? 1 : 0.28}
                    onMouseEnter={() => setHovered({ step, path: n.path })}
                    className="cursor-default transition-opacity"
                  >
                    <rect
                      width={COL_W}
                      height={n.h}
                      rx={5}
                      fill={n.exit ? "var(--coral-pale)" : "var(--primary-pale)"}
                      stroke={n.exit ? "var(--coral)" : "var(--primary)"}
                      strokeOpacity={active ? 0.75 : 0.3}
                    />
                    <foreignObject width={COL_W} height={n.h}>
                      <div className="flex h-full flex-col justify-center gap-0.5 overflow-hidden px-2.5">
                        <span
                          className={`truncate text-[11.5px] font-medium ${n.exit ? "text-coral" : "text-primary"}`}
                          title={n.exit ? t.screens.flows.legendExit : n.path}
                        >
                          {n.exit && <LogOut className="mr-1 inline h-3 w-3" />}
                          {n.exit ? t.screens.flows.exit : label(n.path, t.screens.flows.otherPages)}
                        </span>
                        {/* Both numbers, always: a raw count with no
                            denominator was the main thing making this
                            diagram unreadable. */}
                        <span className="text-[10.5px] tabular-nums text-muted">
                          {n.sessions} {t.screens.flows.sessionsCount}
                          <span className="mx-1 text-muted-light">·</span>
                          {Math.round(n.share * 100)}%
                        </span>
                      </div>
                    </foreignObject>
                  </g>
                );
              })
            )}
          </svg>
        )}
      </div>
    </div>
  );
}
