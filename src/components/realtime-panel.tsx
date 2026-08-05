"use client";

import { useState, useEffect, useCallback } from "react";
import { Radio, Globe, Monitor, Smartphone, Tablet, Loader2 } from "lucide-react";

interface RealtimeData {
  active_visitors: number;
  active_pages: { path: string; visitors: number }[];
  live_feed: {
    id: string;
    path: string;
    title: string | null;
    country: string | null;
    device: string | null;
    browser: string | null;
    time: string;
  }[];
  sparkline: number[];
  timestamp: string;
}

const COUNTRY_FLAGS: Record<string, string> = {
  FR: "🇫🇷", US: "🇺🇸", GB: "🇬🇧", DE: "🇩🇪", ES: "🇪🇸", IT: "🇮🇹",
  NL: "🇳🇱", BE: "🇧🇪", CH: "🇨🇭", CA: "🇨🇦", AU: "🇦🇺", JP: "🇯🇵",
  BR: "🇧🇷", IN: "🇮🇳", CN: "🇨🇳", KR: "🇰🇷", MX: "🇲🇽", PT: "🇵🇹",
  SE: "🇸🇪", NO: "🇳🇴", DK: "🇩🇰", FI: "🇫🇮", PL: "🇵🇱", RO: "🇷🇴",
  MA: "🇲🇦", TN: "🇹🇳", DZ: "🇩🇿", SA: "🇸🇦", AE: "🇦🇪", TR: "🇹🇷",
};

function DeviceIcon({ device }: { device: string | null }) {
  const d = device?.toLowerCase() || "";
  if (d.includes("mobile")) return <Smartphone className="h-3.5 w-3.5" />;
  if (d.includes("tablet")) return <Tablet className="h-3.5 w-3.5" />;
  return <Monitor className="h-3.5 w-3.5" />;
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const h = 32;
  const w = 120;
  const step = w / (data.length - 1);

  const points = data.map((v, i) => `${i * step},${h - (v / max) * (h - 4)}`).join(" ");

  return (
    <svg width={w} height={h} className="flex-shrink-0" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      />
      {/* Last point dot */}
      {data.length > 0 && (
        <circle
          cx={(data.length - 1) * step}
          cy={h - (data[data.length - 1] / max) * (h - 4)}
          r="3"
          className="fill-primary"
        />
      )}
    </svg>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  return `${Math.floor(minutes / 60)}h`;
}

export function RealtimePanel({ siteId }: { siteId: string }) {
  const [data, setData] = useState<RealtimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/realtime?site_id=${siteId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        // Trigger pulse animation
        setPulse(true);
        setTimeout(() => setPulse(false), 1000);
      }
    } catch {
      // Silent retry on next interval
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-background p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="rounded-xl border border-border bg-background p-6">
      {/* Header with live indicator */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <Radio className="h-4 w-4 text-emerald-500" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <h2 className="text-lg font-semibold">Temps réel</h2>
        </div>
        <span className="text-xs text-muted">
          Mise à jour toutes les 5s
        </span>
      </div>

      {/* Active visitors count + sparkline */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-4xl font-bold tabular-nums transition-transform duration-300 ${
                pulse ? "scale-110" : "scale-100"
              }`}
            >
              {data.active_visitors}
            </span>
            <span className="text-sm text-muted">
              visiteur{data.active_visitors !== 1 ? "s" : ""} en ce moment
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Sessions actives dans les 5 dernières minutes
          </p>
        </div>
        <Sparkline data={data.sparkline} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Active pages */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted" />
            Pages actives
          </h3>
          {data.active_pages.length === 0 ? (
            <p className="text-xs text-muted py-4 text-center">
              Aucune page active
            </p>
          ) : (
            <div className="space-y-1.5">
              {data.active_pages.map((page) => (
                <div
                  key={page.path}
                  className="flex items-center justify-between rounded-lg bg-surface px-3 py-2"
                >
                  <span className="text-sm truncate max-w-[200px]">
                    {page.path}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {page.visitors}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live feed */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Radio className="h-4 w-4 text-muted" />
            Dernières visites
          </h3>
          {data.live_feed.length === 0 ? (
            <p className="text-xs text-muted py-4 text-center">
              Aucune visite récente
            </p>
          ) : (
            <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
              {data.live_feed.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 rounded-lg bg-surface px-3 py-2"
                >
                  {/* Country flag */}
                  <span className="text-base flex-shrink-0" title={event.country || undefined}>
                    {event.country && COUNTRY_FLAGS[event.country]
                      ? COUNTRY_FLAGS[event.country]
                      : "🌍"}
                  </span>

                  {/* Device icon */}
                  <span className="text-muted flex-shrink-0">
                    <DeviceIcon device={event.device} />
                  </span>

                  {/* Path */}
                  <span className="text-sm truncate flex-1">
                    {event.path}
                  </span>

                  {/* Time ago */}
                  <span className="text-xs text-muted flex-shrink-0">
                    {timeAgo(event.time)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
