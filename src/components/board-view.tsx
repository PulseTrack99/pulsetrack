"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Plus, Trash2, ChevronUp, ChevronDown, Heading1, Type,
  BarChart3, Pencil, Check, AlertTriangle, Maximize2, Minimize2,
} from "lucide-react";
import { useT } from "@/components/locale-context";
import { FilterBar, SegmentedFilter, usePeriodOptions } from "@/components/filters";
import { Lines, Ranking } from "@/components/insight-chart";

/**
 * A board: a document made of blocks, not a grid of charts.
 *
 * The prose blocks are the point. A chart says what happened; only a
 * sentence next to it says what to look for and what to do about it,
 * and that sentence is what turns a page of numbers into something
 * worth sending to a colleague. Every other screen in this product is
 * the developer's question — this one is the customer's.
 *
 * An insight block stores the *question* (measure, split, filters), so
 * reopening a board next week shows next week. Storing the answer would
 * be a screenshot with extra steps.
 */

interface Block {
  id: string;
  position: number;
  kind: "heading" | "text" | "insight";
  width: "full" | "half";
  config: Record<string, unknown>;
}

interface Board {
  id: string;
  site_id: string;
  name: string;
  description: string | null;
  blocks: Block[];
}

export function BoardView({ boardId }: { boardId: string }) {
  const { t } = useT();
  const router = useRouter();
  const periodOptions = usePeriodOptions();

  const [board, setBoard] = useState<Board | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  // The board's period wins over each block's: reading a report means
  // reading every tile over the same window, or the comparisons in the
  // prose stop being true.
  const [period, setPeriod] = useState("30d");

  const load = useCallback(async () => {
    const res = await fetch(`/api/boards/${boardId}`);
    const data = await res.json();
    setPending(Boolean(data.migration_pending));
    setBoard(data.board ?? null);
  }, [boardId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await load();
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  async function addBlock(kind: Block["kind"]) {
    await fetch(`/api/boards/${boardId}/blocks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        width: "full",
        config:
          kind === "insight"
            ? { title: t.screens.boards.newTile, measure: "pageviews", grain: "day" }
            : { text: "" },
      }),
    });
    await load();
  }

  async function updateBlock(blockId: string, patch: Record<string, unknown>) {
    await fetch(`/api/boards/${boardId}/blocks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ block_id: blockId, ...patch }),
    });
    await load();
  }

  async function removeBlock(blockId: string) {
    await fetch(`/api/boards/${boardId}/blocks?block_id=${blockId}`, { method: "DELETE" });
    await load();
  }

  async function move(blockId: string, delta: -1 | 1) {
    if (!board) return;
    const ids = board.blocks.map((b) => b.id);
    const i = ids.indexOf(blockId);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    // Optimistic: reordering is the one edit where waiting for a round
    // trip makes the arrows feel broken.
    setBoard({ ...board, blocks: ids.map((id) => board.blocks.find((b) => b.id === id)!) });
    await fetch(`/api/boards/${boardId}/blocks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: ids }),
    });
  }

  async function removeBoard() {
    await fetch(`/api/boards/${boardId}`, { method: "DELETE" });
    router.push("/dashboard/boards");
  }

  if (pending) {
    return (
      <div className="app-card">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
          <AlertTriangle className="h-3.5 w-3.5 text-amber" />
          {t.screens.boards.pendingTitle}
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
          {t.screens.boards.pendingBody}
        </p>
        <pre className="mt-2.5 rounded-sm bg-surface-sunken p-3 font-mono text-[12px]">
          supabase/boards.sql
        </pre>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-light" />
      </div>
    );
  }

  if (!board) {
    return <p className="text-[13px] text-muted">{t.screens.boards.notFound}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[19px] font-semibold">{board.name}</h1>
          {board.description && (
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted">
              {board.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => setEditing((v) => !v)}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors ${
              editing
                ? "border-primary bg-primary-pale text-primary"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            {editing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
            {editing ? t.screens.boards.done : t.screens.boards.edit}
          </button>
          {editing && (
            <button
              onClick={removeBoard}
              className="rounded-md border border-border p-1.5 text-muted-light transition-colors hover:border-coral/40 hover:text-coral"
              title={t.screens.boards.deleteBoard}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <FilterBar>
        <SegmentedFilter
          value={period}
          options={periodOptions}
          onChange={setPeriod}
          ariaLabel={t.filters.period}
        />
      </FilterBar>

      {board.blocks.length === 0 ? (
        <div className="app-card py-14 text-center">
          <BarChart3 className="mx-auto h-6 w-6 text-muted-light" />
          <p className="mt-3 text-[13px] font-medium">{t.screens.boards.emptyTitle}</p>
          <p className="mx-auto mt-1.5 max-w-md text-[12px] text-muted">
            {t.screens.boards.emptyBody}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {board.blocks.map((b, i) => (
            <div
              key={b.id}
              className={b.width === "full" ? "md:col-span-2" : "md:col-span-1"}
            >
              <BlockCard
                block={b}
                siteId={board.site_id}
                period={period}
                editing={editing}
                first={i === 0}
                last={i === board.blocks.length - 1}
                onUpdate={(patch) => updateBlock(b.id, patch)}
                onRemove={() => removeBlock(b.id)}
                onMove={(d) => move(b.id, d)}
              />
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="flex flex-wrap gap-2">
          <AddButton icon={Heading1} label={t.screens.boards.addHeading} onClick={() => addBlock("heading")} />
          <AddButton icon={Type} label={t.screens.boards.addText} onClick={() => addBlock("text")} />
          <AddButton icon={BarChart3} label={t.screens.boards.addTile} onClick={() => addBlock("insight")} />
        </div>
      )}
    </div>
  );
}

function AddButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-[12.5px] text-muted transition-colors hover:border-primary/40 hover:text-foreground"
    >
      <Icon className="h-3.5 w-3.5" />
      <Plus className="h-3 w-3" />
      {label}
    </button>
  );
}

/* ── One block ── */
function BlockCard({
  block,
  siteId,
  period,
  editing,
  first,
  last,
  onUpdate,
  onRemove,
  onMove,
}: {
  block: Block;
  siteId: string;
  period: string;
  editing: boolean;
  first: boolean;
  last: boolean;
  onUpdate: (patch: Record<string, unknown>) => void;
  onRemove: () => void;
  onMove: (d: -1 | 1) => void;
}) {
  const { t } = useT();
  const text = String(block.config.text ?? "");

  const controls = editing && (
    <div className="flex shrink-0 items-center gap-0.5">
      <button
        onClick={() => onUpdate({ width: block.width === "full" ? "half" : "full" })}
        title={block.width === "full" ? t.screens.boards.half : t.screens.boards.full}
        className="rounded p-1 text-muted-light transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        {block.width === "full" ? (
          <Minimize2 className="h-3.5 w-3.5" />
        ) : (
          <Maximize2 className="h-3.5 w-3.5" />
        )}
      </button>
      <button
        onClick={() => onMove(-1)}
        disabled={first}
        className="rounded p-1 text-muted-light transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-30"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => onMove(1)}
        disabled={last}
        className="rounded p-1 text-muted-light transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-30"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onRemove}
        className="rounded p-1 text-muted-light transition-colors hover:bg-surface-hover hover:text-coral"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  if (block.kind === "heading" || block.kind === "text") {
    return (
      <div className={editing ? "app-card" : "px-1 py-1"}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {editing ? (
              // Uncontrolled, keyed on the saved value: the field only
              // needs to hold what is being typed, and mirroring that
              // into state would mean an effect syncing the two back
              // whenever a save lands.
              <textarea
                key={text}
                defaultValue={text}
                onBlur={(e) =>
                  e.target.value !== text && onUpdate({ config: { text: e.target.value } })
                }
                rows={block.kind === "heading" ? 1 : 3}
                placeholder={
                  block.kind === "heading"
                    ? t.screens.boards.headingPlaceholder
                    : t.screens.boards.textPlaceholder
                }
                className="w-full resize-none rounded-sm border border-border bg-surface px-2 py-1.5 text-[13px] outline-none focus:border-primary"
              />
            ) : block.kind === "heading" ? (
              <h2 className="text-[15px] font-semibold">{text}</h2>
            ) : (
              <p className="max-w-3xl whitespace-pre-wrap text-[13px] leading-relaxed text-muted">
                {text}
              </p>
            )}
          </div>
          {controls}
        </div>
      </div>
    );
  }

  return (
    <div className="app-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium">
            {String(block.config.title ?? t.screens.boards.newTile)}
          </p>
          <p className="mt-0.5 truncate text-[11.5px] text-muted-light">
            {describe(block.config, t)}
          </p>
        </div>
        {controls}
      </div>
      <div className="mt-3">
        <InsightTile siteId={siteId} period={period} config={block.config} />
      </div>
    </div>
  );
}

/** The one-line summary under a tile's title: what it is actually asking. */
function describe(config: Record<string, unknown>, t: ReturnType<typeof useT>["t"]): string {
  const measure = String(config.measure ?? "pageviews");
  const labels: Record<string, string> = {
    pageviews: t.screens.insights.mPageviews,
    sessions: t.screens.insights.mSessions,
    visitors: t.screens.insights.mVisitors,
    events: t.screens.insights.mEvents,
    event_visitors: t.screens.insights.mEventVisitors,
  };
  const parts = [labels[measure] ?? measure];
  if (config.event_name) parts.push(String(config.event_name));
  if (config.breakdown) {
    const b = String(config.breakdown);
    parts.push(
      `${t.screens.insights.splitBy.toLowerCase()} ${
        b.startsWith("prop:") ? b.slice(5) : t.screens.insights.fields[b] ?? b
      }`
    );
  }
  const filters = (config.filters as { field: string; value: string }[] | undefined) ?? [];
  for (const f of filters) parts.push(`${f.field.replace(/^prop:/, "")} = ${f.value}`);
  return parts.join(" · ");
}

/* ── A tile's data ── */
function InsightTile({
  siteId,
  period,
  config,
}: {
  siteId: string;
  period: string;
  config: Record<string, unknown>;
}) {
  const { t, intl } = useT();
  const [rows, setRows] = useState<{ bucket: string; group_key: string; value: number }[] | null>(
    null
  );

  const grain = config.grain ? String(config.grain) : null;
  const formula = config.formula ? String(config.formula) : null;
  const asPercent = config.as_percent !== false;

  /* Le ratio arrive de la route en pourcentage, pour que l'axe reste
     lisible ; l'affichage « par unité » le ramène à sa valeur brute. */
  const fmtValue = (v: number) =>
    formula === "ratio"
      ? asPercent
        ? `${v.toLocaleString(intl, { maximumFractionDigits: 1 })} %`
        : (v / 100).toLocaleString(intl, { maximumFractionDigits: 2 })
      : v.toLocaleString(intl);

  const [periodTotals, setPeriodTotals] = useState<
    { group_key: string; value: number | null }[] | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = new URLSearchParams({
        site_id: siteId,
        period,
        measure: String(config.measure ?? "pageviews"),
      });
      if (config.event_name) p.set("event_name", String(config.event_name));
      if (config.breakdown) p.set("breakdown", String(config.breakdown));
      if (grain) p.set("grain", grain);
      const filters = config.filters as unknown[] | undefined;
      if (filters?.length) p.set("filters", JSON.stringify(filters));
      /* La formule fait partie de la question posée au moment de
         l'épinglage. L'omettre afficherait la mesure brute sous le titre
         du ratio, sans que rien ne le signale. */
      if (config.formula) {
        p.set("formula", String(config.formula));
        p.set("measure_b", String(config.measure_b ?? "visitors"));
        if (config.event_name_b) p.set("event_name_b", String(config.event_name_b));
      }

      const res = await fetch(`/api/insights?${p}`);
      const data = await res.json();
      if (!cancelled) {
        setRows(data.rows ?? []);
        setPeriodTotals(data.period_totals ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
    // config is a stable object from the loaded board; period is what moves.
  }, [siteId, period, config, grain]);

  const { buckets, series, totals } = useMemo(() => {
    const rs = rows ?? [];
    const bucketSet = [...new Set(rs.map((r) => r.bucket))].sort();
    const byGroup = new Map<string, Map<string, number>>();
    for (const r of rs) {
      const m = byGroup.get(r.group_key) ?? new Map();
      m.set(r.bucket, Number(r.value));
      byGroup.set(r.group_key, m);
    }
    /* Même règle que l'écran Insights : la somme des ratios ne veut rien
       dire, et « visiteurs » ne s'additionne pas d'un seau à l'autre. Le
       total de la période, calculé sans granularité par la route, prime
       donc quand il existe. */
    const tot = [...byGroup.entries()]
      .map(([key, m]) => {
        const p = periodTotals?.find((x) => x.group_key === key);
        return {
          key,
          total:
            p !== undefined
              ? (p.value ?? 0)
              : [...m.values()].reduce((a, b) => a + b, 0),
        };
      })
      .sort((a, b) => b.total - a.total);
    return {
      buckets: bucketSet,
      series: tot.map(({ key }) => ({
        key,
        points: bucketSet.map((b) => byGroup.get(key)?.get(b) ?? 0),
      })),
      totals: tot,
    };
  }, [rows, periodTotals]);

  if (rows === null) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-4 w-4 animate-spin text-muted-light" />
      </div>
    );
  }
  if (rows.length === 0) {
    return <p className="py-10 text-center text-[12px] text-muted-light">{t.screens.boards.tileEmpty}</p>;
  }

  const label = (k: string) => (config.breakdown ? k : String(config.title ?? k));

  return grain ? (
    <Lines
      buckets={buckets}
      series={series.map((s) => ({ ...s, key: label(s.key) }))}
      grain={grain}
      intl={intl}
    />
  ) : (
    <Ranking
      totals={totals.map((x) => ({ ...x, key: label(x.key) }))}
      intl={intl}
      format={formula ? fmtValue : undefined}
    />
  );
}
