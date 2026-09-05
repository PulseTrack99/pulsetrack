"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Filter,
  Plus,
  ChevronRight,
  Trash2,
  ArrowDown,
  Loader2,
} from "lucide-react";
import { useSites } from "@/components/site-context";

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
export function FunnelsList({ funnels }: { funnels: Funnel[] }) {
  const { site, siteId, ready } = useSites();

  // Don't flash "ajoutez un site" before the stored selection is read.
  if (!ready) return null;

  if (!siteId) {
    return (
      <div className="app-card flex flex-col items-center justify-center py-16 text-center">
        <Filter className="h-7 w-7 text-muted-light" />
        <h2 className="mt-3 text-[15px] font-semibold">Ajoutez d&apos;abord un site</h2>
        <p className="mt-1 max-w-sm text-[13px] text-muted">
          Un funnel suit le parcours des visiteurs d&apos;un site précis. Ajoutez
          un site pour en créer un.
        </p>
        <Link href="/dashboard/sites/new" className="btn btn-brand mt-4">
          Ajouter un site
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
    />
  );
}

function SiteFunnels({
  siteId,
  siteName,
  funnels: initialFunnels,
}: {
  siteId: string;
  siteName: string;
  funnels: Funnel[];
}) {
  const [funnels, setFunnels] = useState(initialFunnels);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedFunnel, setSelectedFunnel] = useState<string | null>(null);
  const [funnelResults, setFunnelResults] = useState<FunnelStepResult[] | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [period, setPeriod] = useState("30d");

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
          Suivez le parcours de vos visiteurs étape par étape et identifiez où
          ils décrochent.
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-[var(--app-radius-sm)] bg-primary px-2.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-3.5 w-3.5" />
          Créer un funnel
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
      {funnels.length === 0 && !showCreate ? (
        <div className="app-card flex flex-col items-center justify-center py-16 text-center">
          <Filter className="h-7 w-7 text-muted-light" />
          <h3 className="mt-3 text-[15px] font-semibold">
            Aucun funnel sur {siteName}
          </h3>
          <p className="mt-1 max-w-sm text-[13px] text-muted">
            Un funnel est une suite d&apos;étapes — page d&apos;accueil, pricing,
            inscription. PulseTrack compte combien de visiteurs franchissent
            chacune et où ils abandonnent.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 flex items-center gap-1.5 rounded-[var(--app-radius-sm)] bg-primary px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-3.5 w-3.5" />
            Créer mon premier funnel
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Funnel cards */}
          <div className="space-y-3 lg:col-span-1">
            {funnels.map((funnel) => {
              const steps = funnel.funnel_steps?.sort(
                (a, b) => a.step_order - b.step_order
              ) || [];

              return (
                <button
                  key={funnel.id}
                  onClick={() => setSelectedFunnel(
                    selectedFunnel === funnel.id ? null : funnel.id
                  )}
                  className={`w-full rounded-xl border p-4 text-left transition-all ${
                    selectedFunnel === funnel.id
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border bg-background hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{funnel.name}</h3>
                      <p className="text-xs text-muted mt-0.5">
                        {steps.length} étapes
                      </p>
                    </div>
                    <ChevronRight
                      className={`h-4 w-4 text-muted transition-transform ${
                        selectedFunnel === funnel.id ? "rotate-90" : ""
                      }`}
                    />
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
              );
            })}
          </div>

          {/* Funnel visualization */}
          {selectedFunnel && (
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-border bg-background p-6">
                {/* Period selector */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Résultats du funnel</h3>
                  <div className="flex gap-1 rounded-lg border border-border bg-surface p-0.5">
                    {[
                      { value: "7d", label: "7j" },
                      { value: "30d", label: "30j" },
                      { value: "90d", label: "90j" },
                    ].map((p) => (
                      <button
                        key={p.value}
                        onClick={() => setPeriod(p.value)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          period === p.value
                            ? "bg-primary text-white"
                            : "text-muted hover:text-foreground"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {loadingResults ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : funnelResults ? (
                  <FunnelVisualization steps={funnelResults} />
                ) : (
                  <p className="text-center text-sm text-muted py-12">
                    Sélectionnez un funnel pour voir les résultats
                  </p>
                )}
              </div>
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
            `Votre offre permet ${data.limit} funnel${data.limit > 1 ? "s" : ""}. Passez à une offre supérieure pour en créer un nouveau.`
          );
        }
        throw new Error(data.error || "Erreur lors de la création");
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
      <h3 className="text-lg font-semibold mb-4">Créer un funnel</h3>

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
            Nom du funnel
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Ex: Inscription, Achat, Onboarding"
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Steps */}
        <div>
          <label className="block text-sm font-medium mb-3">
            Étapes du funnel
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
                  placeholder="Nom de l'étape"
                  className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <select
                  value={step.match_type}
                  onChange={(e) => updateStep(i, "match_type", e.target.value)}
                  className="rounded-lg border border-border bg-surface px-2 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="path">URL exacte</option>
                  <option value="path_contains">URL contient</option>
                  <option value="event">Événement</option>
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
            Ajouter une étape
          </button>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-hover transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Créer le funnel"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─────────── FUNNEL VISUALIZATION ─────────── */
function FunnelVisualization({ steps }: { steps: FunnelStepResult[] }) {
  if (steps.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-[13px] font-medium">Aucun visiteur dans ce funnel</p>
        <p className="mx-auto mt-1.5 max-w-sm text-[12px] leading-relaxed text-muted">
          Personne n&apos;a franchi la première étape sur la période choisie.
          Vérifiez que son URL correspond bien à une page réelle du site, ou
          élargissez la période ci-dessus.
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
                      {step.visitors.toLocaleString("fr-FR")} visiteurs
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
                <span className="text-xs text-red-400 font-medium">
                  -{step.drop_off_rate}% abandons
                  {steps[i + 1] && (
                    <span className="text-muted font-normal">
                      {" "}
                      ({(step.visitors - steps[i + 1].visitors).toLocaleString(
                        "fr-FR"
                      )}{" "}
                      visiteurs perdus)
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
          <span className="text-sm font-medium">Conversion globale</span>
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
          {steps[0]?.visitors.toLocaleString("fr-FR")} visiteurs au départ →{" "}
          {steps[steps.length - 1]?.visitors.toLocaleString("fr-FR")} à la fin
        </p>
      </div>
    </div>
  );
}
