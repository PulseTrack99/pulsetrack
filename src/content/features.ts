import type { Locale } from "@/i18n/dictionaries";

export const FEATURE_SLUGS = [
  "revenue",
  "heatmaps",
  "funnels",
  "realtime",
  "analytics",
  "dashboards",
  "privacy",
] as const;

export type FeatureSlug = (typeof FEATURE_SLUGS)[number];

/** Which hero illustration the page renders. */
export type ArtKind = "revenue" | "heatmap" | "funnel" | "privacy" | "showcase";

export interface FeaturePage {
  art: ArtKind;
  eyebrow: string;
  title: string;
  titleAccent: string;
  subtitle: string;
  metaTitle: string;
  metaDescription: string;
  highlights: { title: string; body: string }[];
  steps: { title: string; body: string }[];
  faq: { q: string; a: string }[];
  related: FeatureSlug[];
}

type Catalog = Record<FeatureSlug, FeaturePage>;

/* ══════════════════════════════════════════════════════════════
   ENGLISH
   ══════════════════════════════════════════════════════════════ */

const en: Catalog = {
  revenue: {
    art: "revenue",
    eyebrow: "Revenue attribution",
    title: "Know which channel",
    titleAccent: "actually pays",
    subtitle:
      "Connect Stripe once and PulseTrack ties every payment back to the traffic source that produced it. Revenue per channel, not pageviews per channel.",
    metaTitle: "Revenue attribution for web analytics",
    metaDescription:
      "Connect Stripe and see revenue per traffic source. PulseTrack matches every payment to the session that produced it — attribution in euros, not pageviews.",
    highlights: [
      {
        title: "Revenue per source",
        body: "Google, Reddit, your newsletter — each one gets a euro figure, a transaction count and an average order value.",
      },
      {
        title: "Landing pages ranked by money",
        body: "The page with the most traffic is rarely the page that earns the most. See both numbers side by side.",
      },
      {
        title: "Read-only, revocable access",
        body: "You paste a restricted Stripe key that can only read charges. Revoke it from your Stripe dashboard at any time.",
      },
    ],
    steps: [
      {
        title: "Add the tracking script",
        body: "One tag on your site starts recording sessions and their traffic source.",
      },
      {
        title: "Identify your customers",
        body: "Call pulsetrack.identify(email) at signup or checkout so a session can be linked to a person.",
      },
      {
        title: "Connect Stripe",
        body: "Paste a restricted key. PulseTrack imports charges and matches them to sessions by email.",
      },
    ],
    faq: [
      {
        q: "Does PulseTrack take a cut of my revenue?",
        a: "No. PulseTrack reads your Stripe charges to attribute them and never touches money movement. You pay a flat monthly subscription regardless of the revenue you track.",
      },
      {
        q: "What if a customer pays without ever being identified?",
        a: "That payment counts in your totals but sits in an unattributed bucket. The attribution rate shown on the dashboard tells you how much of your revenue is matched, so you know how far to trust the split.",
      },
      {
        q: "Which Stripe permissions are required?",
        a: "A restricted key with read access to Charges and Customers. Nothing else. It cannot create charges, issue refunds or modify your account.",
      },
      {
        q: "Does it work with payment providers other than Stripe?",
        a: "Stripe is supported today. Other providers are on the roadmap — the matching logic is provider-agnostic.",
      },
    ],
    related: ["funnels", "analytics", "dashboards"],
  },

  heatmaps: {
    art: "heatmap",
    eyebrow: "Heatmaps",
    title: "See where attention",
    titleAccent: "actually goes",
    subtitle:
      "Click, tap and scroll maps rendered over your real page. Find the button nobody presses and the dead zone everybody keeps hitting.",
    metaTitle: "Website heatmaps — click, tap and scroll maps",
    metaDescription:
      "Cookie-free heatmaps for any website. See click maps, scroll depth and rage clicks rendered over your live pages, segmented by device and traffic source.",
    highlights: [
      {
        title: "Click and tap maps",
        body: "Every interaction plotted where it happened, on desktop and on mobile, with the real page underneath.",
      },
      {
        title: "Scroll depth",
        body: "See the exact line where most people stop reading — usually far above where you put the call to action.",
      },
      {
        title: "Rage-click detection",
        body: "Repeated clicks on something that is not clickable are flagged automatically. They are the cheapest bugs you will ever fix.",
      },
    ],
    steps: [
      {
        title: "Install the script",
        body: "Heatmaps use the same tag as the rest of PulseTrack. Nothing extra to add.",
      },
      {
        title: "Pick a page",
        body: "Choose any URL that has traffic. The map builds from sessions already recorded.",
      },
      {
        title: "Segment and act",
        body: "Filter by device, source or country to find where a layout breaks down.",
      },
    ],
    faq: [
      {
        q: "Do heatmaps record my visitors' screens?",
        a: "No. PulseTrack records interaction coordinates and page structure, never a video of the screen and never form contents. There is no session video to leak.",
      },
      {
        q: "Will heatmaps slow down my site?",
        a: "The whole PulseTrack script is 1.6 KB gzipped and loads with defer, so it never blocks rendering. Heatmap collection adds no additional request.",
      },
      {
        q: "How much traffic do I need before a heatmap is useful?",
        a: "A few hundred sessions on a page is usually enough to see clear patterns. Below that, individual behaviour dominates and the map is noisy.",
      },
      {
        q: "Does this need a cookie banner?",
        a: "No. Heatmaps are built from the same cookie-free, non-personal data as the rest of PulseTrack.",
      },
    ],
    related: ["funnels", "analytics", "privacy"],
  },

  funnels: {
    art: "funnel",
    eyebrow: "Funnels",
    title: "Find the step",
    titleAccent: "that loses people",
    subtitle:
      "Build a funnel in a few clicks and see exactly where visitors fall out — with the cost of each drop-off in euros, so you know what to fix first.",
    metaTitle: "Conversion funnels with drop-off analysis",
    metaDescription:
      "Build multi-step conversion funnels across pages and events. See drop-off per step in visitors and in euros, and compare the same funnel across traffic sources.",
    highlights: [
      {
        title: "Steps across pages and events",
        body: "Mix URLs and custom events freely. A funnel can span your marketing site and your product.",
      },
      {
        title: "Drop-off priced in euros",
        body: "When revenue attribution is on, each lost step carries an estimated monthly cost. Prioritising becomes obvious.",
      },
      {
        title: "Compare by source",
        body: "The same funnel often converts twice as well from one channel. That gap is where your budget should go.",
      },
    ],
    steps: [
      {
        title: "Define your steps",
        body: "Name the funnel and add steps in order — a URL path or an event name each.",
      },
      {
        title: "Let sessions accumulate",
        body: "PulseTrack matches steps in sequence within a session, so the order you set is the order it measures.",
      },
      {
        title: "Read the drop-off",
        body: "Each step shows how many arrived, how many continued and what the gap costs.",
      },
    ],
    faq: [
      {
        q: "Do steps have to happen in one visit?",
        a: "Funnel matching runs within a session by default, which keeps the numbers honest for short flows like signup or checkout. Longer multi-visit funnels are on the roadmap.",
      },
      {
        q: "How many funnels can I build?",
        a: "One on the free plan, five on Starter, twenty on Growth and unlimited on Business.",
      },
      {
        q: "Can a funnel step be a button click rather than a page?",
        a: "Yes. Send a custom event with pulsetrack.track('event_name') and use that name as a step.",
      },
      {
        q: "Does changing a funnel lose my history?",
        a: "No. Funnels are computed from stored sessions at query time, so editing steps recalculates against all data you already have.",
      },
    ],
    related: ["revenue", "heatmaps", "analytics"],
  },

  realtime: {
    art: "showcase",
    eyebrow: "Real-time",
    title: "See who is on your site",
    titleAccent: "right now",
    subtitle:
      "A live view that updates every few seconds — visitor count, active pages and where in the world they are. The dashboard you actually leave open on launch day.",
    metaTitle: "Real-time website visitor tracking",
    metaDescription:
      "Watch visitors arrive live: active visitor count, current pages and locations, refreshed every few seconds. Perfect for launches and campaign monitoring.",
    highlights: [
      {
        title: "Live visitor count",
        body: "Updated every few seconds, so a Product Hunt or Hacker News spike is visible as it starts, not tomorrow.",
      },
      {
        title: "Active pages",
        body: "Which URLs people are reading at this exact moment, ranked by concurrent visitors.",
      },
      {
        title: "Live geography",
        body: "Where visitors are connecting from, derived from coarse IP location that is never stored.",
      },
    ],
    steps: [
      {
        title: "Install the script",
        body: "Real-time works out of the box with the standard tag.",
      },
      {
        title: "Open the dashboard",
        body: "The live panel sits at the top of your site dashboard.",
      },
      {
        title: "Share the moment",
        body: "Turn on a public dashboard so your whole team can watch the same numbers.",
      },
    ],
    faq: [
      {
        q: "How often does it refresh?",
        a: "Every five seconds. A visitor counts as active if they have sent an event in the last five minutes.",
      },
      {
        q: "Do you store visitor IP addresses?",
        a: "No. The IP is used in memory to derive a country and is discarded — it is never written to the database.",
      },
      {
        q: "Does real-time count against my event quota?",
        a: "No extra cost. Real-time reads the same events already counted for your plan.",
      },
      {
        q: "Can I see real-time for several sites at once?",
        a: "Each site has its own live panel today. A combined view is on the roadmap.",
      },
    ],
    related: ["analytics", "dashboards", "heatmaps"],
  },

  analytics: {
    art: "showcase",
    eyebrow: "Core analytics",
    title: "Every number that matters,",
    titleAccent: "nothing that doesn't",
    subtitle:
      "Visitors, pageviews, sources, top pages, devices and countries — on one screen that loads instantly and needs no training to read.",
    metaTitle: "Simple web analytics dashboard",
    metaDescription:
      "A clean web analytics dashboard: unique visitors, pageviews, bounce rate, traffic sources, top pages, devices and countries. Fast, cookie-free and GDPR-native.",
    highlights: [
      {
        title: "One screen, no menu diving",
        body: "The numbers you check daily are all above the fold. No report builder, no custom dimensions to configure first.",
      },
      {
        title: "Honest traffic sources",
        body: "Referrers and UTM parameters resolved into readable channel names, with self-referrals and spam filtered out.",
      },
      {
        title: "Sub-second queries",
        body: "Pick a different period and the whole dashboard redraws immediately, so you keep exploring instead of waiting.",
      },
    ],
    steps: [
      {
        title: "Add your site",
        body: "Name it, add the domain, copy the generated script tag.",
      },
      {
        title: "Paste one line",
        body: "Before the closing head tag on any framework, CMS or static host.",
      },
      {
        title: "Watch data arrive",
        body: "First events land within seconds. Meaningful trends within a day.",
      },
    ],
    faq: [
      {
        q: "How does PulseTrack count unique visitors without cookies?",
        a: "A daily-rotating, salted hash of coarse request attributes acts as an anonymous session key. It cannot be reversed, cannot follow someone across sites and resets every day.",
      },
      {
        q: "Will my numbers match Google Analytics?",
        a: "Rarely exactly, and usually PulseTrack shows more. GA4 loses every visitor who declines the consent banner or runs an ad blocker; PulseTrack does not depend on either.",
      },
      {
        q: "Does it work on single-page apps?",
        a: "Yes. The script hooks into the History API, so client-side route changes register as pageviews automatically.",
      },
      {
        q: "Can I export the raw data?",
        a: "CSV export is available on the Business plan, and API access on Growth and above.",
      },
    ],
    related: ["realtime", "funnels", "privacy"],
  },

  dashboards: {
    art: "showcase",
    eyebrow: "Public dashboards",
    title: "Share your numbers",
    titleAccent: "without adding seats",
    subtitle:
      "Flip one switch and get a clean public URL. Clients, investors and teammates see the live dashboard — no login, no extra bill.",
    metaTitle: "Public, shareable analytics dashboards",
    metaDescription:
      "Share live analytics with a public link. No login required for viewers, no per-seat pricing, and you stay in control of what is visible.",
    highlights: [
      {
        title: "One switch, one link",
        body: "Enable sharing in settings and you get an unguessable URL that renders the live dashboard.",
      },
      {
        title: "No seats to buy",
        body: "Viewers never create an account, so sharing with a client or a whole team costs nothing extra.",
      },
      {
        title: "Revocable at any time",
        body: "Turn sharing off and the link stops working immediately. Turning it back on issues a fresh URL.",
      },
    ],
    steps: [
      {
        title: "Open site settings",
        body: "Find the site you want to share in your dashboard.",
      },
      {
        title: "Enable public dashboard",
        body: "A share link is generated on the spot.",
      },
      {
        title: "Send the link",
        body: "Anyone with it sees live numbers, in read-only.",
      },
    ],
    faq: [
      {
        q: "Can viewers see my other sites?",
        a: "No. A share link is scoped to a single site and exposes only its aggregate statistics.",
      },
      {
        q: "Is the link indexed by search engines?",
        a: "Public dashboards are excluded in robots.txt and carry no inbound links, so they are not indexed in practice.",
      },
      {
        q: "Does a public dashboard show revenue figures?",
        a: "No. Revenue data is deliberately excluded from public dashboards.",
      },
      {
        q: "Can I put it on my own domain?",
        a: "Not yet. Custom domains for public dashboards are on the roadmap.",
      },
    ],
    related: ["analytics", "realtime", "revenue"],
  },

  privacy: {
    art: "privacy",
    eyebrow: "Privacy by design",
    title: "No cookies. No banner.",
    titleAccent: "No lawyer.",
    subtitle:
      "PulseTrack never sets a cookie and never stores personal data, so there is nothing to ask consent for — and 90× less weight on every page load.",
    metaTitle: "Cookie-free, GDPR-native web analytics",
    metaDescription:
      "Analytics with no cookies, no personal data and no consent banner. GDPR, ePrivacy and CCPA compliant by architecture, hosted in the EU, 1.6 KB script.",
    highlights: [
      {
        title: "Cookie-free by architecture",
        body: "Not a setting you enable — there is no code path in PulseTrack that writes a cookie or reads local storage.",
      },
      {
        title: "No consent banner needed",
        body: "Because nothing personal is stored and nothing is read from the device, the ePrivacy consent requirement does not apply.",
      },
      {
        title: "90× lighter",
        body: "1.6 KB against 144 KB for GA4's gtag.js, both gzipped. That is a measurable Core Web Vitals difference on mobile.",
      },
    ],
    steps: [
      {
        title: "Remove your old tag",
        body: "Delete the GA4 snippet and, in most cases, the consent banner that existed to serve it.",
      },
      {
        title: "Add PulseTrack",
        body: "One script tag, no configuration and no data-processing agreement to negotiate.",
      },
      {
        title: "Keep your data in the EU",
        body: "Events are stored on EU infrastructure and never leave it.",
      },
    ],
    faq: [
      {
        q: "Am I really allowed to skip the cookie banner?",
        a: "Consent under ePrivacy is triggered by storing or reading information on a user's device. PulseTrack does neither. This reflects how cookie-free analytics is commonly treated, but it is not legal advice — check with your counsel for your jurisdiction.",
      },
      {
        q: "What data is actually stored per visit?",
        a: "Page path, referrer, coarse country, device type, an anonymous daily session key and a timestamp. No IP address, no cookie, no cross-site identifier.",
      },
      {
        q: "Where is the data hosted?",
        a: "On EU infrastructure. Events do not leave the European Union.",
      },
      {
        q: "Do ad blockers block PulseTrack?",
        a: "Far less often than Google Analytics, because PulseTrack is not an advertising network and is not on the major tracker blocklists. You will typically see noticeably more traffic than GA4 reported.",
      },
    ],
    related: ["analytics", "heatmaps", "dashboards"],
  },
};

/* ══════════════════════════════════════════════════════════════
   FRANÇAIS
   ══════════════════════════════════════════════════════════════ */

const fr: Catalog = {
  revenue: {
    art: "revenue",
    eyebrow: "Attribution du revenu",
    title: "Sachez quel canal",
    titleAccent: "vous rapporte vraiment",
    subtitle:
      "Connectez Stripe une fois et PulseTrack relie chaque paiement à la source de trafic qui l'a produit. Du revenu par canal, pas des pages vues par canal.",
    metaTitle: "Attribution du revenu pour votre analytics",
    metaDescription:
      "Connectez Stripe et voyez le revenu par source de trafic. PulseTrack relie chaque paiement à la session qui l'a produit — une attribution en euros, pas en pages vues.",
    highlights: [
      {
        title: "Le revenu par source",
        body: "Google, Reddit, votre newsletter — chacun obtient un montant en euros, un nombre de transactions et un panier moyen.",
      },
      {
        title: "Vos pages classées en argent",
        body: "La page qui reçoit le plus de trafic est rarement celle qui rapporte le plus. Voyez les deux chiffres côte à côte.",
      },
      {
        title: "Un accès en lecture seule, révocable",
        body: "Vous collez une clé Stripe restreinte qui ne peut que lire les paiements. Révoquez-la depuis Stripe quand vous voulez.",
      },
    ],
    steps: [
      {
        title: "Ajoutez le script",
        body: "Une balise sur votre site enregistre les sessions et leur source de trafic.",
      },
      {
        title: "Identifiez vos clients",
        body: "Appelez pulsetrack.identify(email) à l'inscription ou au paiement pour relier une session à une personne.",
      },
      {
        title: "Connectez Stripe",
        body: "Collez une clé restreinte. PulseTrack importe les paiements et les rapproche des sessions par email.",
      },
    ],
    faq: [
      {
        q: "PulseTrack prend-il une commission sur mon revenu ?",
        a: "Non. PulseTrack lit vos paiements Stripe pour les attribuer et ne touche jamais aux flux d'argent. Vous payez un abonnement mensuel fixe, quel que soit le revenu suivi.",
      },
      {
        q: "Et si un client paie sans jamais avoir été identifié ?",
        a: "Ce paiement compte dans vos totaux mais reste non attribué. Le taux d'attribution affiché sur le dashboard vous indique quelle part de votre revenu est rapprochée, donc à quel point vous pouvez vous fier à la répartition.",
      },
      {
        q: "Quelles permissions Stripe faut-il ?",
        a: "Une clé restreinte avec accès en lecture aux Charges et aux Customers. Rien d'autre. Elle ne peut pas créer de paiement, rembourser ni modifier votre compte.",
      },
      {
        q: "Est-ce que ça marche avec d'autres prestataires que Stripe ?",
        a: "Stripe est supporté aujourd'hui. D'autres prestataires sont prévus — la logique de rapprochement ne dépend pas du prestataire.",
      },
    ],
    related: ["funnels", "analytics", "dashboards"],
  },

  heatmaps: {
    art: "heatmap",
    eyebrow: "Heatmaps",
    title: "Voyez où va vraiment",
    titleAccent: "l'attention",
    subtitle:
      "Cartes de clics, de taps et de scroll affichées sur votre vraie page. Repérez le bouton que personne ne presse et la zone morte que tout le monde tape.",
    metaTitle: "Heatmaps de site web — clics, taps et scroll",
    metaDescription:
      "Heatmaps sans cookie pour tout site web. Cartes de clics, profondeur de scroll et clics de rage affichés sur vos pages, segmentés par appareil et par source.",
    highlights: [
      {
        title: "Cartes de clics et de taps",
        body: "Chaque interaction tracée là où elle a eu lieu, sur ordinateur comme sur mobile, avec la vraie page en dessous.",
      },
      {
        title: "Profondeur de scroll",
        body: "La ligne exacte où la plupart des gens arrêtent de lire — souvent bien au-dessus de votre appel à l'action.",
      },
      {
        title: "Détection des clics de rage",
        body: "Les clics répétés sur un élément non cliquable sont signalés automatiquement. Ce sont les bugs les moins chers à corriger.",
      },
    ],
    steps: [
      {
        title: "Installez le script",
        body: "Les heatmaps utilisent la même balise que le reste de PulseTrack. Rien à ajouter.",
      },
      {
        title: "Choisissez une page",
        body: "N'importe quelle URL qui reçoit du trafic. La carte se construit à partir des sessions déjà enregistrées.",
      },
      {
        title: "Segmentez et agissez",
        body: "Filtrez par appareil, source ou pays pour trouver où une mise en page se casse.",
      },
    ],
    faq: [
      {
        q: "Les heatmaps enregistrent-elles l'écran de mes visiteurs ?",
        a: "Non. PulseTrack enregistre des coordonnées d'interaction et la structure de la page, jamais une vidéo de l'écran ni le contenu des formulaires. Il n'y a aucune vidéo de session à faire fuiter.",
      },
      {
        q: "Est-ce que ça ralentit mon site ?",
        a: "L'ensemble du script PulseTrack pèse 1,6 Ko gzippé et se charge en defer : il ne bloque jamais le rendu. La collecte des heatmaps n'ajoute aucune requête.",
      },
      {
        q: "Combien de trafic faut-il pour qu'une heatmap soit utile ?",
        a: "Quelques centaines de sessions sur une page suffisent généralement à voir des motifs nets. En dessous, les comportements individuels dominent et la carte est bruitée.",
      },
      {
        q: "Faut-il une bannière cookies ?",
        a: "Non. Les heatmaps sont construites à partir des mêmes données sans cookie et non personnelles que le reste de PulseTrack.",
      },
    ],
    related: ["funnels", "analytics", "privacy"],
  },

  funnels: {
    art: "funnel",
    eyebrow: "Funnels",
    title: "Trouvez l'étape",
    titleAccent: "qui vous fait perdre",
    subtitle:
      "Créez un funnel en quelques clics et voyez précisément où les visiteurs décrochent — avec le coût de chaque abandon en euros, pour savoir quoi corriger en premier.",
    metaTitle: "Tunnels de conversion et analyse des abandons",
    metaDescription:
      "Créez des tunnels de conversion multi-étapes sur vos pages et événements. Visualisez l'abandon par étape en visiteurs et en euros, et comparez par source de trafic.",
    highlights: [
      {
        title: "Des étapes sur pages et événements",
        body: "Mélangez librement URLs et événements personnalisés. Un funnel peut couvrir votre site vitrine et votre produit.",
      },
      {
        title: "Un abandon chiffré en euros",
        body: "Avec l'attribution du revenu activée, chaque étape perdue porte un coût mensuel estimé. Prioriser devient évident.",
      },
      {
        title: "Une comparaison par source",
        body: "Un même funnel convertit souvent deux fois mieux depuis un canal donné. C'est là que doit aller votre budget.",
      },
    ],
    steps: [
      {
        title: "Définissez vos étapes",
        body: "Nommez le funnel et ajoutez les étapes dans l'ordre — un chemin d'URL ou un nom d'événement chacune.",
      },
      {
        title: "Laissez les sessions s'accumuler",
        body: "PulseTrack rapproche les étapes en séquence dans une session : l'ordre que vous définissez est celui qu'il mesure.",
      },
      {
        title: "Lisez l'abandon",
        body: "Chaque étape indique combien sont arrivés, combien ont continué et ce que l'écart coûte.",
      },
    ],
    faq: [
      {
        q: "Les étapes doivent-elles avoir lieu en une seule visite ?",
        a: "Le rapprochement s'effectue au sein d'une session par défaut, ce qui garde des chiffres honnêtes pour des parcours courts comme l'inscription ou le paiement. Les funnels multi-visites sont prévus.",
      },
      {
        q: "Combien de funnels puis-je créer ?",
        a: "Un sur l'offre gratuite, cinq sur Starter, vingt sur Growth et un nombre illimité sur Business.",
      },
      {
        q: "Une étape peut-elle être un clic sur un bouton plutôt qu'une page ?",
        a: "Oui. Envoyez un événement personnalisé avec pulsetrack.track('nom_evenement') et utilisez ce nom comme étape.",
      },
      {
        q: "Modifier un funnel me fait-il perdre l'historique ?",
        a: "Non. Les funnels sont calculés à la volée depuis les sessions stockées : modifier les étapes recalcule sur toutes les données déjà collectées.",
      },
    ],
    related: ["revenue", "heatmaps", "analytics"],
  },

  realtime: {
    art: "showcase",
    eyebrow: "Temps réel",
    title: "Voyez qui est sur votre site",
    titleAccent: "en ce moment",
    subtitle:
      "Une vue en direct rafraîchie toutes les quelques secondes — nombre de visiteurs, pages actives et localisation. Le dashboard qu'on laisse ouvert un jour de lancement.",
    metaTitle: "Suivi des visiteurs en temps réel",
    metaDescription:
      "Observez vos visiteurs arriver en direct : nombre d'actifs, pages consultées et localisation, rafraîchis toutes les quelques secondes. Idéal pour les lancements.",
    highlights: [
      {
        title: "Le compteur en direct",
        body: "Rafraîchi toutes les quelques secondes : un pic Product Hunt ou Hacker News se voit dès qu'il démarre, pas le lendemain.",
      },
      {
        title: "Les pages actives",
        body: "Quelles URLs sont lues à cet instant précis, classées par nombre de visiteurs simultanés.",
      },
      {
        title: "La géographie en direct",
        body: "D'où se connectent vos visiteurs, à partir d'une localisation IP approximative qui n'est jamais stockée.",
      },
    ],
    steps: [
      {
        title: "Installez le script",
        body: "Le temps réel fonctionne d'emblée avec la balise standard.",
      },
      {
        title: "Ouvrez le dashboard",
        body: "Le panneau en direct se trouve en haut du dashboard de votre site.",
      },
      {
        title: "Partagez le moment",
        body: "Activez un dashboard public pour que toute l'équipe suive les mêmes chiffres.",
      },
    ],
    faq: [
      {
        q: "À quelle fréquence les données se rafraîchissent-elles ?",
        a: "Toutes les cinq secondes. Un visiteur est considéré actif s'il a envoyé un événement dans les cinq dernières minutes.",
      },
      {
        q: "Stockez-vous les adresses IP des visiteurs ?",
        a: "Non. L'IP sert en mémoire à déduire un pays puis est écartée — elle n'est jamais écrite en base de données.",
      },
      {
        q: "Le temps réel consomme-t-il mon quota d'événements ?",
        a: "Aucun coût supplémentaire. Le temps réel lit les mêmes événements déjà comptés dans votre offre.",
      },
      {
        q: "Puis-je voir plusieurs sites en temps réel simultanément ?",
        a: "Chaque site a son propre panneau aujourd'hui. Une vue combinée est prévue.",
      },
    ],
    related: ["analytics", "dashboards", "heatmaps"],
  },

  analytics: {
    art: "showcase",
    eyebrow: "Analytics",
    title: "Tous les chiffres qui comptent,",
    titleAccent: "aucun qui ne compte pas",
    subtitle:
      "Visiteurs, pages vues, sources, pages populaires, appareils et pays — sur un seul écran qui se charge instantanément et se lit sans formation.",
    metaTitle: "Dashboard d'analytics web simple",
    metaDescription:
      "Un dashboard analytics épuré : visiteurs uniques, pages vues, taux de rebond, sources de trafic, pages populaires, appareils et pays. Rapide, sans cookie, RGPD natif.",
    highlights: [
      {
        title: "Un écran, aucun menu à explorer",
        body: "Les chiffres que vous consultez chaque jour tiennent en haut de page. Pas de générateur de rapports ni de dimensions à configurer avant.",
      },
      {
        title: "Des sources de trafic honnêtes",
        body: "Référents et paramètres UTM traduits en noms de canaux lisibles, avec les auto-référents et le spam filtrés.",
      },
      {
        title: "Des requêtes sous la seconde",
        body: "Changez de période et tout le dashboard se redessine immédiatement : vous continuez à explorer au lieu d'attendre.",
      },
    ],
    steps: [
      {
        title: "Ajoutez votre site",
        body: "Nommez-le, indiquez le domaine, copiez la balise générée.",
      },
      {
        title: "Collez une ligne",
        body: "Avant la balise de fermeture head, sur n'importe quel framework, CMS ou hébergeur statique.",
      },
      {
        title: "Regardez les données arriver",
        body: "Les premiers événements arrivent en quelques secondes. Des tendances exploitables en une journée.",
      },
    ],
    faq: [
      {
        q: "Comment comptez-vous les visiteurs uniques sans cookie ?",
        a: "Une empreinte salée et renouvelée quotidiennement, calculée sur des attributs approximatifs de la requête, sert de clé de session anonyme. Elle est irréversible, ne permet pas de suivre quelqu'un entre sites et se réinitialise chaque jour.",
      },
      {
        q: "Mes chiffres correspondront-ils à Google Analytics ?",
        a: "Rarement à l'identique, et PulseTrack en affiche généralement davantage. GA4 perd tout visiteur qui refuse la bannière de consentement ou utilise un bloqueur ; PulseTrack ne dépend d'aucun des deux.",
      },
      {
        q: "Est-ce que ça fonctionne sur une application single-page ?",
        a: "Oui. Le script s'accroche à l'History API : les changements de route côté client sont comptés comme des pages vues automatiquement.",
      },
      {
        q: "Puis-je exporter les données brutes ?",
        a: "L'export CSV est disponible sur l'offre Business, et l'accès API à partir de Growth.",
      },
    ],
    related: ["realtime", "funnels", "privacy"],
  },

  dashboards: {
    art: "showcase",
    eyebrow: "Dashboards publics",
    title: "Partagez vos chiffres",
    titleAccent: "sans payer de sièges",
    subtitle:
      "Un interrupteur et vous obtenez une URL publique propre. Clients, investisseurs et collègues voient le dashboard en direct — sans compte, sans surcoût.",
    metaTitle: "Dashboards analytics publics et partageables",
    metaDescription:
      "Partagez vos analytics en direct par un lien public. Aucun compte requis pour les lecteurs, aucune facturation par siège, et vous gardez le contrôle du visible.",
    highlights: [
      {
        title: "Un interrupteur, un lien",
        body: "Activez le partage dans les réglages et obtenez une URL indevinable qui affiche le dashboard en direct.",
      },
      {
        title: "Aucun siège à acheter",
        body: "Les lecteurs ne créent jamais de compte : partager avec un client ou toute une équipe ne coûte rien de plus.",
      },
      {
        title: "Révocable à tout moment",
        body: "Désactivez le partage et le lien cesse immédiatement de fonctionner. Le réactiver génère une nouvelle URL.",
      },
    ],
    steps: [
      {
        title: "Ouvrez les réglages du site",
        body: "Trouvez le site à partager dans votre dashboard.",
      },
      {
        title: "Activez le dashboard public",
        body: "Un lien de partage est généré immédiatement.",
      },
      {
        title: "Envoyez le lien",
        body: "Toute personne qui l'a voit les chiffres en direct, en lecture seule.",
      },
    ],
    faq: [
      {
        q: "Les lecteurs peuvent-ils voir mes autres sites ?",
        a: "Non. Un lien de partage est limité à un seul site et n'expose que ses statistiques agrégées.",
      },
      {
        q: "Le lien est-il indexé par les moteurs de recherche ?",
        a: "Les dashboards publics sont exclus dans le robots.txt et ne reçoivent aucun lien entrant : ils ne sont pas indexés en pratique.",
      },
      {
        q: "Un dashboard public affiche-t-il le revenu ?",
        a: "Non. Les données de revenu sont volontairement exclues des dashboards publics.",
      },
      {
        q: "Puis-je l'héberger sur mon propre domaine ?",
        a: "Pas encore. Les domaines personnalisés pour les dashboards publics sont prévus.",
      },
    ],
    related: ["analytics", "realtime", "revenue"],
  },

  privacy: {
    art: "privacy",
    eyebrow: "Vie privée par conception",
    title: "Aucun cookie. Aucune bannière.",
    titleAccent: "Aucun avocat.",
    subtitle:
      "PulseTrack ne pose jamais de cookie et ne stocke aucune donnée personnelle : il n'y a rien à faire consentir — et 90× moins de poids sur chaque chargement.",
    metaTitle: "Analytics web sans cookie et conforme RGPD",
    metaDescription:
      "Un analytics sans cookie, sans donnée personnelle et sans bannière de consentement. Conforme RGPD, ePrivacy et CCPA par conception, hébergé en Europe, script de 1,6 Ko.",
    highlights: [
      {
        title: "Sans cookie par architecture",
        body: "Ce n'est pas une option à activer : aucun chemin de code dans PulseTrack n'écrit de cookie ni ne lit le stockage local.",
      },
      {
        title: "Aucune bannière nécessaire",
        body: "Puisque rien de personnel n'est stocké et que rien n'est lu sur l'appareil, l'obligation de consentement ePrivacy ne s'applique pas.",
      },
      {
        title: "90× plus léger",
        body: "1,6 Ko contre 144 Ko pour le gtag.js de GA4, tous deux gzippés. C'est une différence mesurable sur les Core Web Vitals en mobile.",
      },
    ],
    steps: [
      {
        title: "Retirez votre ancienne balise",
        body: "Supprimez le snippet GA4 et, le plus souvent, la bannière de consentement qui n'existait que pour lui.",
      },
      {
        title: "Ajoutez PulseTrack",
        body: "Une balise script, aucune configuration et aucun contrat de sous-traitance à négocier.",
      },
      {
        title: "Gardez vos données en Europe",
        body: "Les événements sont stockés sur une infrastructure européenne et n'en sortent jamais.",
      },
    ],
    faq: [
      {
        q: "Ai-je vraiment le droit de me passer de bannière cookies ?",
        a: "Le consentement au titre d'ePrivacy est déclenché par le stockage ou la lecture d'informations sur l'appareil de l'utilisateur. PulseTrack ne fait ni l'un ni l'autre. Cela reflète le traitement habituel de l'analytics sans cookie, mais ne constitue pas un conseil juridique — vérifiez avec votre conseil pour votre juridiction.",
      },
      {
        q: "Quelles données sont réellement stockées par visite ?",
        a: "Le chemin de la page, le référent, un pays approximatif, le type d'appareil, une clé de session anonyme quotidienne et un horodatage. Aucune adresse IP, aucun cookie, aucun identifiant inter-sites.",
      },
      {
        q: "Où les données sont-elles hébergées ?",
        a: "Sur une infrastructure européenne. Les événements ne quittent pas l'Union européenne.",
      },
      {
        q: "Les bloqueurs de publicité bloquent-ils PulseTrack ?",
        a: "Bien moins souvent que Google Analytics, car PulseTrack n'est pas une régie publicitaire et ne figure pas sur les principales listes de blocage. Vous verrez généralement nettement plus de trafic que ce que GA4 remontait.",
      },
    ],
    related: ["analytics", "heatmaps", "dashboards"],
  },
};

const catalogs: Record<Locale, Catalog> = { en, fr };

export function getFeature(locale: Locale, slug: FeatureSlug): FeaturePage {
  return catalogs[locale][slug];
}
