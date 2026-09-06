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

  filters: {
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


  filters: {
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

  filters: {
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
