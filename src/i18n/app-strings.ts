import type { Locale } from "./dictionaries";

/**
 * Every string the signed-in dashboard shows.
 *
 * Kept apart from dictionaries.ts, which is the marketing site's copy:
 * the two have different audiences and change at different times, and
 * one 1,000-line file for both would be worse than two.
 *
 * The French entries are the originals — this is a French product that
 * is now selling into the rest of Europe — so `fr` is written first and
 * `en` is the translation, not the other way round.
 */

export interface AppStrings {
  shell: {
    search: string;
    create: string;
    newSite: string;
    newFunnel: string;
    manageSites: string;
    addSite: string;
    noSite: string;
    addFirstSite: string;
    upgrade: string;
    settings: string;
    help: string;
    openAssistant: string;
    closeAssistant: string;
    assistant: string;
    notifications: string;
    collapseMenu: string;
    expandMenu: string;
    closeMenu: string;
    openMenu: string;
    signOut: string;
    plan: string;
    switchLanguage: string;
    nav: {
      home: string;
      revenue: string;
      funnels: string;
      flows: string;
      replays: string;
      heatmaps: string;
      settings: string;
      mySites: string;
      addSite: string;
      plans: string;
    };
    palette: {
      placeholder: string;
      pages: string;
      sites: string;
      noResult: string;
    };
    notify: {
      title: string;
      nothing: string;
      noData: string;
      noDataBody: string;
      checkInstall: string;
      insights: string;
      seeOnHome: string;
    };
    connect: {
      title: string;
      body: string;
      cta: string;
    };
  };

  assistant: {
    title: string;
    newChat: string;
    history: string;
    close: string;
    noChats: string;
    delete: string;
    emptyTitle: string;
    emptyBody: string;
    suggestions: string;
    placeholder: string;
    send: string;
    disclaimer: string;
    fallback: string;
    /** Keyed by pathname; falls back to suggestions_default. */
    suggestions_by_screen: Record<string, string[]>;
    suggestions_default: string[];
  };


  home: {
    deltaBasis: string;
    periods: Record<string, string>;
    exportCsv: string;
    exporting: string;
    exportLocked: string;
    seePlans: string;
    insightsWeekOf: string;
    metrics: {
      visitors: string;
      visitorsHint: string;
      sessions: string;
      sessionsHint: string;
      pageviews: string;
      pageviewsHint: string;
      bounce: string;
      bounceHint: string;
      duration: string;
      durationHint: string;
      noComparison: string;
      vsPrevious: string;
    };
    chart: {
      title: string;
      totalAndPeak: string;
      annotation: string;
      markEvent: string;
      labelPlaceholder: string;
      add: string;
      remove: string;
      visitorsOn: string;
    };
    rankings: {
      topPages: string;
      topSources: string;
      countries: string;
      emptyPages: string;
      emptySources: string;
      emptyCountries: string;
      totalSuffix: string;
      topOf: string;
      views: string;
      visitors: string;
    };
    empty: {
      title: string;
      body: string;
      addSite: string;
      learnMore: string;
    };
  };

  realtime: {
    title: string;
    visitorsNow: string;
    idle: string;
    refresh: string;
    activePages: string;
    noActivePage: string;
    lastVisits: string;
    noRecentVisit: string;
  };


  settings: {
    tabs: { account: string; sites: string; api: string; team: string };
    account: {
      title: string;
      email: string;
      plan: string;
      upgrade: string;
      memberSince: string;
    };
    password: {
      title: string;
      newPassword: string;
      confirm: string;
      minChars: string;
      retype: string;
      submit: string;
      mismatch: string;
      tooShort: string;
      changed: string;
      networkError: string;
    };
    team: {
      title: string;
      memberOf: string;
      memberOfSuffix: string;
      blurb: string;
      invite: string;
      shareLink: string;
      loading: string;
      none: string;
      pending: string;
      copyLink: string;
      namePlaceholder: string;
      cancel: string;
      generateLink: string;
      removeMember: string;
    };
    sites: {
      title: string;
      addSite: string;
      none: string;
      script: string;
      copied: string;
      copyScript: string;
      remove: string;
      confirmRemove: string;
      publicDashboard: string;
      trafficAlert: string;
      alertIntro: string;
      webhook: string;
      addedOn: string;
    };
    api: {
      title: string;
      seePlans: string;
      addSiteFirst: string;
      blurb: string;
      mcpTitle: string;
      mcpBlurb: string;
      mcpNoPaste: string;
      mcpHeadless: string;
      connectedApps: string;
      newKey: string;
      copyNow: string;
      revoke: string;
      usedOn: string;
      keyNamePlaceholder: string;
      generate: string;
    };
    danger: {
      title: string;
      body: string;
      deleteAccount: string;
      typeToConfirm: string;
      confirmWord: string;
      cancel: string;
    };
  };

  filters: {
    /** Short labels on the period buttons: 7j vs 7d. */
    periodShort: Record<string, string>;
    search: string;
    noMatch: string;
    select: string;
    none: string;
    period: string;
    device: string;
    remove: string;
  };
}

const fr: AppStrings = {
  shell: {
    search: "Rechercher",
    create: "Créer",
    newSite: "Nouveau site",
    newFunnel: "Nouveau funnel",
    manageSites: "Gérer mes sites",
    addSite: "Ajouter un site",
    noSite: "Aucun site",
    addFirstSite: "Ajoutez votre premier site",
    upgrade: "Passer à l'offre supérieure",
    settings: "Paramètres",
    help: "Aide et documentation",
    openAssistant: "Ouvrir l'assistant",
    closeAssistant: "Fermer l'assistant",
    assistant: "Assistant",
    notifications: "Notifications",
    collapseMenu: "Replier le menu",
    expandMenu: "Déplier le menu",
    closeMenu: "Fermer le menu",
    openMenu: "Ouvrir le menu",
    signOut: "Se déconnecter",
    plan: "Plan",
    switchLanguage: "Switch to English",
    nav: {
      home: "Accueil",
      revenue: "Revenue",
      funnels: "Funnels",
      flows: "Flows",
      replays: "Session Replay",
      heatmaps: "Heatmaps",
      settings: "Paramètres",
      mySites: "Mes sites",
      addSite: "Ajouter un site",
      plans: "Offres",
    },
    palette: {
      placeholder: "Aller à une page ou changer de site…",
      pages: "Pages",
      sites: "Sites",
      noResult: "Aucun résultat",
    },
    notify: {
      title: "Notifications",
      nothing:
        "Rien à signaler. Les alertes de chute de trafic et le résumé hebdomadaire apparaîtront ici.",
      noData: "Aucune donnée reçue",
      noDataBody: "Le script n'a encore rien envoyé.",
      checkInstall: "Vérifier l'installation",
      insights: "Insights de la semaine",
      seeOnHome: "Voir sur l'accueil",
    },
    connect: {
      title: "Connectez vos données",
      body: "n'a encore rien envoyé. Une ligne de script à coller, et les écrans se remplissent en quelques secondes — on vous dit dès qu'on reçoit la première visite.",
      cta: "Installer le script",
    },
  },

  assistant: {
    title: "Assistant",
    newChat: "Nouvelle conversation",
    history: "Historique des conversations",
    close: "Fermer l'assistant",
    noChats: "Aucune conversation pour l'instant.",
    delete: "Supprimer",
    emptyTitle: "Une question sur PulseTrack ?",
    emptyBody:
      "Installation, offres, confidentialité, ou ce que fait l'écran devant vous.",
    suggestions: "Suggestions",
    placeholder: "Posez votre question…",
    send: "Envoyer",
    disclaimer:
      "Réponses préécrites, sans appel à un modèle — instantanées et gratuites. Pour une question sur vos propres sessions, utilisez le copilote de Session Replay.",
    fallback:
      "Je n'ai pas de réponse toute prête à celle-là. Les réponses de ce panneau sont écrites à l'avance — elles couvrent l'installation, les offres, la confidentialité et chaque fonctionnalité. Reformulez avec d'autres mots, ou passez par le copilote de Session Replay pour une question portant sur vos propres sessions.",
    suggestions_by_screen: {
      "/dashboard": [
        "Comment installer le script de suivi ?",
        "Que compte exactement « visiteurs » ?",
        "Ai-je besoin d'un bandeau cookies ?",
      ],
      "/dashboard/flows": [
        "Comment lire le diagramme des parcours ?",
        "Que veut dire « Sortie du site » ?",
        "Quelle différence avec un funnel ?",
      ],
      "/dashboard/funnels": [
        "Comment créer un funnel ?",
        "Combien de funnels puis-je créer ?",
      ],
      "/dashboard/heatmaps": [
        "Que sont les clics de rage ?",
        "Comment fonctionne la profondeur de scroll ?",
      ],
      "/dashboard/replays": [
        "Comment fonctionne le Session Replay ?",
        "Les données sensibles sont-elles masquées ?",
      ],
      "/dashboard/revenue": [
        "Comment fonctionne l'attribution du revenu ?",
        "Quelle clé Stripe dois-je créer ?",
      ],
      "/dashboard/settings": [
        "Comment inviter un coéquipier ?",
        "Comment brancher Claude sur mes données ?",
      ],
    },
    suggestions_default: [
      "Comment installer le script de suivi ?",
      "Ai-je besoin d'un bandeau cookies ?",
      "Que puis-je faire avec PulseTrack ?",
    ],
  },



  home: {
    deltaBasis: "Les écarts comparent aux",
    periods: {
      "24h": "24 heures précédentes",
      "7d": "7 jours précédents",
      "30d": "30 jours précédents",
      "90d": "90 jours précédents",
    },
    exportCsv: "Export CSV",
    exporting: "Export…",
    exportLocked: "L'export CSV est disponible sur l'offre Business.",
    seePlans: "Voir les offres",
    insightsWeekOf: "Insights de la semaine du",
    metrics: {
      visitors: "Visiteurs",
      visitorsHint: "Personnes distinctes, identifiées par un hash sans cookie.",
      sessions: "Sessions",
      sessionsHint: "Visites : une même personne qui revient compte plusieurs fois.",
      pageviews: "Pages vues",
      pageviewsHint: "Total des pages chargées sur la période.",
      bounce: "Taux de rebond",
      bounceHint: "Part des sessions qui n'ont vu qu'une seule page.",
      duration: "Durée moy.",
      durationHint: "Temps moyen passé par session.",
      noComparison:
        "Aucune donnée sur la période précédente, il n'y a rien à comparer.",
      vsPrevious: "par rapport à la période précédente",
    },
    chart: {
      title: "Visiteurs par jour",
      totalAndPeak: "au total sur la période · pic à",
      annotation: "Annotation",
      markEvent: "Marquer un événement (lancement, campagne, déploiement…)",
      labelPlaceholder: "Ex. « Lancement early bird »",
      add: "Ajouter",
      remove: "Supprimer",
      visitorsOn: "visiteurs",
    },
    rankings: {
      topPages: "Pages populaires",
      topSources: "Sources de trafic",
      countries: "Pays",
      emptyPages:
        "Vos pages les plus consultées apparaîtront ici dès la première visite enregistrée.",
      emptySources:
        "D'où arrivent vos visiteurs : Google, réseaux sociaux, IA, ou accès direct.",
      emptyCountries:
        "La répartition géographique de vos visiteurs, déduite de leur IP sans la stocker.",
      totalSuffix: "au total",
      topOf: "sur",
      views: "vues",
      visitors: "visiteurs",
    },
    empty: {
      title: "Ajoutez votre premier site",
      body: "Deux étapes : vous déclarez le domaine, puis vous collez une ligne de script dans vos pages. Les premières visites remontent en quelques secondes, sans cookie ni bandeau de consentement.",
      addSite: "Ajouter un site",
      learnMore: "Voir ce que PulseTrack mesure",
    },
  },

  realtime: {
    title: "Temps réel",
    visitorsNow: "visiteurs en ce moment",
    idle: "Personne sur le site à cette seconde. Les visites s'affichent ici en direct, sans rechargement.",
    refresh: "MAJ 5s",
    activePages: "Pages actives",
    noActivePage: "Aucune page active",
    lastVisits: "Dernières visites",
    noRecentVisit: "Aucune visite récente",
  },


  settings: {
    tabs: { account: "Compte", sites: "Sites & alertes", api: "Accès API", team: "Équipe" },
    account: {
      title: "Compte",
      email: "Email",
      plan: "Plan",
      upgrade: "Upgrader →",
      memberSince: "Membre depuis",
    },
    password: {
      title: "Changer le mot de passe",
      newPassword: "Nouveau mot de passe",
      confirm: "Confirmer le mot de passe",
      minChars: "Minimum 8 caractères",
      retype: "Retapez le mot de passe",
      submit: "Modifier le mot de passe",
      mismatch: "Les mots de passe ne correspondent pas",
      tooShort: "Le mot de passe doit contenir au moins 8 caractères",
      changed: "Mot de passe modifié avec succès",
      networkError: "Erreur réseau",
    },
    team: {
      title: "Équipe",
      memberOf: "Vous faites partie de l'équipe de",
      memberOfSuffix: "— accès complet à ses sites, sauf la facturation.",
      blurb: "Un coéquipier invité a accès complet à vos sites, funnels, replays et clés API — tout sauf changer l'offre ou supprimer le compte.",
      invite: "Inviter un coéquipier",
      shareLink: "Envoyez ce lien à votre coéquipier — Slack, email, comme vous voulez.",
      loading: "Chargement…",
      none: "Aucun coéquipier pour l'instant.",
      pending: "Invitation en attente",
      copyLink: "Copier le lien",
      namePlaceholder: "Nom (optionnel — ex. « Marie »)",
      cancel: "Annuler",
      generateLink: "Générer le lien",
      removeMember: "Retirer",
    },
    sites: {
      title: "Mes sites",
      addSite: "+ Ajouter un site",
      none: "Aucun site ajouté.",
      script: "Script",
      copied: "Copié",
      copyScript: "Copier le script de tracking",
      remove: "Supprimer",
      confirmRemove: "Supprimer ce site",
      publicDashboard: "Dashboard public",
      trafficAlert: "Alerte de chute de trafic",
      alertIntro: "Nous alerter par email si le trafic chute de plus de",
      webhook: "Webhook Slack/Discord (optionnel)",
      addedOn: "Ajouté le",
    },
    api: {
      title: "Accès API",
      seePlans: "Voir les offres →",
      addSiteFirst: "Ajoutez d'abord un site.",
      blurb: "Une clé de site donne un accès en lecture aux mêmes statistiques que le dashboard, via",
      mcpTitle: "Connecter Claude, ChatGPT ou Gemini (MCP)",
      mcpBlurb: "Posez vos questions d'analytics en langage naturel directement depuis votre assistant IA. Dans Claude.ai ou ChatGPT, ajoutez un connecteur avec l'URL ci-dessous —",
      mcpNoPaste: "rien d'autre à coller",
      mcpHeadless: "Client sans écran de connexion (Claude Code, script, curl) ? Générez une clé ci-dessous — la clé brute ou l'URL avec la clé intégrée fonctionnent aussi.",
      connectedApps: "Applications connectées",
      newKey: "Nouvelle clé",
      copyNow: "Copiez cette clé maintenant — elle ne sera plus jamais affichée.",
      revoke: "Révoquer",
      usedOn: "utilisée le",
      keyNamePlaceholder: "Nom (optionnel — ex. « BI interne »)",
      generate: "Générer",
    },
    danger: {
      title: "Supprimer le compte",
      body: "La suppression de votre compte est irréversible. Toutes vos données, sites et analytics seront définitivement supprimés.",
      deleteAccount: "Supprimer mon compte",
      typeToConfirm: "pour confirmer la suppression définitive de votre compte.",
      confirmWord: "SUPPRIMER",
      cancel: "Annuler",
    },
  },

  filters: {
    periodShort: { "24h": "24h", "7d": "7j", "30d": "30j", "90d": "90j" },
    search: "Rechercher…",
    noMatch: "Rien ne correspond à",
    select: "Sélectionner…",
    none: "Aucune option",
    period: "Période",
    device: "Appareil",
    remove: "Retirer le filtre",
  },
};

const en: AppStrings = {
  shell: {
    search: "Search",
    create: "Create",
    newSite: "New site",
    newFunnel: "New funnel",
    manageSites: "Manage sites",
    addSite: "Add a site",
    noSite: "No site",
    addFirstSite: "Add your first site",
    upgrade: "Upgrade plan",
    settings: "Settings",
    help: "Help and docs",
    openAssistant: "Open the assistant",
    closeAssistant: "Close the assistant",
    assistant: "Assistant",
    notifications: "Notifications",
    collapseMenu: "Collapse menu",
    expandMenu: "Expand menu",
    closeMenu: "Close menu",
    openMenu: "Open menu",
    signOut: "Sign out",
    plan: "Plan",
    switchLanguage: "Passer en français",
    nav: {
      home: "Home",
      revenue: "Revenue",
      funnels: "Funnels",
      flows: "Flows",
      replays: "Session Replay",
      heatmaps: "Heatmaps",
      settings: "Settings",
      mySites: "My sites",
      addSite: "Add a site",
      plans: "Plans",
    },
    palette: {
      placeholder: "Go to a page or switch site…",
      pages: "Pages",
      sites: "Sites",
      noResult: "No result",
    },
    notify: {
      title: "Notifications",
      nothing:
        "Nothing to report. Traffic-drop alerts and the weekly summary will show up here.",
      noData: "No data received",
      noDataBody: "The script hasn't sent anything yet.",
      checkInstall: "Check the install",
      insights: "This week's insights",
      seeOnHome: "See on Home",
    },
    connect: {
      title: "Connect your data",
      body: "hasn't sent anything yet. One line of script to paste, and these screens fill up within seconds — we'll tell you the moment the first visit lands.",
      cta: "Install the script",
    },
  },

  assistant: {
    title: "Assistant",
    newChat: "New conversation",
    history: "Conversation history",
    close: "Close the assistant",
    noChats: "No conversations yet.",
    delete: "Delete",
    emptyTitle: "A question about PulseTrack?",
    emptyBody:
      "Install, plans, privacy, or what the screen in front of you does.",
    suggestions: "Suggestions",
    placeholder: "Ask your question…",
    send: "Send",
    disclaimer:
      "Pre-written answers, with no model call — instant and free. For a question about your own sessions, use the Session Replay copilot.",
    fallback:
      "I don't have a ready answer for that one. This panel's answers are written in advance — they cover install, plans, privacy and every feature. Try different words, or use the Session Replay copilot for a question about your own sessions.",
    suggestions_by_screen: {
      "/dashboard": [
        "How do I install the tracking script?",
        "What exactly does “visitors” count?",
        "Do I need a cookie banner?",
      ],
      "/dashboard/flows": [
        "How do I read the paths diagram?",
        "What does “Left the site” mean?",
        "How is this different from a funnel?",
      ],
      "/dashboard/funnels": [
        "How do I create a funnel?",
        "How many funnels can I create?",
      ],
      "/dashboard/heatmaps": [
        "What are rage clicks?",
        "How does scroll depth work?",
      ],
      "/dashboard/replays": [
        "How does session replay work?",
        "Is sensitive data masked?",
      ],
      "/dashboard/revenue": [
        "How does revenue attribution work?",
        "Which Stripe key should I create?",
      ],
      "/dashboard/settings": [
        "How do I invite a teammate?",
        "How do I connect Claude to my data?",
      ],
    },
    suggestions_default: [
      "How do I install the tracking script?",
      "Do I need a cookie banner?",
      "What can I do with PulseTrack?",
    ],
  },


  home: {
    deltaBasis: "Changes compare against the",
    periods: {
      "24h": "previous 24 hours",
      "7d": "previous 7 days",
      "30d": "previous 30 days",
      "90d": "previous 90 days",
    },
    exportCsv: "Export CSV",
    exporting: "Exporting…",
    exportLocked: "CSV export is available on the Business plan.",
    seePlans: "See plans",
    insightsWeekOf: "Insights for the week of",
    metrics: {
      visitors: "Visitors",
      visitorsHint: "Distinct people, identified by a cookie-free hash.",
      sessions: "Sessions",
      sessionsHint: "Visits: the same person coming back counts several times.",
      pageviews: "Pageviews",
      pageviewsHint: "Total pages loaded over the period.",
      bounce: "Bounce rate",
      bounceHint: "Share of sessions that saw only one page.",
      duration: "Avg. duration",
      durationHint: "Average time spent per session.",
      noComparison: "No data in the previous period, so there is nothing to compare against.",
      vsPrevious: "versus the previous period",
    },
    chart: {
      title: "Visitors per day",
      totalAndPeak: "in total over the period · peak at",
      annotation: "Annotation",
      markEvent: "Mark an event (launch, campaign, deploy…)",
      labelPlaceholder: "e.g. “Early bird launch”",
      add: "Add",
      remove: "Delete",
      visitorsOn: "visitors",
    },
    rankings: {
      topPages: "Top pages",
      topSources: "Traffic sources",
      countries: "Countries",
      emptyPages: "Your most visited pages will show up here as soon as the first visit is recorded.",
      emptySources: "Where your visitors come from: Google, social, AI, or direct.",
      emptyCountries: "Where your visitors are, inferred from their IP without storing it.",
      totalSuffix: "in total",
      topOf: "of",
      views: "views",
      visitors: "visitors",
    },
    empty: {
      title: "Add your first site",
      body: "Two steps: you declare the domain, then paste one line of script into your pages. The first visits come through within seconds, with no cookie and no consent banner.",
      addSite: "Add a site",
      learnMore: "See what PulseTrack measures",
    },
  },

  realtime: {
    title: "Live",
    visitorsNow: "visitors right now",
    idle: "Nobody on the site this second. Visits appear here live, with no reload.",
    refresh: "Every 5s",
    activePages: "Active pages",
    noActivePage: "No active page",
    lastVisits: "Latest visits",
    noRecentVisit: "No recent visit",
  },


  settings: {
    tabs: { account: "Account", sites: "Sites & alerts", api: "API access", team: "Team" },
    account: {
      title: "Account",
      email: "Email",
      plan: "Plan",
      upgrade: "Upgrade →",
      memberSince: "Member since",
    },
    password: {
      title: "Change password",
      newPassword: "New password",
      confirm: "Confirm password",
      minChars: "At least 8 characters",
      retype: "Retype the password",
      submit: "Change password",
      mismatch: "The passwords don't match",
      tooShort: "The password must be at least 8 characters",
      changed: "Password changed",
      networkError: "Network error",
    },
    team: {
      title: "Team",
      memberOf: "You're part of the team of",
      memberOfSuffix: "— full access to their sites, except billing.",
      blurb: "An invited teammate has full access to your sites, funnels, replays and API keys — everything except changing the plan or deleting the account.",
      invite: "Invite a teammate",
      shareLink: "Send this link to your teammate — Slack, email, however you like.",
      loading: "Loading…",
      none: "No teammates yet.",
      pending: "Invitation pending",
      copyLink: "Copy the link",
      namePlaceholder: "Name (optional — e.g. “Marie”)",
      cancel: "Cancel",
      generateLink: "Generate the link",
      removeMember: "Remove",
    },
    sites: {
      title: "My sites",
      addSite: "+ Add a site",
      none: "No site added.",
      script: "Script",
      copied: "Copied",
      copyScript: "Copy the tracking script",
      remove: "Delete",
      confirmRemove: "Delete this site",
      publicDashboard: "Public dashboard",
      trafficAlert: "Traffic-drop alert",
      alertIntro: "Email us an alert if traffic drops by more than",
      webhook: "Slack/Discord webhook (optional)",
      addedOn: "Added on",
    },
    api: {
      title: "API access",
      seePlans: "See plans →",
      addSiteFirst: "Add a site first.",
      blurb: "A site key gives read access to the same statistics as the dashboard, via",
      mcpTitle: "Connect Claude, ChatGPT or Gemini (MCP)",
      mcpBlurb: "Ask your analytics questions in plain language straight from your AI assistant. In Claude.ai or ChatGPT, add a connector with the URL below —",
      mcpNoPaste: "nothing else to paste",
      mcpHeadless: "A client with no sign-in screen (Claude Code, a script, curl)? Generate a key below — the raw key or the URL with the key built in both work.",
      connectedApps: "Connected apps",
      newKey: "New key",
      copyNow: "Copy this key now — it will never be shown again.",
      revoke: "Revoke",
      usedOn: "used on",
      keyNamePlaceholder: "Name (optional — e.g. “Internal BI”)",
      generate: "Generate",
    },
    danger: {
      title: "Delete account",
      body: "Deleting your account is irreversible. All your data, sites and analytics will be permanently removed.",
      deleteAccount: "Delete my account",
      typeToConfirm: "to confirm permanent deletion of your account.",
      confirmWord: "DELETE",
      cancel: "Cancel",
    },
  },

  filters: {
    periodShort: { "24h": "24h", "7d": "7d", "30d": "30d", "90d": "90d" },
    search: "Search…",
    noMatch: "Nothing matches",
    select: "Select…",
    none: "No option",
    period: "Period",
    device: "Device",
    remove: "Remove filter",
  },
};

export const APP_STRINGS: Record<Locale, AppStrings> = { fr, en };
