"use client";

import { useState } from "react";
import {
  Check,
  Loader2,
  Crown,
  Zap,
  Rocket,
  Star,
  ExternalLink,
} from "lucide-react";

const plans = [
  {
    key: "free",
    name: "Free",
    price: 0,
    icon: Star,
    description: "Pour découvrir PulseTrack",
    features: [
      "1 site",
      "5 000 events/mois",
      "1 funnel",
      "30 jours de rétention",
      "Dashboard public",
    ],
  },
  {
    key: "starter",
    name: "Starter",
    price: 9,
    icon: Zap,
    description: "Pour les créateurs et freelances",
    popular: true,
    features: [
      "3 sites",
      "50 000 events/mois",
      "5 funnels",
      "90 jours de rétention",
      "Dashboard public",
      "Support email",
    ],
  },
  {
    key: "growth",
    name: "Growth",
    price: 29,
    icon: Rocket,
    description: "Pour les business en croissance",
    features: [
      "10 sites",
      "200 000 events/mois",
      "20 funnels",
      "6 mois de rétention",
      "Revenue tracking (Stripe)",
      "API access",
      "Support prioritaire",
    ],
  },
  {
    key: "business",
    name: "Business",
    price: 79,
    icon: Crown,
    description: "Pour les agences et e-commerces",
    features: [
      "50 sites",
      "1M events/mois",
      "Funnels illimités",
      "12 mois de rétention",
      "Revenue tracking (Stripe)",
      "API access",
      "Support prioritaire",
      "Export CSV",
    ],
  },
];

export function PricingCards({ currentPlan }: { currentPlan: string }) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  async function handleUpgrade(planKey: string) {
    setLoadingPlan(planKey);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });

      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    } catch {
      // silent
    } finally {
      setLoadingPlan(null);
    }
  }

  async function handleManage() {
    setLoadingPlan("manage");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    } catch {
      // silent
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Choisissez votre plan</h1>
        <p className="mt-2 text-muted">
          Commencez gratuitement, upgradez quand vous grandissez.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          const isUpgrade =
            plans.findIndex((p) => p.key === plan.key) >
            plans.findIndex((p) => p.key === currentPlan);
          const Icon = plan.icon;

          return (
            <div
              key={plan.key}
              className={`relative rounded-xl border p-6 flex flex-col ${
                plan.popular
                  ? "border-primary border-2 shadow-lg shadow-primary/10"
                  : "border-border"
              } ${isCurrent ? "bg-primary/5" : "bg-background"}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-white">
                  Populaire
                </div>
              )}

              <div className="flex items-center gap-2 mb-2">
                <Icon
                  className={`h-5 w-5 ${
                    isCurrent ? "text-primary" : "text-muted"
                  }`}
                />
                <h3 className="font-semibold">{plan.name}</h3>
              </div>

              <p className="text-xs text-muted mb-4">{plan.description}</p>

              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-3xl font-bold">{plan.price}€</span>
                {plan.price > 0 && (
                  <span className="text-sm text-muted">/mois</span>
                )}
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="space-y-2">
                  <button
                    disabled
                    className="w-full rounded-lg border border-primary bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary cursor-default"
                  >
                    Plan actuel
                  </button>
                  {currentPlan !== "free" && (
                    <button
                      onClick={handleManage}
                      disabled={loadingPlan === "manage"}
                      className="w-full flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted hover:bg-surface-hover transition-colors"
                    >
                      {loadingPlan === "manage" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ExternalLink className="h-3.5 w-3.5" />
                      )}
                      Gérer l&apos;abonnement
                    </button>
                  )}
                </div>
              ) : plan.key === "free" ? (
                <button
                  disabled
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted cursor-default"
                >
                  Gratuit
                </button>
              ) : isUpgrade ? (
                <button
                  onClick={() => handleUpgrade(plan.key)}
                  disabled={loadingPlan === plan.key}
                  className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
                    plan.popular
                      ? "bg-primary hover:bg-primary-dark"
                      : "bg-foreground hover:opacity-90"
                  } disabled:opacity-50`}
                >
                  {loadingPlan === plan.key ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Upgrader"
                  )}
                </button>
              ) : (
                <button
                  disabled
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted cursor-default"
                >
                  —
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted">
        Tous les prix sont en EUR. Annulez à tout moment. Paiement sécurisé par
        Stripe.
      </p>
    </div>
  );
}
