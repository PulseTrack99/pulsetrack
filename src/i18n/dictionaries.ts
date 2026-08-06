export type Locale = "en" | "fr";

export const dictionaries = {
  en: {
    // Navbar
    nav: {
      features: "Features",
      howItWorks: "How it works",
      pricing: "Pricing",
      login: "Log in",
      startFree: "Start free",
    },

    // Hero
    hero: {
      badge: "Now tracking 12M+ events",
      titleStart: "Know where your",
      titleHighlight: "revenue",
      titleEnd: "comes from.",
      subtitle:
        "The analytics platform that connects traffic sources to actual payments. See which channels drive revenue, not just clicks.",
      cta: "Start for free",
      demo: "View demo",
      noCreditCard: "No credit card",
      gdpr: "GDPR compliant",
      quickSetup: "1-min setup",
      liveVisitors: "Live visitors",
      revenueToday: "Revenue today",
    },

    // Social proof
    social: {
      eventsTracked: "Events tracked",
      websites: "Websites",
      countries: "Countries",
      uptime: "Uptime",
    },

    // Features
    features: {
      label: "Features",
      title: "Everything you need.",
      titleMuted: "Nothing you don't.",
      subtitle:
        "PulseTrack replaces Google Analytics with a tool that's 10× simpler, privacy-first, and focused on what matters: your revenue.",
      revenueAttribution: "Revenue Attribution",
      revenueAttributionDesc:
        "Connect Stripe. See exactly which traffic sources drive actual paying customers — not just visits.",
      realtimeDashboard: "Real-time Dashboard",
      realtimeDashboardDesc:
        "Live visitors on a 3D globe, active pages, sparkline metrics. Everything updates every 5 seconds.",
      conversionFunnels: "Conversion Funnels",
      conversionFunnelsDesc:
        "Build multi-step funnels. See where visitors drop off and optimize your conversion flow.",
      gdprNative: "GDPR Native",
      gdprNativeDesc:
        "No cookies. No consent banner needed. Fully compliant with European privacy regulations by design.",
      lightScript: "< 3KB Script",
      lightScriptDesc:
        "Lighter than a favicon. Zero impact on your site speed. Your visitors won't notice a thing.",
      publicDashboards: "Public Dashboards",
      publicDashboardsDesc:
        "Share your analytics with stakeholders. One-click public dashboard with your branding.",
    },

    // Revenue feature
    revenue: {
      label: "Revenue Tracking",
      revenueBySource: "Revenue by Source",
      last30days: "Last 30 days",
      total: "total",
      titleStart: "Stop guessing.",
      titleHighlight: "Start measuring.",
      description:
        "Connect your Stripe account and instantly see which traffic sources generate real revenue. Not just pageviews. Not just clicks. Actual money in your bank account, attributed to every channel.",
      feature1: "Revenue per traffic source",
      feature2: "Best-converting landing pages",
      feature3: "Customer attribution via email matching",
      feature4: "Daily/weekly/monthly revenue charts",
    },

    // How it works
    howItWorks: {
      label: "Setup",
      title: "Live in 60 seconds",
      subtitle:
        "No developer needed. If you can copy-paste, you can install PulseTrack.",
      step1Title: "Add the script",
      step1Desc:
        "One line of code. Works with any framework, CMS, or static site.",
      step2Title: "Data flows in",
      step2Desc:
        "Within minutes: live visitors, traffic sources, top pages, device breakdown.",
      step3Title: "Connect Stripe",
      step3Desc:
        "Link your payment processor and see which channels actually make you money.",
    },

    // Pricing
    pricing: {
      label: "Pricing",
      title: "Simple, transparent pricing",
      subtitle: "Start free. Upgrade when you grow. Cancel anytime.",
      popular: "Popular",
      mo: "/mo",
      free: {
        name: "Free",
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
      starter: {
        name: "Starter",
        description: "For creators & freelancers",
        cta: "Start free trial",
        features: [
          "3 websites",
          "50K events/mo",
          "5 funnels",
          "90-day retention",
          "Public dashboard",
          "Email support",
        ],
      },
      growth: {
        name: "Growth",
        description: "For growing businesses",
        cta: "Start free trial",
        features: [
          "10 websites",
          "200K events/mo",
          "20 funnels",
          "6-month retention",
          "Revenue tracking",
          "API access",
          "Priority support",
        ],
      },
      business: {
        name: "Business",
        description: "For agencies & e-commerce",
        cta: "Contact us",
        features: [
          "50 websites",
          "1M events/mo",
          "Unlimited funnels",
          "12-month retention",
          "Revenue tracking",
          "API access",
          "Priority support",
          "CSV export",
        ],
      },
    },

    // CTA
    cta: {
      title: "Ready to see where your money comes from?",
      subtitle:
        "Join thousands of businesses that replaced Google Analytics with a simpler, faster, privacy-first alternative. Setup in under 60 seconds.",
      button: "Create free account",
      freeForever: "Free forever tier",
      noCreditCard: "No credit card",
      gdpr: "GDPR compliant",
    },

    // Footer
    footer: {
      privacy: "Privacy",
      terms: "Terms",
      docs: "Docs",
      contact: "Contact",
    },
  },

  fr: {
    // Navbar
    nav: {
      features: "Fonctionnalités",
      howItWorks: "Comment ça marche",
      pricing: "Tarifs",
      login: "Connexion",
      startFree: "Essai gratuit",
    },

    // Hero
    hero: {
      badge: "Déjà 12M+ événements trackés",
      titleStart: "Sachez d'où vient votre",
      titleHighlight: "chiffre d'affaires",
      titleEnd: ".",
      subtitle:
        "La plateforme analytics qui connecte vos sources de trafic à vos paiements. Voyez quels canaux génèrent du revenu, pas juste des clics.",
      cta: "Commencer gratuitement",
      demo: "Voir la démo",
      noCreditCard: "Sans carte bancaire",
      gdpr: "Conforme RGPD",
      quickSetup: "Installation 1 min",
      liveVisitors: "Visiteurs en direct",
      revenueToday: "Revenu aujourd'hui",
    },

    // Social proof
    social: {
      eventsTracked: "Événements trackés",
      websites: "Sites web",
      countries: "Pays",
      uptime: "Disponibilité",
    },

    // Features
    features: {
      label: "Fonctionnalités",
      title: "Tout ce qu'il vous faut.",
      titleMuted: "Rien de superflu.",
      subtitle:
        "PulseTrack remplace Google Analytics par un outil 10× plus simple, respectueux de la vie privée, et focalisé sur l'essentiel : votre chiffre d'affaires.",
      revenueAttribution: "Attribution du revenu",
      revenueAttributionDesc:
        "Connectez Stripe. Voyez quelles sources de trafic génèrent de vrais clients payants — pas juste des visites.",
      realtimeDashboard: "Dashboard temps réel",
      realtimeDashboardDesc:
        "Visiteurs en direct sur un globe 3D, pages actives, métriques sparkline. Tout se met à jour toutes les 5 secondes.",
      conversionFunnels: "Funnels de conversion",
      conversionFunnelsDesc:
        "Créez des funnels multi-étapes. Identifiez où vos visiteurs abandonnent et optimisez votre flux de conversion.",
      gdprNative: "RGPD natif",
      gdprNativeDesc:
        "Aucun cookie. Aucune bannière de consentement. Conforme aux réglementations européennes sur la vie privée, par design.",
      lightScript: "Script < 3 Ko",
      lightScriptDesc:
        "Plus léger qu'un favicon. Zéro impact sur la vitesse de votre site. Vos visiteurs ne remarqueront rien.",
      publicDashboards: "Dashboards publics",
      publicDashboardsDesc:
        "Partagez vos analytics avec vos collaborateurs. Dashboard public en un clic, à votre image.",
    },

    // Revenue feature
    revenue: {
      label: "Suivi du revenu",
      revenueBySource: "Revenu par source",
      last30days: "30 derniers jours",
      total: "total",
      titleStart: "Arrêtez de deviner.",
      titleHighlight: "Mesurez.",
      description:
        "Connectez votre compte Stripe et voyez instantanément quelles sources de trafic génèrent du vrai revenu. Pas juste des pages vues. Pas juste des clics. De l'argent réel sur votre compte, attribué à chaque canal.",
      feature1: "Revenu par source de trafic",
      feature2: "Pages d'atterrissage les plus rentables",
      feature3: "Attribution client par email",
      feature4: "Graphiques de revenu jour/semaine/mois",
    },

    // How it works
    howItWorks: {
      label: "Installation",
      title: "En ligne en 60 secondes",
      subtitle:
        "Pas besoin de développeur. Si vous savez copier-coller, vous pouvez installer PulseTrack.",
      step1Title: "Ajoutez le script",
      step1Desc:
        "Une seule ligne de code. Compatible avec tout framework, CMS ou site statique.",
      step2Title: "Les données arrivent",
      step2Desc:
        "En quelques minutes : visiteurs en direct, sources de trafic, pages populaires, appareils.",
      step3Title: "Connectez Stripe",
      step3Desc:
        "Reliez votre processeur de paiement et voyez quels canaux vous rapportent vraiment.",
    },

    // Pricing
    pricing: {
      label: "Tarifs",
      title: "Des tarifs simples et transparents",
      subtitle:
        "Commencez gratuitement. Évoluez quand vous grandissez. Annulez quand vous voulez.",
      popular: "Populaire",
      mo: "/mois",
      free: {
        name: "Gratuit",
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
      starter: {
        name: "Starter",
        description: "Pour les créateurs & freelances",
        cta: "Essai gratuit",
        features: [
          "3 sites web",
          "50K événements/mois",
          "5 funnels",
          "Rétention 90 jours",
          "Dashboard public",
          "Support email",
        ],
      },
      growth: {
        name: "Growth",
        description: "Pour les entreprises en croissance",
        cta: "Essai gratuit",
        features: [
          "10 sites web",
          "200K événements/mois",
          "20 funnels",
          "Rétention 6 mois",
          "Suivi du revenu",
          "Accès API",
          "Support prioritaire",
        ],
      },
      business: {
        name: "Business",
        description: "Pour les agences & e-commerce",
        cta: "Nous contacter",
        features: [
          "50 sites web",
          "1M événements/mois",
          "Funnels illimités",
          "Rétention 12 mois",
          "Suivi du revenu",
          "Accès API",
          "Support prioritaire",
          "Export CSV",
        ],
      },
    },

    // CTA
    cta: {
      title: "Prêt à voir d'où vient votre argent ?",
      subtitle:
        "Rejoignez des milliers d'entreprises qui ont remplacé Google Analytics par une alternative plus simple, plus rapide et respectueuse de la vie privée. Installation en moins de 60 secondes.",
      button: "Créer un compte gratuit",
      freeForever: "Gratuit pour toujours",
      noCreditCard: "Sans carte bancaire",
      gdpr: "Conforme RGPD",
    },

    // Footer
    footer: {
      privacy: "Confidentialité",
      terms: "CGU",
      docs: "Documentation",
      contact: "Contact",
    },
  },
} as const;

export type Dictionary = (typeof dictionaries)["en"];
