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

function formatCurrency(cents: number, currency = "eur") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(cents / 100);
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

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/revenue/stats?site_id=${siteId}&period=${period}`
      );
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
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
        "Utilise une clé restreinte (rk_...) avec accès en lecture seule aux charges et clients."
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

  // Not connected — show connection form
  if (!stats?.connected) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
            <DollarSign className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold">Revenue Tracking</h2>
          <p className="text-muted text-sm">
            Connecte ton Stripe pour voir combien chaque source de trafic te
            rapporte en €.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background p-6 space-y-4">
          <h3 className="font-semibold">Connecter ton Stripe</h3>

          <div className="space-y-2">
            <p className="text-xs text-muted">
              1. Va dans ton{" "}
              <a
                href="https://dashboard.stripe.com/apikeys"
                target="_blank"
                rel="noopener"
                className="text-primary hover:underline"
              >
                Dashboard Stripe → Developers → API Keys
              </a>
            </p>
            <p className="text-xs text-muted">
              2. Crée une <strong>Restricted Key</strong> avec accès en
              lecture uniquement aux <strong>Charges</strong> et{" "}
              <strong>Customers</strong>
            </p>
            <p className="text-xs text-muted">
              3. Colle la clé ci-dessous (commence par <code>rk_</code>)
            </p>
          </div>

          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={stripeKey}
              onChange={(e) => setStripeKey(e.target.value)}
              placeholder="rk_test_..."
              className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 pr-10 text-sm focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
            >
              {showKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          <button
            onClick={handleConnect}
            disabled={connecting || !stripeKey}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
          >
            {connecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            Connecter Stripe
          </button>
        </div>

        <div className="rounded-xl border border-border bg-background p-6 space-y-3">
          <h3 className="font-semibold text-sm">
            📊 Comment fonctionne l&apos;attribution ?
          </h3>
          <p className="text-xs text-muted">
            Ajoute <code className="bg-surface px-1.5 py-0.5 rounded">pulsetrack.identify(&quot;email@client.com&quot;)</code>{" "}
            sur ton site quand un utilisateur se connecte ou passe commande.
            PulseTrack match l&apos;email avec les paiements Stripe pour savoir
            quelle source de trafic a généré le revenu.
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
  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 1);
  const chartWidth = 700;
  const chartHeight = 200;
  const barWidth = chartData.length > 0 ? Math.max(chartWidth / chartData.length - 2, 2) : 10;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Revenue Tracking</h2>
          {stats.last_synced_at && (
            <p className="text-xs text-muted mt-1">
              Dernière sync :{" "}
              {new Date(stats.last_synced_at).toLocaleString("fr-FR")}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {["7d", "30d", "90d"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === p
                    ? "bg-primary text-white"
                    : "bg-background text-muted hover:bg-surface-hover"
                }`}
              >
                {p === "7d" ? "7j" : p === "30d" ? "30j" : "90j"}
              </button>
            ))}
          </div>

          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-hover transition-colors"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
            />
            Sync
          </button>

          <button
            onClick={handleDisconnect}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <Unlink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Revenu total"
          value={formatCurrency(o.total_revenue, currency)}
          icon={DollarSign}
          color="emerald"
          change={o.revenue_growth}
        />
        <StatCard
          title="Transactions"
          value={o.total_transactions.toString()}
          icon={ShoppingCart}
          color="blue"
        />
        <StatCard
          title="Panier moyen"
          value={formatCurrency(o.avg_order_value, currency)}
          icon={BarChart3}
          color="violet"
        />
        <StatCard
          title="Taux d'attribution"
          value={`${o.attribution_rate}%`}
          icon={Target}
          color="amber"
        />
      </div>

      {/* Revenue chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-border bg-background p-6">
          <h3 className="text-sm font-semibold mb-4">Revenus par jour</h3>
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto"
          >
            {chartData.map((d, i) => {
              const barHeight = (d.revenue / maxRevenue) * (chartHeight - 30);
              const x = i * (chartWidth / chartData.length) + 1;
              return (
                <g key={d.date}>
                  <rect
                    x={x}
                    y={chartHeight - 20 - barHeight}
                    width={barWidth}
                    height={Math.max(barHeight, 0)}
                    rx={2}
                    className="fill-emerald-500/80 hover:fill-emerald-500 transition-colors"
                  />
                  {/* Show label every ~7 days */}
                  {(i % Math.max(Math.floor(chartData.length / 6), 1) === 0) && (
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight - 4}
                      textAnchor="middle"
                      className="fill-muted text-[9px]"
                    >
                      {formatDate(d.date)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue by source */}
        <div className="rounded-xl border border-border bg-background p-6">
          <h3 className="text-sm font-semibold mb-4">Revenu par source</h3>
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
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted">Aucune donnée</p>
          )}
        </div>

        {/* Revenue by page */}
        <div className="rounded-xl border border-border bg-background p-6">
          <h3 className="text-sm font-semibold mb-4">Revenu par page</h3>
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
                        className="h-full rounded-full bg-violet-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted">
              Ajoute <code>pulsetrack.identify(email)</code> pour attribuer les
              revenus aux pages.
            </p>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      {stats.recent_transactions && stats.recent_transactions.length > 0 && (
        <div className="rounded-xl border border-border bg-background p-6">
          <h3 className="text-sm font-semibold mb-4">
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
                    <td className="py-2.5 font-semibold text-emerald-600">
                      {formatCurrency(t.amount, t.currency)}
                    </td>
                    <td className="py-2.5 text-muted truncate max-w-[150px]">
                      {t.email || "—"}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          t.source === "Unattributed"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-emerald-50 text-emerald-700"
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

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  change,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  change?: number;
}) {
  const colorClasses: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-500",
    blue: "bg-blue-500/10 text-blue-500",
    violet: "bg-violet-500/10 text-violet-500",
    amber: "bg-amber-500/10 text-amber-500",
  };

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted font-medium">{title}</span>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${colorClasses[color]}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {change !== undefined && (
        <div
          className={`flex items-center gap-1 text-xs mt-1 ${
            change >= 0 ? "text-emerald-500" : "text-red-500"
          }`}
        >
          {change >= 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {change >= 0 ? "+" : ""}
          {change}% vs période précédente
        </div>
      )}
    </div>
  );
}
