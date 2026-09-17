import type { ComparePage } from "./compare";

/**
 * PulseTrack ou Plausible.
 *
 * C'est le voisin le plus proche : sans cookie, hébergé en Europe, une
 * interface qui tient sur un écran. La page serait malhonnête si elle
 * ne disait pas où Plausible gagne — et il gagne à trois endroits
 * mesurables : son script est trois fois plus léger que le nôtre, son
 * code est libre et auto-hébergeable, et il importe l'historique
 * Google Analytics, ce que nous ne savons pas encore faire.
 *
 * Chiffres relevés le 18 septembre 2026 ; poids des scripts mesuré,
 * pas recopié.
 */

const SOURCES = [
  { label: "Plausible Analytics — Pricing (plans, trial, features per plan)", url: "https://plausible.io/#pricing" },
  { label: "Plausible docs — Accessing your Plausible data (Stats API, MCP)", url: "https://plausible.io/docs/data-access" },
  { label: "plausible/analytics on GitHub — AGPLv3, Community Edition", url: "https://github.com/plausible/analytics" },
  { label: "plausible.io/js/script.js, measured by PulseTrack (compressed transfer size)", url: "https://plausible.io/js/script.js" },
];

export const plausibleEn: Record<"plausible", ComparePage> = {
  plausible: {
    competitor: "Plausible",
    metaTitle: "PulseTrack vs Plausible — an honest comparison",
    metaDescription:
      "Both are cookie-free and hosted in the EU. Where they differ: heatmaps, session replay, A/B tests, Stripe revenue — and where Plausible wins, including a lighter script and open source.",
    eyebrow: "Comparison",
    title: "PulseTrack vs Plausible",
    subtitle:
      "Plausible and PulseTrack agree on the hard part: no cookies, no cross-site tracking, data in the EU. They disagree on scope. Plausible stays a beautifully small traffic dashboard; PulseTrack adds heatmaps, session replay, A/B tests and revenue from Stripe. Here is the whole picture, including where Plausible is the better answer.",
    summary: [
      {
        title: "Same privacy stance",
        body: "Neither tool sets a cookie or follows a visitor across sites. If that is your only requirement, both qualify and the rest is about scope.",
      },
      {
        title: "One tool or two",
        body: "Plausible measures traffic. Seeing why a page fails means adding a second tool. PulseTrack keeps heatmaps, replay and experiments in the same account.",
      },
      {
        title: "Where Plausible wins",
        body: "Its script is 1.3 KB against our 3.7 KB, its code is AGPLv3 and self-hostable for free, and it imports your Google Analytics history today.",
      },
    ],
    rows: [
      {
        criterion: "Works without cookies",
        us: { state: "yes", text: "No cookie, no local storage: a daily-rotating anonymous identifier computed on the server" },
        them: { state: "yes", text: "No cookies, no persistent identifiers, no cross-site or cross-device tracking" },
      },
      {
        criterion: "Free plan",
        us: { state: "yes", text: "1 site, 5,000 events a month, 1 funnel, 30 days of history — no card" },
        them: { state: "no", text: "No free plan; a 30-day trial without a card, then a paid plan" },
      },
      {
        criterion: "Entry price",
        us: { state: "info", text: "€9 a month: 3 sites, 50,000 events, heatmaps, session replay and the AI assistant" },
        them: { state: "info", text: "$9 a month: 10,000 pageviews on the Starter plan (pageviews and events do not count the same way)" },
      },
      {
        criterion: "Heatmaps",
        us: { state: "yes", text: "Click, scroll and rage-click maps (Starter plan and above)" },
        them: { state: "no", text: "Not offered" },
      },
      {
        criterion: "Session replay",
        us: { state: "yes", text: "Recorded sessions with every input masked (Starter plan and above)" },
        them: { state: "no", text: "Not offered" },
      },
      {
        criterion: "A/B tests and feature flags",
        us: { state: "yes", text: "Experiments with a significance verdict, and percentage rollouts" },
        them: { state: "no", text: "Not offered" },
      },
      {
        criterion: "Funnels",
        us: { state: "yes", text: "From the free plan (1 funnel), 5 on Starter, 20 on Growth, with revenue lost per step" },
        them: { state: "partial", text: "Funnels and user journeys are on the Business plan, $19 a month" },
      },
      {
        criterion: "Revenue per traffic source from Stripe",
        us: { state: "yes", text: "Connect a read-only Stripe key; payments are matched to the sessions that brought them (Growth plan and above)" },
        them: { state: "partial", text: "Revenue attribution from custom events you send with an amount, on the Business plan; no Stripe connection" },
      },
      {
        criterion: "Retention cohorts",
        us: { state: "yes", text: "Weekly cohorts on any event, with the return curve" },
        them: { state: "no", text: "Not offered" },
      },
      {
        criterion: "MCP server for AI assistants",
        us: { state: "yes", text: "Ours, hosted, OAuth sign-in, read-only by default, changes only with your permission" },
        them: { state: "partial", text: "An MCP server built by the Sentry team and linked from Plausible's docs, not published by Plausible itself" },
      },
      {
        criterion: "Google Analytics import",
        us: { state: "no", text: "Not yet: PulseTrack measures from the day you install it" },
        them: { state: "yes", text: "Included from the Starter plan" },
      },
      {
        criterion: "Open source and self-hosting",
        us: { state: "no", text: "Not open source; hosted service only" },
        them: { state: "yes", text: "AGPLv3, with a free self-hosted Community Edition" },
      },
      {
        criterion: "Data hosted in the EU",
        us: { state: "yes", text: "Stored in Ireland, servers in Dublin" },
        them: { state: "yes", text: "Built and hosted in the EU on European-owned infrastructure" },
      },
      {
        criterion: "API",
        us: { state: "partial", text: "Stats API and daily signed export (Growth plan and above)" },
        them: { state: "partial", text: "Stats API on the Business plan, 600 requests an hour; Sites API on Enterprise" },
      },
      {
        criterion: "Base script weight",
        us: { state: "info", text: "3.7 KB gzipped; heatmaps and replay load extra code only when you enable them" },
        them: { state: "info", text: "1.3 KB gzipped, measured on 18 September 2026 — lighter than ours" },
      },
    ],
    chooseThem: {
      title: "Choose Plausible if…",
      points: [
        "You want the lightest possible script and nothing more than traffic numbers.",
        "You want to read the source, or host it yourself for free.",
        "You need your Google Analytics history imported now.",
      ],
    },
    chooseUs: {
      title: "Choose PulseTrack if…",
      points: [
        "You want to see why a page fails, not only that it fails — heatmaps and replay included.",
        "You want to know which channel brings paying customers, straight from Stripe.",
        "You run A/B tests or feature flags and would rather not add a third tool.",
        "You want to start free and stay free while the site is small.",
      ],
    },
    details: [
      {
        title: "Two tools that measure the same thing differently",
        body: "Plausible counts pageviews; PulseTrack counts events, and a pageview is one event among others. A plan sold on 10,000 pageviews and one sold on 50,000 events are not the same allowance, in either direction: a content site sends almost only pageviews, while an app that tracks clicks and form steps burns through events much faster. Compare on your own traffic before comparing the prices.",
      },
      {
        title: "Why our script is heavier",
        body: "1.3 KB against 3.7 KB is a real difference and it comes from what the file does. Ours carries identify(), group(), feature-flag evaluation and the hooks that trigger heatmaps and replay on demand. If you never use any of them, you are paying for code you never run — that is an honest reason to pick Plausible.",
      },
      {
        title: "Open source, and what it buys you",
        body: "Plausible is AGPLv3 and can be self-hosted for free; PulseTrack is not open source. If auditing the code or keeping the data on your own machines is a requirement, that settles it. If what you actually want is for the data to stay in Europe, both answer it: ours is stored in Ireland and served from Dublin.",
      },
    ],
    faq: [
      {
        q: "Can I run both at once?",
        a: "Yes, the two scripts are independent. Expect close but not identical numbers: both count visitors per day without cookies, but each has its own bot filtering and its own way of closing a session.",
      },
      {
        q: "Does PulseTrack need a cookie banner, like Plausible does not?",
        a: "PulseTrack sets no cookie and reads nothing on the device, exactly as Plausible does. Whether your site needs a banner also depends on the other tools it loads, so check with your own advisor.",
      },
      {
        q: "Is session replay compatible with not having cookies?",
        a: "Yes. A recording is attached to a session, not to a person followed across days, and every input value is masked in the browser before anything is sent.",
      },
    ],
    sources: SOURCES,
    checkedOn: "2026-09-18",
  },
};

/* ══════════════════════════════════════════════════════════════
   FRANÇAIS
   ══════════════════════════════════════════════════════════════ */

export const plausibleFr: Record<"plausible", ComparePage> = {
  plausible: {
    competitor: "Plausible",
    metaTitle: "PulseTrack ou Plausible — le comparatif honnête",
    metaDescription:
      "Tous deux sans cookie et hébergés en Europe. Ce qui les sépare : heatmaps, replay, tests A/B, revenu Stripe — et là où Plausible gagne, script plus léger et code libre compris.",
    eyebrow: "Comparatif",
    title: "PulseTrack ou Plausible",
    subtitle:
      "Plausible et PulseTrack sont d'accord sur le plus difficile : pas de cookie, pas de suivi entre sites, données en Europe. Ils divergent sur l'étendue. Plausible reste un très beau tableau de trafic ; PulseTrack y ajoute heatmaps, replay de sessions, tests A/B et revenu Stripe. Voici le tableau complet, y compris là où Plausible est la meilleure réponse.",
    summary: [
      {
        title: "La même position sur la vie privée",
        body: "Aucun des deux ne pose de cookie ni ne suit un visiteur d'un site à l'autre. Si c'est votre seule exigence, les deux conviennent et le reste est une question d'étendue.",
      },
      {
        title: "Un outil ou deux",
        body: "Plausible mesure le trafic. Comprendre pourquoi une page échoue demande un second outil. PulseTrack garde heatmaps, replay et expériences dans le même compte.",
      },
      {
        title: "Là où Plausible gagne",
        body: "Son script pèse 1,3 Ko contre 3,7 Ko pour le nôtre, son code est sous AGPLv3 et auto-hébergeable gratuitement, et il importe votre historique Google Analytics dès aujourd'hui.",
      },
    ],
    rows: [
      {
        criterion: "Fonctionne sans cookie",
        us: { state: "yes", text: "Ni cookie ni stockage local : un identifiant anonyme calculé sur le serveur, renouvelé chaque jour" },
        them: { state: "yes", text: "Ni cookie, ni identifiant persistant, ni suivi entre sites ou entre appareils" },
      },
      {
        criterion: "Offre gratuite",
        us: { state: "yes", text: "1 site, 5 000 événements par mois, 1 funnel, 30 jours d'historique — sans carte" },
        them: { state: "no", text: "Pas d'offre gratuite ; un essai de 30 jours sans carte, puis une offre payante" },
      },
      {
        criterion: "Prix d'entrée",
        us: { state: "info", text: "9 € par mois : 3 sites, 50 000 événements, heatmaps, replay et assistant IA" },
        them: { state: "info", text: "9 $ par mois : 10 000 pages vues sur l'offre Starter (pages vues et événements ne se comptent pas pareil)" },
      },
      {
        criterion: "Heatmaps",
        us: { state: "yes", text: "Cartes de clics, de scroll et de clics de rage (offre Starter et au-delà)" },
        them: { state: "no", text: "Non proposé" },
      },
      {
        criterion: "Replay de sessions",
        us: { state: "yes", text: "Sessions enregistrées, toutes les saisies masquées (offre Starter et au-delà)" },
        them: { state: "no", text: "Non proposé" },
      },
      {
        criterion: "Tests A/B et feature flags",
        us: { state: "yes", text: "Expériences avec verdict de significativité, et ouverture par pourcentage" },
        them: { state: "no", text: "Non proposé" },
      },
      {
        criterion: "Funnels",
        us: { state: "yes", text: "Dès l'offre gratuite (1 funnel), 5 en Starter, 20 en Growth, avec le revenu perdu par étape" },
        them: { state: "partial", text: "Funnels et parcours sur l'offre Business, 19 $ par mois" },
      },
      {
        criterion: "Revenu par source de trafic depuis Stripe",
        us: { state: "yes", text: "Une clé Stripe en lecture seule ; les paiements sont rattachés aux sessions qui les ont amenés (offre Growth et au-delà)" },
        them: { state: "partial", text: "Attribution du revenu à partir d'événements personnalisés que vous envoyez avec un montant, sur l'offre Business ; pas de connexion Stripe" },
      },
      {
        criterion: "Cohortes de rétention",
        us: { state: "yes", text: "Cohortes hebdomadaires sur n'importe quel événement, avec la courbe de retour" },
        them: { state: "no", text: "Non proposé" },
      },
      {
        criterion: "Serveur MCP pour les assistants IA",
        us: { state: "yes", text: "Le nôtre, hébergé, connexion OAuth, lecture seule par défaut, modifications seulement avec votre accord" },
        them: { state: "partial", text: "Un serveur MCP construit par l'équipe Sentry et cité dans la documentation de Plausible, pas publié par Plausible" },
      },
      {
        criterion: "Import Google Analytics",
        us: { state: "no", text: "Pas encore : PulseTrack mesure à partir du jour de l'installation" },
        them: { state: "yes", text: "Inclus dès l'offre Starter" },
      },
      {
        criterion: "Code libre et auto-hébergement",
        us: { state: "no", text: "Pas open source ; service hébergé uniquement" },
        them: { state: "yes", text: "AGPLv3, avec une Community Edition auto-hébergeable gratuitement" },
      },
      {
        criterion: "Données hébergées dans l'Union européenne",
        us: { state: "yes", text: "Stockées en Irlande, serveurs à Dublin" },
        them: { state: "yes", text: "Conçu et hébergé dans l'UE, sur une infrastructure européenne" },
      },
      {
        criterion: "API",
        us: { state: "partial", text: "API de statistiques et export quotidien signé (offre Growth et au-delà)" },
        them: { state: "partial", text: "Stats API sur l'offre Business, 600 requêtes par heure ; Sites API sur Enterprise" },
      },
      {
        criterion: "Poids du script de base",
        us: { state: "info", text: "3,7 Ko gzippés ; heatmaps et replay ne chargent du code en plus que si vous les activez" },
        them: { state: "info", text: "1,3 Ko gzippés, mesuré le 18 septembre 2026 — plus léger que le nôtre" },
      },
    ],
    chooseThem: {
      title: "Choisissez Plausible si…",
      points: [
        "Vous voulez le script le plus léger possible et rien de plus que des chiffres de trafic.",
        "Vous voulez lire le code source, ou l'héberger vous-même gratuitement.",
        "Vous avez besoin d'importer votre historique Google Analytics maintenant.",
      ],
    },
    chooseUs: {
      title: "Choisissez PulseTrack si…",
      points: [
        "Vous voulez voir pourquoi une page échoue, pas seulement qu'elle échoue — heatmaps et replay compris.",
        "Vous voulez savoir quel canal amène des clients payants, directement depuis Stripe.",
        "Vous faites des tests A/B ou des feature flags et préférez éviter un troisième outil.",
        "Vous voulez commencer gratuitement et le rester tant que le site est petit.",
      ],
    },
    details: [
      {
        title: "Deux outils qui mesurent la même chose différemment",
        body: "Plausible compte des pages vues ; PulseTrack compte des événements, et une page vue est un événement parmi d'autres. Une offre vendue sur 10 000 pages vues et une autre sur 50 000 événements ne sont pas le même volume, dans un sens comme dans l'autre : un site de contenu n'envoie presque que des pages vues, tandis qu'une application qui suit les clics et les étapes de formulaire consomme des événements bien plus vite. Comparez sur votre trafic avant de comparer les prix.",
      },
      {
        title: "Pourquoi notre script est plus lourd",
        body: "1,3 Ko contre 3,7 Ko est un écart réel, et il vient de ce que le fichier sait faire. Le nôtre embarque identify(), group(), l'évaluation des feature flags et les points d'accroche qui déclenchent heatmaps et replay à la demande. Si vous ne vous en servez jamais, vous payez pour du code que vous n'exécutez pas — c'est une raison honnête de préférer Plausible.",
      },
      {
        title: "Le code libre, et ce qu'il vous apporte",
        body: "Plausible est sous AGPLv3 et s'auto-héberge gratuitement ; PulseTrack n'est pas open source. Si auditer le code ou garder les données sur vos machines est une exigence, la question est tranchée. Si ce que vous voulez vraiment est que les données restent en Europe, les deux y répondent : les nôtres sont stockées en Irlande et servies depuis Dublin.",
      },
    ],
    faq: [
      {
        q: "Puis-je faire tourner les deux en même temps ?",
        a: "Oui, les deux scripts sont indépendants. Attendez-vous à des chiffres proches mais pas identiques : tous deux comptent des visiteurs par jour sans cookie, mais chacun a son filtrage des robots et sa façon de clore une session.",
      },
      {
        q: "PulseTrack demande-t-il une bannière de consentement, alors que Plausible non ?",
        a: "PulseTrack ne pose aucun cookie et ne lit rien sur l'appareil, exactement comme Plausible. Le besoin d'une bannière dépend aussi des autres outils que charge votre site : vérifiez avec votre conseil.",
      },
      {
        q: "Le replay de sessions est-il compatible avec l'absence de cookie ?",
        a: "Oui. Un enregistrement est rattaché à une session, pas à une personne suivie sur plusieurs jours, et chaque valeur saisie est masquée dans le navigateur avant tout envoi.",
      },
    ],
    sources: SOURCES,
    checkedOn: "2026-09-18",
  },
};
