"use client";

import { useEffect, useMemo, useState } from "react";
import { Workflow, LogOut } from "lucide-react";

interface Site {
  id: string;
  name: string;
  domain: string;
}

interface Row {
  step: number;
  from_path: string;
  to_path: string | null;
  sessions: number;
}

interface Node {
  path: string;
  sessions: number;
  y: number;
  h: number;
  exit: boolean;
}

const COL_W = 200;
const COL_GAP = 90;
const DIAGRAM_H = 460;
const NODE_H = 34;
const NODE_GAP = 10;

function label(path: string): string {
  if (path === "Autres") return "Autres pages";
  return path || "/";
}

/** Lays nodes out top-to-bottom in a fixed-height column, sized by
 *  session count relative to the busiest node in the whole diagram —
 *  so the visual shrinkage across steps reflects real drop-off rather
 *  than each column re-normalizing to its own max. */
function layoutColumn(entries: { path: string; sessions: number; exit?: boolean }[], maxSessions: number): Node[] {
  let y = 0;
  return entries.map((e) => {
    const h = Math.max(28, (e.sessions / maxSessions) * DIAGRAM_H * 0.9);
    const node: Node = { path: e.path, sessions: e.sessions, y, h, exit: Boolean(e.exit) };
    y += h + NODE_GAP;
    return node;
  });
}

function edgePath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

export function FlowPanel({ sites }: { sites: Site[] }) {
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [period, setPeriod] = useState("30d");
  const [startPath, setStartPath] = useState<string | null>(null);
  const [depth, setDepth] = useState(4);
  const [topPaths, setTopPaths] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);

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

  const { columns, maxSessions } = useMemo(() => {
    if (!rows || rows.length === 0) return { columns: [] as Node[][], maxSessions: 1 };

    const numCols = depth + 1;
    const maxSessions = Math.max(...rows.filter((r) => r.step === 0).map((r) => r.sessions), 1);

    const cols: Node[][] = [];
    for (let step = 0; step < numCols; step++) {
      if (step === 0) {
        const byPath = new Map<string, number>();
        for (const r of rows.filter((x) => x.step === 0)) {
          byPath.set(r.from_path, (byPath.get(r.from_path) ?? 0) + r.sessions);
        }
        const entries = [...byPath.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([path, sessions]) => ({ path, sessions }));
        cols.push(layoutColumn(entries, maxSessions));
      } else {
        const incoming = rows.filter((x) => x.step === step - 1);
        const byPath = new Map<string, { sessions: number; exit: boolean }>();
        for (const r of incoming) {
          const key = r.to_path ?? "Sortie";
          const cur = byPath.get(key) ?? { sessions: 0, exit: r.to_path === null };
          cur.sessions += r.sessions;
          byPath.set(key, cur);
        }
        const entries = [...byPath.entries()]
          .sort((a, b) => (a[1].exit ? 1 : 0) - (b[1].exit ? 1 : 0) || b[1].sessions - a[1].sessions)
          .map(([path, v]) => ({ path, sessions: v.sessions, exit: v.exit }));
        cols.push(layoutColumn(entries, maxSessions));
      }
    }
    return { columns: cols, maxSessions };
  }, [rows, depth]);

  const edges = useMemo(() => {
    if (!rows) return [];
    const out: { step: number; x1: number; y1: number; x2: number; y2: number; sessions: number }[] = [];
    for (let step = 0; step < columns.length - 1; step++) {
      const fromCol = columns[step];
      const toCol = columns[step + 1];
      const stepRows = rows.filter((r) => r.step === step);
      for (const r of stepRows) {
        const fromNode = fromCol.find((n) => n.path === r.from_path);
        const toKey = r.to_path ?? "Sortie";
        const toNode = toCol.find((n) => n.path === toKey);
        if (!fromNode || !toNode) continue;
        out.push({
          step,
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

  if (sites.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-12 text-center">
        <Workflow className="mx-auto h-8 w-8 text-muted-light" />
        <h2 className="mt-4 text-lg font-medium">Ajoutez d&apos;abord un site</h2>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {sites.length > 1 && (
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="rounded-sm border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}

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

        <select
          value={startPath ?? ""}
          onChange={(e) => setStartPath(e.target.value || null)}
          className="rounded-sm border border-border bg-surface px-2.5 py-1.5 text-[12px] outline-none focus:border-primary"
        >
          <option value="">Toutes les entrées</option>
          {topPaths.map((p) => (
            <option key={p} value={p}>
              À partir de {p || "/"}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-1.5 text-[12px] text-muted">
          Profondeur
          <input
            type="number"
            min={1}
            max={6}
            value={depth}
            onChange={(e) => setDepth(Math.max(1, Math.min(6, Number(e.target.value))))}
            className="w-12 rounded-sm border border-border bg-surface px-1.5 py-1 text-[12px] outline-none focus:border-primary"
          />
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface p-6">
        {loading ? (
          <div className="flex h-[460px] items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          </div>
        ) : columns.length === 0 || columns.every((c) => c.length === 0) ? (
          <div className="flex h-[300px] flex-col items-center justify-center text-center">
            <Workflow className="h-6 w-6 text-muted-light" />
            <p className="mt-3 text-[13px] font-medium">Pas assez de données</p>
            <p className="mt-1.5 text-[12px] text-muted">
              Les parcours apparaîtront dès qu&apos;il y aura des visites enregistrées.
            </p>
          </div>
        ) : (
          <svg
            width={columns.length * (COL_W + COL_GAP) - COL_GAP}
            height={DIAGRAM_H}
            className="min-w-full"
          >
            {edges.map((e, i) => (
              <path
                key={i}
                d={edgePath(e.x1, e.y1, e.x2, e.y2)}
                fill="none"
                stroke="var(--primary)"
                strokeOpacity={0.15 + 0.35 * (e.sessions / maxEdge)}
                strokeWidth={Math.max(1.5, (e.sessions / maxEdge) * 14)}
              />
            ))}

            {columns.map((col, step) =>
              col.map((n) => (
                <g key={`${step}-${n.path}`} transform={`translate(${step * (COL_W + COL_GAP)}, ${n.y})`}>
                  <rect
                    width={COL_W}
                    height={n.h}
                    rx={5}
                    fill={n.exit ? "var(--coral-pale)" : "var(--primary-pale)"}
                    stroke={n.exit ? "var(--coral)" : "var(--primary)"}
                    strokeOpacity={0.3}
                  />
                  <foreignObject width={COL_W} height={n.h}>
                    <div className="flex h-full items-center justify-between gap-2 overflow-hidden px-2.5">
                      <span
                        className={`truncate text-[11.5px] font-medium ${n.exit ? "text-coral" : "text-primary"}`}
                        title={n.path}
                      >
                        {n.exit && <LogOut className="mr-1 inline h-3 w-3" />}
                        {n.exit ? "Sortie" : label(n.path)}
                      </span>
                      <span className="shrink-0 text-[10.5px] text-muted-light">{n.sessions}</span>
                    </div>
                  </foreignObject>
                </g>
              ))
            )}
          </svg>
        )}
      </div>

      <p className="text-[11.5px] text-muted-light">
        Chaque colonne représente une étape du parcours ; l&apos;épaisseur des
        traits indique le volume de sessions entre deux pages. &laquo;
        Sortie &raquo; regroupe les sessions qui n&apos;ont pas visité de
        page suivante à cette étape.
      </p>
    </div>
  );
}
