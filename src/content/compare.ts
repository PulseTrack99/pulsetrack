import type { Locale } from "@/i18n/dictionaries";

/**
 * Les comparatifs (src/app/compare/[slug]).
 *
 * Trois règles, parce qu'une page de comparaison est une publicité
 * comparative — en Europe, elle doit être objective et vérifiable :
 *
 * 1. Chaque affirmation sur le concurrent vient d'une source listée en
 *    bas de page, avec la date de vérification.
 * 2. Le concurrent gagne là où il gagne, et la page le dit — tableau et
 *    rubrique « choisissez-le si » compris. Une page qui ne montre que
 *    des coches vertes d'un côté n'est pas crue.
 * 3. Le poids des scripts est mesuré, pas recopié, et contrôlé au build
 *    avec le reste de la copie (scripts/check-claims.mjs).
 */

export const COMPARE_SLUGS = ["google-analytics"] as const;
export type CompareSlug = (typeof COMPARE_SLUGS)[number];

/** yes / partial / no décrivent la présence ; info, un fait sans verdict. */
export type CellState = "yes" | "partial" | "no" | "info";

export interface CompareCell {
  state: CellState;
  text: string;
}

export interface ComparePage {
  competitor: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  summary: { title: string; body: string }[];
  rows: { criterion: string; us: CompareCell; them: CompareCell }[];
  chooseThem: { title: string; points: string[] };
  chooseUs: { title: string; points: string[] };
  details: { title: string; body: string }[];
  faq: { q: string; a: string }[];
  sources: { label: string; url: string }[];
  /** Date de la dernière vérification des faits, AAAA-MM-JJ. */
  checkedOn: string;
}

const GA_SOURCES = [
  { label: "Google Analytics Help — [GA4] Cookie usage on websites", url: "https://support.google.com/analytics/answer/11397207" },
  { label: "Google Analytics Help — [GA4] Data retention", url: "https://support.google.com/analytics/answer/7667196" },
  { label: "Google Analytics Help — [GA4] BigQuery Export", url: "https://support.google.com/analytics/answer/9358801" },
  { label: "Google Analytics Help — About consent mode", url: "https://support.google.com/analytics/answer/9976101" },
  { label: "Google for Developers — Google Analytics MCP server", url: "https://developers.google.com/analytics/devguides/MCP" },
  { label: "GA4 Optimizer — Google Analytics Ask Advisor tested", url: "https://www.gaoptimizer.com/blog/google-analytics-advisor-ai-first-impresions/" },
  { label: "gtag.js, measured by PulseTrack (compressed transfer size)", url: "https://www.googletagmanager.com/gtag/js" },
];

const en: Record<CompareSlug, ComparePage> = {
  "google-analytics": {
    competitor: "Google Analytics 4",
    metaTitle: "PulseTrack vs Google Analytics 4 — an honest comparison",
    metaDescription:
      "Cookies, consent, revenue attribution, heatmaps, AI and exports: how PulseTrack and Google Analytics 4 compare, with sources — and when GA4 is the better choice.",
    eyebrow: "Comparison",
    title: "PulseTrack vs Google Analytics 4",
    subtitle:
      "Google Analytics 4 is free and built into the Google Ads ecosystem. PulseTrack works without cookies, ties revenue to its source and bundles heatmaps, session replay and A/B tests. Here is where each one wins — including where GA4 does.",
    summary: [
      {
        title: "No cookies",
        body: "GA4 sets _ga cookies that last up to two years by default. PulseTrack stores nothing on the visitor's device.",
      },
      {
        title: "Revenue, not just traffic",
        body: "PulseTrack connects to Stripe and splits revenue by source. GA4 needs purchase events implemented on your site.",
      },
      {
        title: "Where GA4 wins",
        body: "It is free, exports raw events to BigQuery at no cost up to 1M events a day, and integrates natively with Google Ads.",
      },
    ],
    rows: [
      {
        criterion: "Works without cookies",
        us: { state: "yes", text: "No cookie, no local storage: a daily-rotating anonymous identifier computed on the server" },
        them: { state: "no", text: "Sets _ga and _ga_<id> first-party cookies, 2-year default expiry; Consent Mode can send cookieless pings used for modeling" },
      },
      {
        criterion: "Revenue per traffic source from Stripe",
        us: { state: "yes", text: "Connect a read-only Stripe key; payments are matched to the sessions that brought them" },
        them: { state: "partial", text: "Ecommerce purchase events must be implemented; no native Stripe connection" },
      },
      {
        criterion: "Funnels",
        us: { state: "yes", text: "Multi-step funnels with drop-off, time to convert and revenue lost per step" },
        them: { state: "yes", text: "Funnel explorations" },
      },
      {
        criterion: "Real-time",
        us: { state: "yes", text: "Visitors in the last 5 minutes and the pages they are on" },
        them: { state: "yes", text: "Realtime report" },
      },
      {
        criterion: "Heatmaps and session replay",
        us: { state: "yes", text: "Click, scroll and rage-click maps; recorded sessions (Starter plan and above)" },
        them: { state: "no", text: "Not included" },
      },
      {
        criterion: "A/B tests and feature flags",
        us: { state: "yes", text: "Experiments with a significance verdict, and feature flags" },
        them: { state: "no", text: "Not included since Google Optimize was discontinued in 2023" },
      },
      {
        criterion: "AI assistant in plain language",
        us: { state: "yes", text: "Built-in assistant (Starter plan and above)" },
        them: { state: "partial", text: "Ask Advisor (Gemini), launched in beta in June 2026, English first" },
      },
      {
        criterion: "MCP server for AI assistants",
        us: { state: "yes", text: "Hosted, OAuth sign-in, read-only by default, changes only with your permission" },
        them: { state: "partial", text: "Official server, labelled experimental, runs on your own machine, read-only" },
      },
      {
        criterion: "Raw data export",
        us: { state: "partial", text: "Daily signed export to your own URL, and an API (Growth plan and above)" },
        them: { state: "yes", text: "Free BigQuery export, up to 1M events a day on standard properties" },
      },
      {
        criterion: "Google Ads integration",
        us: { state: "no", text: "Not available" },
        them: { state: "yes", text: "Native" },
      },
      {
        criterion: "Data retention",
        us: { state: "info", text: "30 days to 12 months depending on plan" },
        them: { state: "info", text: "Explorations: 2 or 14 months on standard properties; standard reports are not affected" },
      },
      {
        criterion: "Base script weight",
        us: { state: "info", text: "3.7 KB gzipped; heatmaps and replay load extra code only when enabled" },
        them: { state: "info", text: "gtag.js: 144 KB compressed, measured on 17 September 2026" },
      },
      {
        criterion: "Price",
        us: { state: "info", text: "Free plan; paid plans from €9 per month" },
        them: { state: "info", text: "Free; Analytics 360 is a paid enterprise edition" },
      },
    ],
    chooseThem: {
      title: "Choose Google Analytics 4 if…",
      points: [
        "You run Google Ads campaigns and rely on the native integration.",
        "You need a free tool and are comfortable managing cookie consent.",
        "You want raw event data in BigQuery at no extra cost.",
      ],
    },
    chooseUs: {
      title: "Choose PulseTrack if…",
      points: [
        "You want to know which channels bring paying customers, not just visits.",
        "You would rather not set cookies on your visitors' devices.",
        "You want heatmaps, session replay and A/B tests in the same tool as your analytics.",
        "You want your data hosted in the European Union.",
      ],
    },
    details: [
      {
        title: "How PulseTrack counts visitors without cookies",
        body: "Each request is attributed to an identifier computed on our servers from the request and a salt that changes every day. Nothing is written to or read from the visitor's device. The trade-off is deliberate: the same person returning tomorrow counts as a new visitor, so PulseTrack reports visitors per day rather than people followed over months. To follow customers over time, you identify them yourself when they sign up.",
      },
      {
        title: "Cookies and consent",
        body: "GA4 relies on first-party cookies. When a visitor refuses them, Consent Mode can still send cookieless pings that Google uses to model the missing data. PulseTrack sets no cookie at all. Whether your site needs a consent banner also depends on the other tools it uses, so check with your own advisor.",
      },
      {
        title: "Where the data lives",
        body: "PulseTrack stores its data in Ireland and runs its servers in Dublin, inside the European Union.",
      },
    ],
    faq: [
      {
        q: "Can I run PulseTrack alongside Google Analytics?",
        a: "Yes. The two scripts are independent, so you can compare figures side by side before deciding. Expect different visitor counts: GA4 follows a browser across days with its cookie, while PulseTrack counts visitors per day.",
      },
      {
        q: "Can I import my Google Analytics history?",
        a: "Not yet. An import is planned; until then, PulseTrack measures from the day you install it.",
      },
      {
        q: "Is PulseTrack free like GA4?",
        a: "There is a free plan: one site, 5,000 events a month and 30 days of history. Heatmaps, session replay and the AI assistant start with the Starter plan at €9 per month.",
      },
    ],
    sources: GA_SOURCES,
    checkedOn: "2026-09-17",
  },
};

const fr: Record<CompareSlug, ComparePage> = {
  "google-analytics": {
    competitor: "Google Analytics 4",
    metaTitle: "PulseTrack ou Google Analytics 4 — le comparatif honnête",
    metaDescription:
      "Cookies, consentement, attribution du revenu, heatmaps, IA et exports : comment PulseTrack et Google Analytics 4 se comparent, sources à l'appui — et quand GA4 est le meilleur choix.",
    eyebrow: "Comparatif",
    title: "PulseTrack ou Google Analytics 4",
    subtitle:
      "Google Analytics 4 est gratuit et intégré à l'écosystème Google Ads. PulseTrack fonctionne sans cookie, relie le revenu à sa source et réunit heatmaps, replays de sessions et tests A/B. Voici où chacun gagne — y compris là où GA4 l'emporte.",
    summary: [
      {
        title: "Aucun cookie",
        body: "GA4 pose des cookies _ga qui durent jusqu'à deux ans par défaut. PulseTrack n'enregistre rien sur l'appareil du visiteur.",
      },
      {
        title: "Le revenu, pas seulement le trafic",
        body: "PulseTrack se connecte à Stripe et répartit le revenu par source. GA4 demande d'implémenter des événements d'achat sur votre site.",
      },
      {
        title: "Là où GA4 gagne",
        body: "Il est gratuit, exporte les événements bruts vers BigQuery sans frais jusqu'à 1 million d'événements par jour, et s'intègre nativement à Google Ads.",
      },
    ],
    rows: [
      {
        criterion: "Fonctionne sans cookie",
        us: { state: "yes", text: "Ni cookie ni stockage local : un identifiant anonyme calculé sur le serveur, renouvelé chaque jour" },
        them: { state: "no", text: "Pose les cookies _ga et _ga_<id>, deux ans par défaut ; le mode Consentement peut envoyer des pings sans cookie servant à la modélisation" },
      },
      {
        criterion: "Revenu par source de trafic depuis Stripe",
        us: { state: "yes", text: "Une clé Stripe en lecture seule ; les paiements sont rattachés aux sessions qui les ont amenés" },
        them: { state: "partial", text: "Événements d'achat e-commerce à implémenter ; pas de connexion Stripe native" },
      },
      {
        criterion: "Funnels",
        us: { state: "yes", text: "Funnels multi-étapes avec abandon, temps de conversion et revenu perdu par étape" },
        them: { state: "yes", text: "Explorations de type entonnoir" },
      },
      {
        criterion: "Temps réel",
        us: { state: "yes", text: "Les visiteurs des 5 dernières minutes et les pages qu'ils consultent" },
        them: { state: "yes", text: "Rapport Temps réel" },
      },
      {
        criterion: "Heatmaps et replay de sessions",
        us: { state: "yes", text: "Cartes de clics, de scroll et de clics de rage ; sessions enregistrées (à partir de l'offre Starter)" },
        them: { state: "no", text: "Non inclus" },
      },
      {
        criterion: "Tests A/B et feature flags",
        us: { state: "yes", text: "Expériences avec verdict de significativité, et feature flags" },
        them: { state: "no", text: "Non inclus depuis l'arrêt de Google Optimize en 2023" },
      },
      {
        criterion: "Assistant IA en langage naturel",
        us: { state: "yes", text: "Assistant intégré (à partir de l'offre Starter)" },
        them: { state: "partial", text: "Ask Advisor (Gemini), lancé en bêta en juin 2026, d'abord en anglais" },
      },
      {
        criterion: "Serveur MCP pour assistants IA",
        us: { state: "yes", text: "Hébergé, connexion OAuth, lecture seule par défaut, modifications seulement avec votre permission" },
        them: { state: "partial", text: "Serveur officiel, présenté comme expérimental, à faire tourner sur sa machine, lecture seule" },
      },
      {
        criterion: "Export des données brutes",
        us: { state: "partial", text: "Export quotidien signé vers votre propre URL, et une API (à partir de l'offre Growth)" },
        them: { state: "yes", text: "Export BigQuery gratuit, jusqu'à 1 million d'événements par jour sur les propriétés standard" },
      },
      {
        criterion: "Intégration Google Ads",
        us: { state: "no", text: "Non disponible" },
        them: { state: "yes", text: "Native" },
      },
      {
        criterion: "Conservation des données",
        us: { state: "info", text: "De 30 jours à 12 mois selon l'offre" },
        them: { state: "info", text: "Explorations : 2 ou 14 mois sur les propriétés standard ; les rapports standard ne sont pas concernés" },
      },
      {
        criterion: "Poids du script de base",
        us: { state: "info", text: "3,7 Ko gzippé ; heatmaps et replay chargent du code en plus seulement s'ils sont activés" },
        them: { state: "info", text: "gtag.js : 144 Ko compressé, mesuré le 17 septembre 2026" },
      },
      {
        criterion: "Prix",
        us: { state: "info", text: "Offre gratuite ; offres payantes à partir de 9 € par mois" },
        them: { state: "info", text: "Gratuit ; Analytics 360 est une édition entreprise payante" },
      },
    ],
    chooseThem: {
      title: "Choisissez Google Analytics 4 si…",
      points: [
        "Vous menez des campagnes Google Ads et comptez sur l'intégration native.",
        "Il vous faut un outil gratuit et la gestion du consentement aux cookies ne vous gêne pas.",
        "Vous voulez vos événements bruts dans BigQuery sans surcoût.",
      ],
    },
    chooseUs: {
      title: "Choisissez PulseTrack si…",
      points: [
        "Vous voulez savoir quels canaux amènent des clients payants, pas seulement des visites.",
        "Vous préférez ne pas poser de cookies sur l'appareil de vos visiteurs.",
        "Vous voulez heatmaps, replays de sessions et tests A/B dans le même outil que vos analytics.",
        "Vous voulez des données hébergées dans l'Union européenne.",
      ],
    },
    details: [
      {
        title: "Comment PulseTrack compte les visiteurs sans cookie",
        body: "Chaque requête est rattachée à un identifiant calculé sur nos serveurs à partir de la requête et d'un sel qui change chaque jour. Rien n'est écrit ni lu sur l'appareil du visiteur. Le compromis est voulu : une même personne revenue le lendemain compte comme un nouveau visiteur, donc PulseTrack mesure des visiteurs par jour, pas des personnes suivies pendant des mois. Pour suivre vos clients dans la durée, vous les identifiez vous-même à l'inscription.",
      },
      {
        title: "Cookies et consentement",
        body: "GA4 repose sur des cookies. Quand un visiteur les refuse, le mode Consentement peut encore envoyer des pings sans cookie que Google utilise pour modéliser les données manquantes. PulseTrack ne pose aucun cookie. Le besoin d'une bannière de consentement sur votre site dépend aussi des autres outils qu'il utilise : vérifiez-le avec votre propre conseil.",
      },
      {
        title: "Où sont les données",
        body: "PulseTrack stocke ses données en Irlande et fait tourner ses serveurs à Dublin, dans l'Union européenne.",
      },
    ],
    faq: [
      {
        q: "Puis-je utiliser PulseTrack en même temps que Google Analytics ?",
        a: "Oui. Les deux scripts sont indépendants : vous pouvez comparer les chiffres côte à côte avant de décider. Attendez-vous à des nombres de visiteurs différents : GA4 suit un navigateur d'un jour à l'autre grâce à son cookie, PulseTrack compte les visiteurs par jour.",
      },
      {
        q: "Puis-je importer mon historique Google Analytics ?",
        a: "Pas encore. Un import est prévu ; d'ici là, PulseTrack mesure à partir du jour de l'installation.",
      },
      {
        q: "PulseTrack est-il gratuit comme GA4 ?",
        a: "Il existe une offre gratuite : un site, 5 000 événements par mois et 30 jours d'historique. Heatmaps, replays de sessions et assistant IA commencent avec l'offre Starter à 9 € par mois.",
      },
    ],
    sources: GA_SOURCES,
    checkedOn: "2026-09-17",
  },
};

export function getComparison(locale: Locale, slug: CompareSlug): ComparePage {
  return (locale === "fr" ? fr : en)[slug];
}
