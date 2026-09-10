"use client";

import { useState } from "react";

/**
 * Comment un resultat d'Insights se dessine.
 *
 * Extrait pour que les tuiles de tableau et l'ecran Insights rendent
 * la meme chose : deux implementations divergeraient, et la premiere
 * divergence serait sur un axe ou une couleur, donc invisible jusqu'a
 * ce que quelqu'un compare les deux ecrans.
 */

/** Series colours. Fixed hex rather than tokens: these have to stay
 *  distinguishable from each other in both themes, which a semantic
 *  token cannot promise. */
export const SERIES = [
  "#5b3df5", "#e8663d", "#12a594", "#d4a017", "#9333ea",
  "#0891b2", "#e11d6f", "#65a30d", "#7c6cf5", "#f0824b",
  "#0e7490", "#b45309",
];

/** A round number above the peak, so the axis reads cleanly. */
function niceTop(peak: number): number {
  if (peak <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(peak));
  return Math.ceil(peak / mag) * mag;
}

/* ── Lines over time ── */
export function Lines({
  buckets,
  series,
  grain,
  intl,
}: {
  buckets: string[];
  series: { key: string; points: number[] }[];
  grain: string;
  intl: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 900;
  const H = 260;
  const PAD = { top: 12, right: 12, bottom: 26, left: 44 };

  const peak = Math.max(...series.flatMap((s) => s.points), 0);
  const top = niceTop(peak);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const x = (i: number) =>
    PAD.left + (buckets.length <= 1 ? innerW / 2 : (i / (buckets.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(intl, {
      day: grain === "month" ? undefined : "numeric",
      month: "short",
      year: grain === "month" ? "numeric" : undefined,
    });

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ minWidth: 520 }}
        onMouseLeave={() => setHover(null)}
      >
        {/* Scale */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(top * f)}
              y2={y(top * f)}
              stroke="currentColor"
              className="text-border"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 8}
              y={y(top * f) + 3}
              textAnchor="end"
              className="fill-current text-[9px] text-muted-light"
            >
              {Math.round(top * f).toLocaleString(intl)}
            </text>
          </g>
        ))}

        {series.map((s, si) => (
          <polyline
            key={s.key}
            fill="none"
            stroke={SERIES[si % SERIES.length]}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={s.points.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
          />
        ))}

        {/* Hover: one column per bucket, invisible, full height */}
        {buckets.map((b, i) => (
          <rect
            key={b}
            x={x(i) - innerW / Math.max(buckets.length, 1) / 2}
            y={PAD.top}
            width={innerW / Math.max(buckets.length, 1)}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}

        {hover !== null && (
          <>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={PAD.top + innerH}
              stroke="currentColor"
              className="text-muted-light"
              strokeDasharray="3 3"
            />
            {series.map((s, si) => (
              <circle
                key={s.key}
                cx={x(hover)}
                cy={y(s.points[hover])}
                r="3.5"
                fill={SERIES[si % SERIES.length]}
              />
            ))}
          </>
        )}

        {/* Four dates, enough to place a spike without crowding */}
        {buckets.map((b, i) => {
          const step = Math.max(1, Math.floor(buckets.length / 4));
          if (i % step !== 0 && i !== buckets.length - 1) return null;
          return (
            <text
              key={b}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              className="fill-current text-[9px] text-muted-light"
            >
              {fmt(b)}
            </text>
          );
        })}
      </svg>

      {hover !== null && (
        <p className="mt-1 text-center text-[12px] text-muted">
          <span className="font-medium">{fmt(buckets[hover])}</span>
          {series.slice(0, 6).map((s, si) => (
            <span key={s.key} className="ml-3">
              <span style={{ color: SERIES[si % SERIES.length] }}>●</span>{" "}
              {s.key} <span className="font-medium">{s.points[hover].toLocaleString(intl)}</span>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

/* ── Ranking, when no grain is asked for ── */
export function Ranking({
  totals,
  intl,
  format,
}: {
  totals: { key: string; total: number }[];
  intl: string;
  /** Comment écrire la valeur. Par défaut un entier localisé — mais un
   *  ratio se lit « 4,2 % », pas « 4 ». Optionnel pour que les appelants
   *  qui ne combinent rien n'aient pas à s'en soucier. */
  format?: (n: number) => string;
}) {
  const max = Math.max(...totals.map((t) => t.total), 1);
  return (
    <div className="space-y-1.5">
      {totals.map((g, i) => (
        <div key={g.key} className="flex items-center gap-3">
          <span className="w-44 shrink-0 truncate text-[12.5px]" title={g.key}>
            {g.key}
          </span>
          <div className="h-5 flex-1 overflow-hidden rounded-sm bg-surface-sunken">
            <div
              className="h-full rounded-sm transition-all duration-500"
              style={{
                width: `${(g.total / max) * 100}%`,
                backgroundColor: SERIES[i % SERIES.length],
              }}
            />
          </div>
          <span className="w-20 shrink-0 text-right text-[12.5px] font-medium tabular-nums">
            {format ? format(g.total) : g.total.toLocaleString(intl)}
          </span>
        </div>
      ))}
    </div>
  );
}
