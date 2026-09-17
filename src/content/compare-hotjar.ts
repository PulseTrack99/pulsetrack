import type { ComparePage } from "./compare";

/**
 * PulseTrack ou Hotjar.
 *
 * Une particularité change la comparaison : depuis le 1er juillet 2025,
 * Hotjar (Hotjar Ltd, Malte) a fusionné dans le groupe Contentsquare.
 * Les anciennes offres Basic / Plus / Business / Scale ont laissé place
 * à Free / Growth / Pro / Enterprise, et la page de tarifs de Hotjar
 * redirige vers celle de Contentsquare. Le dire est plus utile que de
 * comparer des offres qui n'existent plus.
 *
 * Leur offre gratuite est très large — 200 000 sessions par mois — et
 * ils ont des sondages, que nous n'avons pas. En face, nous mesurons le
 * trafic et le revenu dans le même outil, sans cookie, et notre tarif
 * est public jusqu'en haut de la grille.
 *
 * Chiffres relevés le 18 septembre 2026 ; poids des scripts mesuré.
 */

const SOURCES = [
  {
    label: "Contentsquare Help Center — Hotjar is now part of Contentsquare: plans and pricing (merger date, plan names)",
    url: "https://support.contentsquare.com/hc/en-us/articles/37271913608721-Hotjar-is-now-part-of-Contentsquare-Plans-and-Pricing",
  },
  { label: "Contentsquare — Pricing (Free and Growth allowances, replay capture rate, MCP)", url: "https://contentsquare.com/pricing/" },
  { label: "static.hotjar.com tag and script.hotjar.com modules, measured and read by PulseTrack (size, cookies)", url: "https://static.hotjar.com/" },
];

export const hotjarEn: Record<"hotjar", ComparePage> = {
  hotjar: {
    competitor: "Hotjar",
    metaTitle: "PulseTrack vs Hotjar — an honest comparison",
    metaDescription:
      "Hotjar merged into Contentsquare on 1 July 2025. How its Free and Growth plans compare with PulseTrack on heatmaps, replay, analytics, cookies and script weight — with sources.",
    eyebrow: "Comparison",
    title: "PulseTrack vs Hotjar",
    subtitle:
      "Hotjar showed everyone what a heatmap is for. Since 1 July 2025 it is part of Contentsquare, and its plans are now Free, Growth, Pro and Enterprise. It remains a behaviour tool you add next to your analytics; PulseTrack is both in one place, without cookies.",
    summary: [
      {
        title: "One tool instead of two",
        body: "Hotjar shows behaviour; your traffic and revenue live somewhere else. PulseTrack puts pages, sources, revenue, heatmaps and replay in the same account.",
      },
      {
        title: "No cookies, and a much lighter page",
        body: "Hotjar's recording module writes _hj cookies and weighs about 62 KB on a recorded page. Our script is 3.7 KB, and replay only loads where you enabled it.",
      },
      {
        title: "Where Hotjar wins",
        body: "Its free plan covers 200,000 sessions a month, and it has surveys, feedback widgets and usability testing — none of which we offer.",
      },
    ],
    rows: [
      {
        criterion: "Works without cookies",
        us: { state: "yes", text: "No cookie, no local storage: a daily-rotating anonymous identifier computed on the server" },
        them: { state: "no", text: "The recording module writes cookies on the visitor's device, under _hj names" },
      },
      {
        criterion: "Traffic analytics: pages, sources, devices",
        us: { state: "yes", text: "A full analytics dashboard: pageviews, visitors, channels, campaigns, countries and devices" },
        them: { state: "partial", text: "Experience Analytics is built around sessions and pages; funnels and journey analysis are included, acquisition reporting is not its purpose" },
      },
      {
        criterion: "Heatmaps",
        us: { state: "yes", text: "Click, scroll and rage-click maps (Starter plan and above)" },
        them: { state: "yes", text: "Heatmaps on every plan; zone-based heatmaps from the Growth plan" },
      },
      {
        criterion: "Session replay",
        us: { state: "yes", text: "Recorded sessions with every input masked (Starter plan and above)" },
        them: { state: "yes", text: "Replays on every plan; the free plan captures 5% of sessions, up to 10,000, kept one month" },
      },
      {
        criterion: "Surveys, feedback widgets, usability testing",
        us: { state: "no", text: "Not offered" },
        them: { state: "yes", text: "Voice of Customer: free up to 100 responses a month, then $99 a month" },
      },
      {
        criterion: "Funnels",
        us: { state: "yes", text: "Multi-step funnels with drop-off, time to convert and revenue lost per step" },
        them: { state: "yes", text: "Funnels included from the free plan" },
      },
      {
        criterion: "A/B tests and feature flags",
        us: { state: "yes", text: "Experiments with a significance verdict, and percentage rollouts" },
        them: { state: "no", text: "Not offered; A/B testing tools are connected through integrations" },
      },
      {
        criterion: "Revenue per traffic source from Stripe",
        us: { state: "yes", text: "A read-only Stripe key; every payment is attributed to the session and channel that brought it (Growth plan and above)" },
        them: { state: "partial", text: "Revenue goals and tracking from the Pro plan, whose price is on quote" },
      },
      {
        criterion: "Free plan",
        us: { state: "partial", text: "1 site, 5,000 events a month, 1 funnel, 30 days of history" },
        them: { state: "yes", text: "200,000 sessions a month, 1 project, replays, heatmaps and funnels — far larger than ours" },
      },
      {
        criterion: "Price published up to the top of the range",
        us: { state: "yes", text: "Every plan has a public price, from the free plan to the top one" },
        them: { state: "partial", text: "Free and Growth are public ($49 a month, billed annually); Pro and Enterprise are on quote" },
      },
      {
        criterion: "History kept",
        us: { state: "info", text: "30 days on the free plan, up to 12 months depending on plan" },
        them: { state: "info", text: "1 month of analytics access on the free plan, 13 months from Growth; replays kept 1 month, 2 from Growth" },
      },
      {
        criterion: "MCP server for AI assistants",
        us: { state: "yes", text: "Hosted, OAuth sign-in, read-only by default, and no cap on the number of questions" },
        them: { state: "yes", text: "Included on every plan, metered: up to 300 tool calls a month on the free plan" },
      },
      {
        criterion: "Base script weight",
        us: { state: "info", text: "3.7 KB gzipped; replay loads extra code only on the pages where you enabled it" },
        them: { state: "info", text: "6 KB loader, then a 56 KB recording module — about 62 KB compressed on a recorded page, measured on 18 September 2026" },
      },
    ],
    chooseThem: {
      title: "Choose Hotjar if…",
      points: [
        "You need surveys, feedback widgets and usability testing alongside the recordings.",
        "You have a high-traffic site and the 200,000 free sessions a month decide it.",
        "You already have an analytics tool you are happy with, and only want the behaviour layer.",
      ],
    },
    chooseUs: {
      title: "Choose PulseTrack if…",
      points: [
        "You would rather have traffic, revenue and behaviour on one screen than in two tools.",
        "You do not want a cookie on your visitors' devices.",
        "You care what the script costs your pages — 3.7 KB against about 62 KB once recording starts.",
        "You want to know the price of the top plan without asking for a quote.",
      ],
    },
    details: [
      {
        title: "What the Contentsquare merger changed",
        body: "Hotjar Ltd, the Maltese company, merged into the Contentsquare group on 1 July 2025. The tools are the same — heatmaps, recordings, surveys — but they are sold inside Contentsquare's range, and the old Basic, Plus, Business and Scale plans were replaced by Free, Growth, Pro and Enterprise. If you are comparing against a Hotjar quote older than that, it is worth re-reading.",
      },
      {
        title: "What 5% of sessions means for a replay",
        body: "On the free plan, replays are captured on 5% of sessions, up to 10,000 a month. That is a sampling choice, not a bug: it keeps the free tier affordable at 200,000 sessions. It does mean the specific session a customer complained about is unlikely to be in there. Our free plan records nothing at all, and from €9 a month records up to 500 sessions — a smaller number, but not sampled, so a funnel drop-off you filter for is actually findable.",
      },
      {
        title: "Two scripts, two costs",
        body: "Hotjar's tag is a 6 KB loader that fetches a 56 KB recording module, so a page being recorded pays around 62 KB compressed. Ours is 3.7 KB, and the replay code — which is comparable in size, because recording a DOM costs what it costs — is only fetched on the pages where you turned replay on. The difference is not our code being cleverer; it is when it loads.",
      },
    ],
    faq: [
      {
        q: "Do I still need Google Analytics next to PulseTrack?",
        a: "No, and that is the main difference with Hotjar: traffic, channels, campaigns and revenue are in the same dashboard as the heatmaps and the replays.",
      },
      {
        q: "Are your heatmaps as detailed as Hotjar's?",
        a: "For clicks, scroll depth and rage clicks, yes. Contentsquare's zone-based heatmaps, which attribute engagement and revenue to a page zone, go further and are on their paid plans.",
      },
      {
        q: "Can I import my Hotjar recordings?",
        a: "No. Recordings cannot be moved between tools, so PulseTrack starts recording from the day you enable it.",
      },
    ],
    sources: SOURCES,
    checkedOn: "2026-09-18",
  },
};

/* ══════════════════════════════════════════════════════════════
   FRANÇAIS
   ══════════════════════════════════════════════════════════════ */

export const hotjarFr: Record<"hotjar", ComparePage> = {
  hotjar: {
    competitor: "Hotjar",
    metaTitle: "PulseTrack ou Hotjar — le comparatif honnête",
    metaDescription:
      "Hotjar a fusionné dans Contentsquare le 1er juillet 2025. Comment ses offres Free et Growth se comparent à PulseTrack : heatmaps, replay, analytics, cookies et poids du script, sources à l'appui.",
    eyebrow: "Comparatif",
    title: "PulseTrack ou Hotjar",
    subtitle:
      "Hotjar a appris à tout le monde à quoi sert une heatmap. Depuis le 1er juillet 2025, il fait partie de Contentsquare, et ses offres s'appellent Free, Growth, Pro et Enterprise. Il reste un outil de comportement que l'on ajoute à côté de son analytics ; PulseTrack réunit les deux, sans cookie.",
    summary: [
      {
        title: "Un outil au lieu de deux",
        body: "Hotjar montre le comportement ; votre trafic et votre revenu vivent ailleurs. PulseTrack met pages, sources, revenu, heatmaps et replay dans le même compte.",
      },
      {
        title: "Aucun cookie, et une page bien plus légère",
        body: "Le module d'enregistrement de Hotjar écrit des cookies _hj et pèse environ 62 Ko sur une page enregistrée. Notre script fait 3,7 Ko, et le replay ne se charge que là où vous l'avez activé.",
      },
      {
        title: "Là où Hotjar gagne",
        body: "Son offre gratuite couvre 200 000 sessions par mois, et il propose sondages, widgets de feedback et tests d'utilisabilité — que nous n'avons pas.",
      },
    ],
    rows: [
      {
        criterion: "Fonctionne sans cookie",
        us: { state: "yes", text: "Ni cookie ni stockage local : un identifiant anonyme calculé sur le serveur, renouvelé chaque jour" },
        them: { state: "no", text: "Le module d'enregistrement écrit des cookies sur l'appareil du visiteur, sous des noms en _hj" },
      },
      {
        criterion: "Analytics de trafic : pages, sources, appareils",
        us: { state: "yes", text: "Un vrai tableau de bord analytics : pages vues, visiteurs, canaux, campagnes, pays et appareils" },
        them: { state: "partial", text: "Experience Analytics est construit autour des sessions et des pages ; funnels et analyse de parcours sont inclus, le rapport d'acquisition n'est pas sa vocation" },
      },
      {
        criterion: "Heatmaps",
        us: { state: "yes", text: "Cartes de clics, de scroll et de clics de rage (offre Starter et au-delà)" },
        them: { state: "yes", text: "Heatmaps sur toutes les offres ; heatmaps par zone à partir de l'offre Growth" },
      },
      {
        criterion: "Replay de sessions",
        us: { state: "yes", text: "Sessions enregistrées, toutes les saisies masquées (offre Starter et au-delà)" },
        them: { state: "yes", text: "Replays sur toutes les offres ; l'offre gratuite enregistre 5 % des sessions, jusqu'à 10 000, conservées un mois" },
      },
      {
        criterion: "Sondages, widgets de feedback, tests d'utilisabilité",
        us: { state: "no", text: "Non proposé" },
        them: { state: "yes", text: "Voice of Customer : gratuit jusqu'à 100 réponses par mois, puis 99 $ par mois" },
      },
      {
        criterion: "Funnels",
        us: { state: "yes", text: "Funnels multi-étapes avec abandon, temps de conversion et revenu perdu par étape" },
        them: { state: "yes", text: "Funnels inclus dès l'offre gratuite" },
      },
      {
        criterion: "Tests A/B et feature flags",
        us: { state: "yes", text: "Expériences avec verdict de significativité, et ouverture par pourcentage" },
        them: { state: "no", text: "Non proposé ; les outils de test A/B se branchent par intégration" },
      },
      {
        criterion: "Revenu par source de trafic depuis Stripe",
        us: { state: "yes", text: "Une clé Stripe en lecture seule ; chaque paiement est attribué à la session et au canal qui l'ont amené (offre Growth et au-delà)" },
        them: { state: "partial", text: "Objectifs et suivi du revenu à partir de l'offre Pro, dont le prix est sur devis" },
      },
      {
        criterion: "Offre gratuite",
        us: { state: "partial", text: "1 site, 5 000 événements par mois, 1 funnel, 30 jours d'historique" },
        them: { state: "yes", text: "200 000 sessions par mois, 1 projet, replays, heatmaps et funnels — bien plus large que la nôtre" },
      },
      {
        criterion: "Prix publié jusqu'en haut de la grille",
        us: { state: "yes", text: "Chaque offre a un prix public, de la gratuite à la dernière" },
        them: { state: "partial", text: "Free et Growth sont publics (49 $ par mois, facturés à l'année) ; Pro et Enterprise sont sur devis" },
      },
      {
        criterion: "Historique conservé",
        us: { state: "info", text: "30 jours sur l'offre gratuite, jusqu'à 12 mois selon l'offre" },
        them: { state: "info", text: "1 mois d'accès aux analyses sur l'offre gratuite, 13 mois dès Growth ; replays conservés 1 mois, 2 dès Growth" },
      },
      {
        criterion: "Serveur MCP pour les assistants IA",
        us: { state: "yes", text: "Hébergé, connexion OAuth, lecture seule par défaut, et sans plafond sur le nombre de questions" },
        them: { state: "yes", text: "Inclus dans toutes les offres, avec compteur : jusqu'à 300 appels d'outils par mois sur l'offre gratuite" },
      },
      {
        criterion: "Poids du script de base",
        us: { state: "info", text: "3,7 Ko gzippés ; le replay ne charge du code en plus que sur les pages où vous l'avez activé" },
        them: { state: "info", text: "Chargeur de 6 Ko, puis un module d'enregistrement de 56 Ko — environ 62 Ko compressés sur une page enregistrée, mesuré le 18 septembre 2026" },
      },
    ],
    chooseThem: {
      title: "Choisissez Hotjar si…",
      points: [
        "Vous avez besoin de sondages, de widgets de feedback et de tests d'utilisabilité à côté des enregistrements.",
        "Vous avez un site à fort trafic et les 200 000 sessions gratuites par mois emportent la décision.",
        "Vous avez déjà un outil d'analytics qui vous convient et ne voulez que la couche comportement.",
      ],
    },
    chooseUs: {
      title: "Choisissez PulseTrack si…",
      points: [
        "Vous préférez avoir trafic, revenu et comportement sur un écran plutôt que dans deux outils.",
        "Vous ne voulez pas de cookie sur l'appareil de vos visiteurs.",
        "Le coût du script sur vos pages compte — 3,7 Ko contre environ 62 Ko dès que l'enregistrement démarre.",
        "Vous voulez connaître le prix de l'offre la plus haute sans demander un devis.",
      ],
    },
    details: [
      {
        title: "Ce qu'a changé la fusion avec Contentsquare",
        body: "Hotjar Ltd, la société maltaise, a fusionné dans le groupe Contentsquare le 1er juillet 2025. Les outils sont les mêmes — heatmaps, enregistrements, sondages — mais ils se vendent à l'intérieur de la gamme Contentsquare, et les anciennes offres Basic, Plus, Business et Scale ont été remplacées par Free, Growth, Pro et Enterprise. Si vous comparez avec un devis Hotjar antérieur à cette date, il mérite une relecture.",
      },
      {
        title: "Ce que veut dire 5 % des sessions pour un replay",
        body: "Sur l'offre gratuite, les replays sont enregistrés sur 5 % des sessions, jusqu'à 10 000 par mois. C'est un choix d'échantillonnage, pas un défaut : il rend l'offre gratuite tenable à 200 000 sessions. Mais cela veut dire que la session précise dont un client s'est plaint a peu de chances d'y être. Notre offre gratuite n'enregistre rien du tout, et dès 9 € par mois elle enregistre jusqu'à 500 sessions — un chiffre plus petit, mais non échantillonné, donc un abandon de funnel que vous filtrez est réellement retrouvable.",
      },
      {
        title: "Deux scripts, deux coûts",
        body: "La balise de Hotjar est un chargeur de 6 Ko qui va chercher un module d'enregistrement de 56 Ko : une page enregistrée paie donc environ 62 Ko compressés. La nôtre pèse 3,7 Ko, et le code de replay — de taille comparable, parce qu'enregistrer un DOM coûte ce que ça coûte — n'est récupéré que sur les pages où vous avez activé le replay. La différence ne tient pas à un code plus malin, mais au moment où il se charge.",
      },
    ],
    faq: [
      {
        q: "Ai-je encore besoin de Google Analytics à côté de PulseTrack ?",
        a: "Non, et c'est la différence principale avec Hotjar : trafic, canaux, campagnes et revenu sont dans le même tableau de bord que les heatmaps et les replays.",
      },
      {
        q: "Vos heatmaps sont-elles aussi détaillées que celles de Hotjar ?",
        a: "Pour les clics, la profondeur de scroll et les clics de rage, oui. Les heatmaps par zone de Contentsquare, qui rattachent engagement et revenu à une zone de page, vont plus loin et sont sur leurs offres payantes.",
      },
      {
        q: "Puis-je importer mes enregistrements Hotjar ?",
        a: "Non. Les enregistrements ne se transfèrent pas d'un outil à l'autre : PulseTrack enregistre à partir du jour où vous l'activez.",
      },
    ],
    sources: SOURCES,
    checkedOn: "2026-09-18",
  },
};
