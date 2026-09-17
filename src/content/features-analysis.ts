import type { FeaturePage } from "./features";

/**
 * Cinq pages de fonctionnalités : replay de sessions, insights,
 * rétention, parcours et comptes.
 *
 * Elles étaient construites depuis des semaines sans qu'aucune page ne
 * les présente — le site vendait la moitié du produit. Chaque promesse
 * ici correspond à du code exercé : les valeurs masquées par le replay,
 * les mesures que l'écran Insights accepte, la fenêtre des cohortes.
 *
 * Le catalogue complet vit dans src/content/features.ts, qui fusionne
 * ce fichier et src/content/features-product.ts.
 */

export type AnalysisSlug = "session-replay" | "insights" | "retention" | "flows" | "accounts";

export const analysisEn: Record<AnalysisSlug, FeaturePage> = {
  "session-replay": {
    art: "replay",
    eyebrow: "Session replay",
    title: "Watch the session",
    titleAccent: "that went wrong",
    subtitle:
      "Replay a real visit like a video: the pages, the scrolling, the hesitations, the rage clicks. Every input value is masked before anything leaves the browser.",
    metaTitle: "Session replay for websites — watch real visits",
    metaDescription:
      "Replay real sessions to see where visitors hesitate, with every input masked by default. Filter by rage clicks, low scroll or funnel drop-off. Cookie-free, EU-hosted.",
    highlights: [
      {
        title: "Inputs masked by default",
        body: "What people type is never recorded. Add the class pt-mask to hide a text, or pt-block to leave a whole element out of the recording.",
      },
      {
        title: "Find the sessions worth watching",
        body: "Filter by rage clicks, sessions that never scrolled, visits without a conversion, or the exact step of a funnel where people left.",
      },
      {
        title: "Recorded on demand, not always",
        body: "Recording is capped by your plan's monthly allowance, and the server decides before the browser starts: your visitors' devices carry nothing extra otherwise.",
      },
    ],
    steps: [
      {
        title: "Add the tracking script",
        body: "The same line that measures your traffic; recording loads as a separate file, only when it is enabled.",
      },
      {
        title: "Pick a signal",
        body: "Open the replay list and filter on rage clicks, low scroll or a funnel step rather than scrolling through everything.",
      },
      {
        title: "Watch, then fix",
        body: "Jump between a page's heatmap and its recorded sessions to see both the pattern and the individual story behind it.",
      },
    ],
    faq: [
      {
        q: "Are passwords or credit-card numbers recorded?",
        a: "No. Recording masks every input value by default, so what visitors type is replaced before it leaves the browser. Sensitive text outside a field can be hidden with the pt-mask class, and any element can be excluded entirely with pt-block.",
      },
      {
        q: "Does recording slow down my site?",
        a: "The recorder is a separate file loaded only when a session is being recorded, and only after the page itself has loaded. The base tracking script stays at 3.7 KB gzipped.",
      },
      {
        q: "How many sessions can I record?",
        a: "500 a month on Starter, 3,000 on Growth and 15,000 on Business. Past the allowance, recording stops until the next month; measurement itself keeps going.",
      },
      {
        q: "How long are recordings kept?",
        a: "As long as your plan's retention window, from 30 days to 12 months. A daily job deletes anything older, including the recording payload itself.",
      },
    ],
    related: ["heatmaps", "funnels", "privacy"],
  },

  insights: {
    art: "insights",
    eyebrow: "Insights",
    title: "Ask the question",
    titleAccent: "nobody planned for",
    subtitle:
      "Every other screen answers a question decided in advance. This one answers yours: any measure, split by any field, filtered, compared, or combined into a ratio.",
    metaTitle: "Custom analytics queries — measures, breakdowns and formulas",
    metaDescription:
      "Build any analytics question: visitors, sessions, pageviews or custom events, split by source, country, page or your own event properties, with formulas and period comparison.",
    highlights: [
      {
        title: "Five measures, any split",
        body: "Pageviews, sessions, visitors, a custom event's count, or the visitors who fired it — split by page, source, country, device, campaign or one of your own event properties.",
      },
      {
        title: "Formulas, not mental arithmetic",
        body: "Divide one measure by another and read a conversion rate directly. Ratios are computed on period totals, never as an average of daily ratios.",
      },
      {
        title: "Compare, then pin",
        body: "Put the previous period next to the current one, then pin the question — not its answer — to a dashboard that recomputes every time it is opened.",
      },
    ],
    steps: [
      {
        title: "Pick a measure",
        body: "Start from pageviews or from one of your custom events, over 24 hours to 365 days.",
      },
      {
        title: "Split and filter",
        body: "Break down by any field, then narrow with up to eight exact-match filters.",
      },
      {
        title: "Save it where your team looks",
        body: "Pin the result to a dashboard, or ask the same question from your AI assistant through the MCP server.",
      },
    ],
    faq: [
      {
        q: "Can I query my own event properties?",
        a: "Yes. Any property sent with a custom event can be used as a breakdown or a filter — the builder lists the keys your site actually sends, so you never have to guess the spelling.",
      },
      {
        q: "Why does a period total differ from the sum of its days?",
        a: "Because visitors are counted per day: the same person on two days is two daily visitors but one visitor over the period. PulseTrack shows the period total computed over the whole window, not the sum of the bars.",
      },
      {
        q: "Are results sampled on large sites?",
        a: "No. Every figure is aggregated in the database over your complete data for the period.",
      },
      {
        q: "Can I get these numbers outside the dashboard?",
        a: "Yes, through the REST API or the MCP server, which exposes the same engine to Claude, ChatGPT and other assistants.",
      },
    ],
    related: ["analytics", "funnels", "dashboards"],
  },

  retention: {
    art: "retention",
    eyebrow: "Retention",
    title: "Do they come back",
    titleAccent: "week after week",
    subtitle:
      "Acquisition tells you who arrived. Retention tells you who stayed — by cohort, for the people you identify, with the share still active at each period.",
    metaTitle: "Cohort retention analysis — do your users come back",
    metaDescription:
      "See how many identified users return each week or month after their first visit, cohort by cohort, with the retention rate per period. Cookie-free analytics.",
    highlights: [
      {
        title: "Cohorts by day, week or month",
        body: "Each cohort starts at a person's first activity, and each column shows how many of them were active that period later.",
      },
      {
        title: "A rate, not just a count",
        body: "Every cell shows the share of its cohort still active, so a small cohort and a large one can be compared at a glance.",
      },
      {
        title: "People, not browsers",
        body: "Retention counts the customers you identify with identify(email). Anonymous visitors cannot be followed across days by design, and the screen says so.",
      },
    ],
    steps: [
      {
        title: "Identify your users",
        body: "Call pulsetrack.identify(email) when someone signs in or signs up.",
      },
      {
        title: "Choose the grain",
        body: "Daily cohorts for an onboarding flow, weekly or monthly for a subscription product.",
      },
      {
        title: "Read the drop",
        body: "The column where the rate collapses is the moment your product stops being used — usually long before a subscription is cancelled.",
      },
    ],
    faq: [
      {
        q: "Why are anonymous visitors excluded?",
        a: "Because PulseTrack's visitor identifier is rebuilt every day and cannot follow anyone across days. Retention needs a durable identity, and the only durable identity is the one you provide with identify().",
      },
      {
        q: "How far back can I look?",
        a: "From 30 days to 365 days, within your plan's retention window.",
      },
      {
        q: "Does identifying users mean tracking them?",
        a: "It means linking a session to an e-mail you already hold as a customer. No cookie is set, nothing is stored on the device, and you decide when to call identify().",
      },
      {
        q: "Can I see retention per acquisition channel?",
        a: "Not yet in the retention screen. You can approximate it today by filtering insights on the source and following the same event over time.",
      },
    ],
    related: ["accounts", "insights", "funnels"],
  },

  flows: {
    art: "flows",
    eyebrow: "User flows",
    title: "See the path",
    titleAccent: "people actually take",
    subtitle:
      "Funnels check a path you imagined. Flows show the one visitors invented — page after page, including the exits you never planned for.",
    metaTitle: "User flow analysis — the paths visitors really take",
    metaDescription:
      "Follow visitors page by page, see where sessions branch and where they end. Start from any page, up to six steps deep, with the long tail grouped instead of hidden.",
    highlights: [
      {
        title: "Step by step, up to six",
        body: "Start from the landing page or from any page you choose, and follow what happens next — including when the session simply ends.",
      },
      {
        title: "The long tail is grouped, not dropped",
        body: "Past the busiest pages of each step, the rest are gathered into one visible group, so nothing silently disappears from the picture.",
      },
      {
        title: "Exits count as a destination",
        body: "A session that stops is shown as such: it is often the most useful branch of the whole diagram.",
      },
    ],
    steps: [
      {
        title: "Pick a starting page",
        body: "Your home page, a campaign landing page, or the article that brings the most traffic.",
      },
      {
        title: "Choose the depth",
        body: "Two steps to check a hand-off, six to follow a long journey.",
      },
      {
        title: "Compare with your funnel",
        body: "Where the real path differs from the one you designed, you have either a bug or a better idea.",
      },
    ],
    faq: [
      {
        q: "What is the difference with funnels?",
        a: "A funnel measures a path you define and tells you where people drop. Flows start from the data and show every path, including the ones you would never have thought to measure.",
      },
      {
        q: "Over which period?",
        a: "From 24 hours to 90 days, computed over your complete data — no sampling.",
      },
      {
        q: "Does it work with custom events?",
        a: "Flows follow pages today. Custom events are available in funnels, insights and the API.",
      },
      {
        q: "Are query strings merged?",
        a: "Paths are used as recorded. If your URLs carry identifiers, they will appear as separate pages.",
      },
    ],
    related: ["funnels", "analytics", "heatmaps"],
  },

  accounts: {
    art: "accounts",
    eyebrow: "Account analytics",
    title: "You sell to companies,",
    titleAccent: "not to browsers",
    subtitle:
      "Five people from the same customer are one account, not five strangers. Declare the account once and read activity, usage and revenue per company.",
    metaTitle: "B2B account analytics — activity and revenue per company",
    metaDescription:
      "Group users by company with one call and follow each account: people, sessions, events, first and last activity, and revenue. Built for B2B SaaS, without cookies.",
    highlights: [
      {
        title: "One call, and accounts exist",
        body: "pulsetrack.group(id, name) attaches the current session to a company. Nothing is guessed from e-mail domains, because a wrong guess is worse than no grouping.",
      },
      {
        title: "Activity and revenue side by side",
        body: "Per account: people, sessions, events, pageviews, first and last activity, and the revenue attributed through Stripe.",
      },
      {
        title: "Quiet accounts are visible",
        body: "The account that stopped logging in three weeks ago is the one your renewal depends on. It is in the list, not buried in an average.",
      },
    ],
    steps: [
      {
        title: "Identify the person",
        body: "Call pulsetrack.identify(email) when they sign in.",
      },
      {
        title: "Declare the account",
        body: "Call pulsetrack.group(accountId, accountName) once you know which company they belong to.",
      },
      {
        title: "Read the account screen",
        body: "Sort by activity or revenue, then open an account to see the people behind it.",
      },
    ],
    faq: [
      {
        q: "Can PulseTrack guess the company from the e-mail domain?",
        a: "No, and that is deliberate. Free-mail domains and shared addresses would produce groupings nobody could correct. You declare the account explicitly.",
      },
      {
        q: "Is account data sent to AI assistants?",
        a: "Only aggregates. Through the MCP server, an assistant sees totals per account — never the e-mail addresses of the people in them.",
      },
      {
        q: "Does it work without Stripe?",
        a: "Yes. Activity per account works on its own; the revenue column appears once Stripe is connected.",
      },
      {
        q: "Which plan includes it?",
        a: "Account analytics is available on every plan, including the free one.",
      },
    ],
    related: ["revenue", "retention", "insights"],
  },
};

export const analysisFr: Record<AnalysisSlug, FeaturePage> = {
  "session-replay": {
    art: "replay",
    eyebrow: "Replay de sessions",
    title: "Revoyez la session",
    titleAccent: "qui a mal tourné",
    subtitle:
      "Rejouez une vraie visite comme une vidéo : les pages, le défilement, les hésitations, les clics de rage. Toutes les saisies sont masquées avant même de quitter le navigateur.",
    metaTitle: "Replay de sessions — revoir les vraies visites de votre site",
    metaDescription:
      "Rejouez de vraies sessions pour voir où vos visiteurs hésitent, avec toutes les saisies masquées par défaut. Filtrez par clics de rage, scroll faible ou abandon de funnel.",
    highlights: [
      {
        title: "Les saisies masquées par défaut",
        body: "Ce que les gens tapent n'est jamais enregistré. Ajoutez la classe pt-mask pour cacher un texte, ou pt-block pour exclure tout un élément de l'enregistrement.",
      },
      {
        title: "Trouver les sessions qui valent le coup",
        body: "Filtrez par clics de rage, sessions sans défilement, visites sans conversion, ou l'étape exacte d'un funnel où les gens sont partis.",
      },
      {
        title: "Enregistré à la demande, pas en permanence",
        body: "L'enregistrement est plafonné par le quota mensuel de votre offre, et le serveur décide avant que le navigateur ne commence : sinon, l'appareil du visiteur ne porte rien de plus.",
      },
    ],
    steps: [
      {
        title: "Ajoutez le script",
        body: "La même ligne que pour vos statistiques ; l'enregistreur est un fichier à part, chargé seulement quand il sert.",
      },
      {
        title: "Choisissez un signal",
        body: "Ouvrez la liste des sessions et filtrez sur les clics de rage, le scroll faible ou une étape de funnel, plutôt que de tout regarder.",
      },
      {
        title: "Regardez, puis corrigez",
        body: "Passez de la heatmap d'une page à ses sessions enregistrées : vous voyez le motif général et l'histoire individuelle qui l'explique.",
      },
    ],
    faq: [
      {
        q: "Les mots de passe ou numéros de carte sont-ils enregistrés ?",
        a: "Non. L'enregistrement masque toutes les valeurs saisies par défaut : ce que tapent vos visiteurs est remplacé avant de quitter le navigateur. Un texte sensible hors champ de saisie se masque avec la classe pt-mask, et tout élément peut être exclu avec pt-block.",
      },
      {
        q: "Est-ce que ça ralentit mon site ?",
        a: "L'enregistreur est un fichier séparé, chargé seulement quand une session est enregistrée, et après le chargement de la page. Le script de base reste à 3,7 Ko gzippé.",
      },
      {
        q: "Combien de sessions puis-je enregistrer ?",
        a: "500 par mois en Starter, 3 000 en Growth et 15 000 en Business. Au-delà, l'enregistrement s'arrête jusqu'au mois suivant ; la mesure du trafic, elle, continue.",
      },
      {
        q: "Combien de temps les enregistrements sont-ils gardés ?",
        a: "La durée de conservation de votre offre, de 30 jours à 12 mois. Un traitement quotidien supprime ce qui est plus ancien, y compris le contenu de l'enregistrement.",
      },
    ],
    related: ["heatmaps", "funnels", "privacy"],
  },

  insights: {
    art: "insights",
    eyebrow: "Insights",
    title: "Posez la question",
    titleAccent: "que personne n'avait prévue",
    subtitle:
      "Tous les autres écrans répondent à une question décidée d'avance. Celui-ci répond à la vôtre : n'importe quelle mesure, découpée par n'importe quel champ, filtrée, comparée, ou combinée en ratio.",
    metaTitle: "Requêtes analytics libres — mesures, découpages et formules",
    metaDescription:
      "Construisez n'importe quelle question : visiteurs, sessions, pages vues ou événements personnalisés, découpés par source, pays, page ou vos propres propriétés, avec formules et comparaison de périodes.",
    highlights: [
      {
        title: "Cinq mesures, tous les découpages",
        body: "Pages vues, sessions, visiteurs, le nombre d'un événement personnalisé ou les visiteurs qui l'ont déclenché — découpés par page, source, pays, appareil, campagne ou une de vos propres propriétés d'événement.",
      },
      {
        title: "Des formules, pas du calcul mental",
        body: "Divisez une mesure par une autre et lisez un taux de conversion directement. Les ratios se calculent sur les totaux de la période, jamais comme une moyenne de ratios quotidiens.",
      },
      {
        title: "Comparez, puis épinglez",
        body: "Posez la période précédente à côté de l'actuelle, puis épinglez la question — pas sa réponse — sur un tableau de bord qui recalcule à chaque ouverture.",
      },
    ],
    steps: [
      {
        title: "Choisissez une mesure",
        body: "Partez des pages vues ou d'un de vos événements personnalisés, sur 24 heures à 365 jours.",
      },
      {
        title: "Découpez et filtrez",
        body: "Répartissez par n'importe quel champ, puis affinez avec jusqu'à huit filtres exacts.",
      },
      {
        title: "Rangez-la où l'équipe regarde",
        body: "Épinglez le résultat sur un tableau de bord, ou posez la même question depuis votre assistant IA via le serveur MCP.",
      },
    ],
    faq: [
      {
        q: "Puis-je interroger mes propres propriétés d'événement ?",
        a: "Oui. Toute propriété envoyée avec un événement personnalisé sert de découpage ou de filtre — le constructeur liste les clés que votre site envoie réellement, vous n'avez donc jamais à deviner l'orthographe.",
      },
      {
        q: "Pourquoi le total d'une période diffère-t-il de la somme des jours ?",
        a: "Parce que les visiteurs se comptent par jour : la même personne sur deux jours fait deux visiteurs quotidiens mais un seul sur la période. PulseTrack affiche le total calculé sur toute la fenêtre, pas la somme des barres.",
      },
      {
        q: "Les résultats sont-ils échantillonnés sur les gros sites ?",
        a: "Non. Chaque chiffre est agrégé en base sur l'intégralité de vos données de la période.",
      },
      {
        q: "Puis-je récupérer ces chiffres hors du tableau de bord ?",
        a: "Oui, via l'API REST ou le serveur MCP, qui expose le même moteur à Claude, ChatGPT et aux autres assistants.",
      },
    ],
    related: ["analytics", "funnels", "dashboards"],
  },

  retention: {
    art: "retention",
    eyebrow: "Rétention",
    title: "Reviennent-ils",
    titleAccent: "semaine après semaine",
    subtitle:
      "L'acquisition dit qui est arrivé. La rétention dit qui est resté — par cohorte, pour les personnes que vous identifiez, avec la part encore active à chaque période.",
    metaTitle: "Rétention par cohortes — vos utilisateurs reviennent-ils",
    metaDescription:
      "Voyez combien d'utilisateurs identifiés reviennent chaque semaine ou chaque mois après leur première visite, cohorte par cohorte, avec le taux de rétention par période.",
    highlights: [
      {
        title: "Des cohortes par jour, semaine ou mois",
        body: "Chaque cohorte démarre à la première activité d'une personne, et chaque colonne montre combien d'entre elles étaient encore actives une période plus tard.",
      },
      {
        title: "Un taux, pas seulement un nombre",
        body: "Chaque case montre la part de sa cohorte encore active : une petite cohorte et une grande se comparent d'un coup d'œil.",
      },
      {
        title: "Des personnes, pas des navigateurs",
        body: "La rétention compte les clients que vous identifiez avec identify(email). Les visiteurs anonymes ne peuvent pas être suivis d'un jour à l'autre, par conception, et l'écran le dit.",
      },
    ],
    steps: [
      {
        title: "Identifiez vos utilisateurs",
        body: "Appelez pulsetrack.identify(email) à la connexion ou à l'inscription.",
      },
      {
        title: "Choisissez la maille",
        body: "Cohortes quotidiennes pour une prise en main, hebdomadaires ou mensuelles pour un abonnement.",
      },
      {
        title: "Lisez la chute",
        body: "La colonne où le taux s'effondre est le moment où votre produit cesse d'être utilisé — souvent bien avant qu'un abonnement soit résilié.",
      },
    ],
    faq: [
      {
        q: "Pourquoi les visiteurs anonymes sont-ils exclus ?",
        a: "Parce que l'identifiant visiteur de PulseTrack est recalculé chaque jour et ne peut suivre personne d'un jour à l'autre. La rétention demande une identité durable, et la seule identité durable est celle que vous fournissez avec identify().",
      },
      {
        q: "Jusqu'où puis-je remonter ?",
        a: "De 30 à 365 jours, dans la limite de la conservation de votre offre.",
      },
      {
        q: "Identifier un utilisateur, est-ce le pister ?",
        a: "C'est relier une session à un e-mail que vous détenez déjà comme client. Aucun cookie n'est posé, rien n'est stocké sur l'appareil, et vous décidez quand appeler identify().",
      },
      {
        q: "Puis-je voir la rétention par canal d'acquisition ?",
        a: "Pas encore dans l'écran Rétention. Vous pouvez l'approcher aujourd'hui en filtrant les insights sur la source et en suivant le même événement dans le temps.",
      },
    ],
    related: ["accounts", "insights", "funnels"],
  },

  flows: {
    art: "flows",
    eyebrow: "Parcours",
    title: "Voyez le chemin",
    titleAccent: "que les gens prennent vraiment",
    subtitle:
      "Un funnel vérifie un chemin que vous avez imaginé. Les parcours montrent celui que vos visiteurs ont inventé — page après page, sorties imprévues comprises.",
    metaTitle: "Analyse des parcours — les chemins réellement empruntés",
    metaDescription:
      "Suivez vos visiteurs page par page, voyez où les sessions se divisent et où elles s'arrêtent. Partez de n'importe quelle page, jusqu'à six étapes, sans masquer la longue traîne.",
    highlights: [
      {
        title: "Étape par étape, jusqu'à six",
        body: "Partez de la page d'arrivée ou de la page de votre choix, et suivez ce qui se passe ensuite — y compris quand la session s'arrête simplement.",
      },
      {
        title: "La longue traîne est regroupée, pas jetée",
        body: "Au-delà des pages les plus fréquentées de chaque étape, le reste est réuni dans un groupe visible : rien ne disparaît en silence.",
      },
      {
        title: "La sortie est une destination",
        body: "Une session qui s'arrête est affichée comme telle : c'est souvent la branche la plus instructive du schéma.",
      },
    ],
    steps: [
      {
        title: "Choisissez une page de départ",
        body: "Votre accueil, une page de campagne, ou l'article qui amène le plus de trafic.",
      },
      {
        title: "Choisissez la profondeur",
        body: "Deux étapes pour vérifier un enchaînement, six pour suivre un long parcours.",
      },
      {
        title: "Comparez avec votre funnel",
        body: "Là où le vrai chemin diffère de celui que vous aviez dessiné, vous avez soit un bug, soit une meilleure idée.",
      },
    ],
    faq: [
      {
        q: "Quelle différence avec les funnels ?",
        a: "Un funnel mesure un chemin que vous définissez et dit où les gens décrochent. Les parcours partent des données et montrent tous les chemins, y compris ceux que vous n'auriez jamais pensé à mesurer.",
      },
      {
        q: "Sur quelle période ?",
        a: "De 24 heures à 90 jours, calculé sur l'intégralité de vos données, sans échantillonnage.",
      },
      {
        q: "Est-ce que ça marche avec les événements personnalisés ?",
        a: "Les parcours suivent les pages aujourd'hui. Les événements personnalisés sont disponibles dans les funnels, les insights et l'API.",
      },
      {
        q: "Les paramètres d'URL sont-ils regroupés ?",
        a: "Les chemins sont utilisés tels qu'enregistrés. Si vos URL portent des identifiants, elles apparaîtront comme des pages distinctes.",
      },
    ],
    related: ["funnels", "analytics", "heatmaps"],
  },

  accounts: {
    art: "accounts",
    eyebrow: "Analyse par compte",
    title: "Vous vendez à des entreprises,",
    titleAccent: "pas à des navigateurs",
    subtitle:
      "Cinq personnes d'un même client font un compte, pas cinq inconnus. Déclarez le compte une fois, et lisez l'activité, l'usage et le revenu par entreprise.",
    metaTitle: "Analytics par compte B2B — activité et revenu par entreprise",
    metaDescription:
      "Regroupez vos utilisateurs par entreprise avec un seul appel et suivez chaque compte : personnes, sessions, événements, première et dernière activité, et revenu.",
    highlights: [
      {
        title: "Un appel, et les comptes existent",
        body: "pulsetrack.group(id, nom) rattache la session en cours à une entreprise. Rien n'est deviné depuis un domaine d'e-mail, car une mauvaise déduction est pire que pas de regroupement.",
      },
      {
        title: "Activité et revenu côte à côte",
        body: "Par compte : personnes, sessions, événements, pages vues, première et dernière activité, et le revenu attribué via Stripe.",
      },
      {
        title: "Les comptes silencieux se voient",
        body: "Le compte qui ne s'est plus connecté depuis trois semaines est celui dont dépend votre renouvellement. Il est dans la liste, pas noyé dans une moyenne.",
      },
    ],
    steps: [
      {
        title: "Identifiez la personne",
        body: "Appelez pulsetrack.identify(email) à sa connexion.",
      },
      {
        title: "Déclarez le compte",
        body: "Appelez pulsetrack.group(identifiant, nom) dès que vous savez à quelle entreprise elle appartient.",
      },
      {
        title: "Lisez l'écran Comptes",
        body: "Triez par activité ou par revenu, puis ouvrez un compte pour voir les personnes derrière.",
      },
    ],
    faq: [
      {
        q: "PulseTrack peut-il deviner l'entreprise depuis le domaine de l'e-mail ?",
        a: "Non, et c'est volontaire. Les adresses personnelles et partagées produiraient des regroupements que personne ne pourrait corriger. Vous déclarez le compte explicitement.",
      },
      {
        q: "Les données de compte sont-elles envoyées aux assistants IA ?",
        a: "Seulement des agrégats. Via le serveur MCP, un assistant voit les totaux par compte — jamais les adresses e-mail des personnes qui les composent.",
      },
      {
        q: "Est-ce que ça marche sans Stripe ?",
        a: "Oui. L'activité par compte fonctionne seule ; la colonne revenu apparaît une fois Stripe connecté.",
      },
      {
        q: "Quelle offre l'inclut ?",
        a: "L'analyse par compte est disponible dans toutes les offres, y compris l'offre gratuite.",
      },
    ],
    related: ["revenue", "retention", "insights"],
  },
};
