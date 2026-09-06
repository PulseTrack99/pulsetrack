"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

/**
 * The filter controls, in one place.
 *
 * Every screen had rewritten the same segmented button group by hand —
 * six copies of the same twelve lines, already drifting apart (the
 * Accueil's was a filled variant, the others pale). Worse, the two long
 * lists in the app, the page pickers on Flows and Heatmaps, were plain
 * <select> elements: on a site with two hundred URLs that is a scroll
 * through two hundred options with no way to search.
 *
 * So: one segmented control, one dropdown that grows a search box when
 * the list is long enough to need one, one toggle, one removable chip.
 */

/** Closes a popover on any click outside it. */
export function useOutsideClose(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  return ref;
}

/** The row every screen puts its filters in. */
export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="app-toolbar">{children}</div>;
}

export interface SegmentOption<T> {
  value: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Shown after the label, e.g. how many sessions match. */
  count?: number;
}

/** Period, device — any short, mutually exclusive set. */
export function SegmentedFilter<T extends string | null>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex gap-0.5 rounded-sm border border-border bg-surface p-0.5"
    >
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={String(o.value)}
            onClick={() => onChange(o.value)}
            className={`flex items-center gap-1.5 rounded-xs px-2.5 py-1.5 text-[12px] transition-colors ${
              selected
                ? "bg-primary-pale text-primary"
                : "text-muted hover:text-foreground"
            }`}
          >
            {o.icon && <o.icon className="h-3.5 w-3.5" />}
            {o.label}
            {o.count !== undefined && (
              <span className="text-[10.5px] text-muted-light">{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  /** Secondary text on the right of the row — a count, a domain. */
  hint?: string;
}

/** Beyond this many options, the dropdown gets a search box. */
const SEARCH_THRESHOLD = 8;

/**
 * A dropdown that can actually be searched. Used for the page pickers,
 * where the option list is however many URLs the site has.
 */
export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = "Sélectionner…",
  emptyLabel = "Aucune option",
  searchPlaceholder = "Rechercher…",
  minWidth = 180,
}: {
  value: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  searchPlaceholder?: string;
  minWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useOutsideClose(() => setOpen(false));

  const selected = options.find((o) => o.value === value) ?? null;
  const withSearch = options.length > SEARCH_THRESHOLD;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q)
    );
  }, [options, query]);

  return (
    <div className="relative" ref={ref} style={{ minWidth }}>
      <button
        onClick={() => {
          setOpen((v) => !v);
          setQuery("");
        }}
        disabled={options.length === 0}
        className="flex w-full items-center gap-2 rounded-sm border border-border bg-surface px-2.5 py-1.5 text-[12px] outline-none transition-colors hover:border-border-strong disabled:opacity-50"
      >
        <span
          className={`min-w-0 flex-1 truncate text-left ${
            selected ? "" : "text-muted-light"
          }`}
        >
          {options.length === 0 ? emptyLabel : (selected?.label ?? placeholder)}
        </span>
        {selected?.hint && (
          <span className="shrink-0 text-[10.5px] text-muted-light">
            {selected.hint}
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-light" />
      </button>

      {open && options.length > 0 && (
        <div className="absolute left-0 z-40 mt-1 min-w-full overflow-hidden rounded-[var(--app-radius)] border border-border bg-surface shadow-lg">
          {withSearch && (
            <div className="flex items-center gap-1.5 border-b border-border px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-light" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-[12px] outline-none placeholder:text-muted-light"
              />
            </div>
          )}

          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-2.5 py-2 text-[12px] text-muted-light">
                Rien ne correspond à « {query} ».
              </p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-surface-hover"
                >
                  <span className="min-w-0 flex-1 truncate text-[12px]">
                    {o.label}
                  </span>
                  {o.hint && (
                    <span className="shrink-0 text-[10.5px] text-muted-light">
                      {o.hint}
                    </span>
                  )}
                  {o.value === value && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** An on/off filter, e.g. "rage clicks only". */
export function ToggleFilter({
  active,
  onToggle,
  children,
  icon: Icon,
  tone = "primary",
}: {
  active: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  /** Coral for filters that isolate a problem, primary otherwise. */
  tone?: "primary" | "coral";
}) {
  const on =
    tone === "coral"
      ? "border-coral/40 bg-coral-pale text-coral"
      : "border-primary/40 bg-primary-pale text-primary";

  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-[12px] transition-colors ${
        active ? on : "border-border text-muted hover:text-foreground"
      }`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

/** A filter that is on, shown so it can be seen and removed. */
export function ActiveFilterChip({
  label,
  value,
  onClear,
}: {
  label: string;
  value: string;
  onClear: () => void;
}) {
  return (
    <span className="flex items-center gap-1.5 rounded-sm border border-primary/30 bg-primary-pale px-2.5 py-1.5 text-[12px] text-primary">
      <span className="text-primary/70">{label} :</span>
      <span className="max-w-[220px] truncate">{value}</span>
      <button
        onClick={onClear}
        title={`Retirer le filtre ${label.toLowerCase()}`}
        className="shrink-0 transition-opacity hover:opacity-70"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

/** The periods every screen offers, so they can't drift apart. */
export const PERIOD_OPTIONS: SegmentOption<string>[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7j" },
  { value: "30d", label: "30j" },
  { value: "90d", label: "90j" },
];

/** Revenue syncs from Stripe and has no 24h window. */
export const PERIOD_OPTIONS_NO_DAY = PERIOD_OPTIONS.filter(
  (p) => p.value !== "24h"
);
