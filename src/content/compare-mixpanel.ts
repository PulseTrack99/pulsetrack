import type { ComparePage } from "./compare";

/**
 * PulseTrack ou Mixpanel.
 *
 * Mixpanel est la référence de l'analytics produit, et son offre
 * gratuite est devenue très large : un million d'événements et dix
 * mille replays par mois. Le dire d'emblée évite d'écrire une page que
 * sa grille tarifaire démentirait.
 *
 * Ce que nous opposons est vérifiable : leur SDK stocke son identifiant
 * dans un cookie par défaut — « persistence:"cookie" » se lit dans le
 * fichier distribué — il pèse 33 Ko contre 3,7 Ko, et leur serveur MCP
 * peut écrire dès qu'il est connecté.
 *
 * Chiffres relevés le 18 septembre 2026 ; poids du script mesuré.
 */

const SOURCES = [
  { label: "Mixpanel — Pricing (free and Growth allowances, data residency)", url: "https://mixpanel.com/pricing/" },
  { label: "Mixpanel docs — MCP server (hosted, OAuth, read and write)", url: "https://docs.mixpanel.com/docs/mcp" },
  { label: "cdn.mxpnl.com/libs/mixpanel-2-latest.min.js, measured and read by PulseTrack (size, default persistence)", url: "https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js" },
];

export const mixpanelEn: Record<"mixpanel", ComparePage> = {
  mixpanel: {
    competitor: "Mixpanel",
    metaTitle: "PulseTrack vs Mixpanel — an honest comparison",
    metaDescription:
      "Mixpanel is the product-analytics reference with a large free tier. PulseTrack sets no cookie, weighs 3.7 KB and ties revenue to its source. Where each wins, with sources.",
    eyebrow: "Comparison",
    title: "PulseTrack vs Mixpanel",
    subtitle:
      "Mixpanel invented most of the vocabulary — funnels, cohorts, retention — and gives away a million events a month. PulseTrack is smaller on purpose: no cookie, a 3.7 KB script, and revenue attributed to the channel that earned it without modelling anything first.",
    summary: [
      {
        title: "Mixpanel is the deeper product analytics",
        body: "Cohorts, breakdowns, saved metrics: if you already think in events and properties, it goes further than we do.",
      },
      {
        title: "PulseTrack starts working immediately",
        body: "Pages, sources, devices, revenue and heatmaps are there the moment the script is on the page — nothing to model first.",
      },
      {
        title: "The cookie difference",
        body: "Mixpanel's browser SDK stores its identifier in a cookie by default. PulseTrack writes nothing on the visitor's device at all.",
      },
    ],
    rows: [
      {
        criterion: "Works without cookies",
        us: { state: "yes", text: "No cookie, no local storage: a daily-rotating anonymous identifier computed on the server" },
        them: { state: "no", text: "The browser SDK ships with cookie persistence by default (mp_ prefix); local storage is a configuration option" },
      },
      {
        criterion: "Free plan",
        us: { state: "partial", text: "1 site, 5,000 events a month, 1 funnel, 30 days of history" },
        them: { state: "yes", text: "Up to 1M events a month, unlimited seats, 10K session replays, 10 active feature flags — much larger than ours" },
      },
      {
        criterion: "Base script weight",
        us: { state: "info", text: "3.7 KB gzipped; heatmaps and replay load extra code only when you enable them" },
        them: { state: "info", text: "mixpanel-2-latest.min.js: 33 KB compressed, measured on 18 September 2026" },
      },
      {
        criterion: "Funnels, retention and flows",
        us: { state: "yes", text: "Multi-step funnels with revenue lost per step, weekly cohorts, user flows" },
        them: { state: "yes", text: "The reference implementation: funnels, retention, flows, cohorts and breakdowns" },
      },
      {
        criterion: "Session replay",
        us: { state: "yes", text: "Recorded sessions with every input masked (Starter plan and above)" },
        them: { state: "yes", text: "10K replays a month on the free plan, kept 30 days; 7 to 365 days on Growth" },
      },
      {
        criterion: "Heatmaps",
        us: { state: "yes", text: "Click, scroll and rage-click maps as their own screen, per page" },
        them: { state: "partial", text: "Heatmaps and clickmaps, offered inside session replay" },
      },
      {
        criterion: "A/B tests",
        us: { state: "yes", text: "Experiments with a significance verdict, no separate quota" },
        them: { state: "yes", text: "Experiments, metered in monthly experiment users: 1k on the free plan, 5k on Growth" },
      },
      {
        criterion: "Feature flags",
        us: { state: "yes", text: "Percentage rollouts, no cap on the number of flags" },
        them: { state: "yes", text: "Up to 10 active flags on the free plan, up to 50 on Growth" },
      },
      {
        criterion: "Revenue per traffic source from Stripe",
        us: { state: "yes", text: "A read-only Stripe key; every payment is attributed to the session and channel that brought it (Growth plan and above)" },
        them: { state: "partial", text: "Revenue reporting from the purchase events you send; no native Stripe connection" },
      },
      {
        criterion: "Ready without an event schema",
        us: { state: "yes", text: "Pages, sources, devices and durations are collected and charted from the first pageview" },
        them: { state: "partial", text: "Built around the events and properties you define; the value comes after the tracking plan" },
      },
      {
        criterion: "MCP server for AI assistants",
        us: { state: "yes", text: "Hosted, OAuth sign-in, read-only by default: writing needs a connection you explicitly allow to write" },
        them: { state: "yes", text: "Hosted server with US, EU and India endpoints, OAuth or service accounts; once connected it can read and write" },
      },
      {
        criterion: "Data hosted in the EU",
        us: { state: "yes", text: "Only ever in the EU: stored in Ireland, servers in Dublin" },
        them: { state: "partial", text: "US or EU data residency, chosen for the project" },
      },
      {
        criterion: "Price",
        us: { state: "info", text: "Free plan; €9 a month for heatmaps, replay and the assistant; €29 for revenue and the API" },
        them: { state: "info", text: "Free up to 1M events a month; Growth starts at $0 and scales to 20M events; Enterprise on quote" },
      },
    ],
    chooseThem: {
      title: "Choose Mixpanel if…",
      points: [
        "Your team already thinks in events, properties and cohorts, and wants the deepest analysis of them.",
        "A million events a month for free decides it — that is far beyond our free plan.",
        "You need unlimited seats without paying per user.",
      ],
    },
    chooseUs: {
      title: "Choose PulseTrack if…",
      points: [
        "You want nothing stored on your visitors' devices, not even an identifier in local storage.",
        "You want the traffic report and the revenue report without writing a tracking plan first.",
        "You want every euro traced back to the channel that earned it, straight from Stripe.",
        "You want an AI assistant that cannot change anything unless you let it.",
      ],
    },
    details: [
      {
        title: "Two starting points, not two feature lists",
        body: "Mixpanel starts from the events you decide to send: name them well and the analysis is excellent. PulseTrack starts from the page: the script collects pages, sources, devices, durations and revenue with no schema at all, and custom events are an addition rather than a prerequisite. Neither is better in the abstract. If you have a product team that will maintain a tracking plan, Mixpanel rewards it. If the tracking plan is the thing that never gets written, we are the safer bet.",
      },
      {
        title: "What the cookie difference actually changes",
        body: "Mixpanel's default persistence is a cookie, which is how it recognises the same browser across weeks. That is a real capability, and dropping it is a real cost: PulseTrack counts visitors per day and cannot tell you that today's visitor came back from a campaign three weeks ago unless you identify them yourself. We think the trade is worth it — no banner, nothing to store, nothing to leak — but you should know what you are trading.",
      },
      {
        title: "Both have an MCP server; they are not the same shape",
        body: "Mixpanel's is hosted, signs you in with OAuth, and once connected the assistant can read and write. Ours is hosted and signs you in with OAuth too, but the connection is read-only unless you deliberately create one that can write, and every writing tool is flagged as destructive to the assistant. Same protocol, different default.",
      },
    ],
    faq: [
      {
        q: "Is PulseTrack a Mixpanel replacement?",
        a: "For traffic, funnels, retention, flows, heatmaps, replay, experiments and revenue, yes. For very deep cohort analysis on a large event schema, Mixpanel goes further and we would rather say so.",
      },
      {
        q: "Can I keep the same event names?",
        a: "Yes. PulseTrack takes arbitrary event names and properties through track(), so a tracking plan written for Mixpanel can be sent to us unchanged. What we cannot do is import the history that is already in Mixpanel.",
      },
      {
        q: "Will my numbers match Mixpanel's?",
        a: "Event counts should be close. Unique-user counts will not: Mixpanel follows a browser across days with its cookie, while PulseTrack counts visitors per day. Compare events and conversions, not uniques.",
      },
    ],
    sources: SOURCES,
    checkedOn: "2026-09-18",
  },
};

/* ══════════════════════════════════════════════════════════════
   FRANÇAIS
   ══════════════════════════════════════════════════════════════ */

export const mixpanelFr: Record<"mixpanel", ComparePage> = {
  mixpanel: {
    competitor: "Mixpanel",
    metaTitle: "PulseTrack ou Mixpanel — le comparatif honnête",
    metaDescription:
      "Mixpanel est la référence de l'analytics produit, avec une large offre gratuite. PulseTrack ne pose aucun cookie, pèse 3,7 Ko et relie le revenu à sa source. Où chacun gagne, sources à l'appui.",
    eyebrow: "Comparatif",
    title: "PulseTrack ou Mixpanel",
    subtitle:
      "Mixpanel a inventé la plupart du vocabulaire — funnels, cohortes, rétention — et offre un million d'événements par mois. PulseTrack est plus petit volontairement : aucun cookie, un script de 3,7 Ko, et le revenu attribué au canal qui l'a rapporté sans rien modéliser au préalable.",
    summary: [
      {
        title: "Mixpanel va plus loin sur l'analytics produit",
        body: "Cohortes, découpages, mesures enregistrées : si vous pensez déjà en événements et propriétés, il va plus loin que nous.",
      },
      {
        title: "PulseTrack fonctionne immédiatement",
        body: "Pages, sources, appareils, revenu et heatmaps sont là dès que le script est sur la page — rien à modéliser d'abord.",
      },
      {
        title: "La différence du cookie",
        body: "Le SDK navigateur de Mixpanel stocke son identifiant dans un cookie par défaut. PulseTrack n'écrit rien du tout sur l'appareil du visiteur.",
      },
    ],
    rows: [
      {
        criterion: "Fonctionne sans cookie",
        us: { state: "yes", text: "Ni cookie ni stockage local : un identifiant anonyme calculé sur le serveur, renouvelé chaque jour" },
        them: { state: "no", text: "Le SDK navigateur est livré avec la persistance par cookie par défaut (préfixe mp_) ; le stockage local est une option de configuration" },
      },
      {
        criterion: "Offre gratuite",
        us: { state: "partial", text: "1 site, 5 000 événements par mois, 1 funnel, 30 jours d'historique" },
        them: { state: "yes", text: "Jusqu'à 1 M d'événements par mois, sièges illimités, 10 000 replays, 10 feature flags actifs — bien plus large que la nôtre" },
      },
      {
        criterion: "Poids du script de base",
        us: { state: "info", text: "3,7 Ko gzippés ; heatmaps et replay ne chargent du code en plus que si vous les activez" },
        them: { state: "info", text: "mixpanel-2-latest.min.js : 33 Ko compressés, mesuré le 18 septembre 2026" },
      },
      {
        criterion: "Funnels, rétention et parcours",
        us: { state: "yes", text: "Funnels multi-étapes avec revenu perdu par étape, cohortes hebdomadaires, parcours" },
        them: { state: "yes", text: "La référence du genre : funnels, rétention, parcours, cohortes et découpages" },
      },
      {
        criterion: "Replay de sessions",
        us: { state: "yes", text: "Sessions enregistrées, toutes les saisies masquées (offre Starter et au-delà)" },
        them: { state: "yes", text: "10 000 replays par mois sur l'offre gratuite, conservés 30 jours ; 7 à 365 jours en Growth" },
      },
      {
        criterion: "Heatmaps",
        us: { state: "yes", text: "Cartes de clics, de scroll et de clics de rage, sur leur propre écran, page par page" },
        them: { state: "partial", text: "Heatmaps et cartes de clics, proposées à l'intérieur du replay de sessions" },
      },
      {
        criterion: "Tests A/B",
        us: { state: "yes", text: "Expériences avec verdict de significativité, sans quota séparé" },
        them: { state: "yes", text: "Expériences, comptées en utilisateurs d'expérience par mois : 1 000 sur l'offre gratuite, 5 000 en Growth" },
      },
      {
        criterion: "Feature flags",
        us: { state: "yes", text: "Ouverture par pourcentage, sans limite sur le nombre de flags" },
        them: { state: "yes", text: "Jusqu'à 10 flags actifs sur l'offre gratuite, jusqu'à 50 en Growth" },
      },
      {
        criterion: "Revenu par source de trafic depuis Stripe",
        us: { state: "yes", text: "Une clé Stripe en lecture seule ; chaque paiement est attribué à la session et au canal qui l'ont amené (offre Growth et au-delà)" },
        them: { state: "partial", text: "Rapports de revenu à partir des événements d'achat que vous envoyez ; pas de connexion Stripe native" },
      },
      {
        criterion: "Utilisable sans plan de taggage",
        us: { state: "yes", text: "Pages, sources, appareils et durées sont collectés et mis en graphique dès la première page vue" },
        them: { state: "partial", text: "Construit autour des événements et propriétés que vous définissez ; la valeur arrive après le plan de taggage" },
      },
      {
        criterion: "Serveur MCP pour les assistants IA",
        us: { state: "yes", text: "Hébergé, connexion OAuth, lecture seule par défaut : écrire suppose une connexion que vous autorisez explicitement à écrire" },
        them: { state: "yes", text: "Serveur hébergé avec des points d'entrée aux États-Unis, dans l'UE et en Inde, OAuth ou comptes de service ; une fois connecté, il peut lire et écrire" },
      },
      {
        criterion: "Données hébergées dans l'Union européenne",
        us: { state: "yes", text: "Uniquement dans l'UE : stockées en Irlande, serveurs à Dublin" },
        them: { state: "partial", text: "Résidence des données aux États-Unis ou dans l'UE, choisie pour le projet" },
      },
      {
        criterion: "Prix",
        us: { state: "info", text: "Offre gratuite ; 9 € par mois pour heatmaps, replay et assistant ; 29 € pour le revenu et l'API" },
        them: { state: "info", text: "Gratuit jusqu'à 1 M d'événements par mois ; Growth démarre à 0 $ et monte à 20 M d'événements ; Enterprise sur devis" },
      },
    ],
    chooseThem: {
      title: "Choisissez Mixpanel si…",
      points: [
        "Votre équipe pense déjà en événements, propriétés et cohortes, et veut l'analyse la plus poussée.",
        "Un million d'événements par mois gratuitement emporte la décision — c'est très au-delà de notre offre gratuite.",
        "Vous avez besoin de sièges illimités sans payer par utilisateur.",
      ],
    },
    chooseUs: {
      title: "Choisissez PulseTrack si…",
      points: [
        "Vous ne voulez rien stocker sur l'appareil de vos visiteurs, pas même un identifiant en stockage local.",
        "Vous voulez le rapport de trafic et le rapport de revenu sans écrire d'abord un plan de taggage.",
        "Vous voulez chaque euro rattaché au canal qui l'a rapporté, directement depuis Stripe.",
        "Vous voulez un assistant IA incapable de modifier quoi que ce soit sans votre accord.",
      ],
    },
    details: [
      {
        title: "Deux points de départ, pas deux listes de fonctions",
        body: "Mixpanel part des événements que vous décidez d'envoyer : bien nommés, l'analyse est excellente. PulseTrack part de la page : le script collecte pages, sources, appareils, durées et revenu sans aucun schéma, et les événements personnalisés sont un ajout plutôt qu'un préalable. Aucun n'est meilleur dans l'absolu. Si vous avez une équipe produit qui maintiendra un plan de taggage, Mixpanel le récompense. Si le plan de taggage est précisément ce qui ne s'écrit jamais, nous sommes le pari plus sûr.",
      },
      {
        title: "Ce que change vraiment le cookie",
        body: "La persistance par défaut de Mixpanel est un cookie : c'est ainsi qu'il reconnaît le même navigateur d'une semaine à l'autre. C'est une vraie capacité, et y renoncer a un vrai coût : PulseTrack compte des visiteurs par jour et ne saura pas vous dire que le visiteur d'aujourd'hui revient d'une campagne d'il y a trois semaines, sauf si vous l'identifiez vous-même. Nous pensons que l'échange en vaut la peine — pas de bannière, rien à stocker, rien à faire fuir — mais vous devez savoir ce que vous échangez.",
      },
      {
        title: "Les deux ont un serveur MCP, pas de la même forme",
        body: "Celui de Mixpanel est hébergé, vous connecte en OAuth, et une fois connecté l'assistant peut lire et écrire. Le nôtre est hébergé et connecte aussi en OAuth, mais la connexion est en lecture seule tant que vous n'en créez pas délibérément une autorisée à écrire, et chaque outil d'écriture est signalé comme destructif à l'assistant. Même protocole, défaut différent.",
      },
    ],
    faq: [
      {
        q: "PulseTrack remplace-t-il Mixpanel ?",
        a: "Pour le trafic, les funnels, la rétention, les parcours, les heatmaps, le replay, les expériences et le revenu, oui. Pour une analyse de cohortes très poussée sur un grand schéma d'événements, Mixpanel va plus loin et nous préférons le dire.",
      },
      {
        q: "Puis-je garder les mêmes noms d'événements ?",
        a: "Oui. PulseTrack accepte des noms et propriétés d'événements libres via track() : un plan de taggage écrit pour Mixpanel peut nous être envoyé tel quel. Ce que nous ne savons pas faire, c'est importer l'historique déjà présent dans Mixpanel.",
      },
      {
        q: "Mes chiffres correspondront-ils à ceux de Mixpanel ?",
        a: "Les volumes d'événements devraient être proches. Les utilisateurs uniques, non : Mixpanel suit un navigateur sur plusieurs jours grâce à son cookie, quand PulseTrack compte des visiteurs par jour. Comparez les événements et les conversions, pas les uniques.",
      },
    ],
    sources: SOURCES,
    checkedOn: "2026-09-18",
  },
};
