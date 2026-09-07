"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { UserCircle2, Loader2, X, CreditCard, Mail } from "lucide-react";
import { useSites } from "@/components/site-context";
import { useT } from "@/components/locale-context";
import { relativeTime } from "@/lib/relative-time";
import { useEventAliases } from "@/components/use-event-aliases";
import { FilterBar, SegmentedFilter, usePeriodOptionsNoDay } from "@/components/filters";

/**
 * The people who told you who they are.
 *
 * This is the durable half of identity, and it exists only because the
 * customer's own application called pulsetrack.identify(email). We add
 * no tracking to get it — which is why this screen can sit next to
 * Visiteurs, where ids deliberately last a single day, without either
 * one contradicting the other. The screen says so, because "Visitors"
 * and "Profiles" looking similar while meaning opposite things is how
 * somebody ends up trusting the wrong number.
 */

interface Profile {
  email: string;
  sessions: number;
  first_at: string;
  last_at: string;
  revenue: number;
  currency: string | null;
  payments: number;
}

interface Detail {
  email: string;
  identified_at: string | null;
  sessions: string[];
  events: {
    id: string;
    type: string;
    event_name: string | null;
    path: string | null;
    source: string | null;
    device: string | null;
    country: string | null;
    created_at: string;
  }[];
  revenue: {
    amount: number;
    currency: string;
    source: string | null;
    landing_page: string | null;
    stripe_created_at: string;
  }[];
}

export function ProfilesPanel() {
  const { siteId } = useSites();
  const { t } = useT();

  if (!siteId) {
    return (
      <div className="app-card flex flex-col items-center justify-center py-16 text-center">
        <UserCircle2 className="h-7 w-7 text-muted-light" />
        <h2 className="mt-3 text-[15px] font-semibold">{t.screens.common.noSiteTitle}</h2>
        <p className="mt-1 max-w-sm text-[13px] text-muted">{t.screens.profiles.noSiteBody}</p>
        <Link href="/dashboard/sites/new" className="btn btn-brand mt-4">
          {t.screens.common.addSite}
        </Link>
      </div>
    );
  }

  return <SiteProfiles key={siteId} siteId={siteId} />;
}

function money(cents: number, currency: string | null, intl: string): string {
  return new Intl.NumberFormat(intl, {
    style: "currency",
    currency: (currency ?? "eur").toUpperCase(),
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function SiteProfiles({ siteId }: { siteId: string }) {
  const { t, intl } = useT();
  const periodOptions = usePeriodOptionsNoDay();

  const [period, setPeriod] = useState("90d");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Detail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/profiles?site_id=${siteId}&period=${period}`);
    const data = await res.json();
    setProfiles(data.profiles ?? []);
    setTruncated(Boolean(data.truncated));
  }, [siteId, period]);

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

  async function openProfile(email: string) {
    setLoadingDetail(true);
    try {
      // POST, not a query string: an email in a URL ends up in logs and
      // browser history.
      const res = await fetch("/api/profiles/detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId, email }),
      });
      const data = await res.json();
      setOpen(data.profile ?? null);
    } finally {
      setLoadingDetail(false);
    }
  }

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
        <p className="text-[12px] text-muted-light">{t.screens.profiles.truncated}</p>
      )}

      <div className="app-card overflow-hidden p-0">
        {loading ? (
          <div className="flex justify-center py-14">
            <Loader2 className="h-5 w-5 animate-spin text-muted-light" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="p-10 text-center">
            <UserCircle2 className="mx-auto h-6 w-6 text-muted-light" />
            <p className="mt-3 text-[13px] font-medium">{t.screens.profiles.emptyTitle}</p>
            <p className="mx-auto mt-1.5 max-w-md text-[12px] leading-relaxed text-muted">
              {t.screens.profiles.emptyBody}
            </p>
            <pre className="mx-auto mt-3 w-fit rounded-sm bg-surface-sunken px-3 py-2 font-mono text-[11.5px]">
              pulsetrack.identify(&quot;client@exemple.com&quot;)
            </pre>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-light">
                  <th className="px-3 py-2 font-medium">{t.screens.profiles.colPerson}</th>
                  <th className="px-3 py-2 font-medium">{t.screens.profiles.colSeen}</th>
                  <th className="px-3 py-2 font-medium">{t.screens.profiles.colSessions}</th>
                  <th className="px-3 py-2 font-medium">{t.screens.profiles.colRevenue}</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr
                    key={p.email}
                    onClick={() => openProfile(p.email)}
                    className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-surface-hover"
                  >
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Mail className="h-3 w-3 shrink-0 text-primary" />
                        {p.email}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-light">
                      {relativeTime(p.last_at, intl)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted">
                      {p.sessions}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {p.payments > 0 ? (
                        <span className="font-medium text-emerald-600">
                          {money(p.revenue, p.currency, intl)}
                        </span>
                      ) : (
                        <span className="text-muted-light">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Why this screen is not the Visitors screen with names on it. */}
      <div className="app-card">
        <p className="text-[13px] font-semibold">{t.screens.profiles.whyTitle}</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
          {t.screens.profiles.whyBody}
        </p>
      </div>

      {(open || loadingDetail) && (
        <ProfileDrawer
          siteId={siteId}
          detail={open}
          loading={loadingDetail}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

/* ── One person, opened ── */
function ProfileDrawer({
  siteId,
  detail,
  loading,
  onClose,
}: {
  siteId: string;
  detail: Detail | null;
  loading: boolean;
  onClose: () => void;
}) {
  const { t, intl } = useT();
  const label = useEventAliases(siteId);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col border-l border-border bg-background"
      >
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
          <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
            {detail?.email ?? ""}
          </span>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-muted-light transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading || !detail ? (
            <div className="flex justify-center py-14">
              <Loader2 className="h-5 w-5 animate-spin text-muted-light" />
            </div>
          ) : (
            <div className="space-y-4">
              {detail.revenue.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-light">
                    {t.screens.profiles.payments}
                  </p>
                  {detail.revenue.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-baseline justify-between gap-2 rounded-sm bg-surface-sunken px-2 py-1.5 text-[12px]"
                    >
                      <span className="flex items-center gap-1.5">
                        <CreditCard className="h-3 w-3 text-emerald-600" />
                        <span className="font-medium">
                          {money(r.amount, r.currency, intl)}
                        </span>
                        {r.source && <span className="text-muted-light">{r.source}</span>}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-light">
                        {relativeTime(r.stripe_created_at, intl)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-light">
                  {t.screens.profiles.timeline}
                </p>
                {detail.events.length === 0 ? (
                  <p className="text-[12px] text-muted-light">
                    {t.screens.profiles.timelineEmpty}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {detail.events.map((e) => (
                      <div key={e.id} className="flex items-baseline gap-2 text-[12px]">
                        <span className="w-24 shrink-0 text-muted-light">
                          {relativeTime(e.created_at, intl)}
                        </span>
                        <span
                          className={
                            e.event_name ? "font-medium text-foreground" : "text-muted"
                          }
                        >
                          {e.event_name
                            ? label(e.event_name)
                            : e.type === "pageview"
                              ? t.screens.events.pageview
                              : e.type === "leave"
                                ? t.screens.events.leave
                                : e.type}
                        </span>
                        {e.path && (
                          <span className="truncate text-muted-light">{e.path}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
