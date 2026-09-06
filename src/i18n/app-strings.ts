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
      escape: string;
      /** {q} is the typed query. */
      noMatchFor: string;
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
    thinking: string;
    failed: string;
    quotaExceeded: string;
    upgradeRequired: string;
    quotaLeft: string;
    openReplays: string;
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
      vsLastWeek: string;
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
      availableFrom: string;
      blurb: string;
      blurbHeader: string;
      blurbBusiness1: string;
      blurbBusiness2: string;
      mcpTitle: string;
      mcpBlurb: string;
      mcpNoPaste: string;
      mcpBlurbTail: string;
      mcpHeadless: string;
      connectedApps: string;
      newKey: string;
      copyNow: string;
      revoke: string;
      usedOn: string;
      neverUsed: string;
      keyNamePlaceholder: string;
      generate: string;
    };
    danger: {
      title: string;
      body: string;
      deleteAccount: string;
      deletePermanently: string;
      typeToConfirm: string;
      confirmWord: string;
      cancel: string;
    };
  };


  screens: {
    common: {
      networkErrorRetry: string;
      inviteAccepted: string;
      inviteFailed: string;
      acceptInvite: string;
      noSiteTitle: string;
      addSite: string;
      seePlans: string;
      howItWorks: string;
      page: string;
      sessions: string;
      clicks: string;
    };
    intros: { flows: string; heatmaps: string; replays: string };
    flows: {
      noSiteBody: string;
      legendPage: string;
      legendExit: string;
      legendThick: string;
      legendHover: string;
      emptyTitle: string;
      emptyBody1: string;
      emptyBodyStrong: string;
      emptyBody2: string;
      widen: string;
      checkScript: string;
      allEntries: string;
      fromPage: string;
      entry: string;
      step: string;
      sessionsCount: string;
      exit: string;
      otherPages: string;
      depth: string;
    };
    heatmaps: {
      noSiteBody: string;
      lockedTitle: string;
      lockedBody: string;
      overlayNote: string;
      snapshotTaken: string;
      snapshotOn: string;
      snapshotElements: string;
      noSnapshot: string;
      inert: string;
      sampledNote1: string;
      sampledNote2: string;
      loadLive: string;
      cold: string;
      hot: string;
      sessionsOnPage: string;
      sessionsOnPageBody: string;
      seeAllSessions: string;
      scrollDepth: string;
      scrollDepthBody: string;
      rageClicks: string;
      rageBody: string;
      topElements: string;
      topElementsEmpty: string;
      choosePage: string;
      noPage: string;
      filterPages: string;
      avgScroll: string;
      noInteractionTitle: string;
      noInteractionBody: string;
      rageDetected: string;
      notClickable: string;
    };
    replays: {
      noSiteBody: string;
      lockedTitle: string;
      rageOnly: string;
      all: string;
      behaviour: string;
      lowScroll: string;
      funnelDropoff: string;
      advancedCondition: string;
      addCondition: string;
      removeCondition: string;
      alreadyOneClick: string;
      cohorts: string;
      save: string;
      deleteCohort: string;
      recordings: string;
      matchingFilters: string;
      over: string;
      overPeriod: Record<string, string>;
      emptyTitle: string;
      emptyBody: string;
      skipInactive: string;
      replayFailed: string;
      lockedBody: string;
      reachedStep: string;
      stuckAfter: string;
      afterStep: string;
      nameThisFilter: string;
      scrolledLessThan: string;
      percentScrolled: string;
      emptyFilteredTitle: string;
      emptyFilteredBody: string;
      selectOne: string;
      heatmapOfPage: string;
      chipLowScroll: string;
      chipNoConversion: string;
      chipFunnelDropoff: string;
      matchAll: string;
      matchAny: string;
      fields: Record<string, string>;
      operators: Record<string, string>;
    };
    funnels: {
      noSiteTitle: string;
      noSiteBody: string;
      intro: string;
      create: string;
      limitReached1: string;
      limitReached2: string;
      createError: string;
      createFirst: string;
      emptyTitle: string;
      emptyBody: string;
      steps: string;
      results: string;
      selectFunnel: string;
      noVisitorsTitle: string;
      noVisitorsBody: string;
      funnelName: string;
      namePlaceholder: string;
      funnelSteps: string;
      stepName: string;
      exactUrl: string;
      urlContains: string;
      event: string;
      addStep: string;
      cancel: string;
      createCta: string;
      visitors: string;
      dropoffs: string;
      lostVisitors: string;
      overallConversion: string;
      startedWith: string;
      endedWith: string;
    };
    sitesPage: {
      intro: string; addSite: string; emptyTitle: string; emptyBody: string;
      addFirst: string; shown: string; show: string; checking: string;
      dataReceived: string; lastVisit: string; events: string; over30d: string;
      waiting: string; waitingBody: string; install: string; hide: string;
      deleteSite: string; deleteConfirm: string;
    };
    setup: {
      readyTitle: string; readySubtitle: string; step1: string; step1Body1: string;
      step1Body2: string; copy: string; copied: string; step2: string; step2Body: string;
      step3: string; received: string; lastVisitOn: string; seeStats: string;
      nothingYet: string; tip1: string; tip1b: string; tip2: string; tip3: string;
      retry: string; listening: string; listeningBody1: string; listeningBody2: string;
    };
    revenueScreen: { emptyBody: string };
    newSite: {
      title: string; intro: string; nameLabel: string; namePlaceholder: string;
      domainLabel: string; domainPlaceholder: string; submit: string;
      mustBeSignedIn: string; limitReached: string; limitBody: string;
      backToDashboard: string;
    };
    usage: {
      title: string; events: string; sites: string; funnels: string;
      nearLimit: string; unlimited: string;
    };
    revenue: {
      intro: string;
      connectTitle: string;
      step1: string;
      step2a: string;
      restrictedKey: string;
      readOnly: string;
      step2b: string;
      andNothingElse: string;
      showKey: string;
      hideKey: string;
      callVerb: string;
      step3: string;
      connect: string;
      attributionTitle: string;
      attributionBody: string;
      attributionNote: string;
      lastSync: string;
      sync: string;
      syncing: string;
      disconnect: string;
      disconnectConfirm: string;
      totalRevenue: string;
      totalRevenueHint: string;
      transactions: string;
      transactionsHint: string;
      aov: string;
      aovHint: string;
      attributionRate: string;
      attributionRateHint: string;
      perDay: string;
      peakAt: string;
      bySource: string;
      byPage: string;
      noSource: string;
      noPage: string;
      noPageTail: string;
      vsPrevious: string;
      recentTransactions: string;
      amount: string;
      customer: string;
      source: string;
      date: string;
      keyError: string;
      connectError: string;
      networkError: string;
    };
  };

  filters: {
    /** Short labels on the period buttons: 7j vs 7d. */
    periodShort: Record<string, string>;
    search: string;
    /** {q} is the typed query. */
    noMatchFor: string;
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
      escape: "Échap",
      noMatchFor: "Rien ne correspond à « {q} »",
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
    emptyTitle: "Que voulez-vous savoir ?",
    emptyBody:
      "Posez une question sur vos chiffres, vos parcours ou vos revenus — je lis les données de",
    suggestions: "Suggestions",
    placeholder: "Posez votre question…",
    send: "Envoyer",
    disclaimer:
      "L'assistant lit vos données pour répondre. Chaque question compte dans le quota mensuel de votre offre.",
    thinking: "Je regarde vos données…",
    failed: "L'assistant n'a pas pu répondre. Réessayez dans un instant.",
    quotaExceeded: "Vous avez atteint votre quota de questions pour ce mois. Il se réinitialise le 1er.",
    upgradeRequired: "L'assistant est disponible à partir de l'offre Starter.",
    quotaLeft: "Questions restantes ce mois :",
    openReplays: "Ouvrir ces sessions",
    fallback:
      "Je n'ai pas de réponse toute prête à celle-là. Les réponses de ce panneau sont écrites à l'avance — elles couvrent l'installation, les offres, la confidentialité et chaque fonctionnalité. Reformulez avec d'autres mots, ou passez par le copilote de Session Replay pour une question portant sur vos propres sessions.",
    suggestions_by_screen: {
      "/dashboard": [
        "Comment évolue mon trafic ce mois-ci ?",
        "D'où viennent mes meilleurs visiteurs ?",
        "Quelle page marche le mieux ?",
      ],
      "/dashboard/flows": [
        "Où mes visiteurs partent-ils le plus ?",
        "Quel est le parcours le plus fréquent ?",
      ],
      "/dashboard/funnels": [
        "À quelle étape je perds le plus de monde ?",
        "Mes funnels convertissent-ils mieux qu'avant ?",
      ],
      "/dashboard/heatmaps": [
        "Sur quelle page y a-t-il le plus de clics de rage ?",
        "Mes visiteurs descendent-ils jusqu'en bas ?",
      ],
      "/dashboard/replays": [
        "Montre-moi les sessions qui n'ont presque pas scrollé",
        "Y a-t-il des sessions avec des clics de rage ?",
      ],
      "/dashboard/revenue": [
        "Quelle source me rapporte le plus ?",
        "Quel est mon panier moyen ce mois-ci ?",
      ],
      "/dashboard/settings": [
        "Comment brancher Claude sur mes données ?",
        "Quelle clé Stripe dois-je créer ?",
      ],
    },
    suggestions_default: [
      "Comment évolue mon trafic ce mois-ci ?",
      "D'où viennent mes visiteurs ?",
      "Y a-t-il quelque chose d'anormal cette semaine ?",
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
      vsLastWeek: "% vs la semaine dernière",
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
      availableFrom: "Disponible à partir du plan Growth.",
      blurb: "Une clé par site donne un accès en lecture aux mêmes statistiques que le dashboard, via",
      blurbHeader: "avec l'en-tête",
      blurbBusiness1: "Sur l'offre Business, la même clé donne aussi accès aux événements bruts (",
      blurbBusiness2: ", paginé par curseur) pour alimenter votre propre entrepôt de données.",
      mcpTitle: "Connecter Claude, ChatGPT ou Gemini (MCP)",
      mcpBlurb: "Posez vos questions d'analytics en langage naturel directement depuis votre assistant IA. Dans Claude.ai ou ChatGPT, ajoutez un connecteur avec l'URL ci-dessous —",
      mcpNoPaste: "rien d'autre à coller",
      mcpBlurbTail: ", l'app vous redirige ici pour vous connecter et choisir un site, aucune clé n'est jamais affichée.",
      mcpHeadless: "Client sans écran de connexion (Claude Code, script, curl) ? Générez une clé ci-dessous — la clé brute ou l'URL avec la clé intégrée fonctionnent aussi.",
      connectedApps: "Applications connectées",
      newKey: "Nouvelle clé",
      copyNow: "Copiez cette clé maintenant — elle ne sera plus jamais affichée.",
      revoke: "Révoquer",
      usedOn: "utilisée le",
      neverUsed: "jamais utilisée",
      keyNamePlaceholder: "Nom (optionnel — ex. « BI interne »)",
      generate: "Générer",
    },
    danger: {
      title: "Supprimer le compte",
      body: "La suppression de votre compte est irréversible. Toutes vos données, sites et analytics seront définitivement supprimés.",
      deleteAccount: "Supprimer mon compte",
      deletePermanently: "Supprimer définitivement",
      typeToConfirm: "pour confirmer la suppression définitive de votre compte.",
      confirmWord: "SUPPRIMER",
      cancel: "Annuler",
    },
  },

  screens: {
    common: {
      networkErrorRetry: "Erreur réseau — réessayez.",
      inviteAccepted: "Invitation acceptée — redirection…",
      inviteFailed: "Impossible d'accepter l'invitation.",
      acceptInvite: "Accepter l'invitation",
      noSiteTitle: "Aucun site pour l'instant",
      addSite: "Ajouter un site",
      seePlans: "Voir les offres",
      howItWorks: "Comment ça marche",
      page: "Page",
      sessions: "Sessions",
      clicks: "Clics",
    },
    intros: {
      flows: "Le parcours réel de vos visiteurs entre les pages — pas un funnel défini à l'avance, ce qui se passe vraiment.",
      heatmaps: "Où vos visiteurs cliquent, jusqu'où ils scrollent, et ce sur quoi ils s'acharnent sans résultat.",
      replays: "Regardez vos visiteurs naviguer réellement sur votre site — chaque clic, chaque scroll, chaque hésitation.",
    },
    flows: {
      noSiteBody:
        "Les parcours se reconstituent à partir des pages vues d'un site. Ajoutez-en un pour commencer.",
      legendPage: "Page vue à cette étape",
      legendExit: "Sessions qui se sont arrêtées là",
      legendThick: "Trait épais = beaucoup de sessions ont suivi ce chemin",
      legendHover: "Survolez une page pour isoler son parcours.",
      emptyTitle: "Pas encore de parcours à reconstituer",
      emptyBody1: "Cet écran a besoin de sessions ayant vu",
      emptyBodyStrong: "au moins deux pages",
      emptyBody2:
        "pour dessiner un enchaînement. Sur cette période il n'y en a pas encore — c'est normal sur un site récent ou peu visité.",
      widen: "Élargir à 90 jours",
      checkScript: "Vérifier l'installation du script",
      allEntries: "Toutes les entrées",
      fromPage: "À partir de",
      entry: "Entrée",
      step: "Étape",
      sessionsCount: "sessions",
      exit: "Sortie du site",
      otherPages: "Autres pages",
      depth: "Profondeur",
    },
    heatmaps: {
      noSiteBody:
        "Une heatmap se construit à partir des clics et des scrolls que le script enregistre sur une page. Ajoutez un site, installez le script, et la première carte apparaît dès les premières visites.",
      lockedTitle: "Les heatmaps sont sur Starter",
      lockedBody:
        "Passez sur Starter pour voir où vos visiteurs cliquent, jusqu'où ils scrollent et sur quoi ils s'acharnent en vain.",
      overlayNote:
        "La page live n'apparaît que si le domaine est joignable et accepte d'être affiché dans un cadre. Sinon, décochez : la structure ci-dessous vient de la capture, elle est toujours fidèle.",
      snapshotTaken: "Structure de la page relevée le",
      snapshotOn: "sur",
      snapshotElements: "éléments",
      inert: "inerte",
      noSnapshot:
        "Aucune structure relevée pour cette page. Elle sera capturée au prochain passage d'un visiteur avec le script à jour.",
      sampledNote1: "Carte et classement calculés sur les",
      sampledNote2:
        "interactions les plus récentes. Les totaux ci-dessus portent sur la période entière.",
      loadLive: "Charger la page live",
      cold: "Froid",
      hot: "Chaud",
      sessionsOnPage: "Sessions sur cette page",
      sessionsOnPageBody:
        "Regardez ce que ces visiteurs ont fait, pas juste où ils ont cliqué.",
      seeAllSessions: "Voir toutes les sessions →",
      scrollDepth: "Profondeur de scroll",
      scrollDepthBody: "Part des sessions atteignant chaque palier",
      rageClicks: "Clics de rage",
      rageBody: "Éléments non cliquables sur lesquels on insiste",
      topElements: "Éléments les plus cliqués",
      topElementsEmpty:
        "Les boutons et liens les plus cliqués de cette page se classeront ici.",
      choosePage: "Choisir une page",
      noPage: "Aucune page",
      filterPages: "Filtrer les pages…",
      avgScroll: "Scroll moyen",
      noInteractionTitle: "Pas encore d'interactions",
      noInteractionBody:
        "Aucun clic ni scroll enregistré sur cette page sur la période choisie. Essayez une autre page dans le sélecteur ci-dessus, ou élargissez la période — sur un site récent c'est simplement qu'il n'y a pas encore eu de visite ici.",
      rageDetected: "Clic de rage détecté",
      notClickable: "Cet élément n'est pas cliquable",
    },
    replays: {
      noSiteBody:
        "Session Replay rejoue les visites d'un site. Ajoutez-en un pour commencer à enregistrer.",
      lockedTitle: "Le Session Replay est sur Starter",
      rageOnly: "Clics de rage uniquement",
      all: "Tous",
      behaviour: "Comportement :",
      lowScroll: "N'ont presque pas scrollé",
      funnelDropoff: "Abandon de funnel",
      advancedCondition: "Condition avancée",
      addCondition: "Ajouter une condition",
      removeCondition: "Retirer cette condition",
      alreadyOneClick:
        "Déjà accessible en un clic ci-dessus — inutile à sauvegarder.",
      cohorts: "Cohorts :",
      save: "Sauvegarder",
      deleteCohort: "Supprimer ce cohort",
      recordings: "enregistrements",
      matchingFilters: "correspondant aux filtres",
      over: "sur",
      overPeriod: { "24h": "sur 24 h", "7d": "sur 7 jours", "30d": "sur 30 jours", "90d": "sur 90 jours" },
      emptyTitle: "Aucun enregistrement",
      emptyBody: "Ils apparaîtront dès qu'un visiteur sera enregistré.",
      skipInactive: "Accélérer automatiquement les temps morts",
      lockedBody:
        "Passez sur Starter pour regarder vos visiteurs naviguer réellement sur votre site — clics, scroll, hésitations, clics de rage.",
      reachedStep: "Ont atteint :",
      stuckAfter: "Bloqués après :",
      afterStep: "après",
      nameThisFilter: "Nommer ce filtre…",
      replayFailed: "La capture n'a pas pu être rejouée. La carte reste exacte.",
      scrolledLessThan: "Moins de",
      percentScrolled: "% scrollé",
      emptyFilteredTitle: "Aucun enregistrement ne correspond",
      emptyFilteredBody:
        "Des sessions sont bien enregistrées, mais aucune ne remplit ce filtre. Élargissez-le pour en voir.",
      selectOne: "Sélectionnez un enregistrement à gauche",
      heatmapOfPage: "Heatmap de cette page",
      chipLowScroll: "Sessions qui n'ont presque pas scrollé",
      chipNoConversion: "Sessions qui n'ont pas converti",
      chipFunnelDropoff: "Abandon du funnel",
      matchAll: "ET (toutes)",
      matchAny: "OU (au moins une)",
      fields: {
        scroll_pct: "Scroll max",
        duration: "Durée de session",
        pageview_count: "Nombre de pages vues",
        rage_click: "Clic de rage",
        converted: "A converti",
        device: "Appareil",
        source: "Source de trafic",
        country: "Pays",
        funnel_step: "Étape de funnel",
      },
      operators: {
        exists: "a eu lieu",
        not_exists: "n'a pas eu lieu",
        yes: "oui",
        no: "non",
        eq: "est",
        contains: "contient",
        dropped: "bloqué après",
        reached: "a atteint",
      },
    },
    funnels: {
      noSiteTitle: "Ajoutez d'abord un site",
      noSiteBody:
        "Un funnel suit le parcours des visiteurs d'un site précis. Ajoutez un site pour en créer un.",
      intro:
        "Suivez le parcours de vos visiteurs étape par étape et identifiez où ils décrochent.",
      create: "Créer un funnel",
      limitReached1: "Votre offre permet",
      limitReached2: "Passez à une offre supérieure pour en créer un nouveau.",
      createError: "Erreur lors de la création",
      createFirst: "Créer mon premier funnel",
      emptyTitle: "Aucun funnel sur",
      emptyBody:
        "Un funnel est une suite d'étapes — page d'accueil, pricing, inscription. PulseTrack compte combien de visiteurs franchissent chacune et où ils abandonnent.",
      steps: "étapes",
      results: "Résultats du funnel",
      selectFunnel: "Sélectionnez un funnel pour voir les résultats",
      noVisitorsTitle: "Aucun visiteur dans ce funnel",
      noVisitorsBody:
        "Personne n'a franchi la première étape sur la période choisie. Vérifiez que son URL correspond bien à une page réelle du site, ou élargissez la période ci-dessus.",
      funnelName: "Nom du funnel",
      namePlaceholder: "Ex: Inscription, Achat, Onboarding",
      funnelSteps: "Étapes du funnel",
      stepName: "Nom de l'étape",
      exactUrl: "URL exacte",
      urlContains: "URL contient",
      event: "Événement",
      addStep: "Ajouter une étape",
      cancel: "Annuler",
      createCta: "Créer le funnel",
      visitors: "visiteurs",
      dropoffs: "abandons",
      lostVisitors: "visiteurs perdus",
      overallConversion: "Conversion globale",
      startedWith: "visiteurs au départ →",
      endedWith: "à la fin",
    },
    sitesPage: {
      intro: "Les sites que PulseTrack suit pour vous, et l'état de leur script.",
      addSite: "Ajouter un site",
      emptyTitle: "Aucun site pour l'instant",
      emptyBody:
        "Déclarez un domaine, collez une ligne de script, et PulseTrack vous dit lui-même quand les premières données arrivent.",
      addFirst: "Ajouter mon premier site",
      shown: "Affiché",
      show: "Afficher",
      checking: "Vérification…",
      dataReceived: "Données reçues",
      lastVisit: "Dernière visite",
      events: "évt",
      over30d: "/ 30 j",
      waiting: "En attente de données",
      waitingBody: "Le script n'a encore rien envoyé.",
      install: "Installation",
      hide: "Masquer",
      deleteSite: "Supprimer ce site et toutes ses données",
      deleteConfirm:
        "Toutes ses statistiques, sessions et funnels seront définitivement effacés. Cette action est irréversible.",
    },
    setup: {
      readyTitle: "est prêt à recevoir des données",
      readySubtitle: "Trois étapes, dont la dernière se coche toute seule.",
      step1: "Copiez le script",
      step1Body1: "Une seule ligne, à coller dans le",
      step1Body2:
        "de. Aucun cookie, aucun bandeau de consentement à ajouter.",
      copy: "Copier",
      copied: "Copié",
      step2: "Collez-le dans vos pages",
      step2Body:
        "Sur un site classique, dans le template partagé par toutes les pages. Sur Webflow, Shopify ou WordPress, dans le champ « code personnalisé / head » des paramètres du thème. Publiez, puis ouvrez une page du site.",
      step3: "On vérifie que ça remonte",
      received: "Données reçues — le script fonctionne",
      lastVisitOn: "Dernière visite enregistrée le",
      seeStats: "Voir mes statistiques",
      nothingYet: "Toujours rien reçu",
      tip1: "Le script est-il bien publié en ligne sur",
      tip1b:
        "? Un aperçu local ou une prévisualisation non publiée ne compte pas.",
      tip2: "Ouvrez une page du site, faites un clic droit → « Code source », et cherchez",
      tip3: "Un bloqueur de publicité sur votre propre navigateur peut masquer votre visite : testez en navigation privée ou depuis un téléphone.",
      retry: "Relancer la vérification",
      listening: "En écoute des données…",
      listeningBody1: "Cette page se met à jour toute seule dès la première visite sur",
      listeningBody2:
        ". Vous pouvez la laisser ouverte — ou ouvrir votre site dans un autre onglet pour déclencher la première.",
    },
    newSite: {
      title: "Ajouter un site",
      intro: "Entrez les informations de votre site web pour commencer le tracking.",
      nameLabel: "Nom du site",
      namePlaceholder: "Mon super site",
      domainLabel: "Domaine",
      domainPlaceholder: "monsite.com",
      submit: "Ajouter ce site",
      mustBeSignedIn: "Vous devez être connecté.",
      limitReached: "Limite atteinte",
      limitBody: "Votre offre actuelle ne permet pas d'ajouter un site de plus. Passez à une offre supérieure pour en ajouter un nouveau.",
      backToDashboard: "Retour au dashboard",
    },
    usage: {
      title: "Utilisation ce mois-ci",
      events: "Événements",
      sites: "Sites",
      funnels: "Funnels",
      nearLimit: "Vous approchez d'une limite de votre offre.",
      unlimited: "illimité",
    },
    revenueScreen: {
      emptyBody:
        "Le suivi du revenu relie vos paiements Stripe aux sources de trafic qui les ont produits. Ajoutez un site pour commencer.",
    },
    revenue: {
      intro:
        "Reliez votre compte Stripe pour savoir combien chaque source de trafic vous rapporte réellement — pas seulement combien de visiteurs elle envoie. PulseTrack lit vos paiements en lecture seule et ne peut rien y modifier.",
      connectTitle: "Connecter Stripe",
      step1: "Ouvrez",
      step2a: "Créez une",
      restrictedKey: "clé restreinte",
      readOnly: "lecture seule",
      step2b: "avec l'accès",
      andNothingElse: ", et rien d'autre.",
      showKey: "Afficher la clé",
      hideKey: "Masquer la clé",
      callVerb: "Appelez",
      step3: "Collez-la ci-dessous — elle commence par",
      connect: "Connecter Stripe",
      attributionTitle: "Comment PulseTrack relie un paiement à une source",
      attributionBody:
        "sur votre site au moment de la connexion ou de la commande. PulseTrack rapproche cet e-mail des paiements Stripe, et sait donc de quelle source venait la visite qui a produit le revenu.",
      attributionNote:
        "Sans cet appel, les paiements remontent quand même : c'est l'attribution à une source qui manque.",
      lastSync: "Dernière synchro",
      sync: "Synchroniser",
      syncing: "Synchro…",
      disconnect: "Déconnecter",
      disconnectConfirm:
        "Déconnecter Stripe ? Les données de revenus seront supprimées.",
      totalRevenue: "Revenu total",
      totalRevenueHint: "Somme des paiements Stripe encaissés sur la période.",
      transactions: "Transactions",
      transactionsHint: "Nombre de paiements réussis sur la période.",
      aov: "Panier moyen",
      aovHint: "Revenu total divisé par le nombre de transactions.",
      attributionRate: "Taux d'attribution",
      attributionRateHint:
        "Part des paiements rattachés à une source de trafic, via pulsetrack.identify().",
      perDay: "Revenus par jour",
      peakAt: "pic à",
      bySource: "Revenu par source",
      byPage: "Revenu par page",
      noSource:
        "Aucun paiement rattaché à une source sur cette période. Dès qu'un visiteur venu de Google ou d'un réseau social paiera, le revenu qu'il a rapporté apparaîtra ici.",
      noPage: "Aucun revenu rattaché à une page. Appelez",
      noPageTail: "sur votre site pour relier un paiement à la page qui l'a amené.",
      vsPrevious: "par rapport à la période précédente",
      recentTransactions: "Transactions récentes",
      amount: "Montant",
      customer: "Client",
      source: "Source",
      date: "Date",
      keyError:
        "Cette clé doit être une clé restreinte Stripe : elle commence par rk_ et n'a que l'accès en lecture aux charges et aux clients.",
      connectError: "Erreur de connexion",
      networkError: "Erreur réseau",
    },
  },

  filters: {
    periodShort: { "24h": "24h", "7d": "7j", "30d": "30j", "90d": "90j" },
    search: "Rechercher…",
    noMatchFor: "Rien ne correspond à « {q} ».",
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
      escape: "Esc",
      noMatchFor: "Nothing matches “{q}”",
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
    emptyTitle: "What would you like to know?",
    emptyBody:
      "Ask about your numbers, your journeys or your revenue — I read the data for",
    suggestions: "Suggestions",
    placeholder: "Ask your question…",
    send: "Send",
    disclaimer:
      "The assistant reads your data to answer. Each question counts against your plan's monthly allowance.",
    thinking: "Looking at your data…",
    failed: "The assistant could not answer. Try again in a moment.",
    quotaExceeded: "You have used this month's question allowance. It resets on the 1st.",
    upgradeRequired: "The assistant is available from the Starter plan.",
    quotaLeft: "Questions left this month:",
    openReplays: "Open these sessions",
    fallback:
      "I don't have a ready answer for that one. This panel's answers are written in advance — they cover install, plans, privacy and every feature. Try different words, or use the Session Replay copilot for a question about your own sessions.",
    suggestions_by_screen: {
      "/dashboard": [
        "How is my traffic trending this month?",
        "Where do my best visitors come from?",
        "Which page performs best?",
      ],
      "/dashboard/flows": [
        "Where do visitors drop off most?",
        "What is the most common path?",
      ],
      "/dashboard/funnels": [
        "Which step loses the most people?",
        "Are my funnels converting better than before?",
      ],
      "/dashboard/heatmaps": [
        "Which page has the most rage clicks?",
        "Do visitors scroll all the way down?",
      ],
      "/dashboard/replays": [
        "Show me the sessions that barely scrolled",
        "Are there sessions with rage clicks?",
      ],
      "/dashboard/revenue": [
        "Which source earns me the most?",
        "What is my average order this month?",
      ],
      "/dashboard/settings": [
        "How do I connect Claude to my data?",
        "Which Stripe key should I create?",
      ],
    },
    suggestions_default: [
      "How is my traffic trending this month?",
      "Where do my visitors come from?",
      "Is anything unusual this week?",
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
      vsLastWeek: "% vs last week",
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
      availableFrom: "Available from the Growth plan.",
      blurb: "A key per site gives read access to the same statistics as the dashboard, via",
      blurbHeader: "with the header",
      blurbBusiness1: "On the Business plan, the same key also gives access to raw events (",
      blurbBusiness2: ", cursor-paginated) to feed your own data warehouse.",
      mcpTitle: "Connect Claude, ChatGPT or Gemini (MCP)",
      mcpBlurb: "Ask your analytics questions in plain language straight from your AI assistant. In Claude.ai or ChatGPT, add a connector with the URL below —",
      mcpNoPaste: "nothing else to paste",
      mcpBlurbTail: ", the app redirects you here to sign in and pick a site, and no key is ever shown.",
      mcpHeadless: "A client with no sign-in screen (Claude Code, a script, curl)? Generate a key below — the raw key or the URL with the key built in both work.",
      connectedApps: "Connected apps",
      newKey: "New key",
      copyNow: "Copy this key now — it will never be shown again.",
      revoke: "Revoke",
      usedOn: "used on",
      neverUsed: "never used",
      keyNamePlaceholder: "Name (optional — e.g. “Internal BI”)",
      generate: "Generate",
    },
    danger: {
      title: "Delete account",
      body: "Deleting your account is irreversible. All your data, sites and analytics will be permanently removed.",
      deleteAccount: "Delete my account",
      deletePermanently: "Delete permanently",
      typeToConfirm: "to confirm permanent deletion of your account.",
      confirmWord: "DELETE",
      cancel: "Cancel",
    },
  },

  screens: {
    common: {
      networkErrorRetry: "Network error — try again.",
      inviteAccepted: "Invitation accepted — redirecting…",
      inviteFailed: "Could not accept the invitation.",
      acceptInvite: "Accept the invitation",
      noSiteTitle: "No site yet",
      addSite: "Add a site",
      seePlans: "See plans",
      howItWorks: "How it works",
      page: "Page",
      sessions: "Sessions",
      clicks: "Clicks",
    },
    intros: {
      flows: "The real journeys your visitors take between pages — not a funnel defined in advance, what actually happens.",
      heatmaps: "Where your visitors click, how far they scroll, and what they keep hitting to no effect.",
      replays: "Watch your visitors actually move through your site — every click, every scroll, every hesitation.",
    },
    flows: {
      noSiteBody:
        "Paths are reconstructed from a site's pageviews. Add one to get started.",
      legendPage: "Page seen at this step",
      legendExit: "Sessions that stopped there",
      legendThick: "Thick line = many sessions took this path",
      legendHover: "Hover a page to isolate its route.",
      emptyTitle: "No paths to reconstruct yet",
      emptyBody1: "This screen needs sessions that saw",
      emptyBodyStrong: "at least two pages",
      emptyBody2:
        "to draw a sequence. There are none in this period yet — normal on a recent or quiet site.",
      widen: "Widen to 90 days",
      checkScript: "Check the script install",
      allEntries: "All entries",
      fromPage: "From",
      entry: "Entry",
      step: "Step",
      sessionsCount: "sessions",
      exit: "Left the site",
      otherPages: "Other pages",
      depth: "Depth",
    },
    heatmaps: {
      noSiteBody:
        "A heatmap is built from the clicks and scrolls the script records on a page. Add a site, install the script, and the first map appears with the first visits.",
      lockedTitle: "Heatmaps are on Starter",
      lockedBody:
        "Move to Starter to see where your visitors click, how far they scroll and what they hammer on in vain.",
      overlayNote:
        "The live page only shows if the domain is reachable and allows being displayed in a frame. Otherwise untick it: the structure below comes from the capture, and is always faithful.",
      snapshotTaken: "Page structure captured on",
      snapshotOn: "on",
      snapshotElements: "elements",
      inert: "inert",
      noSnapshot:
        "No structure captured for this page yet. It will be captured the next time a visitor comes through with an up-to-date script.",
      sampledNote1: "Map and ranking computed on the",
      sampledNote2: "most recent interactions. The totals above cover the whole period.",
      loadLive: "Load the live page",
      cold: "Cold",
      hot: "Hot",
      sessionsOnPage: "Sessions on this page",
      sessionsOnPageBody:
        "Watch what those visitors did, not just where they clicked.",
      seeAllSessions: "See all sessions →",
      scrollDepth: "Scroll depth",
      scrollDepthBody: "Share of sessions reaching each band",
      rageClicks: "Rage clicks",
      rageBody: "Non-clickable elements people keep hitting",
      topElements: "Most clicked elements",
      topElementsEmpty:
        "The most clicked buttons and links on this page will rank here.",
      choosePage: "Choose a page",
      noPage: "No page",
      filterPages: "Filter pages…",
      avgScroll: "Avg. scroll",
      noInteractionTitle: "No interactions yet",
      noInteractionBody:
        "No click or scroll recorded on this page over the chosen period. Try another page in the picker above, or widen the period — on a recent site it simply means nobody has been here yet.",
      rageDetected: "Rage click detected",
      notClickable: "This element isn't clickable",
    },
    replays: {
      noSiteBody:
        "Session Replay plays back a site's visits. Add one to start recording.",
      lockedTitle: "Session Replay is on Starter",
      rageOnly: "Rage clicks only",
      all: "All",
      behaviour: "Behaviour:",
      lowScroll: "Barely scrolled",
      funnelDropoff: "Funnel drop-off",
      advancedCondition: "Advanced condition",
      addCondition: "Add a condition",
      removeCondition: "Remove this condition",
      alreadyOneClick:
        "Already one click away above — no need to save it.",
      cohorts: "Cohorts:",
      save: "Save",
      deleteCohort: "Delete this cohort",
      recordings: "recordings",
      matchingFilters: "matching the filters",
      over: "over",
      overPeriod: { "24h": "over 24h", "7d": "over 7 days", "30d": "over 30 days", "90d": "over 90 days" },
      emptyTitle: "No recording",
      emptyBody: "They'll appear as soon as a visitor is recorded.",
      skipInactive: "Automatically speed through idle time",
      lockedBody:
        "Move to Starter to watch your visitors actually move through your site — clicks, scrolls, hesitations, rage clicks.",
      reachedStep: "Reached:",
      stuckAfter: "Stuck after:",
      afterStep: "after",
      nameThisFilter: "Name this filter…",
      replayFailed: "The capture could not be replayed. The map is still accurate.",
      scrolledLessThan: "Less than",
      percentScrolled: "% scrolled",
      emptyFilteredTitle: "No recording matches",
      emptyFilteredBody:
        "Sessions are being recorded, but none meet this filter. Widen it to see some.",
      selectOne: "Select a recording on the left",
      heatmapOfPage: "Heatmap of this page",
      chipLowScroll: "Sessions that barely scrolled",
      chipNoConversion: "Sessions that didn't convert",
      chipFunnelDropoff: "Drop-off in funnel",
      matchAll: "AND (all)",
      matchAny: "OR (at least one)",
      fields: {
        scroll_pct: "Max scroll",
        duration: "Session duration",
        pageview_count: "Number of pageviews",
        rage_click: "Rage click",
        converted: "Converted",
        device: "Device",
        source: "Traffic source",
        country: "Country",
        funnel_step: "Funnel step",
      },
      operators: {
        exists: "happened",
        not_exists: "didn't happen",
        yes: "yes",
        no: "no",
        eq: "is",
        contains: "contains",
        dropped: "stuck after",
        reached: "reached",
      },
    },
    funnels: {
      noSiteTitle: "Add a site first",
      noSiteBody:
        "A funnel follows visitors through one specific site. Add a site to create one.",
      intro:
        "Follow your visitors step by step and find where they drop off.",
      create: "Create a funnel",
      limitReached1: "Your plan allows",
      limitReached2: "Move to a higher plan to create a new one.",
      createError: "Could not create the funnel",
      createFirst: "Create my first funnel",
      emptyTitle: "No funnel on",
      emptyBody:
        "A funnel is a sequence of steps — home page, pricing, sign-up. PulseTrack counts how many visitors clear each one and where they give up.",
      steps: "steps",
      results: "Funnel results",
      selectFunnel: "Select a funnel to see the results",
      noVisitorsTitle: "No visitor in this funnel",
      noVisitorsBody:
        "Nobody cleared the first step over the chosen period. Check that its URL matches a real page on the site, or widen the period above.",
      funnelName: "Funnel name",
      namePlaceholder: "e.g. Sign-up, Purchase, Onboarding",
      funnelSteps: "Funnel steps",
      stepName: "Step name",
      exactUrl: "Exact URL",
      urlContains: "URL contains",
      event: "Event",
      addStep: "Add a step",
      cancel: "Cancel",
      createCta: "Create the funnel",
      visitors: "visitors",
      dropoffs: "drop-offs",
      lostVisitors: "visitors lost",
      overallConversion: "Overall conversion",
      startedWith: "visitors at the start →",
      endedWith: "at the end",
    },
    sitesPage: {
      intro: "The sites PulseTrack tracks for you, and the state of their script.",
      addSite: "Add a site",
      emptyTitle: "No site yet",
      emptyBody:
        "Declare a domain, paste one line of script, and PulseTrack tells you itself when the first data arrives.",
      addFirst: "Add my first site",
      shown: "Shown",
      show: "Show",
      checking: "Checking…",
      dataReceived: "Data received",
      lastVisit: "Last visit",
      events: "evt",
      over30d: "/ 30 d",
      waiting: "Waiting for data",
      waitingBody: "The script hasn't sent anything yet.",
      install: "Install",
      hide: "Hide",
      deleteSite: "Delete this site and all its data",
      deleteConfirm:
        "All its statistics, sessions and funnels will be permanently erased. This cannot be undone.",
    },
    setup: {
      readyTitle: "is ready to receive data",
      readySubtitle: "Three steps, and the last one ticks itself off.",
      step1: "Copy the script",
      step1Body1: "One line, to paste into the",
      step1Body2: "of. No cookie, no consent banner to add.",
      copy: "Copy",
      copied: "Copied",
      step2: "Paste it into your pages",
      step2Body:
        "On a classic site, into the template shared by every page. On Webflow, Shopify or WordPress, into the theme's “custom code / head” field. Publish, then open a page on the site.",
      step3: "We check it's coming through",
      received: "Data received — the script works",
      lastVisitOn: "Last visit recorded on",
      seeStats: "See my statistics",
      nothingYet: "Still nothing received",
      tip1: "Is the script actually published live on",
      tip1b: "? A local preview or an unpublished draft doesn't count.",
      tip2: "Open a page on the site, right-click → “View source”, and look for",
      tip3: "An ad blocker in your own browser can hide your visit: try a private window or a phone.",
      retry: "Run the check again",
      listening: "Listening for data…",
      listeningBody1: "This page updates on its own the moment the first visit lands on",
      listeningBody2:
        ". You can leave it open — or open your site in another tab to trigger the first one.",
    },
    newSite: {
      title: "Add a site",
      intro: "Enter your website details to start tracking.",
      nameLabel: "Site name",
      namePlaceholder: "My great site",
      domainLabel: "Domain",
      domainPlaceholder: "mysite.com",
      submit: "Add this site",
      mustBeSignedIn: "You must be signed in.",
      limitReached: "Limit reached",
      limitBody: "Your current plan does not allow another site. Upgrade to add a new one.",
      backToDashboard: "Back to the dashboard",
    },
    usage: {
      title: "Usage this month",
      events: "Events",
      sites: "Sites",
      funnels: "Funnels",
      nearLimit: "You are approaching one of your plan limits.",
      unlimited: "unlimited",
    },
    revenueScreen: {
      emptyBody:
        "Revenue tracking links your Stripe payments to the traffic sources that produced them. Add a site to get started.",
    },
    revenue: {
      intro:
        "Connect your Stripe account to see what each traffic source actually earns you — not just how many visitors it sends. PulseTrack reads your payments read-only and cannot change anything.",
      connectTitle: "Connect Stripe",
      step1: "Open",
      step2a: "Create a",
      restrictedKey: "restricted key",
      readOnly: "read-only",
      step2b: "with",
      andNothingElse: ", and nothing else.",
      showKey: "Show the key",
      hideKey: "Hide the key",
      callVerb: "Call",
      step3: "Paste it below — it starts with",
      connect: "Connect Stripe",
      attributionTitle: "How PulseTrack ties a payment to a source",
      attributionBody:
        "on your site at sign-in or checkout. PulseTrack matches that email to Stripe payments, so it knows which source the visit that produced the revenue came from.",
      attributionNote:
        "Without that call payments still come through: it's the attribution to a source that's missing.",
      lastSync: "Last sync",
      sync: "Sync",
      syncing: "Syncing…",
      disconnect: "Disconnect",
      disconnectConfirm:
        "Disconnect Stripe? The revenue data will be deleted.",
      totalRevenue: "Total revenue",
      totalRevenueHint: "Sum of Stripe payments collected over the period.",
      transactions: "Transactions",
      transactionsHint: "Number of successful payments over the period.",
      aov: "Average order",
      aovHint: "Total revenue divided by the number of transactions.",
      attributionRate: "Attribution rate",
      attributionRateHint:
        "Share of payments tied to a traffic source, via pulsetrack.identify().",
      perDay: "Revenue per day",
      peakAt: "peak at",
      bySource: "Revenue by source",
      byPage: "Revenue by page",
      noSource:
        "No payment tied to a source over this period. As soon as a visitor who came from Google or social pays, the revenue they brought will appear here.",
      noPage: "No revenue tied to a page. Call",
      noPageTail: "on your site to tie a payment back to the page that brought it.",
      vsPrevious: "versus the previous period",
      recentTransactions: "Recent transactions",
      amount: "Amount",
      customer: "Customer",
      source: "Source",
      date: "Date",
      keyError:
        "This key must be a Stripe restricted key: it starts with rk_ and has read-only access to charges and customers.",
      connectError: "Connection error",
      networkError: "Network error",
    },
  },

  filters: {
    periodShort: { "24h": "24h", "7d": "7d", "30d": "30d", "90d": "90d" },
    search: "Search…",
    noMatchFor: "Nothing matches “{q}”.",
    select: "Select…",
    none: "No option",
    period: "Period",
    device: "Device",
    remove: "Remove filter",
  },
};

export const APP_STRINGS: Record<Locale, AppStrings> = { fr, en };
