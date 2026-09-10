"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  FlaskConical,
  Loader2,
  AlertTriangle,
  Plus,
  Play,
  Square,
  Trophy,
  ShieldCheck,
} from "lucide-react";
import { useSites } from "@/components/site-context";
import { useT } from "@/components/locale-context";

/**
 * Les expériences — et surtout, savoir quand se taire.
 *
 * Afficher « B gagne » sur trente visiteurs est pire que ne rien
 * afficher : la personne prend une décision de produit sur du bruit, et
 * l'outil lui a donné raison. Cet écran ne désigne donc un gagnant que
 * lorsque le test le permet, et dit combien il en faudrait encore le
 * reste du temps.
 */

interface Comparison {
  variant: string;
  subjects: number;
  conversions: number;
  rate: number;
  lift: number | null;
  pValue: number | null;
  significant: boolean;
  needed: number | null;
}

interface Experiment {
  id: string;
  key: string;
  name: string;
  description: string | null;
  variants: { key: string; weight: number }[];
  metric_event: string;
  status: string;
  started_at: string | null;
  stopped_at: string | null;
  results: Comparison[] | null;
}

export function ExperimentsPanel() {
  const { siteId } = useSites();
  const { t } = useT();

  if (!siteId) {
    return (
      <div className="app-card flex flex-col items-center justify-center py-16 text-center">
        <FlaskConical className="h-7 w-7 text-muted-light" />
        <h2 className="mt-3 text-[15px] font-semibold">{t.screens.common.noSiteTitle}</h2>
        <p className="mt-1 max-w-sm text-[13px] text-muted">
          {t.screens.experiments.noSiteBody}
        </p>
        <Link href="/dashboard/sites/new" className="btn btn-brand mt-4">
          {t.screens.common.addSite}
        </Link>
      </div>
    );
  }

  return <SiteExperiments key={siteId} siteId={siteId} />;
}

function SiteExperiments({ siteId }: { siteId: string }) {
  const { t, intl } = useT();

  const [items, setItems] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [metric, setMetric] = useState("");
  const [aKey, setAKey] = useState("control");
  const [bKey, setBKey] = useState("b");

  const load = useCallback(async () => {
    const res = await fetch(`/api/experiments?site_id=${siteId}`);
    const data = await res.json();
    setItems(data.experiments ?? []);
    setPending(Boolean(data.migration_pending));
  }, [siteId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await load();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function setStatus(id: string, status: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch("/api/experiments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        setError(t.screens.experiments.updateFailed);
        return;
      }
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function create() {
    setBusy("new");
    setError(null);
    try {
      const res = await fetch("/api/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: siteId,
          key: key.trim().toLowerCase(),
          name: name.trim(),
          metric_event: metric.trim(),
          variants: [
            { key: aKey.trim(), weight: 50 },
            { key: bKey.trim(), weight: 50 },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "duplicate_key"
            ? t.screens.experiments.duplicateKey
            : data.error === "invalid_key"
              ? t.screens.experiments.invalidKey
              : data.error === "need_two_variants"
                ? t.screens.experiments.needTwo
                : t.screens.experiments.createFailed
        );
        return;
      }
      setKey("");
      setName("");
      setMetric("");
      setCreating(false);
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (pending) {
    return (
      <div className="app-card">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
          <AlertTriangle className="h-3.5 w-3.5 text-amber" />
          {t.screens.experiments.pendingTitle}
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
          {t.screens.experiments.pendingBody}
        </p>
        <pre className="mt-2.5 rounded-sm bg-surface-sunken p-3 font-mono text-[12px]">
          supabase/experiments.sql
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="app-toolbar justify-between">
        <p className="text-[13px] text-muted">{t.screens.experiments.intro}</p>
        <button
          onClick={() => setCreating((v) => !v)}
          className="flex items-center gap-1.5 rounded-[var(--app-radius-sm)] bg-primary px-2.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-3.5 w-3.5" />
          {t.screens.experiments.create}
        </button>
      </div>

      {error && (
        <div className="app-card flex items-start gap-2 border-coral/40 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
          <p className="text-[12.5px] leading-relaxed text-coral">{error}</p>
        </div>
      )}

      {creating && (
        <div className="app-card space-y-2.5">
          <div className="flex flex-wrap gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.screens.experiments.namePlaceholder}
              className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
            />
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={t.screens.experiments.keyPlaceholder}
              className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 font-mono text-[13px] outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={aKey}
              onChange={(e) => setAKey(e.target.value)}
              placeholder={t.screens.experiments.controlPlaceholder}
              className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 font-mono text-[13px] outline-none focus:border-primary"
            />
            <input
              value={bKey}
              onChange={(e) => setBKey(e.target.value)}
              placeholder={t.screens.experiments.challengerPlaceholder}
              className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 font-mono text-[13px] outline-none focus:border-primary"
            />
            <input
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              placeholder={t.screens.experiments.metricPlaceholder}
              className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 font-mono text-[13px] outline-none focus:border-primary"
            />
          </div>
          <p className="text-[11.5px] leading-relaxed text-muted-light">
            {t.screens.experiments.createHint}
          </p>
          <div className="flex gap-2">
            <button
              onClick={create}
              disabled={busy === "new" || !key.trim() || !name.trim() || !metric.trim()}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[12.5px] font-semibold text-white transition-opacity disabled:opacity-40"
            >
              {busy === "new" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t.screens.experiments.createCta}
            </button>
            <button
              onClick={() => setCreating(false)}
              className="rounded-md px-3 py-2 text-[12.5px] text-muted transition-colors hover:text-foreground"
            >
              {t.screens.experiments.cancel}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="app-card flex justify-center py-14">
          <Loader2 className="h-5 w-5 animate-spin text-muted-light" />
        </div>
      ) : items.length === 0 && !creating ? (
        <div className="app-card p-10 text-center">
          <FlaskConical className="mx-auto h-6 w-6 text-muted-light" />
          <p className="mt-3 text-[13px] font-medium">{t.screens.experiments.emptyTitle}</p>
          <p className="mx-auto mt-1.5 max-w-md text-[12px] leading-relaxed text-muted">
            {t.screens.experiments.emptyBody}
          </p>
          <pre className="mx-auto mt-3 w-fit rounded-sm bg-surface-sunken px-3 py-2 text-left font-mono text-[11.5px]">
{`pulsetrack.onFlags(function () {
  if (pulsetrack.variant("titre-accueil") === "b") { … }
});`}
          </pre>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((x) => (
            <ExperimentCard
              key={x.id}
              exp={x}
              busy={busy === x.id}
              intl={intl}
              onStatus={(s) => setStatus(x.id, s)}
            />
          ))}
        </div>
      )}

      <div className="app-card">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          {t.screens.experiments.readTitle}
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
          {t.screens.experiments.readBody}
        </p>
        <p className="mt-2 text-[11.5px] leading-relaxed text-muted-light">
          {t.screens.experiments.readNote}
        </p>
      </div>
    </div>
  );
}

function ExperimentCard({
  exp,
  busy,
  intl,
  onStatus,
}: {
  exp: Experiment;
  busy: boolean;
  intl: string;
  onStatus: (status: string) => void;
}) {
  const { t } = useT();
  const results = exp.results ?? [];
  const challenger = results.find((r, i) => i > 0 && r.significant);
  const control = results[0];

  return (
    <div className="app-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold">{exp.name}</p>
          <p className="mt-0.5 font-mono text-[11.5px] text-muted-light">
            {exp.key} · {t.screens.experiments.metric} {exp.metric_event}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-light" />}
          <span
            className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
              exp.status === "running"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : exp.status === "stopped"
                  ? "bg-surface-sunken text-muted"
                  : "bg-amber/15 text-amber"
            }`}
          >
            {exp.status === "running"
              ? t.screens.experiments.running
              : exp.status === "stopped"
                ? t.screens.experiments.stopped
                : t.screens.experiments.draft}
          </span>
          {exp.status !== "running" ? (
            <button
              onClick={() => onStatus("running")}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[12.5px] text-muted transition-colors hover:text-foreground"
            >
              <Play className="h-3.5 w-3.5" />
              {t.screens.experiments.start}
            </button>
          ) : (
            <button
              onClick={() => onStatus("stopped")}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[12.5px] text-muted transition-colors hover:border-coral/40 hover:text-coral"
            >
              <Square className="h-3.5 w-3.5" />
              {t.screens.experiments.stop}
            </button>
          )}
        </div>
      </div>

      {exp.status === "draft" ? (
        <p className="mt-3 text-[12px] leading-relaxed text-muted">
          {t.screens.experiments.draftNote}
        </p>
      ) : results.length === 0 || results.every((r) => r.subjects === 0) ? (
        <p className="mt-3 text-[12px] leading-relaxed text-muted">
          {t.screens.experiments.noDataYet}
        </p>
      ) : (
        <>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-light">
                  <th className="px-2 py-1.5 text-left font-medium">
                    {t.screens.experiments.colVariant}
                  </th>
                  <th className="px-2 py-1.5 text-right font-medium">
                    {t.screens.experiments.colSubjects}
                  </th>
                  <th className="px-2 py-1.5 text-right font-medium">
                    {t.screens.experiments.colConversions}
                  </th>
                  <th className="px-2 py-1.5 text-right font-medium">
                    {t.screens.experiments.colRate}
                  </th>
                  <th className="px-2 py-1.5 text-right font-medium">
                    {t.screens.experiments.colLift}
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={r.variant} className="border-b border-border/60 last:border-0">
                    <td className="px-2 py-1.5">
                      <span className="font-mono">{r.variant}</span>
                      {i === 0 && (
                        <span className="ml-1.5 text-[11px] text-muted-light">
                          {t.screens.experiments.reference}
                        </span>
                      )}
                      {r.significant && (
                        <Trophy className="ml-1.5 inline h-3 w-3 text-emerald-600" />
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-muted">
                      {r.subjects.toLocaleString(intl)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-muted">
                      {r.conversions.toLocaleString(intl)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-medium tabular-nums">
                      {r.rate.toLocaleString(intl, { maximumFractionDigits: 1 })} %
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {r.lift === null ? (
                        "—"
                      ) : (
                        <span
                          className={
                            r.lift > 0 ? "text-emerald-600" : r.lift < 0 ? "text-coral" : "text-muted"
                          }
                        >
                          {r.lift > 0 ? "+" : ""}
                          {r.lift.toLocaleString(intl, { maximumFractionDigits: 1 })} pts
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Le verdict, ou son absence assumée. */}
          <div className="mt-3 rounded-sm bg-surface-sunken p-2.5">
            {challenger ? (
              <p className="text-[12.5px] leading-relaxed">
                <Trophy className="mr-1 inline h-3.5 w-3.5 text-emerald-600" />
                <span className="font-semibold">{challenger.variant}</span>{" "}
                {t.screens.experiments.wins}{" "}
                <span className="font-medium">
                  {challenger.lift! > 0 ? "+" : ""}
                  {challenger.lift} pts
                </span>{" "}
                {t.screens.experiments.pValue} {challenger.pValue}.
              </p>
            ) : (
              <p className="text-[12.5px] leading-relaxed text-muted">
                {t.screens.experiments.notYet}
                {(() => {
                  const need = results.find((r, i) => i > 0 && r.needed !== null);
                  if (!need || !control) return null;
                  return (
                    <>
                      {" "}
                      {t.screens.experiments.wouldNeed}{" "}
                      <span className="font-medium text-foreground">
                        {need.needed!.toLocaleString(intl)}
                      </span>{" "}
                      {t.screens.experiments.perVariant}
                    </>
                  );
                })()}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
