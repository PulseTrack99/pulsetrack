"use client";

import { useEffect, useRef } from "react";

export interface Point {
  x: number; // 0..1 across document width
  y: number; // 0..1 down document height
}

/**
 * Renders a click cloud the way heatmaps are actually built: every point
 * is stamped as a soft radial blob into an alpha channel, the blobs are
 * allowed to accumulate, and only then is the resulting density mapped
 * through a colour ramp. Colouring each point individually instead would
 * show overlapping circles rather than intensity.
 */
export function HeatmapCanvas({
  points,
  rage = [],
  radius = 26,
  intensity = 0.22,
  className = "",
}: {
  points: Point[];
  rage?: Point[];
  radius?: number;
  intensity?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    let frame = 0;

    function draw() {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;

      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      if (points.length === 0) return;

      // Pass 1 — accumulate density in black with low alpha.
      const r = Math.max(12, radius);
      ctx.globalCompositeOperation = "source-over";
      for (const p of points) {
        const cx = p.x * w;
        const cy = p.y * h;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, `rgba(0,0,0,${intensity})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pass 2 — map accumulated alpha through a colour ramp.
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = img.data;
      const lut = buildLut();

      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a === 0) continue;
        const o = a * 4;
        data[i] = lut[o];
        data[i + 1] = lut[o + 1];
        data[i + 2] = lut[o + 2];
        data[i + 3] = lut[o + 3];
      }
      ctx.putImageData(img, 0, 0);

      // Rage clicks sit on top as discrete markers — they are individual
      // incidents worth locating, not a density to blend into the cloud.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const p of rage) {
        const cx = p.x * w;
        const cy = p.y * h;
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(229,72,77,0.85)";
        ctx.fill();
      }
    }

    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    }

    schedule();

    const ro = new ResizeObserver(schedule);
    ro.observe(wrap);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [points, rage, radius, intensity]);

  return (
    <div ref={wrapRef} className={`pointer-events-none absolute inset-0 ${className}`}>
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}

/**
 * 256-entry ramp from cool to hot, indexed by accumulated alpha.
 * Built once and cached — it is identical for every render.
 */
let lutCache: Uint8ClampedArray | null = null;

function buildLut(): Uint8ClampedArray {
  if (lutCache) return lutCache;

  const stops: [number, [number, number, number]][] = [
    [0.0, [59, 130, 246]], // blue — barely touched
    [0.35, [62, 200, 138]], // green
    [0.6, [245, 212, 35]], // yellow
    [0.8, [255, 157, 46]], // orange
    [1.0, [255, 60, 0]], // red — heavily clicked
  ];

  const lut = new Uint8ClampedArray(256 * 4);

  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let lo = stops[0];
    let hi = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) {
        lo = stops[s];
        hi = stops[s + 1];
        break;
      }
    }
    const span = hi[0] - lo[0] || 1;
    const f = (t - lo[0]) / span;

    const o = i * 4;
    lut[o] = lo[1][0] + (hi[1][0] - lo[1][0]) * f;
    lut[o + 1] = lo[1][1] + (hi[1][1] - lo[1][1]) * f;
    lut[o + 2] = lo[1][2] + (hi[1][2] - lo[1][2]) * f;
    // Fade the coldest values out so sparse areas stay readable.
    lut[o + 3] = Math.min(255, i * 2.4);
  }

  lutCache = lut;
  return lut;
}
