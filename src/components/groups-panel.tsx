"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useSites } from "@/components/site-context";
import { useT } from "@/components/locale-context";
import { FilterBar, SegmentedFilter } from "@/components/filters";
import { relativeTime } from "@/lib/relative-time";

/**
 * Les comptes — « quel client décroche », pas « quelle personne ».
 *
 * Tout le reste du produit raisonne par personne. Une entreprise qui
 * vend à d'autres entreprises ne se demande pas si Marie s'est
 * connectée : elle se demande si Acme est en train de partir. Trois
 * personnes actives chez un client qui en emploie quarante, c'est un
 * compte perdu, et aucun écran ne pouvait le dire.
 *
 * L'appartenance vient du client, qui appelle pulsetrack.group().
 * Rien n'est déduit d'un domaine d'e-mail — deux clients peuvent
 * partager gmail.com — et l'écran le dit plutôt que de laisser croire
 * à une magie qui n'existe pas.
 */

interface Group {
  group_id: string;
  group_name: string;
  people: number;
  sessions: number;
  events: number;
  pageviews: number;
  first_seen: string | null;
  last_seen: string | null;
  revenue_cents: number;
}

interface Member {
  email: string;
  sessions: number;
  events: number;
  last_seen: string | null;
}

export function GroupsPanel() {
  const { siteId } = useSites();
  const { t } = useT();

  if (!siteId) {
    return (
      <div className="app-card flex flex-col items-center justify-center py-16 text-center">
        <Building2 className="h-7 w-7 text-muted-light" />
        <h2 className="mt-3 text-[15px] font-semibold">{t.screens.common.noSiteTitle}</h2>
        <p className="mt-1 max-w-sm text-[13px] text-muted">{t.screens.groups.noSiteBody}</p>
        <Link href="/dashboard/sites/new" className="btn btn-brand mt-4">
          {t.screens.common.addSite}
        </Link>
      </div>
    );
  }

  // Changer de site invalide la liste, le compte ouvert et la
  // recherche : les remonter d'un coup vaut mieux que les remettre à
  // zéro un par un dans un effet.
  return <SiteGroups key={siteId} siteId={siteId} />;
}

function SiteGroups({ siteId }: { siteId: string }) {
  const { t, intl } = useT();

  const [period, setPeriod] = useState("30d");
  const [groups, setGroups] = useState<Group[]>([]);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [open, setOpen] = useState<Group | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/groups?site_id=${siteId}&period=${period}`);
    const data = await res.json();
    setGroups(data.groups ?? []);
    setPending(Boolean(data.migration_pending));
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

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.group_name.toLowerCase().includes(q) ||
        g.group_id.toLowerCase().includes(q)
    );
  }, [groups, query]);

  const money = (cents: number) =>
    new Intl.NumberFormat(intl, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(cents / 100);

  const periodOptions = [
    { value: "7d", label: "7j" },
    { value: "30d", label: "30j" },
    { value: "90d", label: "90j" },
    { value: "365d", label: "12m" },
  ];

  if (pending) {
    return (
      <div className="app-card">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
          <AlertTriangle className="h-3.5 w-3.5 text-amber" />
          {t.screens.groups.pendingTitle}
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
          {t.screens.groups.pendingBody}
        </p>
        <pre className="mt-2.5 rounded-sm bg-surface-sunken p-3 font-mono text-[12px]">
          supabase/groups.sql
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FilterBar>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.screens.groups.search}
          className="w-52 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12.5px] outline-none focus:border-primary"
        />
        <SegmentedFilter
          value={period}
          options={periodOptions}
          onChange={setPeriod}
          ariaLabel={t.filters.period}
        />
      </FilterBar>

      <div className="app-card overflow-hidden p-0">
        {loading ? (
          <div className="flex justify-center py-14">
            <Loader2 className="h-5 w-5 animate-spin text-muted-light" />
          </div>
        ) : shown.length === 0 ? (
          <div className="p-10 text-center">
            <Building2 className="mx-auto h-6 w-6 text-muted-light" />
            <p className="mt-3 text-[13px] font-medium">
              {t.screens.groups.emptyTitle}
            </p>
            <p className="mx-auto mt-1.5 max-w-md text-[12px] leading-relaxed text-muted">
              {t.screens.groups.emptyBody}
            </p>
            <pre className="mx-auto mt-3 w-fit rounded-sm bg-surface-sunken px-3 py-2 font-mono text-[11.5px]">
              pulsetrack.group(&quot;acme-42&quot;, &quot;Acme Corp&quot;)
            </pre>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-light">
                  <th className="px-3 py-2 text-left font-medium">
                    {t.screens.groups.colAccount}
                  </th>
                  <th className="px-2 py-2 text-right font-medium">
                    {t.screens.groups.colPeople}
                  </th>
                  <th className="px-2 py-2 text-right font-medium">
                    {t.screens.groups.colSessions}
                  </th>
                  <th className="px-2 py-2 text-right font-medium">
                    {t.screens.groups.colEvents}
                  </th>
                  <th className="px-2 py-2 text-right font-medium">
                    {t.screens.groups.colRevenue}
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    {t.screens.groups.colLastSeen}
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((g) => (
                  <tr
                    key={g.group_id}
                    onClick={() => setOpen(g)}
                    className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-surface-hover"
                  >
                    <td className="px-3 py-2">
                      <span className="font-medium">{g.group_name}</span>
                      {/* L'identifiant n'est montré que s'il diffère du
                          nom : le répéter deux fois n'apprend rien. */}
                      {g.group_name !== g.group_id && (
                        <span className="ml-1.5 font-mono text-[11px] text-muted-light">
                          {g.group_id}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {g.people.toLocaleString(intl)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-muted">
                      {g.sessions.toLocaleString(intl)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-muted">
                      {g.events.toLocaleString(intl)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {g.revenue_cents > 0 ? money(g.revenue_cents) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-muted">
                      {g.last_seen ? relativeTime(g.last_seen, intl) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Qui compose le compte — le pas suivant quand l'un d'eux
          inquiète. Monté sur la clé du compte : passer d'Acme à Globex
          remonte le panneau à neuf, plutôt que de remettre ses membres
          à zéro dans un effet. */}
      {open && (
        <GroupMembers
          key={open.group_id}
          siteId={siteId}
          period={period}
          group={open}
          onClose={() => setOpen(null)}
        />
      )}

      {/* D'où vient l'appartenance, et d'où elle ne vient pas. */}
      <div className="app-card">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          {t.screens.groups.whoTitle}
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
          {t.screens.groups.whoBody}
        </p>
        <pre className="mt-2.5 w-fit rounded-sm bg-surface-sunken px-3 py-2 font-mono text-[11.5px]">
          pulsetrack.group(&quot;acme-42&quot;, &quot;Acme Corp&quot;)
        </pre>
      </div>
    </div>
  );
}

/** Les membres ne sont demandés qu'à l'ouverture d'un compte : les
 *  charger pour tous ferait une requête par ligne, pour un panneau que
 *  personne n'ouvre la plupart du temps. */
function GroupMembers({
  siteId,
  period,
  group,
  onClose,
}: {
  siteId: string;
  period: string;
  group: Group;
  onClose: () => void;
}) {
  const { t, intl } = useT();
  const [members, setMembers] = useState<Member[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(
        `/api/groups?site_id=${siteId}&period=${period}&group=${encodeURIComponent(group.group_id)}`
      );
      const data = await res.json();
      if (!cancelled) setMembers(data.members ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [siteId, period, group.group_id]);

  return (
        <div className="app-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold">
              <Users className="h-3.5 w-3.5 text-primary" />
              {t.screens.groups.membersOf} {group.group_name}
            </p>
            <button
              onClick={onClose}
              className="flex items-center gap-1 rounded-sm px-2 py-1 text-[12px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              {t.screens.groups.close}
            </button>
          </div>

          {members === null ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-light" />
            </div>
          ) : members.length === 0 ? (
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              {t.screens.groups.noMembers}
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-light">
                    <th className="px-2 py-1.5 text-left font-medium">
                      {t.screens.groups.colMember}
                    </th>
                    <th className="px-2 py-1.5 text-right font-medium">
                      {t.screens.groups.colSessions}
                    </th>
                    <th className="px-2 py-1.5 text-right font-medium">
                      {t.screens.groups.colEvents}
                    </th>
                    <th className="px-2 py-1.5 text-right font-medium">
                      {t.screens.groups.colLastSeen}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.email} className="border-b border-border/60 last:border-0">
                      <td className="px-2 py-1.5">{m.email}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-muted">
                        {m.sessions.toLocaleString(intl)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-muted">
                        {m.events.toLocaleString(intl)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right text-muted">
                        {m.last_seen ? relativeTime(m.last_seen, intl) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
  );
}
