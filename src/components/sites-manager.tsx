"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Globe, Plus, Loader2, Radio, Check, Trash2 } from "lucide-react";
import { useSites, type Site } from "@/components/site-context";
import { SetupGuide } from "@/components/setup-guide";

interface Status {
  id: string;
  last_event_at: string | null;
  events_30d: number;
}

function relative(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
  return `il y a ${Math.round(s / 86400)} j`;
}

/**
 * "Gérer mes sites", the second entry of the rail's site switcher —
 * Mixpanel puts project management one click from the project picker.
 *
 * The column that earns its place is the install status: a site that
 * has never sent an event looks exactly like a quiet one everywhere
 * else in the app, and that is precisely when someone needs to be told
 * the script isn't reporting.
 */
export function SitesManager({ origin }: { origin: string }) {
  const { sites, siteId, setSiteId, ready } = useSites();
  const [statuses, setStatuses] = useState<Record<string, Status> | null>(null);
  const [openGuide, setOpenGuide] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/sites/status")
      .then((r) => (r.ok ? r.json() : { sites: [] }))
      .then((d) => {
        if (cancelled) return;
        const byId: Record<string, Status> = {};
        for (const s of d.sites ?? []) byId[s.id] = s;
        setStatuses(byId);
      })
      .catch(() => !cancelled && setStatuses({}));
    return () => {
      cancelled = true;
    };
  }, [sites]);

  async function remove(site: Site) {
    const confirmed = window.confirm(
      `Supprimer « ${site.name} » ?\n\nToutes ses statistiques, sessions et funnels seront définitivement effacés. Cette action est irréversible.`
    );
    if (!confirmed) return;
    setDeleting(site.id);
    try {
      const res = await fetch(`/api/sites/${site.id}`, { method: "DELETE" });
      if (res.ok) window.location.reload();
      else setDeleting(null);
    } catch {
      setDeleting(null);
    }
  }

  if (!ready) return null;

  return (
    <div className="space-y-4">
      <div className="app-toolbar justify-between">
        <p className="text-[13px] text-muted">
          Les sites que PulseTrack suit pour vous, et l&apos;état de leur script.
        </p>
        <Link
          href="/dashboard/sites/new"
          className="flex items-center gap-1.5 rounded-[var(--app-radius-sm)] bg-primary px-2.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter un site
        </Link>
      </div>

      {sites.length === 0 ? (
        <div className="app-card flex flex-col items-center justify-center py-16 text-center">
          <Globe className="h-7 w-7 text-muted-light" />
          <h2 className="mt-3 text-[15px] font-semibold">Aucun site pour l&apos;instant</h2>
          <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted">
            Déclarez un domaine, collez une ligne de script, et PulseTrack vous
            dit lui-même quand les premières données arrivent.
          </p>
          <Link
            href="/dashboard/sites/new"
            className="mt-4 rounded-[var(--app-radius-sm)] bg-primary px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
          >
            Ajouter mon premier site
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[var(--app-radius)] border border-border bg-surface">
          {sites.map((site, i) => {
            const status = statuses?.[site.id];
            const live = Boolean(status?.last_event_at);
            const current = site.id === siteId;

            return (
              <div
                key={site.id}
                className={`flex flex-wrap items-center gap-3 px-4 py-3 ${
                  i > 0 ? "border-t border-border" : ""
                }`}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary/10 text-[12px] font-semibold text-primary">
                  {site.name.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[13px] font-medium">
                    <span className="truncate">{site.name}</span>
                    {current && (
                      <span className="shrink-0 rounded-xs bg-primary-pale px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        Affiché
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[12px] text-muted-light">{site.domain}</p>
                </div>

                {/* Install status — the reason this page exists. */}
                <div className="w-44 shrink-0">
                  {statuses === null ? (
                    <span className="flex items-center gap-1.5 text-[12px] text-muted-light">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Vérification…
                    </span>
                  ) : live ? (
                    <>
                      <span className="flex items-center gap-1.5 text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3.5 w-3.5" />
                        Données reçues
                      </span>
                      <span className="text-[11px] text-muted-light">
                        Dernière visite {relative(status!.last_event_at!)} ·{" "}
                        {status!.events_30d.toLocaleString("fr-FR")} évt
                        {status!.events_30d > 1 ? "s" : ""} / 30 j
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="flex items-center gap-1.5 text-[12px] font-medium text-amber-600 dark:text-amber-400">
                        <Radio className="h-3.5 w-3.5" />
                        En attente de données
                      </span>
                      <span className="text-[11px] text-muted-light">
                        Le script n&apos;a encore rien envoyé.
                      </span>
                    </>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {!current && (
                    <button
                      onClick={() => setSiteId(site.id)}
                      className="rounded-[var(--app-radius-sm)] border border-border px-2.5 py-1.5 text-[12px] font-medium transition-colors hover:bg-surface-hover"
                    >
                      Afficher
                    </button>
                  )}
                  <button
                    onClick={() =>
                      setOpenGuide(openGuide === site.id ? null : site.id)
                    }
                    className="rounded-[var(--app-radius-sm)] border border-border px-2.5 py-1.5 text-[12px] font-medium transition-colors hover:bg-surface-hover"
                  >
                    {openGuide === site.id ? "Masquer" : "Installation"}
                  </button>
                  <button
                    onClick={() => remove(site)}
                    disabled={deleting === site.id}
                    title="Supprimer ce site et toutes ses données"
                    className="rounded-[var(--app-radius-sm)] border border-border px-2 py-1.5 text-muted-light transition-colors hover:border-red-300 hover:text-red-500 disabled:opacity-50"
                  >
                    {deleting === site.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {openGuide === site.id && (
                  <div className="w-full pt-2">
                    <SetupGuide
                      siteId={site.id}
                      domain={site.domain}
                      origin={origin}
                      // Otherwise the guide would announce "données
                      // reçues" while the row right above it still
                      // said "en attente".
                      onDataReceived={(at) =>
                        setStatuses((cur) => ({
                          ...(cur ?? {}),
                          [site.id]: {
                            id: site.id,
                            last_event_at: at,
                            events_30d: Math.max(
                              1,
                              cur?.[site.id]?.events_30d ?? 0
                            ),
                          },
                        }))
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
