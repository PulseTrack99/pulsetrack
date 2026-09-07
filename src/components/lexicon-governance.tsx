"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Gauge, Trash2, AlertTriangle, ShieldCheck } from "lucide-react";
import { useT } from "@/components/locale-context";
import { useEventAliases } from "@/components/use-event-aliases";

/**
 * The two halves of governance: what the allowance is being spent on,
 * and how to remove something that should not be there.
 *
 * Both exist because of promises the product already makes. The quota
 * is sold by the plan, so it has to be legible. And PulseTrack calls
 * itself GDPR-native, which makes Article 17 an obligation rather than
 * a feature — a customer who receives an erasure request from one of
 * their users had, until now, no way to honour it.
 */

interface Volume {
  plan: string;
  limit: number;
  used: number;
  month: string;
  pageviews: number;
  named: { name: string; volume: number }[];
}

export function VolumeTab({ siteId }: { siteId: string }) {
  const { t, intl } = useT();
  // Le nom lisible partout où un événement est montré, ici comme
  // ailleurs : une répartition qui parle une autre langue que la liste
  // oblige à traduire de tête.
  const label = useEventAliases(siteId);
  const [data, setData] = useState<Volume | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/lexicon/volume?site_id=${siteId}`);
      const json = await res.json();
      if (!cancelled) setData(json);
    })();
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  if (!data) {
    return (
      <div className="flex justify-center py-14">
        <Loader2 className="h-5 w-5 animate-spin text-muted-light" />
      </div>
    );
  }

  // -1 means unlimited in the plan table; a progress bar would be a lie.
  const capped = data.limit > 0;
  const share = capped ? Math.min(1, data.used / data.limit) : 0;
  const namedTotal = data.named.reduce((s, n) => s + n.volume, 0);
  const biggest = Math.max(1, ...data.named.map((n) => n.volume));

  return (
    <div className="space-y-4">
      <div className="app-card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold">
            <Gauge className="h-3.5 w-3.5 text-primary" />
            {t.screens.lexicon.volumeTitle}
          </p>
          <p className="text-[12.5px] text-muted">
            <span className="font-medium text-foreground">
              {data.used.toLocaleString(intl)}
            </span>
            {capped ? ` / ${data.limit.toLocaleString(intl)}` : ""} ·{" "}
            {t.screens.lexicon.thisMonth}
          </p>
        </div>

        {capped && (
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-sunken">
            <div
              className={`h-full rounded-full transition-all ${
                share > 0.9 ? "bg-coral" : share > 0.7 ? "bg-amber" : "bg-primary"
              }`}
              style={{ width: `${share * 100}%` }}
            />
          </div>
        )}

        <p className="mt-2 text-[11.5px] leading-relaxed text-muted-light">
          {t.screens.lexicon.volumeNote}
        </p>
      </div>

      <div className="app-card">
        <p className="text-[13px] font-semibold">{t.screens.lexicon.spentOn}</p>

        <div className="mt-3 space-y-1.5">
          <Bar
            label={t.screens.events.pageview}
            value={data.pageviews}
            max={Math.max(biggest, data.pageviews)}
            intl={intl}
            muted
          />
          {data.named.map((n) => (
            <Bar
              key={n.name}
              label={label(n.name)}
              value={n.volume}
              max={Math.max(biggest, data.pageviews)}
              intl={intl}
            />
          ))}
        </div>

        {data.named.length === 0 && (
          <p className="mt-2 text-[12px] text-muted-light">{t.screens.lexicon.noNamed}</p>
        )}

        {namedTotal > 0 && (
          <p className="mt-3 text-[11.5px] leading-relaxed text-muted-light">
            {t.screens.lexicon.hiddenStillCounts}
          </p>
        )}
      </div>
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  intl,
  muted,
}: {
  label: string;
  value: number;
  max: number;
  intl: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-44 shrink-0 truncate text-[12.5px]" title={label}>
        {label}
      </span>
      <div className="h-4 flex-1 overflow-hidden rounded-sm bg-surface-sunken">
        <div
          className={`h-full rounded-sm ${muted ? "bg-muted-light/40" : "bg-primary"}`}
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
      <span className="w-20 shrink-0 text-right text-[12.5px] tabular-nums">
        {value.toLocaleString(intl)}
      </span>
    </div>
  );
}

/* ── Erasure ── */
export function EraseTab({ siteId }: { siteId: string }) {
  const { t } = useT();
  const [mode, setMode] = useState<"person" | "event_name">("person");
  const [value, setValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Typing the exact subject again is the only confirmation that scales
  // to something irreversible: a checkbox is clicked without reading.
  const armed = value.trim().length > 0 && confirm.trim() === value.trim();

  const run = useCallback(async () => {
    if (!armed || busy) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/lexicon/erase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "person"
            ? { site_id: siteId, mode, email: value.trim() }
            : { site_id: siteId, mode, name: value.trim() }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t.screens.lexicon.eraseFailed);
        return;
      }
      setDone(data.deleted);
      setValue("");
      setConfirm("");
    } finally {
      setBusy(false);
    }
  }, [armed, busy, mode, siteId, value, t]);

  return (
    <div className="space-y-4">
      <div className="app-card">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          {t.screens.lexicon.eraseWhyTitle}
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
          {t.screens.lexicon.eraseWhyBody}
        </p>
        <p className="mt-2 text-[11.5px] leading-relaxed text-muted-light">
          {t.screens.lexicon.eraseAnonNote}
        </p>
      </div>

      <div className="app-card">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["person", t.screens.lexicon.erasePerson],
              ["event_name", t.screens.lexicon.eraseEvent],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setValue("");
                setConfirm("");
                setDone(null);
              }}
              className={`rounded-sm px-2.5 py-1.5 text-[12.5px] transition-colors ${
                mode === m
                  ? "bg-primary-pale font-medium text-primary"
                  : "text-muted hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              mode === "person"
                ? t.screens.lexicon.erasePersonPlaceholder
                : t.screens.lexicon.eraseEventPlaceholder
            }
            className="w-full max-w-sm rounded-md border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
          />
          {value.trim() && (
            <>
              <p className="text-[12px] text-muted">
                {t.screens.lexicon.eraseRetype}{" "}
                <span className="font-mono font-medium text-foreground">{value.trim()}</span>
              </p>
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full max-w-sm rounded-md border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
              />
            </>
          )}

          <button
            onClick={run}
            disabled={!armed || busy}
            className="flex items-center gap-1.5 rounded-md bg-coral px-3 py-2 text-[12.5px] font-semibold text-white transition-opacity disabled:opacity-40"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {t.screens.lexicon.eraseNow}
          </button>
        </div>

        {error && (
          <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-coral">
            <AlertTriangle className="h-3.5 w-3.5" />
            {error}
          </p>
        )}

        {done && (
          <div className="mt-3 rounded-sm bg-surface-sunken p-2.5 text-[12px]">
            <p className="font-medium">{t.screens.lexicon.eraseDone}</p>
            <p className="mt-1 text-muted">
              {Object.entries(done)
                .filter(([, n]) => n > 0)
                .map(([k, n]) => `${n} ${t.screens.lexicon.eraseRows[k] ?? k}`)
                .join(" · ") || t.screens.lexicon.eraseNothing}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
