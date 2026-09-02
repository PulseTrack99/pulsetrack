import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-07-29.dahlia",
  typescript: true,
});

// Plan definitions.
//
// `limits` are numeric caps (-1 means unlimited); `capabilities` are the
// on/off features the pricing table sells. Both are enforced in
// src/lib/plan.ts — keep them in sync with the marketing copy in
// src/i18n/dictionaries.ts.
export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    limits: {
      sites: 1,
      events_per_month: 5000,
      funnels: 1,
      retention_days: 30,
      replays_per_month: 0,
    },
    capabilities: {
      heatmaps: false,
      session_replay: false,
      revenue: false,
      api: false,
      csv_export: false,
    },
    features: [
      "1 site",
      "5 000 events/mois",
      "1 funnel",
      "30 jours de rétention",
      "Dashboard public",
    ],
  },
  starter: {
    name: "Starter",
    price: 9,
    priceId: "", // Will be set after creating products
    limits: {
      sites: 3,
      events_per_month: 50000,
      funnels: 5,
      retention_days: 90,
      replays_per_month: 500,
    },
    capabilities: {
      heatmaps: true,
      session_replay: true,
      revenue: false,
      api: false,
      csv_export: false,
    },
    features: [
      "3 sites",
      "50 000 events/mois",
      "5 funnels",
      "500 session replays/mois",
      "90 jours de rétention",
      "Dashboard public",
      "Support email",
    ],
  },
  growth: {
    name: "Growth",
    price: 29,
    priceId: "",
    limits: {
      sites: 10,
      events_per_month: 200000,
      funnels: 20,
      retention_days: 180,
      replays_per_month: 3000,
    },
    capabilities: {
      heatmaps: true,
      session_replay: true,
      revenue: true,
      api: true,
      csv_export: false,
    },
    features: [
      "10 sites",
      "200 000 events/mois",
      "20 funnels",
      "3 000 session replays/mois",
      "6 mois de rétention",
      "Revenue tracking (Stripe)",
      "API access",
      "Support prioritaire",
    ],
  },
  business: {
    name: "Business",
    price: 79,
    priceId: "",
    limits: {
      sites: 50,
      events_per_month: 1000000,
      funnels: -1, // unlimited
      retention_days: 365,
      replays_per_month: 15000,
    },
    capabilities: {
      heatmaps: true,
      session_replay: true,
      revenue: true,
      api: true,
      csv_export: true,
    },
    features: [
      "50 sites",
      "1M events/mois",
      "Funnels illimités",
      "15 000 session replays/mois",
      "12 mois de rétention",
      "Revenue tracking (Stripe)",
      "API access",
      "Support prioritaire",
      "Export CSV",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;
