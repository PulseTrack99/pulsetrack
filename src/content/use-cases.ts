import type { Locale } from "@/i18n/dictionaries";

/**
 * Les pages par cas d'usage (src/app/use-cases/[slug]).
 *
 * Une page ne décrit que ce que le produit fait aujourd'hui. Un lien
 * « En savoir plus » n'apparaît que si la page cible existe — c'est
 * vérifié au build (scripts/check-site-links.mjs) ; une capacité sans
 * page dédiée est décrite, simplement sans lien.
 */

export const USE_CASE_SLUGS = ["b2b-saas"] as const;
export type UseCaseSlug = (typeof USE_CASE_SLUGS)[number];

export interface UseCasePage {
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  titleAccent: string;
  subtitle: string;
  problemsTitle: string;
  problems: { title: string; body: string }[];
  capabilitiesTitle: string;
  capabilities: { title: string; body: string; href?: string }[];
  steps: { title: string; body: string }[];
  faq: { q: string; a: string }[];
  compare?: { label: string; href: string };
}

const en: Record<UseCaseSlug, UseCasePage> = {
  "b2b-saas": {
    metaTitle: "Analytics for B2B SaaS — revenue per channel, accounts and funnels",
    metaDescription:
      "See which channels bring paying B2B customers, follow accounts rather than anonymous users, and find where trials drop off. Cookie-free analytics with Stripe revenue attribution.",
    eyebrow: "For B2B SaaS",
    title: "From first visit",
    titleAccent: "to paid account",
    subtitle:
      "Marketing counts signups, finance counts revenue, product counts active users. PulseTrack puts the three in one place, per channel and per customer account, without cookies.",
    problemsTitle: "What usually goes wrong",
    problems: [
      {
        title: "Signups are not revenue",
        body: "A channel that brings many trials can bring few paying customers. Without the link to billing, budget goes to the wrong place.",
      },
      {
        title: "You sell to companies, not browsers",
        body: "Five people from the same customer look like five unrelated users in most analytics tools.",
      },
      {
        title: "Trials leave without a word",
        body: "People sign up, get stuck during onboarding and never come back. You see the drop, not the reason.",
      },
    ],
    capabilitiesTitle: "What PulseTrack gives you",
    capabilities: [
      {
        title: "Revenue per channel",
        body: "Connect Stripe with a read-only key: each payment, subscription renewals included, is attributed to the channel that brought the customer.",
        href: "/features/revenue",
      },
      {
        title: "Signup and activation funnels",
        body: "Build the path from landing page to paid plan and see, step by step, how many people you lose and how much revenue that represents.",
        href: "/features/funnels",
      },
      {
        title: "Account-level analytics",
        body: "Call pulsetrack.group(id, name) and follow each customer company: people, sessions, activity and revenue.",
      },
      {
        title: "Retention cohorts",
        body: "See whether the people you identify come back week after week.",
      },
      {
        title: "Heatmaps and session replay",
        body: "See where trial users hesitate during onboarding, click by click.",
        href: "/features/heatmaps",
      },
      {
        title: "A/B tests and feature flags",
        body: "Test a new pricing page or roll a feature out to part of your users, with a clear verdict on significance.",
      },
      {
        title: "Your AI assistant, connected",
        body: "Ask Claude or ChatGPT which channel brought last month's paying accounts, through the MCP server.",
        href: "/docs/mcp",
      },
    ],
    steps: [
      { title: "Add the script", body: "One line in your site's <head>; data starts flowing within seconds." },
      {
        title: "Identify people and accounts",
        body: "Call pulsetrack.identify(email) at signup, and pulsetrack.group(id, name) once you know the company.",
      },
      { title: "Connect Stripe", body: "Paste a read-only restricted key; payments are matched to the sessions that brought them." },
    ],
    faq: [
      {
        q: "Does PulseTrack calculate MRR or churn?",
        a: "No. It attributes each Stripe payment to its source and shows revenue by channel, landing page and account. MRR and churn stay in your billing tool.",
      },
      {
        q: "Is personal data sent to AI assistants?",
        a: "No. Through the MCP server, assistants receive aggregates such as account totals, never e-mail addresses.",
      },
      {
        q: "Does it work if we don't use Stripe?",
        a: "Traffic, funnels, accounts, heatmaps and experiments work without it. Revenue attribution currently needs Stripe.",
      },
    ],
    compare: { label: "PulseTrack vs Google Analytics 4", href: "/compare/google-analytics" },
  },
};

const fr: Record<UseCaseSlug, UseCasePage> = {
  "b2b-saas": {
    metaTitle: "Analytics pour SaaS B2B — revenu par canal, comptes et funnels",
    metaDescription:
      "Voyez quels canaux amènent des clients B2B payants, suivez des comptes plutôt que des utilisateurs anonymes, et trouvez où les essais décrochent. Analytics sans cookie avec attribution du revenu Stripe.",
    eyebrow: "Pour les SaaS B2B",
    title: "De la première visite",
    titleAccent: "au compte payant",
    subtitle:
      "Le marketing compte les inscriptions, la finance le revenu, le produit les utilisateurs actifs. PulseTrack réunit les trois, par canal et par compte client, sans cookie.",
    problemsTitle: "Ce qui coince d'habitude",
    problems: [
      {
        title: "Une inscription n'est pas un revenu",
        body: "Un canal qui amène beaucoup d'essais peut amener peu de clients payants. Sans lien avec la facturation, le budget part au mauvais endroit.",
      },
      {
        title: "Vous vendez à des entreprises, pas à des navigateurs",
        body: "Cinq personnes d'un même client ressemblent à cinq utilisateurs sans rapport dans la plupart des outils d'analytics.",
      },
      {
        title: "Les essais partent sans un mot",
        body: "Des gens s'inscrivent, bloquent pendant la prise en main et ne reviennent jamais. Vous voyez la chute, pas la raison.",
      },
    ],
    capabilitiesTitle: "Ce que PulseTrack vous apporte",
    capabilities: [
      {
        title: "Le revenu par canal",
        body: "Connectez Stripe avec une clé en lecture seule : chaque paiement, renouvellements d'abonnement compris, est attribué au canal qui a amené le client.",
        href: "/features/revenue",
      },
      {
        title: "Funnels d'inscription et d'activation",
        body: "Construisez le chemin de la page d'arrivée à l'offre payante et voyez, étape par étape, combien de personnes vous perdez et ce que cela représente en revenu.",
        href: "/features/funnels",
      },
      {
        title: "L'analyse par compte",
        body: "Appelez pulsetrack.group(id, nom) et suivez chaque entreprise cliente : personnes, sessions, activité et revenu.",
      },
      {
        title: "Les cohortes de rétention",
        body: "Voyez si les personnes que vous identifiez reviennent semaine après semaine.",
      },
      {
        title: "Heatmaps et replay de sessions",
        body: "Voyez où les utilisateurs en essai hésitent pendant la prise en main, clic après clic.",
        href: "/features/heatmaps",
      },
      {
        title: "Tests A/B et feature flags",
        body: "Testez une nouvelle page de prix ou ouvrez une fonctionnalité à une partie de vos utilisateurs, avec un verdict clair sur la significativité.",
      },
      {
        title: "Votre assistant IA, branché",
        body: "Demandez à Claude ou ChatGPT quel canal a amené les comptes payants du mois dernier, grâce au serveur MCP.",
        href: "/docs/mcp",
      },
    ],
    steps: [
      { title: "Ajoutez le script", body: "Une ligne dans le <head> de votre site ; les données arrivent en quelques secondes." },
      {
        title: "Identifiez personnes et comptes",
        body: "Appelez pulsetrack.identify(email) à l'inscription, et pulsetrack.group(id, nom) dès que vous connaissez l'entreprise.",
      },
      { title: "Connectez Stripe", body: "Collez une clé restreinte en lecture seule ; les paiements sont rattachés aux sessions qui les ont amenés." },
    ],
    faq: [
      {
        q: "PulseTrack calcule-t-il le MRR ou le churn ?",
        a: "Non. Il attribue chaque paiement Stripe à sa source et montre le revenu par canal, page d'arrivée et compte. MRR et churn restent dans votre outil de facturation.",
      },
      {
        q: "Des données personnelles sont-elles envoyées aux assistants IA ?",
        a: "Non. Via le serveur MCP, les assistants reçoivent des agrégats comme les totaux par compte, jamais d'adresses e-mail.",
      },
      {
        q: "Est-ce que ça marche sans Stripe ?",
        a: "Trafic, funnels, comptes, heatmaps et expériences fonctionnent sans. L'attribution du revenu demande Stripe pour l'instant.",
      },
    ],
    compare: { label: "PulseTrack ou Google Analytics 4", href: "/compare/google-analytics" },
  },
};

export function getUseCase(locale: Locale, slug: UseCaseSlug): UseCasePage {
  return (locale === "fr" ? fr : en)[slug];
}
