"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Video,
  AlertTriangle,
  Monitor,
  Smartphone,
  Tablet,
  Lock,
  Clock,
} from "lucide-react";

const SessionReplayPlayer = dynamic(
  () => import("./session-replay-player").then((m) => m.SessionReplayPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-border bg-surface-sunken">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    ),
  }
);

interface Site {
  id: string;
  name: string;
  domain: string;
}

interface ReplayRow {
  id: string;
  replay_id: string;
  session_id: string;
  path: string | null;
  device: string | null;
  browser: string | null;
  country: string | null;
  started_at: string;
  duration_ms: number;
  event_count: number;
  status: string;
  has_rage: boolean;
}

const DEVICE_ICON: Record<string, typeof Monitor> = {
  Desktop: Monitor,
  Mobile: Smartphone,
  Tablet: Tablet,
};

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
  return `il y a ${Math.round(s / 86400)} j`;
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m > 0 ? `${m}m ${rem}s` : `${rem}s`;
}

export function SessionReplayPanel({ sites }: { sites: Site[] }) {
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [period, setPeriod] = useState("30d");
  const [device, setDevice] = useState<string | null>(null);
  const [rageOnly, setRageOnly] = useState(false);

  const [replays, setReplays] = useState<ReplayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  const [selected, setSelected] = useState<ReplayRow | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [events, setEvents] = useState<any[] | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);

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
        if (rageOnly) params.set("rage", "1");

        const res = await fetch(`/api/replay/list?${params}`);
        if (cancelled) return;

        if (res.status === 402) {
          setLocked(true);
          setReplays([]);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setReplays(data.replays ?? []);
          setSelected((cur) => cur ?? data.replays?.[0] ?? null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [siteId, period, device, rageOnly]);

  useEffect(() => {
    if (!selected) {
      setEvents(null);
      return;
    }
    let cancelled = false;
    setEvents(null);
    setEventsError(null);

    fetch(
      `/api/replay/events?site_id=${siteId}&replay_id=${encodeURIComponent(selected.replay_id)}`
    )
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Impossible de charger cet enregistrement");
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setEvents(data.events);
      })
      .catch((err) => {
        if (!cancelled) setEventsError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [selected, siteId]);

  if (sites.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-12 text-center">
        <Video className="mx-auto h-8 w-8 text-muted-light" />
        <h2 className="mt-4 text-lg font-medium">Ajoutez d&apos;abord un site</h2>
        <p className="mx-auto mt-2 max-w-sm text-[13.5px] text-muted">
          Les enregistrements de session apparaissent ici dès que des
          visiteurs parcourent votre site avec le script installé.
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
        <h2 className="mt-4 text-lg font-medium">Le Session Replay est sur Starter</h2>
        <p className="mx-auto mt-2 max-w-sm text-[13.5px] text-muted">
          Passez sur Starter pour regarder vos visiteurs naviguer réellement
          sur votre site — clics, scroll, hésitations, clics de rage.
        </p>
        <Link href="/dashboard/upgrade" className="btn btn-brand mt-6">
          Voir les offres
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {sites.length > 1 && (
          <select
            value={siteId}
            onChange={(e) => {
              setSiteId(e.target.value);
              setSelected(null);
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

        <div className="flex gap-0.5 rounded-sm border border-border bg-surface p-0.5">
          {[
            { value: null, label: "Tous" },
            { value: "Desktop", label: "Desktop" },
            { value: "Mobile", label: "Mobile" },
            { value: "Tablet", label: "Tablette" },
          ].map((d) => (
            <button
              key={d.label}
              onClick={() => setDevice(d.value)}
              className={`rounded-xs px-2.5 py-1.5 text-[12px] transition-colors ${
                device === d.value
                  ? "bg-primary-pale text-primary"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {d.label}
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

        <button
          onClick={() => setRageOnly((v) => !v)}
          className={`flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-[12px] transition-colors ${
            rageOnly
              ? "border-coral/40 bg-coral-pale text-coral"
              : "border-border text-muted hover:text-foreground"
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Clics de rage uniquement
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* Session list */}
        <div className="max-h-[720px] overflow-y-auto rounded-lg border border-border bg-surface">
          {loading && (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            </div>
          )}

          {!loading && replays.length === 0 && (
            <div className="p-8 text-center">
              <Video className="mx-auto h-6 w-6 text-muted-light" />
              <p className="mt-3 text-[13px] font-medium">Aucun enregistrement</p>
              <p className="mt-1.5 text-[12px] text-muted">
                Ils apparaîtront dès qu&apos;un visiteur sera enregistré.
              </p>
            </div>
          )}

          <ul className="divide-y divide-border">
            {replays.map((r) => {
              const Icon = DEVICE_ICON[r.device ?? ""] ?? Monitor;
              const active = selected?.id === r.id;
              return (
                <li key={r.id}>
                  <button
                    onClick={() => setSelected(r)}
                    className={`block w-full px-4 py-3 text-left transition-colors ${
                      active ? "bg-primary-pale/50" : "hover:bg-surface-hover"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-light" />
                        <span className="truncate">{r.path || "/"}</span>
                      </span>
                      {r.has_rage && (
                        <span title="Clic de rage détecté">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-coral" />
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2.5 text-[11px] text-muted-light">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(r.duration_ms)}
                      </span>
                      <span>{timeAgo(r.started_at)}</span>
                      {r.status === "recording" && (
                        <span className="flex items-center gap-1 text-emerald">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
                          en cours
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Player */}
        <div>
          {!selected && (
            <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-border bg-surface-sunken text-[13px] text-muted">
              Sélectionnez un enregistrement à gauche
            </div>
          )}

          {selected && eventsError && (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface-sunken text-center">
              <p className="text-[13px] text-muted">{eventsError}</p>
            </div>
          )}

          {selected && !eventsError && (
            <>
              <div className="mb-3">
                <p className="text-[13px] font-medium">{selected.path || "/"}</p>
                <p className="text-[11.5px] text-muted-light">
                  {site?.domain} · {selected.browser} · {selected.country}
                </p>
              </div>
              {events ? (
                <SessionReplayPlayer events={events} />
              ) : (
                <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-border bg-surface-sunken">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
