"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { useSites } from "@/components/site-context";
import {
  FilterBar,
  SegmentedFilter,
  ToggleFilter,
  ActiveFilterChip,
  usePeriodOptions,
} from "@/components/filters";
import { useT } from "@/components/locale-context";
import { relativeTime } from "@/lib/relative-time";
import { plural } from "@/lib/plural";
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

/* Field and operator labels come from the dictionary; the comparison
   symbols (<, ≥) are not language and stay as they are. */
type OpKey = "exists" | "not_exists" | "yes" | "no" | "eq" | "contains" | "dropped" | "reached";

const OPERATORS_FOR: Record<string, { value: string; symbol?: string; key?: OpKey }[]> = {
  scroll_pct: [
    { value: "lt", symbol: "<" },
    { value: "lte", symbol: "≤" },
    { value: "gt", symbol: ">" },
    { value: "gte", symbol: "≥" },
  ],
  duration: [
    { value: "gt", symbol: ">" },
    { value: "gte", symbol: "≥" },
    { value: "lt", symbol: "<" },
    { value: "lte", symbol: "≤" },
  ],
  pageview_count: [
    { value: "gt", symbol: ">" },
    { value: "gte", symbol: "≥" },
    { value: "lt", symbol: "<" },
    { value: "lte", symbol: "≤" },
  ],
  rage_click: [
    { value: "exists", key: "exists" },
    { value: "not_exists", key: "not_exists" },
  ],
  converted: [
    { value: "exists", key: "yes" },
    { value: "not_exists", key: "no" },
  ],
  device: [{ value: "eq", key: "eq" }],
  source: [
    { value: "eq", key: "eq" },
    { value: "contains", key: "contains" },
  ],
  country: [{ value: "eq", key: "eq" }],
  funnel_step: [
    { value: "dropped", key: "dropped" },
    { value: "reached", key: "reached" },
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

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m > 0 ? `${m}m ${rem}s` : `${rem}s`;
}

/**
 * Follows the rail's site switcher. Everything below is scoped to one
 * site — the open recording, the filters, the saved cohorts, the
 * saved cohorts — so the panel is keyed by site and a switch
 * remounts it clean rather than leaving one site's session list under
 * another site's name.
 */
export function SessionReplayPanel() {
  const { sites, site, siteId, ready, setSiteId } = useSites();
  const { t } = useT();

  // Arriving from "Sessions sur cette page" on the heatmap view carries
  // ?site= and ?path=. The site part points the rail's shared selection
  // at that site so every screen follows, not just this one.
  const params = useSearchParams();
  const linked = params.get("site");
  const path = params.get("path");

  /* The assistant's "open these sessions" arrives as URL parameters
     rather than shared state: the panel lives in a page and the
     assistant in the shell, and a link is something you can also
     bookmark, share with a colleague, or come back to. */
  const incoming: IncomingFilter = {
    behavior: params.get("behavior"),
    scrollMax: params.get("scroll_max"),
    funnelId: params.get("funnel_id"),
    step: params.get("step"),
    device: params.get("device"),
    rage: params.get("rage") === "1",
  };

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
        <h2 className="mt-3 text-[15px] font-semibold">{t.screens.common.noSiteTitle}</h2>
        <p className="mt-1 max-w-sm text-[13px] text-muted">
          {t.screens.replays.noSiteBody}
        </p>
        <Link href="/dashboard/sites/new" className="btn btn-brand mt-4">
          {t.screens.common.addSite}
        </Link>
      </div>
    );
  }

  /* The key carries the arriving filter, not just the site. Landing
     here from the assistant or from a heatmap while already on this
     screen changes the URL without changing the route, so without this
     the panel keeps its old state and the filter silently does nothing.
     Remounting is how the rest of this file already applies an incoming
     selection — the initial state is read once, and the user is free to
     change it afterwards. */
  const incomingKey = [
    siteId,
    path ?? "",
    incoming.behavior ?? "",
    incoming.scrollMax ?? "",
    incoming.funnelId ?? "",
    incoming.step ?? "",
    incoming.device ?? "",
    incoming.rage ? "1" : "",
  ].join("|");

  return (
    <SiteReplays
      key={incomingKey}
      siteId={siteId}
      siteDomain={site?.domain ?? ""}
      initialPath={path}
      incoming={incoming}
    />
  );
}

interface IncomingFilter {
  behavior: string | null;
  scrollMax: string | null;
  funnelId: string | null;
  step: string | null;
  device: string | null;
  rage: boolean;
}

/** The URL filter, as the one-condition array the panel already speaks. */
function conditionsFrom(f: IncomingFilter): Condition[] {
  if (f.behavior === "low_scroll") {
    return [
      {
        field: "scroll_pct",
        operator: "lt",
        value: Math.max(1, Math.min(99, Number(f.scrollMax) || 25)),
      },
    ];
  }
  if (f.behavior === "no_conversion") {
    return [{ field: "converted", operator: "not_exists" }];
  }
  if (f.behavior === "funnel_dropoff" && f.funnelId) {
    return [
      {
        field: "funnel_step",
        operator: "dropped",
        funnel_id: f.funnelId,
        step: Math.max(0, Number(f.step) || 0),
      },
    ];
  }
  return [];
}

function SiteReplays({
  siteId,
  siteDomain,
  initialPath,
  incoming,
}: {
  siteId: string;
  siteDomain: string;
  initialPath: string | null;
  incoming: IncomingFilter;
}) {
  const { t, intl } = useT();
  const [path, setPath] = useState<string | null>(initialPath);
  const periodOptions = usePeriodOptions();
  const [period, setPeriod] = useState("30d");
  const [device, setDevice] = useState<string | null>(
    ["Desktop", "Mobile", "Tablet"].includes(incoming.device ?? "") ? incoming.device : null
  );
  const [rageOnly, setRageOnly] = useState(incoming.rage);

  // Read-time filters over sessions already recorded — they never change
  // which visits the tracker chooses to record (src/app/api/replay/gate
  // decides that before any of this can be known), only which of the
  // already-captured recordings show up here. One mechanism for
  // everything: the quick-filter buttons below just set a one-condition
  // array of the same shape the advanced builder produces.
  const [conditions, setConditions] = useState<Condition[]>(() =>
    conditionsFrom(incoming)
  );
  const [match, setMatch] = useState<Match>("AND");
  const [showBuilder, setShowBuilder] = useState(false);
  const [funnels, setFunnels] = useState<FunnelOption[]>([]);
  const [hasRevenue, setHasRevenue] = useState(false);

  const singleCondition = conditions.length === 1 ? conditions[0] : null;

  /** Is the list narrowed at all? Period is excluded — there is always
   *  one, so it never explains an empty list the way the rest do. */
  const filtering =
    conditions.length > 0 || device !== null || rageOnly || path !== null;

  // Saved cohorts — a name attached to the exact filter shape above,
  // nothing more. Applying one just sets the same state the manual
  // controls set, so it stays editable afterwards like any other
  // selection (same principle as the copilot).
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [savingCohort, setSavingCohort] = useState(false);
  const [cohortName, setCohortName] = useState("");


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



  if (locked) {
    return (
      <div className="rounded-lg border border-border bg-surface p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary-pale">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <h2 className="mt-4 text-lg font-medium">{t.screens.replays.lockedTitle}</h2>
        <p className="mx-auto mt-2 max-w-sm text-[13.5px] text-muted">
          {t.screens.replays.lockedBody}
        </p>
        <Link href="/dashboard/upgrade" className="btn btn-brand mt-6">
          {t.screens.common.seePlans}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <FilterBar>
        <SegmentedFilter
          ariaLabel="Appareil"
          value={device}
          onChange={setDevice}
          options={[
            { value: null, label: t.screens.replays.all },
            { value: "Desktop", label: "Desktop" },
            { value: "Mobile", label: "Mobile" },
            { value: "Tablet", label: t.screens.replays.fields.device === "Device" ? "Tablet" : "Tablette" },
          ]}
        />

        <SegmentedFilter
          ariaLabel={t.filters.period}
          value={period}
          options={periodOptions}
          onChange={setPeriod}
        />

        <ToggleFilter
          active={rageOnly}
          onToggle={() => setRageOnly((v) => !v)}
          icon={AlertTriangle}
          tone="coral"
        >
          {t.screens.replays.rageOnly}
        </ToggleFilter>

        {path && (
          <ActiveFilterChip label={t.screens.common.page} value={path} onClear={() => setPath(null)} />
        )}
      </FilterBar>

      {/* Behavioural filters — narrow which recorded sessions show up,
          never which ones get recorded in the first place. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-[11.5px] text-muted-light">
          <Filter className="h-3.5 w-3.5" />
          {t.screens.replays.behaviour}
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
            {t.screens.replays.all}
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
            {t.screens.replays.lowScroll}
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
              {t.screens.replays.funnelDropoff}
            </button>
          )}
          <button
            onClick={() => setShowBuilder((v) => !v)}
            className={`flex items-center gap-1.5 rounded-xs px-2.5 py-1.5 text-[12px] transition-colors ${
              showBuilder ? "bg-primary-pale text-primary" : "text-muted hover:text-foreground"
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            {t.screens.replays.advancedCondition}
          </button>
        </div>

        {singleCondition?.field === "scroll_pct" && !showBuilder && (
          <label className="flex items-center gap-1.5 text-[12px] text-muted">
            {t.screens.replays.scrolledLessThan}
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
            {t.screens.replays.percentScrolled}
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
                      ? `${t.screens.replays.reachedStep} ${s.name}`
                      : `${t.screens.replays.stuckAfter} ${s.name}`}
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
                  {Object.entries(t.screens.replays.fields).map(([value, label]) => (
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
                      {op.symbol ?? t.screens.replays.operators[op.key!]}
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
                            {si === arr.length - 1 ? s.name : `${t.screens.replays.afterStep} ${s.name}`}
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
                  title={t.screens.replays.removeCondition}
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
              {t.screens.replays.addCondition}
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
                    {m === "AND" ? t.screens.replays.matchAll : t.screens.replays.matchAny}
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
      {/* Hidden entirely when there is nothing to show — it used to
          spend a whole row announcing that it was empty. It reappears as
          soon as a filter is set (so the choice can be saved) or a
          cohort exists. */}
      <div
        className={`flex-wrap items-center gap-2 ${
          cohorts.length === 0 && conditions.length === 0 ? "hidden" : "flex"
        }`}
      >
        <span className="flex items-center gap-1.5 text-[11.5px] text-muted-light">
          <Bookmark className="h-3.5 w-3.5" />
          {t.screens.replays.cohorts}
        </span>

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
              title={t.screens.replays.deleteCohort}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {conditions.length > 0 && isTrivialDefault && (
          <span className="text-[11.5px] text-muted-light">
            {t.screens.replays.alreadyOneClick}
          </span>
        )}

        {conditions.length > 0 && !isTrivialDefault && (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={cohortName}
              onChange={(e) => setCohortName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveCohort()}
              placeholder={t.screens.replays.nameThisFilter}
              className="w-36 rounded-sm border border-border bg-surface px-2 py-1 text-[12px] outline-none focus:border-primary"
            />
            <button
              onClick={saveCohort}
              disabled={savingCohort || !cohortName.trim()}
              className="flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-[12px] text-muted transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-40"
            >
              <Save className="h-3 w-3" />
              {t.screens.replays.save}
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* Left column: the session list first — it is what the screen is
            for. The copilot that used to sit under it has moved to the
            assistant panel on the right, where it has room and can
            answer about more than this one screen. */}
        <div className="flex flex-col gap-4">
          {/* Session list */}
          <div className="flex max-h-[460px] flex-col overflow-hidden rounded-lg border border-border bg-surface">
            {/* Always, not only when a filter is set: a list with no
                count leaves you guessing whether you're looking at
                everything or at a filtered subset. */}
            {!loading && (
              <p className="border-b border-border px-4 py-2 text-[11.5px] text-muted-light">
                <span className="font-medium text-foreground">{replays.length}</span>{" "}
                {plural(replays.length, t.screens.replays.recording, t.screens.replays.recordings)}
                {conditions.length > 0 || rageOnly || device || path
                  ? ` ${t.screens.replays.matchingFilters}`
                  : ` ${t.screens.replays.overPeriod[period]}`}
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
              {/* "Nothing recorded yet" and "nothing matches what you
                  asked for" are different problems with different fixes,
                  and telling someone to wait for a first visitor when they
                  already have recordings just reads as broken. */}
              <p className="mt-3 text-[13px] font-medium">
                {filtering ? t.screens.replays.emptyFilteredTitle : t.screens.replays.emptyTitle}
              </p>
              <p className="mt-1.5 text-[12px] text-muted">
                {filtering ? t.screens.replays.emptyFilteredBody : t.screens.replays.emptyBody}
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
                      {/* Labelled, not a bare triangle: an unexplained
                          warning icon is the kind of thing you have to
                          hover to understand. */}
                      {r.has_rage && (
                        <span className="flex shrink-0 items-center gap-1 rounded-xs bg-coral-pale px-1.5 py-0.5 text-[10px] font-medium text-coral">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          rage
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-light">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(r.duration_ms)}
                      </span>
                      {/* event_count is deliberately not shown: it counts
                          rrweb frames (DOM mutations, mouse moves), not
                          pages or clicks — 92 of them for a 28-second
                          single-page visit. It means nothing to a reader. */}
                      {r.country && r.country !== "Unknown" && <span>{r.country}</span>}
                      {r.browser && <span>{r.browser}</span>}
                      <span>{relativeTime(r.started_at, intl)}</span>
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
              {t.screens.replays.selectOne}
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
                    {t.screens.replays.heatmapOfPage}
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
