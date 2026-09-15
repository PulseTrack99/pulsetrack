import type { Locale } from "@/i18n/dictionaries";

/**
 * La documentation publique du serveur MCP (src/app/docs/mcp).
 *
 * Exigée par les annuaires de Claude et de ChatGPT, et utile à quiconque
 * veut savoir, avant de s'inscrire, ce qu'un assistant pourra faire de
 * ses données.
 *
 * La liste des outils est vérifiée au build (scripts/check-mcp-docs.mjs) :
 * un outil ajouté au serveur sans être documenté ici, ou documenté ici
 * sans exister, fait échouer le build. Une documentation qui promet un
 * outil disparu est une fausse promesse comme une autre.
 */

export type ToolGroup = "overview" | "analysis" | "boards" | "product" | "accounts";

export interface McpToolDoc {
  name: string;
  group: ToolGroup;
  fr: string;
  en: string;
}

export const MCP_TOOLS: McpToolDoc[] = [
  { name: "get_stats", group: "overview", fr: "Visiteurs, pages vues, taux de rebond, pages, sources, pays et appareils sur 7, 30 ou 90 jours.", en: "Visitors, pageviews, bounce rate, pages, sources, countries and devices over 7, 30 or 90 days." },
  { name: "get_realtime", group: "overview", fr: "Visiteurs actifs sur les 5 dernières minutes, et les pages qu'ils consultent.", en: "Visitors active in the last 5 minutes, and the pages they are on." },
  { name: "get_revenue", group: "overview", fr: "Revenu Stripe rattaché aux sources et aux pages d'arrivée, et transactions récentes sans l'e-mail des clients.", en: "Stripe revenue tied to sources and landing pages, and recent transactions without customer e-mails." },
  { name: "list_events", group: "analysis", fr: "Les événements personnalisés suivis et leurs propriétés, pour formuler des requêtes exactes.", en: "The custom events tracked and their properties, to build exact queries." },
  { name: "query_insights", group: "analysis", fr: "Le moteur de l'écran Insights : mesures, découpages, filtres, formules et comparaison de périodes.", en: "The Insights engine: measures, breakdowns, filters, formulas and period comparison." },
  { name: "list_funnels", group: "analysis", fr: "Les funnels configurés et leurs étapes.", en: "The configured funnels and their steps." },
  { name: "get_funnel", group: "analysis", fr: "Conversion et abandon à chaque étape d'un funnel.", en: "Conversion and drop-off at each step of a funnel." },
  { name: "get_retention", group: "analysis", fr: "Rétention par cohortes des personnes identifiées, avec le taux par période.", en: "Cohort retention of identified people, with the rate per period." },
  { name: "get_flows", group: "analysis", fr: "Les parcours de page en page, étape par étape.", en: "Page-to-page flows, step by step." },
  { name: "list_boards", group: "boards", fr: "Les tableaux de bord enregistrés.", en: "The saved dashboards." },
  { name: "get_board", group: "boards", fr: "Un tableau de bord et ses tuiles, avec la requête de chacune.", en: "One dashboard and its tiles, with each tile's query." },
  { name: "list_experiments", group: "product", fr: "Les A/B tests et leurs résultats : taux, écart, significativité, échantillon nécessaire.", en: "A/B tests and their results: rate, lift, significance, sample needed." },
  { name: "list_feature_flags", group: "product", fr: "Les feature flags, leur état et leur pourcentage de déploiement.", en: "Feature flags, their state and rollout percentage." },
  { name: "list_groups", group: "accounts", fr: "Les comptes déclarés avec group() : personnes, sessions, événements, revenu. Agrégats uniquement.", en: "Accounts declared with group(): people, sessions, events, revenue. Aggregates only." },
  { name: "list_session_replays", group: "accounts", fr: "Les sessions enregistrées : page, appareil, durée, clics de rage, lien vers le tableau de bord.", en: "Recorded sessions: page, device, duration, rage clicks, link to the dashboard." },
];

export interface McpDocsContent {
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  serverUrlLabel: string;
  connect: { title: string; intro: string; steps: string[]; cliTitle: string; keyTitle: string; keyBody: string; guide: string };
  auth: { title: string; items: string[] };
  tools: { title: string; intro: string; readOnly: string; groups: Record<ToolGroup, string> };
  prompts: { title: string; items: string[] };
  privacy: { title: string; items: string[] };
  limits: { title: string; items: string[] };
}

export function mcpDocs(locale: Locale): McpDocsContent {
  if (locale === "fr") {
    return {
      metaTitle: "Serveur MCP — documentation",
      metaDescription:
        "Connectez Claude, ChatGPT, Cursor, Gemini ou Copilot à vos analytics PulseTrack : installation, authentification, outils disponibles, exemples et confidentialité.",
      eyebrow: "Documentation",
      title: "Le serveur MCP PulseTrack",
      subtitle:
        "Interrogez vos analytics depuis l'assistant IA que vous utilisez déjà. Une adresse, une connexion à votre compte, et l'assistant lit vos chiffres — sans jamais pouvoir les modifier.",
      serverUrlLabel: "Adresse du serveur",
      connect: {
        title: "Se connecter",
        intro:
          "Le serveur parle le protocole MCP en Streamable HTTP. Tout assistant compatible peut s'y connecter ; avec la plupart, trois étapes suffisent :",
        steps: [
          "Ajoutez un connecteur MCP personnalisé dans votre assistant et collez l'adresse ci-dessus.",
          "Connectez-vous à votre compte PulseTrack quand l'assistant vous y invite.",
          "Choisissez le site à autoriser, puis cliquez sur Autoriser.",
        ],
        cliTitle: "En ligne de commande",
        keyTitle: "Avec une clé API",
        keyBody:
          "Pour un script ou un outil sans écran de connexion, générez une clé dans Paramètres → Accès API et envoyez-la dans l'en-tête Authorization: Bearer <clé>, ou X-API-Key: <clé>.",
        guide:
          "Une fois connecté à PulseTrack, Paramètres → Accès API détaille chaque outil pas à pas : Claude, ChatGPT, Claude Code, Codex, Cursor, VS Code, Gemini CLI, Gemini, Notion, Copilot Studio et Le Chat.",
      },
      auth: {
        title: "Authentification et accès",
        items: [
          "OAuth 2.1 avec PKCE. Les applications s'identifient par une fiche publiée (Client ID Metadata Document) ou par enregistrement dynamique (RFC 7591).",
          "L'accès porte sur un seul site, choisi sur l'écran de consentement. L'assistant ne voit jamais votre mot de passe.",
          "Chaque connexion se révoque à tout moment depuis Paramètres → Accès API.",
          "Le serveur MCP est inclus avec l'accès API, dans les offres Growth et Business.",
        ],
      },
      tools: {
        title: "Les outils",
        intro: "Quinze outils, tous en lecture seule. Chacun porte l'indication readOnlyHint, que les assistants utilisent pour décider des confirmations.",
        readOnly: "Lecture seule",
        groups: {
          overview: "Vue d'ensemble",
          analysis: "Analyse",
          boards: "Tableaux de bord",
          product: "Produit",
          accounts: "Comptes et sessions",
        },
      },
      prompts: {
        title: "Exemples de questions",
        items: [
          "« Combien de visiteurs et de pages vues cette semaine, et quelles sources ont le plus progressé par rapport à la semaine dernière ? »",
          "« Quel est le taux de conversion checkout_completed sur sessions, semaine par semaine, sur les 30 derniers jours ? »",
          "« À quelle étape de mon funnel d'inscription est-ce que je perds le plus de monde ? »",
          "« Mon A/B test sur la page de prix a-t-il un gagnant statistiquement significatif ? »",
          "« Quelles sources de trafic rapportent le plus de revenu ce mois-ci ? »",
        ],
      },
      privacy: {
        title: "Données et confidentialité",
        items: [
          "Lecture seule : l'assistant ne peut rien créer, modifier ni supprimer.",
          "Aucune adresse e-mail ni identifiant personnel n'est transmis : les réponses sont des agrégats.",
          "Les visiteurs anonymes sont comptés par jour, avec un identifiant qui change chaque jour : un même visiteur revenu trois jours compte trois fois sur la période.",
          "Ce que l'assistant reçoit est ensuite traité par son éditeur (Anthropic, OpenAI, Google, Microsoft, Mistral…), selon ses propres conditions.",
        ],
      },
      limits: {
        title: "Limites",
        items: [
          "60 requêtes par minute par clé ou par connexion, partagées avec l'API REST.",
          "Fenêtres de temps de 24 heures à 365 jours selon l'outil.",
          "Les revenus exigent une connexion Stripe, et les sessions enregistrées une offre qui inclut le session replay ; sans elles, l'outil le dit plutôt que de renvoyer zéro.",
        ],
      },
    };
  }

  return {
    metaTitle: "MCP server — documentation",
    metaDescription:
      "Connect Claude, ChatGPT, Cursor, Gemini or Copilot to your PulseTrack analytics: setup, authentication, available tools, examples and privacy.",
    eyebrow: "Documentation",
    title: "The PulseTrack MCP server",
    subtitle:
      "Ask your analytics from the AI assistant you already use. One address, one sign-in to your account, and the assistant reads your numbers — without ever being able to change them.",
    serverUrlLabel: "Server address",
    connect: {
      title: "Connecting",
      intro:
        "The server speaks MCP over Streamable HTTP. Any compatible assistant can connect; with most of them, three steps are enough:",
      steps: [
        "Add a custom MCP connector in your assistant and paste the address above.",
        "Sign in to your PulseTrack account when the assistant asks.",
        "Pick the site to authorize, then click Allow.",
      ],
      cliTitle: "From the command line",
      keyTitle: "With an API key",
      keyBody:
        "For a script or a tool without a sign-in screen, generate a key in Settings → API access and send it in the Authorization: Bearer <key> header, or X-API-Key: <key>.",
      guide:
        "Once signed in to PulseTrack, Settings → API access walks through each tool step by step: Claude, ChatGPT, Claude Code, Codex, Cursor, VS Code, Gemini CLI, Gemini, Notion, Copilot Studio and Le Chat.",
    },
    auth: {
      title: "Authentication and access",
      items: [
        "OAuth 2.1 with PKCE. Applications identify themselves with a published Client ID Metadata Document or through dynamic client registration (RFC 7591).",
        "Access covers a single site, chosen on the consent screen. The assistant never sees your password.",
        "Every connection can be revoked at any time from Settings → API access.",
        "The MCP server comes with API access, on the Growth and Business plans.",
      ],
    },
    tools: {
      title: "Tools",
      intro: "Fifteen tools, all read-only. Each carries the readOnlyHint annotation, which assistants use to decide when to ask for confirmation.",
      readOnly: "Read-only",
      groups: {
        overview: "Overview",
        analysis: "Analysis",
        boards: "Dashboards",
        product: "Product",
        accounts: "Accounts and sessions",
      },
    },
    prompts: {
      title: "Example prompts",
      items: [
        "\"How many visitors and pageviews this week, and which sources grew the most compared with last week?\"",
        "\"What is the checkout_completed over sessions conversion rate, week by week, over the last 30 days?\"",
        "\"At which step of my signup funnel am I losing the most people?\"",
        "\"Does my pricing page A/B test have a statistically significant winner?\"",
        "\"Which traffic sources bring in the most revenue this month?\"",
      ],
    },
    privacy: {
      title: "Data and privacy",
      items: [
        "Read-only: the assistant cannot create, edit or delete anything.",
        "No e-mail address or personal identifier is sent: answers are aggregates.",
        "Anonymous visitors are counted per day, with an identifier that changes daily: one visitor back on three days counts three times over the period.",
        "What the assistant receives is then handled by its vendor (Anthropic, OpenAI, Google, Microsoft, Mistral…) under their own terms.",
      ],
    },
    limits: {
      title: "Limits",
      items: [
        "60 requests per minute per key or connection, shared with the REST API.",
        "Time windows from 24 hours to 365 days depending on the tool.",
        "Revenue needs a Stripe connection, and recorded sessions a plan with session replay; without them, the tool says so rather than returning zero.",
      ],
    },
  };
}
