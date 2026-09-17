import type { ComparePage } from "./compare";

/**
 * PulseTrack ou PostHog.
 *
 * C'est la comparaison la plus inconfortable, donc celle où il faut
 * être le plus exact : PostHog fait plus de choses que nous, et son
 * offre gratuite est bien plus généreuse. Une page qui prétendrait le
 * contraire serait démentie en trente secondes par la grille tarifaire
 * de PostHog.
 *
 * Ce que nous pouvons dire sans exagérer tient en trois faits
 * vérifiables : leur script pèse vingt-six fois le nôtre, ils posent un
 * cookie par défaut, et l'Europe est chez eux une option choisie à la
 * création du projet plutôt que le seul endroit où les données vivent.
 *
 * Chiffres relevés le 18 septembre 2026 ; poids des scripts mesuré.
 */

const SOURCES = [
  { label: "PostHog — Pricing (free tier allowances per product)", url: "https://posthog.com/pricing" },
  { label: "PostHog blog — Introducing PostHog Cloud EU (AWS eu-central-1, Frankfurt)", url: "https://posthog.com/blog/posthog-cloud-eu" },
  { label: "PostHog docs — Cookieless tracking", url: "https://posthog.com/docs/privacy/cookieless-tracking" },
  { label: "PostHog docs — Heatmaps", url: "https://posthog.com/docs/toolbar/heatmaps" },
  { label: "PostHog docs — Revenue analytics", url: "https://posthog.com/docs/web-analytics/revenue-analytics" },
  { label: "PostHog docs — Model Context Protocol", url: "https://posthog.com/docs/model-context-protocol" },
  { label: "PostHog docs — Self-hosting (officially unsupported)", url: "https://posthog.com/docs/self-host" },
  { label: "us-assets.i.posthog.com/static/array.js, measured by PulseTrack (compressed transfer size)", url: "https://us-assets.i.posthog.com/static/array.js" },
];

export const posthogEn: Record<"posthog", ComparePage> = {
  posthog: {
    competitor: "PostHog",
    metaTitle: "PulseTrack vs PostHog — an honest comparison",
    metaDescription:
      "PostHog is a bigger platform with a far more generous free tier. PulseTrack is cookie-free by default, 26× lighter and European by design. Where each one wins, with sources.",
    eyebrow: "Comparison",
    title: "PulseTrack vs PostHog",
    subtitle:
      "Let us be straight: PostHog does more than PulseTrack, and its free tier is far more generous than ours. It is also a 95 KB script that sets a cookie by default. This page is about which of those two facts matters more for your site.",
    summary: [
      {
        title: "PostHog is the bigger platform",
        body: "Error tracking, surveys, a data warehouse, a CDP: PostHog covers ground we do not. If you want one tool for everything, it is the honest answer.",
      },
      {
        title: "PulseTrack is the lighter one",
        body: "3.7 KB against 95 KB, no cookie, nothing written on the visitor's device — measured, not claimed.",
      },
      {
        title: "Where PostHog wins hardest",
        body: "Its free tier includes 1 million events, 5,000 session recordings and 1 million feature-flag requests a month. Ours includes 5,000 events.",
      },
    ],
    rows: [
      {
        criterion: "Works without cookies",
        us: { state: "yes", text: "No cookie, no local storage: a daily-rotating anonymous identifier computed on the server" },
        them: { state: "partial", text: "Stores a cookie by default; a cookieless mode exists and uses a server-side hash, but you lose identify() and alias()" },
      },
      {
        criterion: "Free plan",
        us: { state: "partial", text: "1 site, 5,000 events a month, 1 funnel, 30 days of history" },
        them: { state: "yes", text: "1M events, 5K session recordings, 1M feature-flag requests, 1,500 survey responses a month — much larger than ours" },
      },
      {
        criterion: "Base script weight",
        us: { state: "info", text: "3.7 KB gzipped; heatmaps and replay load extra code only when you enable them" },
        them: { state: "info", text: "array.js: 95 KB compressed, measured on 18 September 2026" },
      },
      {
        criterion: "Heatmaps",
        us: { state: "yes", text: "Click, scroll and rage-click maps in the dashboard (Starter plan and above)" },
        them: { state: "yes", text: "Clicks, dead clicks, rage clicks and scrollmaps, viewed through the toolbar on your live site" },
      },
      {
        criterion: "Session replay",
        us: { state: "yes", text: "Recorded sessions with every input masked (Starter plan and above)" },
        them: { state: "yes", text: "Session recordings, 5,000 a month on the free tier" },
      },
      {
        criterion: "A/B tests and feature flags",
        us: { state: "yes", text: "Experiments with a significance verdict, and percentage rollouts" },
        them: { state: "yes", text: "Experiments and feature flags, billed together" },
      },
      {
        criterion: "Funnels and retention",
        us: { state: "yes", text: "Multi-step funnels with revenue lost per step, weekly retention cohorts, user flows" },
        them: { state: "yes", text: "Funnels, retention, paths and lifecycle insights" },
      },
      {
        criterion: "Revenue from Stripe",
        us: { state: "yes", text: "A read-only Stripe key; every payment is attributed to the session and the channel that brought it (Growth plan and above)" },
        them: { state: "yes", text: "Revenue analytics built on Stripe as a data-warehouse source, exposed as properties on persons and groups" },
      },
      {
        criterion: "Error tracking, surveys, data warehouse, CDP",
        us: { state: "no", text: "Not offered — PulseTrack stops at analytics, behaviour and revenue" },
        them: { state: "yes", text: "All four, each with its own free monthly allowance" },
      },
      {
        criterion: "MCP server for AI assistants",
        us: { state: "yes", text: "Hosted, OAuth sign-in, read-only by default: writing needs a connection you explicitly allow to write" },
        them: { state: "yes", text: "Official hosted server at mcp.posthog.com; once connected, the agent can read and write across PostHog" },
      },
      {
        criterion: "Data hosted in the EU",
        us: { state: "yes", text: "Only ever in the EU: stored in Ireland, servers in Dublin" },
        them: { state: "partial", text: "EU Cloud on AWS eu-central-1 in Frankfurt, at no extra cost, chosen when you create the account; the US region is the other option" },
      },
      {
        criterion: "Open source and self-hosting",
        us: { state: "no", text: "Not open source; hosted service only" },
        them: { state: "partial", text: "MIT-licensed and self-hostable, but self-hosting is officially unsupported and limited to free-plan features" },
      },
      {
        criterion: "Price",
        us: { state: "info", text: "Free plan; €9 a month for heatmaps, replay and the assistant; €29 for revenue and the API" },
        them: { state: "info", text: "Free until you exceed a product's allowance, then usage-based pricing per product" },
      },
    ],
    chooseThem: {
      title: "Choose PostHog if…",
      points: [
        "You want analytics, error tracking, surveys and a data warehouse in one platform.",
        "Your free allowance matters more than the weight of the script — 1M events a month is hard to beat.",
        "You are building a product where engineers live in the tool all day.",
      ],
    },
    chooseUs: {
      title: "Choose PulseTrack if…",
      points: [
        "You do not want a cookie on your visitors' devices, by default and not as an option.",
        "A 95 KB analytics script on every page is not acceptable to you.",
        "You want your data in the European Union without having to choose a region correctly on day one.",
        "You want the five numbers that matter on one screen, not a platform to learn.",
      ],
    },
    details: [
      {
        title: "The free tier comparison is not close",
        body: "PostHog gives away 1 million events, 5,000 session recordings and 1 million feature-flag requests a month. We give 5,000 events. If cost at low volume is your deciding factor, PostHog wins that argument outright and we would rather say so than let you find out later. What we are selling instead is a smaller surface: no cookie, a script you can read in one sitting, and a dashboard that does not need a tutorial.",
      },
      {
        title: "Cookieless by default, or cookieless if you configure it",
        body: "PostHog can run without cookies: its documentation describes a mode where nothing is stored in the browser and visitors are counted with a hash computed on their servers — the same idea as ours. Two differences matter. It is off by default, so the decision has to be made and re-made by whoever installs the script next. And turning it on means giving up identify() and alias(), while our identify() is designed to work in a cookieless world from the start.",
      },
      {
        title: "Two ways to be in Europe",
        body: "PostHog runs an EU Cloud on AWS in Frankfurt at no extra cost, and it is a genuinely separate instance. But it is a choice made when the account is created, next to a US option. PulseTrack has no other region: data is stored in Ireland and the servers run in Dublin, so there is no wrong answer to pick on day one.",
      },
    ],
    faq: [
      {
        q: "Is PulseTrack a PostHog replacement?",
        a: "For web analytics, heatmaps, replay, funnels, experiments and revenue, yes. For error tracking, surveys, the data warehouse and the CDP, no — those are not in our product and we have no plan to pretend otherwise.",
      },
      {
        q: "Why does the script weight matter so much to you?",
        a: "Because it is paid by every visitor on every page, including the ones who bounce. 95 KB of JavaScript has to be downloaded, parsed and executed before it does anything useful. Ours is 3.7 KB, and the heavier parts — replay, heatmaps — only load on the pages where you turned them on.",
      },
      {
        q: "Can I move my PostHog data to PulseTrack?",
        a: "Not automatically. There is no import from PostHog today, so PulseTrack starts measuring the day you install it. You can run both for a few weeks and compare before switching.",
      },
    ],
    sources: SOURCES,
    checkedOn: "2026-09-18",
  },
};

/* ══════════════════════════════════════════════════════════════
   FRANÇAIS
   ══════════════════════════════════════════════════════════════ */

export const posthogFr: Record<"posthog", ComparePage> = {
  posthog: {
    competitor: "PostHog",
    metaTitle: "PulseTrack ou PostHog — le comparatif honnête",
    metaDescription:
      "PostHog est une plateforme plus large, à l'offre gratuite bien plus généreuse. PulseTrack est sans cookie par défaut, 26× plus léger et européen par conception. Où chacun gagne, sources à l'appui.",
    eyebrow: "Comparatif",
    title: "PulseTrack ou PostHog",
    subtitle:
      "Disons-le franchement : PostHog en fait plus que PulseTrack, et son offre gratuite est bien plus généreuse que la nôtre. C'est aussi un script de 95 Ko qui pose un cookie par défaut. Cette page sert à savoir lequel de ces deux faits compte le plus pour votre site.",
    summary: [
      {
        title: "PostHog est la plateforme la plus large",
        body: "Suivi des erreurs, sondages, entrepôt de données, CDP : PostHog couvre un terrain que nous ne couvrons pas. Si vous voulez un seul outil pour tout, c'est la réponse honnête.",
      },
      {
        title: "PulseTrack est le plus léger",
        body: "3,7 Ko contre 95 Ko, aucun cookie, rien d'écrit sur l'appareil du visiteur — mesuré, pas affirmé.",
      },
      {
        title: "Là où PostHog gagne le plus nettement",
        body: "Son offre gratuite comprend 1 million d'événements, 5 000 enregistrements de sessions et 1 million d'appels de feature flags par mois. La nôtre comprend 5 000 événements.",
      },
    ],
    rows: [
      {
        criterion: "Fonctionne sans cookie",
        us: { state: "yes", text: "Ni cookie ni stockage local : un identifiant anonyme calculé sur le serveur, renouvelé chaque jour" },
        them: { state: "partial", text: "Pose un cookie par défaut ; un mode sans cookie existe et repose sur un hachage côté serveur, mais vous perdez identify() et alias()" },
      },
      {
        criterion: "Offre gratuite",
        us: { state: "partial", text: "1 site, 5 000 événements par mois, 1 funnel, 30 jours d'historique" },
        them: { state: "yes", text: "1 M d'événements, 5 000 enregistrements, 1 M d'appels de feature flags, 1 500 réponses de sondage par mois — bien plus large que la nôtre" },
      },
      {
        criterion: "Poids du script de base",
        us: { state: "info", text: "3,7 Ko gzippés ; heatmaps et replay ne chargent du code en plus que si vous les activez" },
        them: { state: "info", text: "array.js : 95 Ko compressés, mesuré le 18 septembre 2026" },
      },
      {
        criterion: "Heatmaps",
        us: { state: "yes", text: "Cartes de clics, de scroll et de clics de rage dans le tableau de bord (offre Starter et au-delà)" },
        them: { state: "yes", text: "Clics, clics morts, clics de rage et cartes de scroll, consultés via la barre d'outils sur votre site" },
      },
      {
        criterion: "Replay de sessions",
        us: { state: "yes", text: "Sessions enregistrées, toutes les saisies masquées (offre Starter et au-delà)" },
        them: { state: "yes", text: "Enregistrements de sessions, 5 000 par mois sur l'offre gratuite" },
      },
      {
        criterion: "Tests A/B et feature flags",
        us: { state: "yes", text: "Expériences avec verdict de significativité, et ouverture par pourcentage" },
        them: { state: "yes", text: "Expériences et feature flags, facturés ensemble" },
      },
      {
        criterion: "Funnels et rétention",
        us: { state: "yes", text: "Funnels multi-étapes avec revenu perdu par étape, cohortes hebdomadaires, parcours" },
        them: { state: "yes", text: "Funnels, rétention, chemins et analyses de cycle de vie" },
      },
      {
        criterion: "Revenu depuis Stripe",
        us: { state: "yes", text: "Une clé Stripe en lecture seule ; chaque paiement est attribué à la session et au canal qui l'ont amené (offre Growth et au-delà)" },
        them: { state: "yes", text: "Analyse du revenu construite sur Stripe comme source de l'entrepôt de données, exposée en propriétés sur les personnes et les groupes" },
      },
      {
        criterion: "Suivi des erreurs, sondages, entrepôt de données, CDP",
        us: { state: "no", text: "Non proposé — PulseTrack s'arrête à l'analytics, au comportement et au revenu" },
        them: { state: "yes", text: "Les quatre, chacun avec son quota gratuit mensuel" },
      },
      {
        criterion: "Serveur MCP pour les assistants IA",
        us: { state: "yes", text: "Hébergé, connexion OAuth, lecture seule par défaut : écrire suppose une connexion que vous autorisez explicitement à écrire" },
        them: { state: "yes", text: "Serveur officiel hébergé sur mcp.posthog.com ; une fois connecté, l'agent peut lire et écrire dans PostHog" },
      },
      {
        criterion: "Données hébergées dans l'Union européenne",
        us: { state: "yes", text: "Uniquement dans l'UE : stockées en Irlande, serveurs à Dublin" },
        them: { state: "partial", text: "Cloud UE sur AWS eu-central-1 à Francfort, sans surcoût, choisi à la création du compte ; la région américaine est l'autre option" },
      },
      {
        criterion: "Code libre et auto-hébergement",
        us: { state: "no", text: "Pas open source ; service hébergé uniquement" },
        them: { state: "partial", text: "Sous licence MIT et auto-hébergeable, mais l'auto-hébergement n'est officiellement pas supporté et se limite aux fonctions de l'offre gratuite" },
      },
      {
        criterion: "Prix",
        us: { state: "info", text: "Offre gratuite ; 9 € par mois pour heatmaps, replay et assistant ; 29 € pour le revenu et l'API" },
        them: { state: "info", text: "Gratuit jusqu'au quota de chaque produit, puis une tarification à l'usage, produit par produit" },
      },
    ],
    chooseThem: {
      title: "Choisissez PostHog si…",
      points: [
        "Vous voulez analytics, suivi des erreurs, sondages et entrepôt de données dans une seule plateforme.",
        "Votre quota gratuit compte plus que le poids du script — 1 million d'événements par mois est difficile à battre.",
        "Vous construisez un produit où les développeurs passent la journée dans l'outil.",
      ],
    },
    chooseUs: {
      title: "Choisissez PulseTrack si…",
      points: [
        "Vous ne voulez pas de cookie sur l'appareil de vos visiteurs, par défaut et non en option.",
        "Un script d'analytics de 95 Ko sur chaque page n'est pas acceptable pour vous.",
        "Vous voulez vos données dans l'Union européenne sans avoir à choisir la bonne région dès le premier jour.",
        "Vous voulez les cinq chiffres qui comptent sur un écran, pas une plateforme à apprendre.",
      ],
    },
    details: [
      {
        title: "Sur l'offre gratuite, ce n'est pas serré",
        body: "PostHog offre 1 million d'événements, 5 000 enregistrements de sessions et 1 million d'appels de feature flags par mois. Nous en offrons 5 000. Si le coût à faible volume est votre critère décisif, PostHog gagne cet argument sans discussion, et nous préférons le dire plutôt que vous laisser le découvrir ensuite. Ce que nous vendons à la place, c'est une surface plus petite : aucun cookie, un script qui se lit d'une traite, et un tableau de bord qui ne demande pas de tutoriel.",
      },
      {
        title: "Sans cookie par défaut, ou sans cookie si vous le configurez",
        body: "PostHog sait fonctionner sans cookie : sa documentation décrit un mode où rien n'est stocké dans le navigateur et où les visiteurs sont comptés avec un hachage calculé sur leurs serveurs — la même idée que la nôtre. Deux différences comptent. Ce mode est désactivé par défaut, donc la décision doit être prise, puis reprise par la personne qui installera le script la fois suivante. Et l'activer suppose de renoncer à identify() et alias(), alors que notre identify() est conçu dès le départ pour un monde sans cookie.",
      },
      {
        title: "Deux façons d'être en Europe",
        body: "PostHog fait tourner un cloud européen sur AWS à Francfort, sans surcoût, et c'est une instance réellement distincte. Mais c'est un choix fait à la création du compte, à côté d'une option américaine. PulseTrack n'a pas d'autre région : les données sont stockées en Irlande et les serveurs tournent à Dublin, il n'y a donc pas de mauvaise réponse à donner le premier jour.",
      },
    ],
    faq: [
      {
        q: "PulseTrack remplace-t-il PostHog ?",
        a: "Pour l'analytics web, les heatmaps, le replay, les funnels, les expériences et le revenu, oui. Pour le suivi des erreurs, les sondages, l'entrepôt de données et la CDP, non — ce n'est pas dans notre produit et nous n'avons pas l'intention de prétendre le contraire.",
      },
      {
        q: "Pourquoi le poids du script compte-t-il autant pour vous ?",
        a: "Parce qu'il est payé par chaque visiteur sur chaque page, y compris ceux qui repartent aussitôt. 95 Ko de JavaScript doivent être téléchargés, analysés et exécutés avant de servir à quoi que ce soit. Le nôtre pèse 3,7 Ko, et les parties lourdes — replay, heatmaps — ne se chargent que sur les pages où vous les avez activées.",
      },
      {
        q: "Puis-je transférer mes données PostHog vers PulseTrack ?",
        a: "Pas automatiquement. Il n'existe pas d'import depuis PostHog aujourd'hui : PulseTrack mesure à partir du jour de l'installation. Vous pouvez faire tourner les deux quelques semaines et comparer avant de basculer.",
      },
    ],
    sources: SOURCES,
    checkedOn: "2026-09-18",
  },
};
