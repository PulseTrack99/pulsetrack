"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, ChevronRight, Loader2, ShieldCheck, Mail } from "lucide-react";
import { useSites } from "@/components/site-context";
import { useT } from "@/components/locale-context";
import { relativeTime } from "@/lib/relative-time";
import { FilterBar, SegmentedFilter, usePeriodOptions } from "@/components/filters";

/**
 * Visitors — with the honesty the identifier demands.
 *
 * src/lib/visitor.ts derives the id from a salt that is destroyed every
 * UTC day, so a visitor here is a person *within one day*, never a
 * durable profile. Every other analytics product's "Users" screen
 * promises the opposite, which is exactly why this one explains itself
 * on the page instead of letting someone assume they are looking at
 * something they are not.
 *
 * The default period is 24h for the same reason: it is the window where
 * the row means what it appears to mean.
 */

interface Visitor {
  visitor_id: string;
  sessions: number;
  pageviews: number;
  events: number;
  pages: number;
  first_at: string;
  last_at: string;
  device: string | null;
  browser: string | null;
  country: string | null;
  source: string | null;
  email: string | null;
}

interface TimelineRow {
  id: string;
  type: string;
  event_name: string | null;
  path: string | null;
  created_at: string;
}

export function VisitorsPanel() {
  const { siteId } = useSites();
  const { t } = useT();

  if (!siteId) {
    return (
      <div className="app-card flex flex-col items-center justify-center py-16 text-center">
        <Users className="h-7 w-7 text-muted-light" />
        <h2 className="mt-3 text-[15px] font-semibold">{t.screens.common.noSiteTitle}</h2>
        <p className="mt-1 max-w-sm text-[13px] text-muted">{t.screens.visitors.noSiteBody}</p>
        <Link href="/dashboard/sites/new" className="btn btn-brand mt-4">
          {t.screens.common.addSite}
        </Link>
      </div>
    );
  }

  return <SiteVisitors key={siteId} siteId={siteId} />;
}

function SiteVisitors({ siteId }: { siteId: string }) {
  const { t, intl } = useT();
  const periodOptions = usePeriodOptions();

  const [period, setPeriod] = useState("24h");
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/visitors?site_id=${siteId}&period=${period}`);
        const data = await res.json();
        if (cancelled) return;
        setVisitors(data.visitors ?? []);
        setTruncated(Boolean(data.truncated));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [siteId, period]);

  return (
    <div className="space-y-4">
      <FilterBar>
        <SegmentedFilter
          value={period}
          options={periodOptions}
          onChange={setPeriod}
          ariaLabel={t.filters.period}
        />
      </FilterBar>

      {truncated && (
        <p className="text-[12px] text-muted-light">{t.screens.visitors.truncated}</p>
      )}

      <div className="app-card overflow-hidden p-0">
        {loading ? (
          <div className="flex justify-center py-14">
            <Loader2 className="h-5 w-5 animate-spin text-muted-light" />
          </div>
        ) : visitors.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="mx-auto h-6 w-6 text-muted-light" />
            <p className="mt-3 text-[13px] font-medium">{t.screens.visitors.emptyTitle}</p>
            <p className="mx-auto mt-1.5 max-w-sm text-[12px] text-muted">
              {t.screens.visitors.emptyBody}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-light">
                  <th className="px-3 py-2 font-medium">{t.screens.visitors.colVisitor}</th>
                  <th className="px-3 py-2 font-medium">{t.screens.visitors.colSeen}</th>
                  <th className="px-3 py-2 font-medium">{t.screens.visitors.colActivity}</th>
                  <th className="px-3 py-2 font-medium">{t.screens.visitors.colSource}</th>
                  <th className="px-3 py-2 font-medium">{t.screens.visitors.colContext}</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((v) => {
                  const open = openId === v.visitor_id;
                  return (
                    <tr
                      key={v.visitor_id}
                      onClick={() => setOpenId(open ? null : v.visitor_id)}
                      className="cursor-pointer border-b border-border/60 align-top last:border-0 hover:bg-surface-hover"
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <ChevronRight
                            className={`h-3 w-3 shrink-0 text-muted-light transition-transform ${
                              open ? "rotate-90" : ""
                            }`}
                          />
                          {v.email ? (
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              <Mail className="h-3 w-3 text-primary" />
                              {v.email}
                            </span>
                          ) : (
                            <span className="font-mono text-[11px] text-muted">
                              {v.visitor_id.slice(0, 10)}
                            </span>
                          )}
                        </div>
                        {open && <Timeline siteId={siteId} visitorId={v.visitor_id} period={period} />}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted-light">
                        {relativeTime(v.last_at, intl)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted">
                        {v.pageviews} {t.screens.visitors.pageviews}
                        {v.events > 0 && ` · ${v.events} ${t.screens.visitors.events}`}
                        {v.sessions > 1 && ` · ${v.sessions} ${t.screens.visitors.sessions}`}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted">
                        {v.source || "Direct"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted-light">
                        {[v.device, v.browser, v.country !== "Unknown" ? v.country : null]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Not a footnote. Someone reading this table will assume these
          rows are people they can follow, because that is what the word
          means everywhere else. */}
      <div className="app-card">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          {t.screens.visitors.rotationTitle}
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
          {t.screens.visitors.rotationBody}
        </p>
        <p className="mt-2 text-[11.5px] leading-relaxed text-muted-light">
          {t.screens.visitors.rotationLink}
        </p>
      </div>
    </div>
  );
}

/** One visitor's events, fetched only when their row is opened. */
function Timeline({
  siteId,
  visitorId,
  period,
}: {
  siteId: string;
  visitorId: string;
  period: string;
}) {
  const { t, intl } = useT();
  const [rows, setRows] = useState<TimelineRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(
        `/api/events/list?site_id=${siteId}&period=${period}&visitor=${visitorId}`
      );
      const data = await res.json();
      if (!cancelled) setRows(data.events ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [siteId, visitorId, period]);

  if (rows === null) {
    return <p className="mt-2 text-[11.5px] text-muted-light">{t.screens.visitors.loading}</p>;
  }
  if (rows.length === 0) {
    return (
      <p className="mt-2 text-[11.5px] text-muted-light">{t.screens.visitors.timelineEmpty}</p>
    );
  }

  return (
    <div className="mt-2 space-y-1 rounded-sm bg-surface-sunken p-2 text-[11.5px]">
      <p className="font-medium text-muted">{t.screens.visitors.timeline}</p>
      {rows.map((e) => (
        <div key={e.id} className="flex items-baseline gap-2">
          <span className="w-20 shrink-0 text-muted-light">
            {relativeTime(e.created_at, intl)}
          </span>
          <span className={e.event_name ? "font-medium text-foreground" : "text-muted"}>
            {e.event_name ??
              (e.type === "pageview"
                ? t.screens.events.pageview
                : e.type === "leave"
                  ? t.screens.events.leave
                  : e.type)}
          </span>
          {e.path && <span className="truncate text-muted-light">{e.path}</span>}
        </div>
      ))}
    </div>
  );
}
