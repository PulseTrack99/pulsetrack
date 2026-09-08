"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import {
  Filter,
  Plus,
  ChevronRight,
  Trash2,
  ArrowDown,
  Loader2,
  Archive,
  Undo2,
  AlertTriangle,
} from "lucide-react";
import { useSites } from "@/components/site-context";
import { SegmentedFilter, usePeriodOptionsNoDay } from "@/components/filters";
import { useT } from "@/components/locale-context";

interface FunnelStep {
  id: string;
  step_order: number;
  name: string;
  match_type: string;
  match_value: string;
}

interface Funnel {
  id: string;
  name: string;
  site_id: string;
  created_at: string;
  /** Absent tant que supabase/funnel-archive.sql n'a pas tourné. */
  archived_at?: string | null;
  funnel_steps: FunnelStep[];
}

interface FunnelStepResult {
  step_order: number;
  name: string;
  match_value: string;
  visitors: number;
  conversion_rate: number;
  drop_off_rate: number;
}

/**
 * The rail's site switcher is the single source of truth for scope, so
 * this screen shows the funnels of the selected site only — the page
 * used to mix every site's funnels into one list and ask you to read
 * the domain under each name to tell them apart.
 *
 * The list is keyed by site: a funnel belongs to exactly one site, so
 * switching site invalidates the opened funnel, its results and a
 * half-filled create form. Remounting drops all of it at once.
 */
export function FunnelsList({
  funnels,
  canArchive = false,
}: {
  funnels: Funnel[];
  /** Faux tant que la colonne archived_at n'existe pas : l'écran se
   *  comporte alors exactement comme avant, sans bouton mort. */
  canArchive?: boolean;
}) {
  const { site, siteId, ready } = useSites();
  const { t } = useT();

  // Don't flash "ajoutez un site" before the stored selection is read.
  if (!ready) return null;

  if (!siteId) {
    return (
      <div className="app-card flex flex-col items-center justify-center py-16 text-center">
        <Filter className="h-7 w-7 text-muted-light" />
        <h2 className="mt-3 text-[15px] font-semibold">{t.screens.funnels.noSiteTitle}</h2>
        <p className="mt-1 max-w-sm text-[13px] text-muted">
          {t.screens.funnels.noSiteBody}
        </p>
        <Link href="/dashboard/sites/new" className="btn btn-brand mt-4">
          {t.screens.common.addSite}
        </Link>
      </div>
    );
  }

  return (
    <SiteFunnels
      key={siteId}
      siteId={siteId}
      siteName={site?.name ?? "ce site"}
      funnels={funnels.filter((f) => f.site_id === siteId)}
      canArchive={canArchive}
    />
  );
}

function SiteFunnels({
  siteId,
  siteName,
  funnels: initialFunnels,
  canArchive,
}: {
  siteId: string;
  siteName: string;
  funnels: Funnel[];
  canArchive: boolean;
}) {
  const { t, intl } = useT();
  const [funnels, setFunnels] = useState(initialFunnels);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedFunnel, setSelectedFunnel] = useState<string | null>(null);
  const [funnelResults, setFunnelResults] = useState<FunnelStepResult[] | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const periodOptions = usePeriodOptionsNoDay();
  const [period, setPeriod] = useState("30d");
  const [showArchived, setShowArchived] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const active = funnels.filter((f) => !f.archived_at);
  const archived = funnels.filter((f) => f.archived_at);

  /* Archiver, ou sortir des archives. Le plafond du plan n'est
     réappliqué qu'au retour, et en base — la réponse 402 ne fait que
     rapporter ce que le trigger a refusé. */
  const setArchivedState = useCallback(
    async (id: string, archive: boolean) => {
      setBusyId(id);
      setArchiveError(null);
      try {
        const res = await fetch(`/api/funnels/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived: archive }),
        });
        const data = await res.json();

        if (!res.ok) {
          setArchiveError(
            data.error === "upgrade_required"
              ? t.screens.funnels.archiveFull
              : data.error === "migration_pending"
                ? t.screens.funnels.archivePending
                : t.screens.funnels.archiveError
          );
          return;
        }

        setFunnels((prev) =>
          prev.map((f) => (f.id === id ? { ...f, archived_at: data.archived_at } : f))
        );
        // Le panneau de résultats d'un funnel qu'on vient de ranger
        // n'aurait plus de carte à laquelle se rattacher.
        if (archive) setSelectedFunnel((cur) => (cur === id ? null : cur));
      } catch {
        setArchiveError(t.screens.funnels.archiveError);
      } finally {
        setBusyId(null);
      }
    },
    [t]
  );

  // Load funnel results when selected
  useEffect(() => {
    if (!selectedFunnel) {
      setFunnelResults(null);
      return;
    }

    async function loadResults() {
      setLoadingResults(true);
      try {
        const res = await fetch(
          `/api/funnels/${selectedFunnel}?period=${period}`
        );
        if (res.ok) {
          const data = await res.json();
          setFunnelResults(data.steps);
        }
      } catch (err) {
        console.error("Failed to load funnel results:", err);
      } finally {
        setLoadingResults(false);
      }
    }

    loadResults();
  }, [selectedFunnel, period]);

  return (
    <div className="space-y-4">
      <div className="app-toolbar justify-between">
        <p className="text-[13px] text-muted">
          {t.screens.funnels.intro}
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-[var(--app-radius-sm)] bg-primary px-2.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-3.5 w-3.5" />
          {t.screens.funnels.create}
        </button>
      </div>

      {/* Create funnel form */}
      {showCreate && (
        <CreateFunnelForm
          siteId={siteId}
          onCreated={(funnel) => {
            setFunnels([funnel, ...funnels]);
            setShowCreate(false);
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Funnels list */}
      {archiveError && (
        <div className="app-card flex items-start gap-2 border-coral/40 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
          <p className="text-[12.5px] leading-relaxed text-coral">{archiveError}</p>
        </div>
      )}

      {active.length === 0 && !showCreate ? (
        <div className="app-card flex flex-col items-center justify-center py-16 text-center">
          <Filter className="h-7 w-7 text-muted-light" />
          <h3 className="mt-3 text-[15px] font-semibold">
            {t.screens.funnels.emptyTitle} {siteName}
          </h3>
          <p className="mt-1 max-w-sm text-[13px] text-muted">
            {t.screens.funnels.emptyBody}
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 flex items-center gap-1.5 rounded-[var(--app-radius-sm)] bg-primary px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-3.5 w-3.5" />
            {t.screens.funnels.createFirst}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Funnel cards */}
          <div className="space-y-3 lg:col-span-1">
            {active.map((funnel) => {
              const steps = funnel.funnel_steps?.sort(
                (a, b) => a.step_order - b.step_order
              ) || [];

              /* La carte n'est plus un seul bouton : archiver est une
                 action à part, et un bouton n'en contient pas un autre.
                 Le chevron devient décoratif, l'espace qu'il occupait
                 étant réservé dans le flux du bouton d'ouverture. */
              return (
                <div
                  key={funnel.id}
                  className={`relative rounded-xl border transition-all ${
                    selectedFunnel === funnel.id
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border bg-background hover:border-primary/30"
                  }`}
                >
                  <button
                    onClick={() => setSelectedFunnel(
                      selectedFunnel === funnel.id ? null : funnel.id
                    )}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{funnel.name}</h3>
                        <p className="text-xs text-muted mt-0.5">
                          {steps.length} {t.screens.funnels.steps}
                        </p>
                      </div>
                      <span className={canArchive ? "w-12 shrink-0" : "w-4 shrink-0"} />
                    </div>
                    <div className="mt-3 flex items-center gap-1 text-xs text-muted">
                      {steps.map((step, i) => (
                        <span key={step.id} className="flex items-center gap-1">
                          <span className="truncate max-w-[80px]">{step.name}</span>
                          {i < steps.length - 1 && <ChevronRight className="h-3 w-3 flex-shrink-0" />}
                        </span>
                      ))}
                    </div>
                  </button>

                  <div className="absolute right-4 top-4 flex items-center gap-1.5">
                    {canArchive && (
                      <button
                        onClick={() => setArchivedState(funnel.id, true)}
                        disabled={busyId === funnel.id}
                        title={t.screens.funnels.archive}
                        aria-label={`${t.screens.funnels.archive} — ${funnel.name}`}
                        className="rounded-sm p-1 text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-40"
                      >
                        {busyId === funnel.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Archive className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                    <ChevronRight
                      aria-hidden
                      className={`h-4 w-4 text-muted transition-transform ${
                        selectedFunnel === funnel.id ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Funnel visualization */}
          {selectedFunnel && (
            <div className="lg:col-span-2">
              <div className="app-card">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-[13.5px] font-semibold">
                    {t.screens.funnels.results}
                  </h3>
                  <SegmentedFilter
                    ariaLabel={t.filters.period}
                    value={period}
                    options={periodOptions}
                    onChange={setPeriod}
                  />
                </div>

                {loadingResults ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : funnelResults ? (
                  <FunnelVisualization steps={funnelResults} />
                ) : (
                  <p className="text-center text-sm text-muted py-12">
                    {t.screens.funnels.selectFunnel}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Les archives. Repliées par défaut : c'est un filet de
          sécurité, pas une seconde liste à parcourir. */}
      {archived.length > 0 && (
        <div className="app-card">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="flex w-full items-center justify-between gap-2 text-left"
          >
            <span className="flex items-center gap-1.5 text-[13px] font-semibold">
              <Archive className="h-3.5 w-3.5 text-muted" />
              {t.screens.funnels.archivedTitle}
              <span className="text-muted">({archived.length})</span>
            </span>
            <ChevronRight
              aria-hidden
              className={`h-4 w-4 text-muted transition-transform ${
                showArchived ? "rotate-90" : ""
              }`}
            />
          </button>

          {showArchived && (
            <div className="mt-3 space-y-1.5">
              {archived.map((funnel) => (
                <div
                  key={funnel.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{funnel.name}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted">
                      {funnel.funnel_steps?.length ?? 0} {t.screens.funnels.steps}
                      {funnel.archived_at && (
                        <>
                          {" · "}
                          {t.screens.funnels.archivedOn}{" "}
                          {new Date(funnel.archived_at).toLocaleDateString(intl)}
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setArchivedState(funnel.id, false)}
                    disabled={busyId === funnel.id}
                    className="flex shrink-0 items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-[12.5px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-40"
                  >
                    {busyId === funnel.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Undo2 className="h-3.5 w-3.5" />
                    )}
                    {t.screens.funnels.restore}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────── CREATE FUNNEL FORM ─────────── */
function CreateFunnelForm({
  siteId,
  onCreated,
  onCancel,
}: {
  siteId: string;
  onCreated: (funnel: Funnel) => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  const [name, setName] = useState("");
  const [steps, setSteps] = useState([
    { name: "Page d'accueil", match_type: "path", match_value: "/" },
    { name: "Page pricing", match_type: "path", match_value: "/pricing" },
    { name: "Inscription", match_type: "path", match_value: "/signup" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addStep() {
    setSteps([...steps, { name: "", match_type: "path", match_value: "" }]);
  }

  function removeStep(index: number) {
    if (steps.length <= 2) return; // Minimum 2 steps
    setSteps(steps.filter((_, i) => i !== index));
  }

  function updateStep(
    index: number,
    field: "name" | "match_type" | "match_value",
    value: string
  ) {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/funnels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, site_id: siteId, steps }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.error === "upgrade_required") {
          throw new Error(
            `${t.screens.funnels.limitReached1} ${data.limit} funnel${data.limit > 1 ? "s" : ""}. ${t.screens.funnels.limitReached2}`
          );
        }
        throw new Error(data.error || t.screens.funnels.createError);
      }

      const funnel = await res.json();
      onCreated(funnel);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-background p-6">
      <h3 className="mb-4 text-[13.5px] font-semibold">{t.screens.funnels.create}</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* No site picker: the funnel is created on the site selected in
            the rail, the same scope the rest of the screen already shows. */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            {t.screens.funnels.funnelName}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder={t.screens.funnels.namePlaceholder}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Steps */}
        <div>
          <label className="block text-sm font-medium mb-3">
            {t.screens.funnels.funnelSteps}
          </label>
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={step.name}
                  onChange={(e) => updateStep(i, "name", e.target.value)}
                  required
                  placeholder={t.screens.funnels.stepName}
                  className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <select
                  value={step.match_type}
                  onChange={(e) => updateStep(i, "match_type", e.target.value)}
                  className="rounded-lg border border-border bg-surface px-2 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="path">{t.screens.funnels.exactUrl}</option>
                  <option value="path_contains">{t.screens.funnels.urlContains}</option>
                  <option value="event">{t.screens.funnels.event}</option>
                </select>
                <input
                  type="text"
                  value={step.match_value}
                  onChange={(e) => updateStep(i, "match_value", e.target.value)}
                  required
                  placeholder={
                    step.match_type === "event"
                      ? "nom_evenement"
                      : "/chemin"
                  }
                  className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                {steps.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeStep(i)}
                    className="text-muted hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                {i < steps.length - 1 && (
                  <ArrowDown className="h-4 w-4 text-muted flex-shrink-0 hidden sm:block" />
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addStep}
            className="mt-2 flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            {t.screens.funnels.addStep}
          </button>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-hover transition-colors"
          >
            {t.screens.funnels.cancel}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t.screens.funnels.createCta
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─────────── FUNNEL VISUALIZATION ─────────── */
function FunnelVisualization({ steps }: { steps: FunnelStepResult[] }) {
  const { t, intl } = useT();
  if (steps.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-[13px] font-medium">{t.screens.funnels.noVisitorsTitle}</p>
        <p className="mx-auto mt-1.5 max-w-sm text-[12px] leading-relaxed text-muted">
          {t.screens.funnels.noVisitorsBody}
        </p>
      </div>
    );
  }

  const maxVisitors = steps[0]?.visitors || 1;

  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const widthPercent = Math.max(
          (step.visitors / maxVisitors) * 100,
          8
        );
        const isLast = i === steps.length - 1;

        return (
          <div key={i}>
            {/* Step bar */}
            <div className="flex items-center gap-4">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {step.step_order}
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{step.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold">
                      {step.visitors.toLocaleString(intl)} {t.screens.funnels.visitors}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        step.conversion_rate >= 50
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : step.conversion_rate >= 20
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {step.conversion_rate}%
                    </span>
                  </div>
                </div>
                <div className="h-8 rounded-lg bg-surface overflow-hidden">
                  <div
                    className="h-full rounded-lg bg-gradient-to-r from-primary to-primary-light transition-all duration-700"
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {step.match_value}
                </p>
              </div>
            </div>

            {/* Drop-off indicator */}
            {!isLast && (
              <div className="ml-3.5 flex items-center gap-3 py-2 pl-7 border-l-2 border-dashed border-border">
                <ArrowDown className="h-3.5 w-3.5 text-red-400" />
                {/* The API measures drop-off looking backwards — a step's
                    rate is the share lost *arriving* at it — while this sits
                    in the gap after a step. So the rate for this gap belongs
                    to the next step, which is also where the count below
                    comes from. Reading step.drop_off_rate here showed every
                    transition the previous transition's rate, and the first
                    one a flat 0%. */}
                <span className="text-xs text-red-400 font-medium">
                  -{steps[i + 1]?.drop_off_rate ?? 0}% {t.screens.funnels.dropoffs}
                  {steps[i + 1] && (
                    <span className="text-muted font-normal">
                      {" "}
                      ({(step.visitors - steps[i + 1].visitors).toLocaleString(
                        intl
                      )}{" "}
                      {t.screens.funnels.lostVisitors})
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        );
      })}

      {/* Summary */}
      <div className="mt-6 rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t.screens.funnels.overallConversion}</span>
          <span
            className={`text-lg font-bold ${
              steps.length > 0 &&
              steps[steps.length - 1].conversion_rate >= 5
                ? "text-emerald-500"
                : "text-red-500"
            }`}
          >
            {steps.length > 0
              ? Math.round(
                  (steps[steps.length - 1].visitors / maxVisitors) * 100
                )
              : 0}
            %
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">
          {steps[0]?.visitors.toLocaleString(intl)} {t.screens.funnels.startedWith}{" "}
          {steps[steps.length - 1]?.visitors.toLocaleString(intl)} {t.screens.funnels.endedWith}
        </p>
      </div>
    </div>
  );
}
