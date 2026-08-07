import type { Labels as ShowcaseLabels } from "@/components/marketing/product-showcase";
import type { NavLabels } from "@/components/marketing/site-nav";
import type { AssistantLabels } from "@/components/marketing/assistant";
import type { Plan } from "@/components/marketing/sections";

export type Locale = "en" | "fr";

export interface Dictionary {
  meta: { title: string; description: string; keywords: string[] };
  nav: NavLabels;

  hero: {
    badge: string;
    title: string;
    titleAccent: string;
    subtitle: string;
    primary: string;
    secondary: string;
    notes: string[];
  };

  showcase: ShowcaseLabels;

  trust: { rating: string; reviews: string; worksWith: string };

  featureRevenue: {
    eyebrow: string;
    title: string;
    titleAccent: string;
    body: string;
    bullets: string[];
    link: string;
    art: {
      journey: string;
      clicked: string;
      landed: string;
      identified: string;
      paid: string;
      attributed: string;
      source: string;
    };
  };

  featureHeatmap: {
    eyebrow: string;
    title: string;
    body: string;
    bullets: string[];
    link: string;
    art: { title: string; hot: string; cold: string; cta: string };
  };

  featureFunnel: {
    eyebrow: string;
    title: string;
    body: string;
    bullets: string[];
    link: string;
    art: { title: string; steps: string[]; lost: string; converted: string };
  };

  featurePrivacy: {
    eyebrow: string;
    title: string;
    body: string;
    bullets: string[];
    link: string;
    art: {
      them: string;
      us: string;
      weight: string;
      cookies: string;
      banner: string;
      yes: string;
      no: string;
      required: string;
      notRequired: string;
    };
  };

  aiConnect: {
    eyebrow: string;
    badge: string;
    title: string;
    body: string;
    cta: string;
  };

  benefits: {
    title: string;
    cta: string;
    items: { icon: string; title: string; body: string }[];
  };

  testimonial: {
    quote: string;
    author: string;
    role: string;
    sampleLabel: string;
  };

  pricing: {
    eyebrow: string;
    title: string;
    subtitle: string;
    popular: string;
    perMonth: string;
    plans: Plan[];
  };

  resources: {
    items: { icon: string; title: string; body: string; cta: string; href: string }[];
  };

  finalCta: {
    title: string;
    titleAccent: string;
    primary: string;
    secondary: string;
    notes: string[];
  };

  footer: {
    tagline: string;
    columns: { title: string; links: { label: string; href: string }[] }[];
    legal: string;
  };

  assistant: AssistantLabels;
}

/* ══════════════════════════════════════════════════════════════
   ENGLISH
   ══════════════════════════════════════════════════════════════ */

const en: Dictionary = {
  meta: {
    title: "PulseTrack — Analytics that follows the money",
    description:
      "See which traffic sources turn into paying customers, not just pageviews. Privacy-first web analytics with revenue attribution, heatmaps and funnels. Cookie-free, GDPR-native, 2 KB script.",
    keywords: [
      "web analytics",
      "revenue attribution",
      "Google Analytics alternative",
      "cookieless analytics",
      "GDPR analytics",
      "heatmaps",
      "conversion funnels",
      "Stripe analytics",
      "privacy-first analytics",
    ],
  },

  nav: {
    product: "Product",
    pricing: "Pricing",
    docs: "How it works",
    login: "Log in",
    cta: "Start free",
    productMenu: [
      {
        href: "/features/revenue",
        title: "Revenue attribution",
        blurb: "Tie every euro back to its source",
        icon: "revenue",
      },
      {
        href: "/features/heatmaps",
        title: "Heatmaps",
        blurb: "See where attention actually goes",
        icon: "heatmaps",
      },
      {
        href: "/features/funnels",
        title: "Funnels",
        blurb: "Find the step that loses people",
        icon: "funnels",
      },
      {
        href: "/features/realtime",
        title: "Real-time",
        blurb: "Who is on your site right now",
        icon: "realtime",
      },
      {
        href: "/features/analytics",
        title: "Core analytics",
        blurb: "Traffic, sources, pages, devices",
        icon: "analytics",
      },
      {
        href: "/features/dashboards",
        title: "Public dashboards",
        blurb: "Share numbers without seats",
        icon: "dashboards",
      },
    ],
  },

  hero: {
    badge: "Revenue attribution is live",
    title: "Analytics that follows",
    titleAccent: "the money",
    subtitle:
      "See which traffic sources turn into paying customers — not just pageviews. Privacy-first, cookie-free, and installed in under a minute.",
    primary: "Start for free",
    secondary: "See how it works",
    notes: ["No credit card", "GDPR-native", "2 KB script"],
  },

  showcase: {
    tabLive: "Live",
    tabAnalytics: "Analytics",
    tabHeatmap: "Heatmaps",
    tabFunnels: "Funnels",
    tabRevenue: "Revenue",

    analytics: "Analytics",
    heatmap: "Heatmap",
    funnels: "Funnels",
    revenue: "Revenue",
    live: "Live",

    last30: "Last 30 days",
    clicks: "Clicks",
    updating: "Updating",

    visitors: "Visitors",
    pageviews: "Pageviews",
    bounce: "Bounce rate",
    visitorsOverTime: "Visitors over time",
    thisMonth: "This month",
    lastMonth: "Last month",

    totalClicks: "Total clicks",
    rageClicks: "Rage clicks",
    scrollDepth: "Avg. scroll depth",

    step1: "Visited pricing",
    step2: "Started signup",
    step3: "Entered payment",
    step4: "Subscribed",
    dropoff: "drop-off",
    conversion: "Conversion",
    avgTime: "Avg. time to convert",

    totalRevenue: "Total revenue",
    transactions: "Transactions",
    aov: "Avg. order value",
    revenueBySource: "Revenue by source",
    dailyRevenue: "Daily revenue",

    visitorsNow: "visitors right now",
    byLocation: "By location",
    activePages: "Active pages",

    ai: {
      live: [
        "Where is the traffic spike coming from?",
        "Product Hunt — 312 visitors in the last hour, 4× your daily average. They're landing on /pricing.",
        "Track this source as a campaign",
      ],
      analytics: [
        "Why did visitors jump this month?",
        "Organic search grew 41% after your 12 Mar post. It now drives 38% of all sessions.",
        "Break this down by landing page",
      ],
      heatmap: [
        "Is anyone clicking the secondary CTA?",
        "Barely — 3.1% of clicks. But 126 rage clicks landed on the pricing table, which isn't clickable.",
        "Show me the sessions that rage-clicked",
      ],
      funnels: [
        "Where are we losing the most people?",
        "Between signup and payment: 46% drop off. That single step costs you ~€4,100/mo.",
        "Compare this step across sources",
      ],
      revenue: [
        "Which channel actually makes money?",
        "Google drives 42% of revenue from only 23% of traffic. Reddit is the inverse — high traffic, €680.",
        "Show revenue per visitor by source",
      ],
    },
  },

  trust: {
    rating: "Built for people who ship",
    reviews: "Independent, bootstrapped, EU-hosted",
    worksWith: "Works with",
  },

  featureRevenue: {
    eyebrow: "Revenue attribution",
    title: "Stop guessing which channel",
    titleAccent: "pays for itself",
    body:
      "Connect Stripe once. PulseTrack matches every payment back to the session that produced it, so you can see revenue per source instead of a wall of pageviews.",
    bullets: [
      "Revenue, transactions and AOV per traffic source",
      "Best-converting landing pages ranked by euros, not clicks",
      "Customer matching via email — no extra tags to install",
      "Read-only Stripe key, revocable at any time",
    ],
    link: "Explore revenue attribution",
    art: {
      journey: "Session → payment",
      clicked: "Clicked a link",
      landed: "Landed on",
      identified: "Identified",
      paid: "Paid",
      attributed: "Attributed to",
      source: "Source",
    },
  },

  featureHeatmap: {
    eyebrow: "Heatmaps",
    title: "See where attention actually goes",
    body:
      "Click, scroll and attention maps rendered straight over your live page. Spot the button nobody presses and the dead zone everyone keeps tapping.",
    bullets: [
      "Click and tap maps for every page",
      "Scroll depth — find where reading stops",
      "Rage-click detection on non-interactive elements",
      "Segment by device, source or country",
    ],
    link: "Explore heatmaps",
    art: {
      title: "/pricing · click map",
      hot: "Hot",
      cold: "Cold",
      cta: "Most-clicked area",
    },
  },

  featureFunnel: {
    eyebrow: "Funnels",
    title: "Find the step that loses people",
    body:
      "Build a funnel in a few clicks and watch where visitors fall out. Every drop-off is priced, so you know which fix is worth doing first.",
    bullets: [
      "Multi-step funnels across pages and events",
      "Drop-off shown in visitors and in euros",
      "Compare the same funnel across traffic sources",
      "Time-to-convert for each step",
    ],
    link: "Explore funnels",
    art: {
      title: "Signup funnel · last 30 days",
      steps: ["Pricing", "Signup", "Payment", "Subscribed"],
      lost: "Lost",
      converted: "Converted",
    },
  },

  featurePrivacy: {
    eyebrow: "Privacy by design",
    title: "No cookies. No consent banner. No lawyer.",
    body:
      "PulseTrack never sets a cookie and never stores personal data, so there is nothing to ask consent for. Your visitors get a faster page and you get one less thing to worry about.",
    bullets: [
      "Cookie-free by architecture, not by setting",
      "Data hosted in the EU",
      "GDPR, ePrivacy and CCPA compliant out of the box",
      "74× lighter than Google Analytics",
    ],
    link: "Read the privacy approach",
    art: {
      them: "GA4",
      us: "PulseTrack",
      weight: "Script size",
      cookies: "Sets cookies",
      banner: "Consent banner",
      yes: "Yes",
      no: "None",
      required: "Required",
      notRequired: "Not needed",
    },
  },

  aiConnect: {
    eyebrow: "PulseTrack MCP",
    badge: "On the roadmap",
    title: "Ask your analytics from wherever you already work",
    body:
      "An MCP server that lets Claude, ChatGPT, Gemini and friends query your PulseTrack data directly — pull last week's revenue by source without leaving your editor or your chat.",
    cta: "Follow the build",
  },

  benefits: {
    title: "Why teams pick PulseTrack over the big dashboards",
    cta: "Start free",
    items: [
      {
        icon: "speed",
        title: "Fast enough to actually use",
        body:
          "Queries return in well under a second, so you keep asking questions instead of waiting on a loading spinner and giving up.",
      },
      {
        icon: "ai",
        title: "Answers, not just charts",
        body:
          "Ask in plain language and get the number plus the reason behind it. Every answer links back to the raw sessions so you can verify it.",
      },
      {
        icon: "flexible",
        title: "One line to install",
        body:
          "A single script tag on any framework, CMS or static site. No tag manager, no data layer, no three-week implementation project.",
      },
      {
        icon: "scale",
        title: "Priced for building, not for enterprise",
        body:
          "A free tier that is genuinely usable and paid plans that start at €9. No sales call, no annual commitment, cancel whenever.",
      },
    ],
  },

  testimonial: {
    quote:
      "We had six dashboards and still could not answer which channel paid the bills. One number per source ended the argument.",
    author: "Sample copy",
    role: "Replace once you have a referenceable customer",
    sampleLabel: "Illustrative — not a real customer quote",
  },

  pricing: {
    eyebrow: "Pricing",
    title: "Simple, transparent pricing",
    subtitle: "Start free. Upgrade when you grow. Cancel anytime.",
    popular: "Popular",
    perMonth: "/mo",
    plans: [
      {
        name: "Free",
        price: "0",
        description: "For side projects",
        cta: "Start free",
        features: [
          "1 website",
          "5K events/mo",
          "1 funnel",
          "30-day retention",
          "Public dashboard",
        ],
      },
      {
        name: "Starter",
        price: "9",
        description: "For creators & freelancers",
        cta: "Start free trial",
        features: [
          "3 websites",
          "50K events/mo",
          "5 funnels",
          "90-day retention",
          "Heatmaps",
          "Email support",
        ],
      },
      {
        name: "Growth",
        price: "29",
        description: "For growing businesses",
        cta: "Start free trial",
        features: [
          "10 websites",
          "200K events/mo",
          "20 funnels",
          "6-month retention",
          "Revenue attribution",
          "API access",
          "Priority support",
        ],
      },
      {
        name: "Business",
        price: "79",
        description: "For agencies & e-commerce",
        cta: "Contact us",
        features: [
          "50 websites",
          "1M events/mo",
          "Unlimited funnels",
          "12-month retention",
          "Revenue attribution",
          "API access",
          "Priority support",
          "CSV export",
        ],
      },
    ],
  },

  resources: {
    items: [
      {
        icon: "docs",
        title: "Install it yourself in a minute",
        body: "Copy-paste guides for Next.js, WordPress, Shopify, Webflow and plain HTML.",
        cta: "Read the docs",
        href: "/#how",
      },
      {
        icon: "support",
        title: "Talk to someone who built it",
        body: "Email support answered by the people writing the code, not a ticket queue.",
        cta: "Get in touch",
        href: "/#how",
      },
      {
        icon: "community",
        title: "Follow the build in public",
        body: "Roadmap, changelog and the occasional revenue screenshot.",
        cta: "See the roadmap",
        href: "/#how",
      },
    ],
  },

  finalCta: {
    title: "Find out which channel",
    titleAccent: "actually pays.",
    primary: "Create a free account",
    secondary: "Compare plans",
    notes: ["Free forever tier", "No credit card", "60-second setup"],
  },

  footer: {
    tagline:
      "Privacy-first web analytics that connects your traffic to your revenue.",
    columns: [
      {
        title: "Product",
        links: [
          { label: "Revenue attribution", href: "/features/revenue" },
          { label: "Heatmaps", href: "/features/heatmaps" },
          { label: "Funnels", href: "/features/funnels" },
          { label: "Real-time", href: "/features/realtime" },
          { label: "Pricing", href: "/#pricing" },
        ],
      },
      {
        title: "Compare",
        links: [
          { label: "vs Google Analytics", href: "/features/privacy" },
          { label: "Core analytics", href: "/features/analytics" },
          { label: "Public dashboards", href: "/features/dashboards" },
        ],
      },
      {
        title: "Company",
        links: [
          { label: "Privacy", href: "/#" },
          { label: "Terms", href: "/#" },
          { label: "Contact", href: "/#" },
        ],
      },
    ],
    legal: "© 2026 PulseTrack. Made in Europe.",
  },

  assistant: {
    pill: "Ask PulseTrack",
    title: "PulseTrack Assistant",
    subtitle: "Questions about the product, answered",
    placeholder: "Ask anything…",
    suggestions: [
      "How does revenue attribution work?",
      "Do I need a cookie banner?",
      "Which plan fits 100K pageviews?",
    ],
    answer:
      "Thanks for asking. The assistant is not wired to a live model yet — in the meantime, the pricing and feature pages cover this, or you can reach a human from the contact link in the footer.",
    disclaimer: "Scripted responses for now. A live model is on the roadmap.",
  },
};

/* ══════════════════════════════════════════════════════════════
   FRANÇAIS
   ══════════════════════════════════════════════════════════════ */

const fr: Dictionary = {
  meta: {
    title: "PulseTrack — L'analytics qui suit l'argent",
    description:
      "Découvrez quelles sources de trafic deviennent des clients payants, pas juste des pages vues. Analytics respectueux de la vie privée avec attribution du revenu, heatmaps et funnels. Sans cookie, conforme RGPD, script de 2 Ko.",
    keywords: [
      "analytics web",
      "attribution du revenu",
      "alternative Google Analytics",
      "analytics sans cookie",
      "analytics RGPD",
      "heatmap",
      "tunnel de conversion",
      "analytics Stripe",
      "statistiques site web",
    ],
  },

  nav: {
    product: "Produit",
    pricing: "Tarifs",
    docs: "Comment ça marche",
    login: "Connexion",
    cta: "Essai gratuit",
    productMenu: [
      {
        href: "/features/revenue",
        title: "Attribution du revenu",
        blurb: "Reliez chaque euro à sa source",
        icon: "revenue",
      },
      {
        href: "/features/heatmaps",
        title: "Heatmaps",
        blurb: "Voyez où va vraiment l'attention",
        icon: "heatmaps",
      },
      {
        href: "/features/funnels",
        title: "Funnels",
        blurb: "Trouvez l'étape qui vous fait perdre",
        icon: "funnels",
      },
      {
        href: "/features/realtime",
        title: "Temps réel",
        blurb: "Qui est sur votre site maintenant",
        icon: "realtime",
      },
      {
        href: "/features/analytics",
        title: "Analytics",
        blurb: "Trafic, sources, pages, appareils",
        icon: "analytics",
      },
      {
        href: "/features/dashboards",
        title: "Dashboards publics",
        blurb: "Partagez sans créer de comptes",
        icon: "dashboards",
      },
    ],
  },

  hero: {
    badge: "L'attribution du revenu est disponible",
    title: "L'analytics qui suit",
    titleAccent: "l'argent",
    subtitle:
      "Découvrez quelles sources de trafic deviennent des clients payants — pas juste des pages vues. Sans cookie, respectueux de la vie privée, installé en moins d'une minute.",
    primary: "Commencer gratuitement",
    secondary: "Voir comment ça marche",
    notes: ["Sans carte bancaire", "RGPD natif", "Script de 2 Ko"],
  },

  showcase: {
    tabLive: "Temps réel",
    tabAnalytics: "Analytics",
    tabHeatmap: "Heatmaps",
    tabFunnels: "Funnels",
    tabRevenue: "Revenu",

    analytics: "Analytics",
    heatmap: "Heatmap",
    funnels: "Funnels",
    revenue: "Revenu",
    live: "Temps réel",

    last30: "30 derniers jours",
    clicks: "Clics",
    updating: "Mise à jour",

    visitors: "Visiteurs",
    pageviews: "Pages vues",
    bounce: "Taux de rebond",
    visitorsOverTime: "Visiteurs dans le temps",
    thisMonth: "Ce mois-ci",
    lastMonth: "Mois dernier",

    totalClicks: "Clics totaux",
    rageClicks: "Clics de rage",
    scrollDepth: "Profondeur de scroll",

    step1: "A vu les tarifs",
    step2: "A commencé l'inscription",
    step3: "A saisi le paiement",
    step4: "S'est abonné",
    dropoff: "d'abandon",
    conversion: "Conversion",
    avgTime: "Temps moyen de conversion",

    totalRevenue: "Revenu total",
    transactions: "Transactions",
    aov: "Panier moyen",
    revenueBySource: "Revenu par source",
    dailyRevenue: "Revenu quotidien",

    visitorsNow: "visiteurs en ce moment",
    byLocation: "Par localisation",
    activePages: "Pages actives",

    ai: {
      live: [
        "D'où vient ce pic de trafic ?",
        "Product Hunt — 312 visiteurs dans la dernière heure, 4× votre moyenne. Ils arrivent sur /pricing.",
        "Suivre cette source comme campagne",
      ],
      analytics: [
        "Pourquoi les visites ont bondi ce mois-ci ?",
        "Le référencement naturel a progressé de 41 % après votre article du 12 mars. Il génère 38 % des sessions.",
        "Détailler par page d'atterrissage",
      ],
      heatmap: [
        "Est-ce qu'on clique sur le CTA secondaire ?",
        "Très peu — 3,1 % des clics. En revanche 126 clics de rage sur le tableau de tarifs, qui n'est pas cliquable.",
        "Voir les sessions concernées",
      ],
      funnels: [
        "Où perd-on le plus de monde ?",
        "Entre l'inscription et le paiement : 46 % d'abandon. Cette seule étape vous coûte ~4 100 €/mois.",
        "Comparer cette étape par source",
      ],
      revenue: [
        "Quel canal rapporte vraiment ?",
        "Google génère 42 % du revenu avec seulement 23 % du trafic. Reddit c'est l'inverse — beaucoup de trafic, 680 €.",
        "Voir le revenu par visiteur et par source",
      ],
    },
  },

  trust: {
    rating: "Fait pour ceux qui expédient",
    reviews: "Indépendant, autofinancé, hébergé en Europe",
    worksWith: "Compatible avec",
  },

  featureRevenue: {
    eyebrow: "Attribution du revenu",
    title: "Arrêtez de deviner quel canal",
    titleAccent: "se rentabilise",
    body:
      "Connectez Stripe une fois. PulseTrack relie chaque paiement à la session qui l'a produit : vous voyez le revenu par source, plus un mur de pages vues.",
    bullets: [
      "Revenu, transactions et panier moyen par source de trafic",
      "Pages d'atterrissage classées en euros, pas en clics",
      "Rapprochement client par email — aucun tag à installer",
      "Clé Stripe en lecture seule, révocable à tout moment",
    ],
    link: "Découvrir l'attribution du revenu",
    art: {
      journey: "Session → paiement",
      clicked: "A cliqué sur un lien",
      landed: "Est arrivé sur",
      identified: "Identifié",
      paid: "A payé",
      attributed: "Attribué à",
      source: "Source",
    },
  },

  featureHeatmap: {
    eyebrow: "Heatmaps",
    title: "Voyez où va vraiment l'attention",
    body:
      "Cartes de clics, de scroll et d'attention affichées directement sur votre page. Repérez le bouton que personne ne presse et la zone morte que tout le monde tape.",
    bullets: [
      "Carte des clics et des taps sur chaque page",
      "Profondeur de scroll — où la lecture s'arrête",
      "Détection des clics de rage sur les éléments non cliquables",
      "Segmentation par appareil, source ou pays",
    ],
    link: "Découvrir les heatmaps",
    art: {
      title: "/pricing · carte des clics",
      hot: "Chaud",
      cold: "Froid",
      cta: "Zone la plus cliquée",
    },
  },

  featureFunnel: {
    eyebrow: "Funnels",
    title: "Trouvez l'étape qui vous fait perdre",
    body:
      "Créez un funnel en quelques clics et observez où les visiteurs décrochent. Chaque abandon est chiffré : vous savez quelle correction fait gagner le plus.",
    bullets: [
      "Funnels multi-étapes sur les pages et les événements",
      "Abandon exprimé en visiteurs et en euros",
      "Comparaison d'un même funnel entre sources de trafic",
      "Temps de conversion pour chaque étape",
    ],
    link: "Découvrir les funnels",
    art: {
      title: "Funnel d'inscription · 30 derniers jours",
      steps: ["Tarifs", "Inscription", "Paiement", "Abonné"],
      lost: "Perdus",
      converted: "Convertis",
    },
  },

  featurePrivacy: {
    eyebrow: "Vie privée par conception",
    title: "Aucun cookie. Aucune bannière. Aucun avocat.",
    body:
      "PulseTrack ne pose jamais de cookie et ne stocke aucune donnée personnelle : il n'y a donc rien à faire consentir. Vos visiteurs ont une page plus rapide et vous avez un souci de moins.",
    bullets: [
      "Sans cookie par architecture, pas par réglage",
      "Données hébergées dans l'Union européenne",
      "Conforme RGPD, ePrivacy et CCPA dès l'installation",
      "74× plus léger que Google Analytics",
    ],
    link: "Lire notre approche de la vie privée",
    art: {
      them: "GA4",
      us: "PulseTrack",
      weight: "Poids du script",
      cookies: "Pose des cookies",
      banner: "Bannière de consentement",
      yes: "Oui",
      no: "Aucun",
      required: "Obligatoire",
      notRequired: "Inutile",
    },
  },

  aiConnect: {
    eyebrow: "PulseTrack MCP",
    badge: "Au programme",
    title: "Interrogez vos analytics depuis là où vous travaillez déjà",
    body:
      "Un serveur MCP qui permet à Claude, ChatGPT, Gemini et les autres d'interroger directement vos données PulseTrack — sortez le revenu par source de la semaine sans quitter votre éditeur ou votre chat.",
    cta: "Suivre le développement",
  },

  benefits: {
    title: "Pourquoi choisir PulseTrack plutôt qu'un gros dashboard",
    cta: "Commencer gratuitement",
    items: [
      {
        icon: "speed",
        title: "Assez rapide pour être utilisé",
        body:
          "Les requêtes répondent en moins d'une seconde : vous continuez à poser des questions au lieu d'attendre un chargement et d'abandonner.",
      },
      {
        icon: "ai",
        title: "Des réponses, pas juste des graphiques",
        body:
          "Posez la question en français et obtenez le chiffre avec son explication. Chaque réponse renvoie aux sessions brutes pour vérification.",
      },
      {
        icon: "flexible",
        title: "Une ligne à installer",
        body:
          "Une balise script sur n'importe quel framework, CMS ou site statique. Pas de tag manager, pas de data layer, pas de chantier de trois semaines.",
      },
      {
        icon: "scale",
        title: "Un prix pour construire, pas pour l'entreprise",
        body:
          "Un plan gratuit réellement utilisable et des offres payantes à partir de 9 €. Sans rendez-vous commercial ni engagement annuel.",
      },
    ],
  },

  testimonial: {
    quote:
      "On avait six dashboards et on ne savait toujours pas quel canal payait les factures. Un chiffre par source a mis fin au débat.",
    author: "Texte d'exemple",
    role: "À remplacer par un vrai client référençable",
    sampleLabel: "Illustratif — ce n'est pas une vraie citation client",
  },

  pricing: {
    eyebrow: "Tarifs",
    title: "Des tarifs simples et transparents",
    subtitle:
      "Commencez gratuitement. Évoluez quand vous grandissez. Annulez quand vous voulez.",
    popular: "Populaire",
    perMonth: "/mois",
    plans: [
      {
        name: "Gratuit",
        price: "0",
        description: "Pour les projets perso",
        cta: "Commencer gratuit",
        features: [
          "1 site web",
          "5K événements/mois",
          "1 funnel",
          "Rétention 30 jours",
          "Dashboard public",
        ],
      },
      {
        name: "Starter",
        price: "9",
        description: "Pour les créateurs & freelances",
        cta: "Essai gratuit",
        features: [
          "3 sites web",
          "50K événements/mois",
          "5 funnels",
          "Rétention 90 jours",
          "Heatmaps",
          "Support email",
        ],
      },
      {
        name: "Growth",
        price: "29",
        description: "Pour les entreprises en croissance",
        cta: "Essai gratuit",
        features: [
          "10 sites web",
          "200K événements/mois",
          "20 funnels",
          "Rétention 6 mois",
          "Attribution du revenu",
          "Accès API",
          "Support prioritaire",
        ],
      },
      {
        name: "Business",
        price: "79",
        description: "Pour les agences & e-commerce",
        cta: "Nous contacter",
        features: [
          "50 sites web",
          "1M événements/mois",
          "Funnels illimités",
          "Rétention 12 mois",
          "Attribution du revenu",
          "Accès API",
          "Support prioritaire",
          "Export CSV",
        ],
      },
    ],
  },

  resources: {
    items: [
      {
        icon: "docs",
        title: "Installez-le vous-même en une minute",
        body:
          "Guides copier-coller pour Next.js, WordPress, Shopify, Webflow et HTML simple.",
        cta: "Lire la doc",
        href: "/#how",
      },
      {
        icon: "support",
        title: "Parlez à quelqu'un qui l'a construit",
        body:
          "Support email assuré par ceux qui écrivent le code, pas par une file de tickets.",
        cta: "Nous écrire",
        href: "/#how",
      },
      {
        icon: "community",
        title: "Suivez le build en public",
        body: "Roadmap, changelog et de temps en temps une capture du revenu.",
        cta: "Voir la roadmap",
        href: "/#how",
      },
    ],
  },

  finalCta: {
    title: "Découvrez quel canal",
    titleAccent: "vous rapporte vraiment.",
    primary: "Créer un compte gratuit",
    secondary: "Comparer les offres",
    notes: ["Gratuit pour toujours", "Sans carte bancaire", "Installé en 60 s"],
  },

  footer: {
    tagline:
      "L'analytics respectueux de la vie privée qui relie votre trafic à votre revenu.",
    columns: [
      {
        title: "Produit",
        links: [
          { label: "Attribution du revenu", href: "/features/revenue" },
          { label: "Heatmaps", href: "/features/heatmaps" },
          { label: "Funnels", href: "/features/funnels" },
          { label: "Temps réel", href: "/features/realtime" },
          { label: "Tarifs", href: "/#pricing" },
        ],
      },
      {
        title: "Comparer",
        links: [
          { label: "vs Google Analytics", href: "/features/privacy" },
          { label: "Analytics", href: "/features/analytics" },
          { label: "Dashboards publics", href: "/features/dashboards" },
        ],
      },
      {
        title: "Entreprise",
        links: [
          { label: "Confidentialité", href: "/#" },
          { label: "CGU", href: "/#" },
          { label: "Contact", href: "/#" },
        ],
      },
    ],
    legal: "© 2026 PulseTrack. Fait en Europe.",
  },

  assistant: {
    pill: "Poser une question",
    title: "Assistant PulseTrack",
    subtitle: "Vos questions sur le produit, répondues",
    placeholder: "Posez votre question…",
    suggestions: [
      "Comment fonctionne l'attribution du revenu ?",
      "Ai-je besoin d'une bannière cookies ?",
      "Quelle offre pour 100K pages vues ?",
    ],
    answer:
      "Merci pour votre question. L'assistant n'est pas encore relié à un modèle en direct — en attendant, les pages tarifs et fonctionnalités couvrent le sujet, ou vous pouvez joindre un humain via le lien contact en bas de page.",
    disclaimer: "Réponses scriptées pour l'instant. Un modèle en direct arrive.",
  },
};

export const dictionaries: Record<Locale, Dictionary> = { en, fr };
