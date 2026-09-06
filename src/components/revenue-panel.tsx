"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Target,
  RefreshCw,
  Link2,
  Unlink,
  Loader2,
  ArrowUpRight,
  BarChart3,
  Eye,
  EyeOff,
} from "lucide-react";
import { SegmentedFilter, PERIOD_OPTIONS_NO_DAY } from "@/components/filters";

interface RevenueStats {
  connected: boolean;
  last_synced_at?: string;
  overview?: {
    total_revenue: number;
    total_transactions: number;
    avg_order_value: number;
    attribution_rate: number;
    revenue_growth: number;
    currency: string;
  };
  revenue_by_source?: { source: string; revenue: number; count: number }[];
  revenue_by_page?: { page: string; revenue: number; count: number }[];
  revenue_chart?: { date: string; revenue: number }[];
  recent_transactions?: {
    amount: number;
    currency: string;
    email: string | null;
    source: string;
    landing_page: string | null;
    date: string;
  }[];
}

/** Amounts, always with both decimals: minimumFractionDigits alone let
 *  Intl drop a trailing zero, so the same screen showed "919,74 €" next
 *  to "102,3 €". */
function formatCurrency(cents: number, currency = "eur") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Axis labels, where whole euros read better than centimes. */
function formatAxis(cents: number, currency = "eur") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** Rounds an axis top up to 1, 2 or 5 x 10^n. */
function niceMax(value: number): number {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const scaled = value / magnitude;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return step * magnitude;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function RevenuePanel({ siteId }: { siteId: string }) {
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [stripeKey, setStripeKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [period, setPeriod] = useState("30d");
  const [error, setError] = useState("");
  const [hoverDay, setHoverDay] = useState<number | null>(null);

  // Callers remount this panel with key={siteId} (src/components/
  // revenue-screen.tsx), so a site change gives a fresh instance rather
  // than one carrying the previous site's revenue while its request is
  // still in flight. Only the period can change under a live request.
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/revenue/stats?site_id=${siteId}&period=${period}`
      );
      if (res.ok) setStats(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [siteId, period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  async function handleConnect() {
    if (!stripeKey.startsWith("rk_")) {
      setError(
        "Cette clé doit être une clé restreinte Stripe : elle commence par rk_ et n'a que l'accès en lecture aux charges et aux clients."
      );
      return;
    }

    setConnecting(true);
    setError("");
    try {
      const res = await fetch("/api/revenue/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId, stripe_key: stripeKey }),
      });

      if (res.ok) {
        setStripeKey("");
        // Auto-sync after connecting
        await handleSync();
        await fetchStats();
      } else {
        const data = await res.json();
        setError(data.error || "Erreur de connexion");
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Déconnecter Stripe ? Les données de revenus seront supprimées.")) return;

    try {
      await fetch("/api/revenue/connect", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId }),
      });
      setStats({ connected: false });
    } catch {
      // silent
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch("/api/revenue/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId }),
      });
      await fetchStats();
    } catch {
      // silent
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  // Not connected — the guided setup, on the same model as the tracking
  // script's: say what it does, number the steps, give the action.
  if (!stats?.connected) {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <p className="text-[13px] leading-relaxed text-muted">
          Reliez votre compte Stripe pour savoir combien chaque source de
          trafic vous rapporte réellement — pas seulement combien de visiteurs
          elle envoie. PulseTrack lit vos paiements en lecture seule et ne peut
          rien y modifier.
        </p>

        <div className="app-card space-y-3">
          <h3 className="text-[13.5px] font-semibold">Connecter Stripe</h3>

          <ol className="space-y-1.5 text-[12.5px] leading-relaxed text-muted">
            <li>
              <span className="font-medium text-foreground">1.</span> Ouvrez{" "}
              <a
                href="https://dashboard.stripe.com/apikeys"
                target="_blank"
                rel="noopener"
                className="text-primary hover:underline"
              >
                Stripe → Developers → API keys
              </a>
              .
            </li>
            <li>
              <span className="font-medium text-foreground">2.</span> Créez une{" "}
              <strong className="font-medium text-foreground">
                clé restreinte
              </strong>{" "}
              avec l&apos;accès <em>lecture seule</em> sur{" "}
              <strong className="font-medium text-foreground">Charges</strong>{" "}
              et{" "}
              <strong className="font-medium text-foreground">Customers</strong>
              , et rien d&apos;autre.
            </li>
            <li>
              <span className="font-medium text-foreground">3.</span> Collez-la
              ci-dessous — elle commence par{" "}
              <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[11.5px]">
                rk_
              </code>
              .
            </li>
          </ol>

          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={stripeKey}
              onChange={(e) => setStripeKey(e.target.value)}
              placeholder="rk_live_…"
              className="w-full rounded-[var(--app-radius-sm)] border border-border bg-surface px-3 py-2 pr-10 font-mono text-[12.5px] outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              title={showKey ? "Masquer la clé" : "Afficher la clé"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-light transition-colors hover:text-foreground"
            >
              {showKey ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {error && <p className="text-[12px] text-coral">{error}</p>}

          <button
            onClick={handleConnect}
            disabled={connecting || !stripeKey}
            className="flex w-full items-center justify-center gap-1.5 rounded-[var(--app-radius-sm)] bg-primary px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {connecting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Link2 className="h-3.5 w-3.5" />
            )}
            Connecter Stripe
          </button>
        </div>

        <div className="app-card space-y-2">
          <h3 className="text-[13.5px] font-semibold">
            Comment PulseTrack relie un paiement à une source
          </h3>
          <p className="text-[12.5px] leading-relaxed text-muted">
            Appelez{" "}
            <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[11.5px]">
              pulsetrack.identify(&quot;email@client.com&quot;)
            </code>{" "}
            sur votre site au moment de la connexion ou de la commande.
            PulseTrack rapproche cet e-mail des paiements Stripe, et sait donc
            de quelle source venait la visite qui a produit le revenu.
          </p>
          <p className="text-[12px] text-muted-light">
            Sans cet appel, les paiements remontent quand même : c&apos;est
            l&apos;attribution à une source qui manque.
          </p>
        </div>
      </div>
    );
  }

  // Connected — show revenue dashboard
  const o = stats.overview!;
  const currency = o.currency;

  // Chart
  const chartData = stats.revenue_chart || [];
  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 0);
  // Axis top rounded up to a readable figure, so the two gridline labels
  // are amounts someone would actually write down.
  const axisTop = niceMax(maxRevenue);
  // Four dates along the bottom: enough to place a spike in time.
  const tickEvery = Math.max(1, Math.floor((chartData.length - 1) / 3));

  return (
    <div className="space-y-3">
      {/* Same toolbar shape as every other screen. The page title lives
          in the breadcrumb, so there is no second one here. */}
      <div className="app-toolbar justify-between">
        <SegmentedFilter
          ariaLabel="Période"
          value={period}
          options={PERIOD_OPTIONS_NO_DAY}
          onChange={setPeriod}
        />

        {stats.last_synced_at && (
          <span className="text-[11.5px] text-muted-light">
            Dernière synchro{" "}
            {new Date(stats.last_synced_at).toLocaleString("fr-FR", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}

        <button
          onClick={handleSync}
          disabled={syncing}
          className="ml-auto flex items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Synchro…" : "Synchroniser"}
        </button>

        {/* Labelled: it deletes the revenue data, and an unlabelled icon
            is a poor warning for that. */}
        <button
          onClick={handleDisconnect}
          className="flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 text-[12px] font-medium text-muted-light transition-colors hover:border-coral/40 hover:text-coral"
        >
          <Unlink className="h-3.5 w-3.5" />
          Déconnecter
        </button>
      </div>

      {/* One accent, like the rest of the app. These cards used to be
          emerald, blue, violet and amber — four colours that encoded
          nothing, on a screen otherwise built in purple. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title="Revenu total"
          value={formatCurrency(o.total_revenue, currency)}
          icon={DollarSign}
          change={o.revenue_growth}
          hint="Somme des paiements Stripe encaissés sur la période."
        />
        <StatCard
          title="Transactions"
          value={o.total_transactions.toString()}
          icon={ShoppingCart}
          hint="Nombre de paiements réussis sur la période."
        />
        <StatCard
          title="Panier moyen"
          value={formatCurrency(o.avg_order_value, currency)}
          icon={BarChart3}
          hint="Revenu total divisé par le nombre de transactions."
        />
        <StatCard
          title="Taux d'attribution"
          value={`${o.attribution_rate}%`}
          icon={Target}
          hint="Part des paiements rattachés à une source de trafic, via pulsetrack.identify()."
        />
      </div>

      {/* Revenue chart. Was a bare bar row: no scale, no gridlines, no
          way to read a day's figure — the same gap the Accueil's chart
          had, fixed the same way. */}
      {chartData.length > 0 && (
        <div className="app-card">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[13.5px] font-semibold">Revenus par jour</h3>
            <p className="text-[11.5px] text-muted-light">
              pic à {formatCurrency(maxRevenue, currency)}
            </p>
          </div>

          <div className="flex gap-2">
            <div className="relative w-14 shrink-0" style={{ height: 148 }}>
              {[axisTop, axisTop / 2, 0].map((v, i) => (
                <span
                  key={i}
                  className="absolute right-0 -translate-y-1/2 text-[10px] tabular-nums text-muted-light"
                  style={{ top: `${(i / 2) * 100}%` }}
                >
                  {formatAxis(v, currency)}
                </span>
              ))}
            </div>

            <div className="min-w-0 flex-1">
              <div className="relative" style={{ height: 148 }}>
                {[0, 0.5, 1].map((f) => (
                  <div
                    key={f}
                    className="absolute inset-x-0 border-t border-border"
                    style={{ top: `${f * 100}%` }}
                  />
                ))}

                <div
                  className="absolute inset-0 flex items-end gap-[2px]"
                  onMouseLeave={() => setHoverDay(null)}
                >
                  {chartData.map((d, i) => (
                    <div
                      key={d.date}
                      onMouseEnter={() => setHoverDay(i)}
                      className="relative flex h-full flex-1 cursor-default items-end"
                    >
                      <div
                        className={`w-full rounded-t-[2px] transition-colors ${
                          hoverDay === i ? "bg-primary" : "bg-primary/55"
                        }`}
                        style={{
                          height: axisTop > 0 ? `${(d.revenue / axisTop) * 100}%` : "0%",
                          minHeight: d.revenue > 0 ? 2 : 0,
                        }}
                      />
                    </div>
                  ))}
                </div>

                {hoverDay !== null && (
                  <div
                    className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[var(--app-radius-sm)] border border-border bg-surface px-2 py-1 text-[11px] shadow-lg"
                    style={{ left: `${((hoverDay + 0.5) / chartData.length) * 100}%` }}
                  >
                    <span className="font-medium tabular-nums">
                      {formatCurrency(chartData[hoverDay].revenue, currency)}
                    </span>
                    <span className="text-muted-light">
                      {" "}
                      · {formatDate(chartData[hoverDay].date)}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-1 flex gap-[2px]">
                {chartData.map((d, i) => (
                  <div key={d.date} className="min-w-0 flex-1 text-center">
                    {i % tickEvery === 0 && (
                      <span className="whitespace-nowrap text-[10px] text-muted-light">
                        {formatDate(d.date)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue by source */}
        <div className="app-card">
          <h3 className="mb-3 text-[13.5px] font-semibold">Revenu par source</h3>
          {stats.revenue_by_source && stats.revenue_by_source.length > 0 ? (
            <div className="space-y-3">
              {stats.revenue_by_source.map((s) => {
                const pct =
                  o.total_revenue > 0
                    ? (s.revenue / o.total_revenue) * 100
                    : 0;
                return (
                  <div key={s.source} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{s.source}</span>
                      <span className="text-muted">
                        {formatCurrency(s.revenue, currency)}{" "}
                        <span className="text-xs">({s.count})</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-surface overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/60 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[13px] leading-relaxed text-muted">
              Aucun paiement rattaché à une source sur cette période. Dès
              qu&apos;un visiteur venu de Google ou d&apos;un réseau social
              paiera, le revenu qu&apos;il a rapporté apparaîtra ici.
            </p>
          )}
        </div>

        {/* Revenue by page */}
        <div className="app-card">
          <h3 className="mb-3 text-[13.5px] font-semibold">Revenu par page</h3>
          {stats.revenue_by_page && stats.revenue_by_page.length > 0 ? (
            <div className="space-y-3">
              {stats.revenue_by_page.map((p) => {
                const pct =
                  o.total_revenue > 0
                    ? (p.revenue / o.total_revenue) * 100
                    : 0;
                return (
                  <div key={p.page} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate max-w-[60%]">
                        {p.page}
                      </span>
                      <span className="text-muted">
                        {formatCurrency(p.revenue, currency)}{" "}
                        <span className="text-xs">({p.count})</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-surface overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/60 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[13px] leading-relaxed text-muted">
              Aucun revenu rattaché à une page. Appelez{" "}
              <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[11.5px]">
                pulsetrack.identify(email)
              </code>{" "}
              sur votre site pour relier un paiement à la page qui l&apos;a
              amené.
            </p>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      {stats.recent_transactions && stats.recent_transactions.length > 0 && (
        <div className="app-card">
          <h3 className="mb-3 text-[13.5px] font-semibold">
            Transactions récentes
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="pb-2 font-medium">Montant</th>
                  <th className="pb-2 font-medium">Client</th>
                  <th className="pb-2 font-medium">Source</th>
                  <th className="pb-2 font-medium">Page</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.recent_transactions.map((t, i) => (
                  <tr key={i}>
                    <td className="py-2.5 font-medium tabular-nums">
                      {formatCurrency(t.amount, t.currency)}
                    </td>
                    <td className="py-2.5 text-muted truncate max-w-[150px]">
                      {t.email || "—"}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          t.source === "Unattributed"
                            ? "bg-surface-sunken text-muted-light"
                            : "bg-primary-pale text-primary"
                        }`}
                      >
                        {t.source !== "Unattributed" && (
                          <ArrowUpRight className="h-3 w-3" />
                        )}
                        {t.source}
                      </span>
                    </td>
                    <td className="py-2.5 text-muted text-xs truncate max-w-[120px]">
                      {t.landing_page || "—"}
                    </td>
                    <td className="py-2.5 text-muted text-xs">
                      {new Date(t.date).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/** Same shape as the Accueil's cards, so the two screens read alike. */
function StatCard({
  title,
  value,
  icon: Icon,
  change,
  hint,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  change?: number;
  hint: string;
}) {
  return (
    <div className="app-card">
      <div className="flex items-center justify-between">
        <span className="app-label" title={hint}>
          {title}
        </span>
        <Icon className="h-3.5 w-3.5 text-muted-light" />
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <p className="app-metric">{value}</p>
        {change !== undefined && (
          <span
            className={`flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[11px] font-medium tabular-nums ${
              change >= 0 ? "text-emerald-600" : "text-coral"
            }`}
            title={`${change >= 0 ? "+" : ""}${change}% par rapport à la période précédente`}
          >
            {change >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {change >= 0 ? "+" : ""}
            {change}%
          </span>
        )}
      </div>
    </div>
  );
}
