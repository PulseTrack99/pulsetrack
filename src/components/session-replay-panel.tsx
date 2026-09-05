"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { useSites } from "@/components/site-context";
import {
  Video,
  AlertTriangle,
  Monitor,
  Smartphone,
  Tablet,
  Lock,
  Clock,
  Flame,
  X,
  CreditCard,
  ArrowDownToLine,
  Filter,
  Sparkles,
  Bookmark,
  Save,
  Plus,
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

interface FunnelOption {
  id: string;
  name: string;
  steps: { step_order: number; name: string }[];
}

// A single condition in the general cohort builder
// (supabase/cohort-builder.sql) — the three quick-filter buttons are
// just presets that set a one-condition array of this same shape, so
// there is only ever one filtering mechanism to reason about.
interface Condition {
  field: string;
  operator: string;
  value?: string | number;
  funnel_id?: string;
  step?: number;
}

type Match = "AND" | "OR";

const FIELD_LABELS: Record<string, string> = {
  scroll_pct: "Scroll max",
  duration: "Durée de session",
  pageview_count: "Nombre de pages vues",
  rage_click: "Clic de rage",
  converted: "A converti",
  device: "Appareil",
  source: "Source de trafic",
  country: "Pays",
  funnel_step: "Étape de funnel",
};

const OPERATORS_FOR: Record<string, { value: string; label: string }[]> = {
  scroll_pct: [
    { value: "lt", label: "<" },
    { value: "lte", label: "≤" },
    { value: "gt", label: ">" },
    { value: "gte", label: "≥" },
  ],
  duration: [
    { value: "gt", label: ">" },
    { value: "gte", label: "≥" },
    { value: "lt", label: "<" },
    { value: "lte", label: "≤" },
  ],
  pageview_count: [
    { value: "gt", label: ">" },
    { value: "gte", label: "≥" },
    { value: "lt", label: "<" },
    { value: "lte", label: "≤" },
  ],
  rage_click: [
    { value: "exists", label: "a eu lieu" },
    { value: "not_exists", label: "n'a pas eu lieu" },
  ],
  converted: [
    { value: "exists", label: "oui" },
    { value: "not_exists", label: "non" },
  ],
  device: [{ value: "eq", label: "est" }],
  source: [
    { value: "eq", label: "est" },
    { value: "contains", label: "contient" },
  ],
  country: [{ value: "eq", label: "est" }],
  funnel_step: [
    { value: "dropped", label: "bloqué après" },
    { value: "reached", label: "a atteint" },
  ],
};

function defaultCondition(field: string, funnels: FunnelOption[]): Condition {
  if (field === "funnel_step") return { field, operator: "dropped", funnel_id: funnels[0]?.id, step: 0 };
  if (field === "rage_click" || field === "converted") return { field, operator: "exists" };
  if (field === "device") return { field, operator: "eq", value: "Desktop" };
  if (field === "scroll_pct") return { field, operator: "lt", value: 25 };
  if (field === "duration") return { field, operator: "gt", value: 60 };
  if (field === "pageview_count") return { field, operator: "gt", value: 3 };
  return { field, operator: "eq", value: "" };
}

interface Cohort {
  id: string;
  name: string;
  conditions: Condition[];
  match: Match;
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

/**
 * Follows the rail's site switcher. Everything below is scoped to one
 * site — the open recording, the filters, the saved cohorts, the
 * copilot conversation — so the panel is keyed by site and a switch
 * remounts it clean rather than leaving one site's session list under
 * another site's name.
 */
export function SessionReplayPanel() {
  const { sites, site, siteId, ready, setSiteId } = useSites();

  // Arriving from "Sessions sur cette page" on the heatmap view carries
  // ?site= and ?path=. The site part points the rail's shared selection
  // at that site so every screen follows, not just this one.
  const params = useSearchParams();
  const linked = params.get("site");
  const path = params.get("path");

  useEffect(() => {
    if (linked && linked !== siteId && sites.some((s) => s.id === linked)) {
      setSiteId(linked);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linked, sites]);

  if (!ready) return null;

  if (!siteId) {
    return (
      <div className="app-card flex flex-col items-center justify-center py-16 text-center">
        <Video className="h-7 w-7 text-muted-light" />
        <h2 className="mt-3 text-[15px] font-semibold">Aucun site pour l&apos;instant</h2>
        <p className="mt-1 max-w-sm text-[13px] text-muted">
          Session Replay rejoue les visites d&apos;un site. Ajoutez-en un pour
          commencer à enregistrer.
        </p>
        <Link href="/dashboard/sites/new" className="btn btn-brand mt-4">
          Ajouter un site
        </Link>
      </div>
    );
  }

  return (
    <SiteReplays
      key={siteId}
      siteId={siteId}
      siteDomain={site?.domain ?? ""}
      initialPath={path}
    />
  );
}

function SiteReplays({
  siteId,
  siteDomain,
  initialPath,
}: {
  siteId: string;
  siteDomain: string;
  initialPath: string | null;
}) {
  const [path, setPath] = useState<string | null>(initialPath);
  const [period, setPeriod] = useState("30d");
  const [device, setDevice] = useState<string | null>(null);
  const [rageOnly, setRageOnly] = useState(false);

  // Read-time filters over sessions already recorded — they never change
  // which visits the tracker chooses to record (src/app/api/replay/gate
  // decides that before any of this can be known), only which of the
  // already-captured recordings show up here. One mechanism for
  // everything: the quick-filter buttons below just set a one-condition
  // array of the same shape the advanced builder produces.
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [match, setMatch] = useState<Match>("AND");
  const [showBuilder, setShowBuilder] = useState(false);
  const [funnels, setFunnels] = useState<FunnelOption[]>([]);
  const [hasRevenue, setHasRevenue] = useState(false);

  const singleCondition = conditions.length === 1 ? conditions[0] : null;

  // Saved cohorts — a name attached to the exact filter shape above,
  // nothing more. Applying one just sets the same state the manual
  // controls set, so it stays editable afterwards like any other
  // selection (same principle as the copilot).
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [savingCohort, setSavingCohort] = useState(false);
  const [cohortName, setCohortName] = useState("");

  // Copilot — translates a plain-language question into one of the
  // behavioural filters above (src/app/api/copilot). It never invents a
  // new way to query the data, it only sets the same state these
  // buttons already set — so whatever it picks stays visibly editable
  // through the ordinary controls afterwards. Kept as a real
  // conversation (chat bubbles, history) rather than a single line that
  // overwrites itself, so a question and its answer stay visible
  // together once a second question is asked.
  const [question, setQuestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [chat, setChat] = useState<
    { role: "user" | "ai" | "upsell"; text: string }[]
  >([]);

  const [replays, setReplays] = useState<ReplayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  const [selected, setSelected] = useState<ReplayRow | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [events, setEvents] = useState<any[] | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);


  // Funnels and the site's Stripe connection state, for the "abandon de
  // funnel" and "sans conversion" filter options. RLS on both tables
  // already restricts this to the signed-in owner, matching how
  // /dashboard/funnels reads funnels directly from the browser client.
  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    const supabase = createClient();

    supabase
      .from("funnels")
      .select("id, name, funnel_steps(step_order, name)")
      .eq("site_id", siteId)
      .then(({ data }) => {
        if (cancelled) return;
        setFunnels(
          (data ?? []).map((f) => ({
            id: f.id,
            name: f.name,
            steps: (f.funnel_steps ?? []).sort(
              (a: { step_order: number }, b: { step_order: number }) =>
                a.step_order - b.step_order
            ),
          }))
        );
      });

    supabase
      .from("stripe_connections")
      .select("id")
      .eq("site_id", siteId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setHasRevenue(Boolean(data));
      });

    return () => {
      cancelled = true;
    };
  }, [siteId]);

  function loadCohorts(site: string, alive?: () => boolean) {
    fetch(`/api/cohorts?site_id=${site}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive || alive()) setCohorts(d.cohorts ?? []);
      });
  }

  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    loadCohorts(siteId, () => !cancelled);
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  function applyCohort(c: Cohort) {
    setConditions(c.conditions);
    setMatch(c.match);
    setShowBuilder(c.conditions.length > 1);
  }

  // A cohort is only worth naming when it takes more than the one
  // click the quick-filter buttons already give you — their plain
  // default (25% scroll, first funnel's first step, no conversion) is
  // already a single click away, so offering to "save" exactly that
  // would just be confusing busywork. Anything built with 2+
  // conditions, a non-default value, or through the advanced builder
  // is real, save-worthy configuration.
  const isTrivialDefault = useMemo(() => {
    if (conditions.length === 0) return true;
    if (conditions.length > 1) return false;
    if (device || rageOnly) return false;
    const c = conditions[0];
    if (c.field === "scroll_pct") return c.operator === "lt" && c.value === 25;
    if (c.field === "converted") return c.operator === "not_exists";
    if (c.field === "funnel_step") {
      return c.operator === "dropped" && c.funnel_id === funnels[0]?.id && c.step === 0;
    }
    return false;
  }, [conditions, device, rageOnly, funnels]);

  async function saveCohort() {
    const name = cohortName.trim();
    if (!name || !siteId) return;
    setSavingCohort(true);
    try {
      const res = await fetch("/api/cohorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId, name, conditions, match }),
      });
      if (res.ok) {
        setCohortName("");
        loadCohorts(siteId);
      }
    } finally {
      setSavingCohort(false);
    }
  }

  async function deleteCohort(id: string) {
    const res = await fetch(`/api/cohorts/${id}`, { method: "DELETE" });
    if (res.ok) setCohorts((c) => c.filter((x) => x.id !== id));
  }

  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLocked(false);
      try {
        const params = new URLSearchParams({ site_id: siteId, period });
        if (device) params.set("device", device);
        if (path) params.set("path", path);
        if (rageOnly) params.set("rage", "1");

        // Only conditions that are actually usable — a funnel_step
        // condition with no funnel chosen yet would just error server
        // side for no reason while the picker is mid-selection.
        const usable = conditions.filter((c) => c.field !== "funnel_step" || c.funnel_id);
        if (usable.length > 0) {
          params.set("conditions", JSON.stringify(usable));
          params.set("match", match);
        }

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
  }, [siteId, period, device, path, rageOnly, conditions, match]);

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

  // Quick-start chips — only the ones that would actually do something on
  // this site, mirroring which manual filter buttons are shown below.
  const suggestions = useMemo(() => {
    const s = ["Sessions qui n'ont presque pas scrollé"];
    if (hasRevenue) s.push("Sessions qui n'ont pas converti");
    if (funnels.length > 0) s.push(`Abandon du funnel ${funnels[0].name}`);
    return s;
  }, [hasRevenue, funnels]);

  async function askCopilot(preset?: string) {
    const q = (preset ?? question).trim();
    if (!q || aiLoading || !siteId) return;

    setChat((c) => [...c, { role: "user", text: q }]);
    setQuestion("");
    setAiLoading(true);

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId, question: q }),
      });
      const data = await res.json();

      if (res.status === 402) {
        setChat((c) => [
          ...c,
          {
            role: "upsell",
            text:
              data.error === "quota_exceeded"
                ? `Quota IA atteint pour ce mois (${data.used}/${data.limit}) — ça repart à zéro le mois prochain, ou passez sur une offre supérieure.`
                : "Le copilote IA est disponible à partir du plan Starter.",
          },
        ]);
        return;
      }
      if (!res.ok) {
        setChat((c) => [
          ...c,
          { role: "ai", text: data.error || "Le copilote n'a pas pu répondre." },
        ]);
        return;
      }

      // The copilot still speaks the older fixed behavior/scroll_max/
      // funnel_id shape (src/app/api/copilot) — translated into a
      // one-condition array here rather than rewriting an already
      // tested backend just to match a newer, more general client shape.
      const f = data.filter as {
        behavior: "no_conversion" | "low_scroll" | "funnel_dropoff" | null;
        scroll_max: number | null;
        funnel_id: string | null;
        step: number;
        device: string | null;
        rage_only: boolean;
      };

      if (f.behavior === "low_scroll") {
        setConditions([{ field: "scroll_pct", operator: "lt", value: f.scroll_max ?? 25 }]);
      } else if (f.behavior === "no_conversion") {
        setConditions([{ field: "converted", operator: "not_exists" }]);
      } else if (f.behavior === "funnel_dropoff" && f.funnel_id) {
        setConditions([{ field: "funnel_step", operator: "dropped", funnel_id: f.funnel_id, step: f.step ?? 0 }]);
      }
      if (f.device) setDevice(f.device);
      if (f.rage_only) setRageOnly(true);

      setChat((c) => [...c, { role: "ai", text: data.explanation }]);
    } catch {
      setChat((c) => [
        ...c,
        { role: "ai", text: "Le copilote n'a pas pu répondre — réessayez." },
      ]);
    } finally {
      setAiLoading(false);
    }
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

        {path && (
          <span className="flex items-center gap-1.5 rounded-sm border border-primary/30 bg-primary-pale px-2.5 py-1.5 text-[12px] text-primary">
            Page : {path}
            <button
              onClick={() => setPath(null)}
              className="rounded-xs p-0.5 hover:bg-primary/10"
              title="Retirer le filtre"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
      </div>

      {/* Behavioural filters — narrow which recorded sessions show up,
          never which ones get recorded in the first place. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-[11.5px] text-muted-light">
          <Filter className="h-3.5 w-3.5" />
          Comportement :
        </span>

        <div className="flex flex-wrap gap-0.5 rounded-sm border border-border bg-surface p-0.5">
          <button
            onClick={() => {
              setConditions([]);
              setShowBuilder(false);
            }}
            className={`rounded-xs px-2.5 py-1.5 text-[12px] transition-colors ${
              conditions.length === 0 ? "bg-primary-pale text-primary" : "text-muted hover:text-foreground"
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => {
              setConditions([{ field: "scroll_pct", operator: "lt", value: 25 }]);
              setShowBuilder(false);
            }}
            className={`flex items-center gap-1.5 rounded-xs px-2.5 py-1.5 text-[12px] transition-colors ${
              singleCondition?.field === "scroll_pct"
                ? "bg-primary-pale text-primary"
                : "text-muted hover:text-foreground"
            }`}
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
            N&apos;ont presque pas scrollé
          </button>
          {hasRevenue && (
            <button
              onClick={() => {
                setConditions([{ field: "converted", operator: "not_exists" }]);
                setShowBuilder(false);
              }}
              className={`flex items-center gap-1.5 rounded-xs px-2.5 py-1.5 text-[12px] transition-colors ${
                singleCondition?.field === "converted"
                  ? "bg-primary-pale text-primary"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <CreditCard className="h-3.5 w-3.5" />
              N&apos;ont pas converti
            </button>
          )}
          {funnels.length > 0 && (
            <button
              onClick={() => {
                setConditions([{ field: "funnel_step", operator: "dropped", funnel_id: funnels[0].id, step: 0 }]);
                setShowBuilder(false);
              }}
              className={`flex items-center gap-1.5 rounded-xs px-2.5 py-1.5 text-[12px] transition-colors ${
                singleCondition?.field === "funnel_step"
                  ? "bg-primary-pale text-primary"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              Abandon de funnel
            </button>
          )}
          <button
            onClick={() => setShowBuilder((v) => !v)}
            className={`flex items-center gap-1.5 rounded-xs px-2.5 py-1.5 text-[12px] transition-colors ${
              showBuilder ? "bg-primary-pale text-primary" : "text-muted hover:text-foreground"
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            Condition avancée
          </button>
        </div>

        {singleCondition?.field === "scroll_pct" && !showBuilder && (
          <label className="flex items-center gap-1.5 text-[12px] text-muted">
            Moins de
            <input
              type="number"
              min={1}
              max={99}
              value={singleCondition.value as number}
              onChange={(e) =>
                setConditions([{ ...singleCondition, value: Math.max(1, Math.min(99, Number(e.target.value))) }])
              }
              className="w-14 rounded-sm border border-border bg-surface px-1.5 py-1 text-[12px] outline-none focus:border-primary"
            />
            % scrollé
          </label>
        )}

        {singleCondition?.field === "funnel_step" && !showBuilder && (
          <>
            <select
              value={singleCondition.funnel_id}
              onChange={(e) => setConditions([{ ...singleCondition, funnel_id: e.target.value, step: 0 }])}
              className="rounded-sm border border-border bg-surface px-2.5 py-1.5 text-[12px] outline-none focus:border-primary"
            >
              {funnels.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <select
              value={singleCondition.step}
              onChange={(e) => setConditions([{ ...singleCondition, step: Number(e.target.value) }])}
              className="rounded-sm border border-border bg-surface px-2.5 py-1.5 text-[12px] outline-none focus:border-primary"
            >
              {funnels
                .find((f) => f.id === singleCondition.funnel_id)
                ?.steps.map((s, i, arr) => (
                  <option key={s.step_order} value={i}>
                    {i === arr.length - 1
                      ? `Ont atteint : ${s.name}`
                      : `Bloqués après : ${s.name}`}
                  </option>
                ))}
            </select>
          </>
        )}
      </div>

      {/* Advanced builder — combine any number of conditions with a
          single AND/OR across the whole set (Mixpanel-style cohort
          builder, scoped to what our session-based data model can
          actually answer). The quick buttons above are just presets
          for the one-condition case. */}
      {showBuilder && (
        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="space-y-2">
            {conditions.map((c, i) => (
              <div key={i} className="flex flex-wrap items-center gap-1.5">
                <select
                  value={c.field}
                  onChange={(e) => {
                    const next = [...conditions];
                    next[i] = defaultCondition(e.target.value, funnels);
                    setConditions(next);
                  }}
                  className="rounded-sm border border-border bg-background px-2 py-1 text-[12px] outline-none focus:border-primary"
                >
                  {Object.entries(FIELD_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>

                <select
                  value={c.operator}
                  onChange={(e) => {
                    const next = [...conditions];
                    next[i] = { ...c, operator: e.target.value };
                    setConditions(next);
                  }}
                  className="rounded-sm border border-border bg-background px-2 py-1 text-[12px] outline-none focus:border-primary"
                >
                  {OPERATORS_FOR[c.field]?.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>

                {c.field === "device" && (
                  <select
                    value={c.value as string}
                    onChange={(e) => {
                      const next = [...conditions];
                      next[i] = { ...c, value: e.target.value };
                      setConditions(next);
                    }}
                    className="rounded-sm border border-border bg-background px-2 py-1 text-[12px] outline-none focus:border-primary"
                  >
                    <option value="Desktop">Desktop</option>
                    <option value="Mobile">Mobile</option>
                    <option value="Tablet">Tablette</option>
                  </select>
                )}

                {c.field === "funnel_step" && (
                  <>
                    <select
                      value={c.funnel_id}
                      onChange={(e) => {
                        const next = [...conditions];
                        next[i] = { ...c, funnel_id: e.target.value, step: 0 };
                        setConditions(next);
                      }}
                      className="rounded-sm border border-border bg-background px-2 py-1 text-[12px] outline-none focus:border-primary"
                    >
                      {funnels.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={c.step}
                      onChange={(e) => {
                        const next = [...conditions];
                        next[i] = { ...c, step: Number(e.target.value) };
                        setConditions(next);
                      }}
                      className="rounded-sm border border-border bg-background px-2 py-1 text-[12px] outline-none focus:border-primary"
                    >
                      {funnels
                        .find((f) => f.id === c.funnel_id)
                        ?.steps.map((s, si, arr) => (
                          <option key={s.step_order} value={si}>
                            {si === arr.length - 1 ? s.name : `après ${s.name}`}
                          </option>
                        ))}
                    </select>
                  </>
                )}

                {["gt", "gte", "lt", "lte"].includes(c.operator) && (
                  <input
                    type="number"
                    value={c.value as number}
                    onChange={(e) => {
                      const next = [...conditions];
                      next[i] = { ...c, value: Number(e.target.value) };
                      setConditions(next);
                    }}
                    className="w-16 rounded-sm border border-border bg-background px-2 py-1 text-[12px] outline-none focus:border-primary"
                  />
                )}

                {["eq", "contains"].includes(c.operator) && c.field !== "device" && (
                  <input
                    type="text"
                    value={(c.value as string) ?? ""}
                    onChange={(e) => {
                      const next = [...conditions];
                      next[i] = { ...c, value: e.target.value };
                      setConditions(next);
                    }}
                    placeholder={c.field === "country" ? "FR" : "google.com"}
                    className="w-28 rounded-sm border border-border bg-background px-2 py-1 text-[12px] outline-none focus:border-primary"
                  />
                )}

                <button
                  onClick={() => setConditions(conditions.filter((_, x) => x !== i))}
                  className="rounded-sm p-1 text-muted-light hover:bg-coral-pale hover:text-coral"
                  title="Retirer cette condition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-2.5 flex items-center gap-2.5">
            <button
              onClick={() => setConditions([...conditions, defaultCondition("scroll_pct", funnels)])}
              className="flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-[12px] text-muted hover:border-primary/40 hover:text-primary"
            >
              <Plus className="h-3 w-3" />
              Ajouter une condition
            </button>

            {conditions.length > 1 && (
              <div className="flex gap-0.5 rounded-sm border border-border bg-background p-0.5">
                {(["AND", "OR"] as Match[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMatch(m)}
                    className={`rounded-xs px-2 py-1 text-[11px] font-medium transition-colors ${
                      match === m ? "bg-primary-pale text-primary" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {m === "AND" ? "ET (toutes)" : "OU (au moins une)"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Saved cohorts — a name attached to the filter combination
          above, nothing more. Applying one sets the same state the
          manual controls set, so it stays editable afterwards. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-[11.5px] text-muted-light">
          <Bookmark className="h-3.5 w-3.5" />
          Cohorts :
        </span>

        {cohorts.length === 0 && conditions.length === 0 && (
          <span className="text-[12px] text-muted-light">
            Aucun cohort sauvegardé pour l&apos;instant.
          </span>
        )}

        {cohorts.map((c) => (
          <span
            key={c.id}
            className="group flex items-center gap-1 rounded-full border border-border bg-surface pl-2.5 pr-1 py-1 text-[12px] transition-colors hover:border-primary/40"
          >
            <button onClick={() => applyCohort(c)} className="text-muted hover:text-primary">
              {c.name}
            </button>
            <button
              onClick={() => deleteCohort(c.id)}
              className="rounded-full p-0.5 text-muted-light opacity-0 transition-opacity hover:bg-coral-pale hover:text-coral group-hover:opacity-100"
              title="Supprimer ce cohort"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {conditions.length > 0 && isTrivialDefault && (
          <span className="text-[11.5px] text-muted-light">
            Déjà accessible en un clic ci-dessus — inutile à sauvegarder.
          </span>
        )}

        {conditions.length > 0 && !isTrivialDefault && (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={cohortName}
              onChange={(e) => setCohortName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveCohort()}
              placeholder="Nommer ce filtre…"
              className="w-36 rounded-sm border border-border bg-surface px-2 py-1 text-[12px] outline-none focus:border-primary"
            />
            <button
              onClick={saveCohort}
              disabled={savingCohort || !cohortName.trim()}
              className="flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-[12px] text-muted transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-40"
            >
              <Save className="h-3 w-3" />
              Sauvegarder
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* Left column: copilot chat, then the session list under it */}
        <div className="flex flex-col gap-4">
          {/* Copilot — sets the same filters as the manual controls
              above, never a new query path of its own. Always shown
              here: every plan that reaches this panel (session_replay
              requires at least Starter) also has ai_copilot, so the
              only way a question can be refused is the monthly quota,
              surfaced inline as an "upsell" chat bubble rather than
              hiding the panel over it. */}
          <div className="flex flex-col overflow-hidden rounded-lg border border-primary/20 bg-surface">
            <div className="flex items-center gap-2 border-b border-border bg-primary-pale/40 px-3.5 py-2.5">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-[13px] font-medium text-primary">Copilote IA</span>
            </div>

            <div className="flex max-h-[220px] min-h-[80px] flex-col gap-2 overflow-y-auto px-3 py-2.5">
              {chat.length === 0 && (
                <p className="px-0.5 text-[12px] text-muted-light">
                  Posez une question sur vos sessions enregistrées — je choisis
                  le filtre qui correspond.
                </p>
              )}
              {chat.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === "user"
                      ? "self-end max-w-[88%] rounded-lg rounded-br-sm bg-primary px-3 py-1.5 text-[12.5px] text-white"
                      : m.role === "upsell"
                        ? "max-w-[92%] rounded-lg bg-coral-pale px-3 py-1.5 text-[12px] text-coral"
                        : "max-w-[92%] rounded-lg rounded-bl-sm bg-surface-sunken px-3 py-1.5 text-[12.5px] text-foreground"
                  }
                >
                  {m.text}
                  {m.role === "upsell" && (
                    <Link
                      href="/dashboard/upgrade"
                      className="ml-1.5 font-medium underline"
                    >
                      Voir les offres
                    </Link>
                  )}
                </div>
              ))}
              {aiLoading && (
                <div className="flex w-fit items-center gap-1 self-start rounded-lg rounded-bl-sm bg-surface-sunken px-3 py-2">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-light [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-light [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-light [animation-delay:240ms]" />
                </div>
              )}
            </div>

            {chat.length === 0 && (
              <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => askCopilot(s)}
                    disabled={aiLoading}
                    className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 border-t border-border p-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && askCopilot()}
                placeholder="Posez votre question…"
                className="min-w-0 flex-1 rounded-sm bg-surface-sunken px-2.5 py-1.5 text-[12.5px] outline-none placeholder:text-muted-light"
              />
              <button
                onClick={() => askCopilot()}
                disabled={aiLoading || !question.trim()}
                className="shrink-0 rounded-sm bg-primary px-3 py-1.5 text-[12px] font-medium text-white transition-opacity disabled:opacity-40"
              >
                {aiLoading ? "…" : "Envoyer"}
              </button>
            </div>
          </div>

          {/* Session list */}
          <div className="flex max-h-[460px] flex-col overflow-hidden rounded-lg border border-border bg-surface">
            {conditions.length > 0 && !loading && (
              <p className="border-b border-border px-4 py-2 text-[11.5px] text-muted-light">
                <span className="font-medium text-foreground">{replays.length}</span>{" "}
                session{replays.length > 1 ? "s" : ""} trouvée{replays.length > 1 ? "s" : ""}
              </p>
            )}
            <div className="overflow-y-auto">
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
          </div>
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
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-medium">{selected.path || "/"}</p>
                  <p className="text-[11.5px] text-muted-light">
                    {siteDomain} · {selected.browser} · {selected.country}
                  </p>
                </div>
                {selected.path && (
                  <Link
                    href={`/dashboard/heatmaps?site=${siteId}&path=${encodeURIComponent(selected.path)}`}
                    className="flex shrink-0 items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 text-[11.5px] text-muted transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <Flame className="h-3.5 w-3.5" />
                    Heatmap de cette page
                  </Link>
                )}
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
