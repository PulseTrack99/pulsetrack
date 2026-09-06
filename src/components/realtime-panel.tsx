"use client";

import { useState, useEffect, useCallback } from "react";
import { useT } from "@/components/locale-context";
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
  const { t } = useT();
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
      // Same height as the loaded strip, so the page below it doesn't
      // jump once the first poll lands.
      <div className="app-card flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        <span className="app-label">{t.realtime.title}</span>
      </div>
    );
  }

  if (!data) return null;

  const idle = data.active_visitors === 0;

  /* One compact strip rather than the page's hero. It used to open the
     dashboard with a 4xl count and two columns that, on a quiet site,
     both read "aucune" — the emptiest thing on screen taking the most
     space, above the figures people actually came for. */
  return (
    <div className="app-card">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="relative flex items-center justify-center">
          <Radio className="h-3.5 w-3.5 text-emerald-500" />
          {!idle && (
            <>
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 animate-ping rounded-full bg-emerald-500" />
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </>
          )}
        </div>

        <span className="app-label">{t.realtime.title}</span>

        <span className="flex items-baseline gap-1.5">
          <span
            className={`text-[20px] font-semibold tabular-nums transition-transform duration-300 ${
              pulse ? "scale-110" : "scale-100"
            }`}
          >
            {data.active_visitors}
          </span>
          <span className="text-[12.5px] text-muted">
            {t.realtime.visitorsNow}
          </span>
        </span>

        <div className="ml-auto flex items-center gap-3">
          <Sparkline data={data.sparkline} />
          <span className="text-[11px] text-muted-light">{t.realtime.refresh}</span>
        </div>
      </div>

      {idle ? (
        <p className="mt-2 text-[12px] text-muted-light">
          {t.realtime.idle}
        </p>
      ) : (
      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        {/* Active pages */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted" />
            {t.realtime.activePages}
          </h3>
          {data.active_pages.length === 0 ? (
            <p className="text-xs text-muted py-4 text-center">
              {t.realtime.noActivePage}
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
            {t.realtime.lastVisits}
          </h3>
          {data.live_feed.length === 0 ? (
            <p className="text-xs text-muted py-4 text-center">
              {t.realtime.noRecentVisit}
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
      )}
    </div>
  );
}
