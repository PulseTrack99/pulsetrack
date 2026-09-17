import type { ComparePage } from "./compare";

/**
 * PulseTrack ou Matomo.
 *
 * Matomo est le choix de la souveraineté : code ouvert, installable sur
 * vos serveurs, vingt ans d'historique. Sur ce terrain il gagne, et la
 * page le dit sans détour — nous ne sommes pas open source et nous
 * n'importons pas encore Google Analytics, lui fait les deux.
 *
 * Ce qui nous sépare vraiment est ailleurs : il pose des cookies
 * propriétaires par défaut, son script pèse 44 Ko, et son offre
 * hébergée commence à 22 € hors taxes quand la nôtre commence à zéro.
 *
 * Chiffres relevés le 18 septembre 2026 ; poids du script mesuré.
 */

const SOURCES = [
  { label: "Matomo — Pricing (Cloud price per traffic tier, allowances, EU hosting)", url: "https://matomo.org/pricing/" },
  { label: "Matomo FAQ — Cookies used by Matomo (first-party cookies by default)", url: "https://matomo.org/faq/general/faq_146/" },
  { label: "Matomo Plugins Marketplace — MCP Server", url: "https://plugins.matomo.org/McpServer" },
  { label: "Matomo FAQ — How to configure the Matomo MCP Server", url: "https://matomo.org/faq/how-to/how-to-configure-the-matomo-mcp-server/" },
  { label: "matomo.js, measured by PulseTrack (compressed transfer size)", url: "https://demo.matomo.cloud/matomo.js" },
];

export const matomoEn: Record<"matomo", ComparePage> = {
  matomo: {
    competitor: "Matomo",
    metaTitle: "PulseTrack vs Matomo — an honest comparison",
    metaDescription:
      "Matomo is open source and self-hostable, and it imports Google Analytics. PulseTrack sets no cookie, weighs 3.7 KB and starts free. Where each one wins, with sources.",
    eyebrow: "Comparison",
    title: "PulseTrack vs Matomo",
    subtitle:
      "Matomo is the sovereignty answer: open source, installable on your own servers, and it will import your Google Analytics history. PulseTrack is the lighter, simpler one that sets no cookie at all and starts at zero. This page is about which of those matters to you.",
    summary: [
      {
        title: "Matomo can be yours entirely",
        body: "Open source and self-hostable: your servers, your database, your backups. Nothing we offer replaces that.",
      },
      {
        title: "PulseTrack sets no cookie at all",
        body: "Matomo's default tracking code uses first-party cookies. Cookieless is a configuration you have to make and keep.",
      },
      {
        title: "Two very different entry prices",
        body: "Matomo Cloud starts at €22 a month excluding tax for 50,000 hits. PulseTrack has a free plan, and €9 a month for heatmaps, replay and the assistant.",
      },
    ],
    rows: [
      {
        criterion: "Works without cookies",
        us: { state: "yes", text: "No cookie, no local storage: a daily-rotating anonymous identifier computed on the server" },
        them: { state: "partial", text: "The default tracking code uses first-party cookies; cookieless tracking is possible but must be configured, and cross-session recognition goes with it" },
      },
      {
        criterion: "Open source and self-hosting",
        us: { state: "no", text: "Not open source; hosted service only" },
        them: { state: "yes", text: "Open source, and the self-hosted edition is free — your servers, your database" },
      },
      {
        criterion: "Google Analytics import",
        us: { state: "no", text: "Not yet: PulseTrack measures from the day you install it" },
        them: { state: "yes", text: "A Google Analytics data importer is included in Matomo Cloud" },
      },
      {
        criterion: "Free hosted plan",
        us: { state: "yes", text: "1 site, 5,000 events a month, 1 funnel, 30 days of history — no card" },
        them: { state: "no", text: "A free trial without a card, then a paid plan; free only if you host it yourself" },
      },
      {
        criterion: "Entry price, hosted",
        us: { state: "info", text: "Free plan, then €9 a month: 3 sites, 50,000 events, heatmaps, session replay and the AI assistant" },
        them: { state: "info", text: "From €22 a month excluding tax for 50,000 hits, with 2 months free on annual billing" },
      },
      {
        criterion: "Heatmaps and session replay",
        us: { state: "yes", text: "Included from €9 a month: 500 recorded sessions a month, and heatmaps with no pageview cap" },
        them: { state: "yes", text: "Included in Cloud with allowances: 1,500 heatmap pageviews and 150 session recordings a month" },
      },
      {
        criterion: "A/B tests",
        us: { state: "yes", text: "Experiments with a significance verdict" },
        them: { state: "yes", text: "A/B testing included in Matomo Cloud" },
      },
      {
        criterion: "Feature flags",
        us: { state: "yes", text: "Percentage rollouts, evaluated by the same script" },
        them: { state: "no", text: "Not offered" },
      },
      {
        criterion: "Funnels and user flows",
        us: { state: "yes", text: "Multi-step funnels with revenue lost per step, plus flows and weekly retention" },
        them: { state: "yes", text: "Funnels, Users Flow and Cohorts included in Cloud" },
      },
      {
        criterion: "Revenue per traffic source from Stripe",
        us: { state: "yes", text: "A read-only Stripe key; every payment is attributed to the session and channel that brought it (Growth plan and above)" },
        them: { state: "partial", text: "Ecommerce tracking and multi-channel conversion attribution from the events your site sends; no native Stripe connection" },
      },
      {
        criterion: "MCP server for AI assistants",
        us: { state: "yes", text: "Ours, hosted, OAuth sign-in, read-only by default — nothing to install" },
        them: { state: "partial", text: "An official plugin you install on your own Matomo and enable; MCP access is off by default and can be kept read-only" },
      },
      {
        criterion: "History kept",
        us: { state: "info", text: "30 days on the free plan, up to 12 months depending on plan" },
        them: { state: "info", text: "Raw data kept 24 months, aggregated reports kept indefinitely — longer than ours" },
      },
      {
        criterion: "Data hosted in the EU",
        us: { state: "yes", text: "Stored in Ireland, servers in Dublin" },
        them: { state: "yes", text: "Matomo Cloud stores data in Europe; self-hosted, it is wherever you put it" },
      },
      {
        criterion: "Base script weight",
        us: { state: "info", text: "3.7 KB gzipped; heatmaps and replay load extra code only when you enable them" },
        them: { state: "info", text: "matomo.js: 44 KB compressed, measured on 18 September 2026" },
      },
    ],
    chooseThem: {
      title: "Choose Matomo if…",
      points: [
        "You want the code on your own servers, auditable and under your control.",
        "You need your Google Analytics history imported.",
        "You want years of history kept, with raw data retained for two years.",
        "Your organisation requires open source software.",
      ],
    },
    chooseUs: {
      title: "Choose PulseTrack if…",
      points: [
        "You do not want cookies at all, rather than cookies you have to switch off.",
        "You want to start free, and pay €9 rather than €22 when the site grows.",
        "You want every euro traced to its channel straight from Stripe.",
        "You would rather not administer an analytics server, or configure one correctly.",
      ],
    },
    details: [
      {
        title: "Cookies you configure away, or no cookies at all",
        body: "Matomo's documentation is clear: the default tracking code uses first-party cookies, and cookieless tracking is something you enable. It works, and it is one of the reasons Matomo is recommended for consent-free configurations in some countries. But it is a setting: someone has to make it, document it, and not undo it on the next tag deployment. PulseTrack has no such setting because there is no cookie to disable — the identifier is computed on our servers and rotates every day.",
      },
      {
        title: "Hits, events, and what you are actually paying for",
        body: "Matomo Cloud is priced per hit: a pageview, an event, a download and a site search each count as one. PulseTrack is priced per event, and a pageview is one event. The units are close enough to compare, unlike pageview-only pricing, but check your own numbers: a site with heavy event tracking reaches 50,000 quickly on either tool.",
      },
      {
        title: "What self-hosting really costs",
        body: "The self-hosted edition is free, and that is a genuine advantage — but the bill moves rather than disappears. You provide the server, the database, the updates, the backups and the archiving cron that keeps reports fast at volume. If your organisation already runs infrastructure, that is cheap. If it does not, a hosted tool at €9 or €22 a month is usually cheaper than the afternoon you will spend on a broken upgrade.",
      },
    ],
    faq: [
      {
        q: "Is PulseTrack as GDPR-friendly as Matomo?",
        a: "Both are built for it, from different angles. Matomo lets you keep the data on your own servers; PulseTrack keeps it in Ireland and never writes anything on the visitor's device. Neither of us can tell you whether your site needs a consent banner — that depends on every tool your pages load.",
      },
      {
        q: "Can I import my Matomo history?",
        a: "No. There is no import from Matomo today, so PulseTrack measures from the day you install it. You can run both for a while and compare.",
      },
      {
        q: "Why is your script so much smaller?",
        a: "Because it does less on the page. Matomo's script carries twenty years of options — content tracking, site search, log analytics, tag manager hooks. Ours collects the page, the source and the events you send, and fetches the heavy parts only where you turned them on.",
      },
    ],
    sources: SOURCES,
    checkedOn: "2026-09-18",
  },
};

/* ══════════════════════════════════════════════════════════════
   FRANÇAIS
   ══════════════════════════════════════════════════════════════ */

export const matomoFr: Record<"matomo", ComparePage> = {
  matomo: {
    competitor: "Matomo",
    metaTitle: "PulseTrack ou Matomo — le comparatif honnête",
    metaDescription:
      "Matomo est open source, auto-hébergeable et importe Google Analytics. PulseTrack ne pose aucun cookie, pèse 3,7 Ko et démarre gratuitement. Où chacun gagne, sources à l'appui.",
    eyebrow: "Comparatif",
    title: "PulseTrack ou Matomo",
    subtitle:
      "Matomo est la réponse souveraine : code ouvert, installable sur vos serveurs, et il importe votre historique Google Analytics. PulseTrack est le plus léger et le plus simple, ne pose aucun cookie et démarre à zéro. Cette page sert à savoir lequel de ces deux points compte pour vous.",
    summary: [
      {
        title: "Matomo peut être entièrement à vous",
        body: "Open source et auto-hébergeable : vos serveurs, votre base, vos sauvegardes. Rien de ce que nous proposons ne remplace cela.",
      },
      {
        title: "PulseTrack ne pose aucun cookie",
        body: "Le code de suivi par défaut de Matomo utilise des cookies propriétaires. Le mode sans cookie est une configuration à faire, puis à maintenir.",
      },
      {
        title: "Deux prix d'entrée très différents",
        body: "Matomo Cloud démarre à 22 € hors taxes par mois pour 50 000 hits. PulseTrack a une offre gratuite, et 9 € par mois pour heatmaps, replay et assistant.",
      },
    ],
    rows: [
      {
        criterion: "Fonctionne sans cookie",
        us: { state: "yes", text: "Ni cookie ni stockage local : un identifiant anonyme calculé sur le serveur, renouvelé chaque jour" },
        them: { state: "partial", text: "Le code de suivi par défaut utilise des cookies propriétaires ; le suivi sans cookie est possible mais doit être configuré, et la reconnaissance entre sessions part avec" },
      },
      {
        criterion: "Code libre et auto-hébergement",
        us: { state: "no", text: "Pas open source ; service hébergé uniquement" },
        them: { state: "yes", text: "Open source, et l'édition auto-hébergée est gratuite — vos serveurs, votre base" },
      },
      {
        criterion: "Import Google Analytics",
        us: { state: "no", text: "Pas encore : PulseTrack mesure à partir du jour de l'installation" },
        them: { state: "yes", text: "Un importateur de données Google Analytics est inclus dans Matomo Cloud" },
      },
      {
        criterion: "Offre hébergée gratuite",
        us: { state: "yes", text: "1 site, 5 000 événements par mois, 1 funnel, 30 jours d'historique — sans carte" },
        them: { state: "no", text: "Un essai gratuit sans carte, puis une offre payante ; gratuit seulement si vous l'hébergez vous-même" },
      },
      {
        criterion: "Prix d'entrée, en hébergé",
        us: { state: "info", text: "Offre gratuite, puis 9 € par mois : 3 sites, 50 000 événements, heatmaps, replay et assistant IA" },
        them: { state: "info", text: "À partir de 22 € hors taxes par mois pour 50 000 hits, avec 2 mois offerts en facturation annuelle" },
      },
      {
        criterion: "Heatmaps et replay de sessions",
        us: { state: "yes", text: "Inclus dès 9 € par mois : 500 sessions enregistrées par mois, et des heatmaps sans plafond de pages vues" },
        them: { state: "yes", text: "Inclus dans Cloud avec des quotas : 1 500 pages vues de heatmap et 150 enregistrements de sessions par mois" },
      },
      {
        criterion: "Tests A/B",
        us: { state: "yes", text: "Expériences avec verdict de significativité" },
        them: { state: "yes", text: "Tests A/B inclus dans Matomo Cloud" },
      },
      {
        criterion: "Feature flags",
        us: { state: "yes", text: "Ouverture par pourcentage, évaluée par le même script" },
        them: { state: "no", text: "Non proposé" },
      },
      {
        criterion: "Funnels et parcours",
        us: { state: "yes", text: "Funnels multi-étapes avec revenu perdu par étape, plus parcours et rétention hebdomadaire" },
        them: { state: "yes", text: "Funnels, Users Flow et Cohortes inclus dans Cloud" },
      },
      {
        criterion: "Revenu par source de trafic depuis Stripe",
        us: { state: "yes", text: "Une clé Stripe en lecture seule ; chaque paiement est attribué à la session et au canal qui l'ont amené (offre Growth et au-delà)" },
        them: { state: "partial", text: "Suivi e-commerce et attribution multi-canal à partir des événements envoyés par votre site ; pas de connexion Stripe native" },
      },
      {
        criterion: "Serveur MCP pour les assistants IA",
        us: { state: "yes", text: "Le nôtre, hébergé, connexion OAuth, lecture seule par défaut — rien à installer" },
        them: { state: "partial", text: "Un plugin officiel à installer sur votre Matomo puis à activer ; l'accès MCP est désactivé par défaut et peut rester en lecture seule" },
      },
      {
        criterion: "Historique conservé",
        us: { state: "info", text: "30 jours sur l'offre gratuite, jusqu'à 12 mois selon l'offre" },
        them: { state: "info", text: "Données brutes conservées 24 mois, rapports agrégés conservés indéfiniment — plus longtemps que chez nous" },
      },
      {
        criterion: "Données hébergées dans l'Union européenne",
        us: { state: "yes", text: "Stockées en Irlande, serveurs à Dublin" },
        them: { state: "yes", text: "Matomo Cloud stocke les données en Europe ; en auto-hébergé, là où vous les mettez" },
      },
      {
        criterion: "Poids du script de base",
        us: { state: "info", text: "3,7 Ko gzippés ; heatmaps et replay ne chargent du code en plus que si vous les activez" },
        them: { state: "info", text: "matomo.js : 44 Ko compressés, mesuré le 18 septembre 2026" },
      },
    ],
    chooseThem: {
      title: "Choisissez Matomo si…",
      points: [
        "Vous voulez le code sur vos propres serveurs, auditable et sous votre contrôle.",
        "Vous avez besoin d'importer votre historique Google Analytics.",
        "Vous voulez des années d'historique, avec des données brutes conservées deux ans.",
        "Votre organisation impose des logiciels open source.",
      ],
    },
    chooseUs: {
      title: "Choisissez PulseTrack si…",
      points: [
        "Vous ne voulez pas de cookies du tout, plutôt que des cookies à désactiver.",
        "Vous voulez démarrer gratuitement, et payer 9 € plutôt que 22 € quand le site grandit.",
        "Vous voulez chaque euro rattaché à son canal, directement depuis Stripe.",
        "Vous préférez ne pas administrer un serveur d'analytics, ni avoir à le configurer correctement.",
      ],
    },
    details: [
      {
        title: "Des cookies qu'on configure, ou pas de cookies du tout",
        body: "La documentation de Matomo est claire : le code de suivi par défaut utilise des cookies propriétaires, et le suivi sans cookie s'active. Cela fonctionne, et c'est une des raisons pour lesquelles Matomo est recommandé dans certains pays pour des configurations exemptées de consentement. Mais c'est un réglage : quelqu'un doit le faire, le documenter, et ne pas le défaire au prochain déploiement de balise. PulseTrack n'a pas ce réglage parce qu'il n'y a pas de cookie à désactiver — l'identifiant est calculé sur nos serveurs et change chaque jour.",
      },
      {
        title: "Hits, événements, et ce que vous payez vraiment",
        body: "Matomo Cloud se facture au hit : une page vue, un événement, un téléchargement et une recherche interne comptent chacun pour un. PulseTrack se facture à l'événement, et une page vue vaut un événement. Les unités sont assez proches pour être comparées, contrairement à une facturation aux seules pages vues, mais vérifiez vos chiffres : un site qui suit beaucoup d'événements atteint vite 50 000 chez l'un comme chez l'autre.",
      },
      {
        title: "Ce que coûte vraiment l'auto-hébergement",
        body: "L'édition auto-hébergée est gratuite, et c'est un avantage réel — mais la facture se déplace plutôt qu'elle ne disparaît. Vous fournissez le serveur, la base, les mises à jour, les sauvegardes et la tâche d'archivage qui garde les rapports rapides à volume. Si votre organisation exploite déjà de l'infrastructure, c'est peu cher. Sinon, un outil hébergé à 9 ou 22 € par mois revient généralement moins cher que l'après-midi passé sur une mise à jour cassée.",
      },
    ],
    faq: [
      {
        q: "PulseTrack est-il aussi respectueux du RGPD que Matomo ?",
        a: "Les deux sont conçus pour, par des chemins différents. Matomo vous laisse garder les données sur vos serveurs ; PulseTrack les garde en Irlande et n'écrit jamais rien sur l'appareil du visiteur. Aucun des deux ne peut vous dire si votre site a besoin d'une bannière : cela dépend de tous les outils que chargent vos pages.",
      },
      {
        q: "Puis-je importer mon historique Matomo ?",
        a: "Non. Il n'existe pas d'import depuis Matomo aujourd'hui : PulseTrack mesure à partir du jour de l'installation. Vous pouvez faire tourner les deux quelque temps et comparer.",
      },
      {
        q: "Pourquoi votre script est-il beaucoup plus petit ?",
        a: "Parce qu'il en fait moins sur la page. Le script de Matomo porte vingt ans d'options — suivi de contenu, recherche interne, analyse de logs, accroches pour le tag manager. Le nôtre collecte la page, la source et les événements que vous envoyez, et ne récupère les parties lourdes que là où vous les avez activées.",
      },
    ],
    sources: SOURCES,
    checkedOn: "2026-09-18",
  },
};
