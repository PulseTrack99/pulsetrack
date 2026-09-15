import type { Locale } from "@/i18n/dictionaries";

/**
 * Le guide de connexion MCP, outil par outil (src/components/mcp-guide.tsx).
 *
 * Chaque chemin de menu vient de la documentation officielle de
 * l'éditeur (septembre 2026), pas d'une supposition. Les limites que
 * nous ne contrôlons pas — offre requise, pays, administrateur — sont
 * écrites dans l'onglet concerné plutôt que tues : un utilisateur qui ne
 * voit pas le menu doit savoir pourquoi.
 *
 * Deux voies d'authentification coexistent. OAuth d'abord : on colle
 * l'URL, on se connecte, on choisit le site, aucune clé ne circule.
 * La clé API ensuite, pour les outils ou les réglages qui ne passent
 * que par un en-tête.
 */

export interface GuideSnippet {
  label: string;
  code: string;
  /** Contient la clé API — affiche l'indication de remplacement. */
  usesKey?: boolean;
}

export interface GuideTab {
  id: string;
  name: string;
  install?: { label: string; href: string };
  steps: string[];
  snippets?: GuideSnippet[];
  note?: string;
}

export interface McpGuideContent {
  intro: string;
  keyPlaceholderHint: string;
  keyInsertedHint: string;
  tabs: GuideTab[];
}

function cursorLink(url: string): string {
  const config = btoa(JSON.stringify({ url }));
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=pulsetrack&config=${encodeURIComponent(config)}`;
}

function vscodeLink(url: string): string {
  return `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name: "pulsetrack", type: "http", url }))}`;
}

export function mcpGuide(locale: Locale, url: string, apiKey: string | null): McpGuideContent {
  const fr = locale === "fr";
  const key = apiKey ?? (fr ? "VOTRE_CLE" : "YOUR_KEY");

  const cursorJson = JSON.stringify(
    { mcpServers: { pulsetrack: { url, headers: { Authorization: `Bearer ${key}` } } } },
    null,
    2
  );
  const vscodeJson = JSON.stringify(
    { servers: { pulsetrack: { type: "http", url, headers: { Authorization: `Bearer ${key}` } } } },
    null,
    2
  );

  if (fr) {
    return {
      intro:
        "Une seule adresse pour tous les assistants. Choisissez le vôtre : dans la plupart des cas, vous collez l'adresse, vous vous connectez à PulseTrack et vous choisissez le site — aucune clé à copier.",
      keyPlaceholderHint: "Remplacez VOTRE_CLE par une clé générée plus bas (bouton « Nouvelle clé »).",
      keyInsertedHint: "La clé que vous venez de générer est déjà insérée.",
      tabs: [
        {
          id: "claude",
          name: "Claude",
          steps: [
            "Sur claude.ai ou dans l'application Claude : Paramètres → Connecteurs → Ajouter un connecteur personnalisé.",
            "Nom : PulseTrack. URL : collez l'adresse ci-dessus, rien d'autre.",
            "Cliquez sur Se connecter, choisissez le site, puis Autoriser.",
            "Dans une conversation, activez PulseTrack depuis le menu des outils et posez votre question.",
          ],
          note: "Nécessite une offre Claude payante (Pro, Max, Team ou Enterprise).",
        },
        {
          id: "chatgpt",
          name: "ChatGPT",
          steps: [
            "Paramètres → Applications et connecteurs → Paramètres avancés : activez le mode développeur.",
            "Revenez à Applications et connecteurs, puis cliquez sur Créer.",
            "Collez l'adresse, choisissez l'authentification OAuth, puis Créer.",
            "Connectez-vous à PulseTrack, choisissez le site, puis Autoriser.",
          ],
          note: "Nécessite une offre ChatGPT payante (Plus, Pro, Business ou Enterprise).",
        },
        {
          id: "claude-code",
          name: "Claude Code",
          steps: [
            "Lancez la commande ci-dessous dans un terminal.",
            "Ouvrez claude, tapez /mcp, choisissez pulsetrack puis Authenticate : le navigateur s'ouvre sur l'écran de connexion PulseTrack.",
          ],
          snippets: [{ label: "Commande", code: `claude mcp add --transport http pulsetrack ${url}` }],
        },
        {
          id: "codex",
          name: "Codex",
          steps: [
            "Application Codex ou extension pour éditeur : Paramètres → MCP servers → Add server, choisissez Streamable HTTP et collez l'adresse.",
            "Cliquez sur Authenticate, connectez-vous à PulseTrack et autorisez, puis redémarrez Codex.",
            "En ligne de commande : lancez les deux commandes ci-dessous — la seconde ouvre le navigateur pour la connexion.",
          ],
          snippets: [
            { label: "Codex CLI", code: `codex mcp add pulsetrack --url ${url}\ncodex mcp login pulsetrack` },
            {
              label: "Autre possibilité, avec une clé — dans ~/.codex/config.toml, puis la variable dans votre terminal :",
              code: `[mcp_servers.pulsetrack]\nurl = "${url}"\nbearer_token_env_var = "PULSETRACK_API_KEY"\n\nexport PULSETRACK_API_KEY="${key}"`,
              usesKey: true,
            },
          ],
        },
        {
          id: "cursor",
          name: "Cursor",
          install: { label: "Ajouter à Cursor", href: cursorLink(url) },
          steps: [
            "Cliquez sur « Ajouter à Cursor » : Cursor s'ouvre avec PulseTrack pré-rempli, confirmez l'installation.",
            "Dans Cursor Settings → MCP, cliquez sur Connect à côté de PulseTrack, connectez-vous et autorisez.",
          ],
          snippets: [
            {
              label: "Autre possibilité, avec une clé — dans ~/.cursor/mcp.json :",
              code: cursorJson,
              usesKey: true,
            },
          ],
        },
        {
          id: "vscode",
          name: "VS Code",
          install: { label: "Installer dans VS Code", href: vscodeLink(url) },
          steps: [
            "Cliquez sur « Installer dans VS Code », puis sur Install dans la fenêtre qui s'ouvre.",
            "Au premier usage, VS Code demande d'autoriser PulseTrack : acceptez, connectez-vous et choisissez le site.",
            "Utilisez PulseTrack depuis le chat, en mode Agent.",
          ],
          snippets: [
            {
              label: "Autre possibilité, avec une clé — dans .vscode/mcp.json :",
              code: vscodeJson,
              usesKey: true,
            },
          ],
        },
        {
          id: "gemini-cli",
          name: "Gemini CLI",
          steps: [
            "Lancez la commande ci-dessous dans un terminal — pas de fichier à modifier.",
            "Dans gemini, tapez /mcp auth pulsetrack : le navigateur s'ouvre, connectez-vous et autorisez.",
          ],
          snippets: [
            { label: "Commande", code: `gemini mcp add --transport http pulsetrack ${url}` },
            {
              label: "Autre possibilité, avec une clé :",
              code: `gemini mcp add --transport http pulsetrack ${url} --header "Authorization: Bearer ${key}"`,
              usesKey: true,
            },
          ],
        },
        {
          id: "gemini",
          name: "Gemini",
          steps: [
            "Sur gemini.google.com, depuis un ordinateur : Paramètres et aide → Applications connectées.",
            "Sous Applications personnalisées, cliquez sur Ajouter une application personnalisée.",
            "Collez l'adresse, cliquez sur Suivant, puis connectez-vous à PulseTrack et autorisez.",
          ],
          note: "Google réserve pour l'instant cette fonction aux États-Unis : compte Google personnel, 18 ans ou plus, Gemini en anglais. Si le menu n'apparaît pas chez vous, c'est cette limite — utilisez Gemini CLI en attendant.",
        },
        {
          id: "notion",
          name: "Notion",
          steps: [
            "Un administrateur de l'espace autorise d'abord les serveurs MCP personnalisés : Paramètres → Connexions.",
            "Ouvrez votre agent personnalisé → Paramètres → Outils et accès → Ajouter une connexion → Serveur MCP personnalisé.",
            "Collez l'adresse, choisissez OAuth, cliquez sur Connecter, puis autorisez.",
          ],
          snippets: [
            {
              label: "Autre possibilité, authentification par en-tête :",
              code: `Authorization: Bearer ${key}`,
              usesKey: true,
            },
          ],
          note: "Réservé aux offres Notion Business et Enterprise.",
        },
        {
          id: "copilot",
          name: "Copilot",
          steps: [
            "Dans Microsoft Copilot Studio, ouvrez votre agent → Outils (Tools) → Ajouter un outil (Add a tool) → Nouvel outil (New tool) → Model Context Protocol.",
            "Nom : PulseTrack. Description : « Statistiques d'audience, insights, funnels, parcours et revenus du site ». URL du serveur : collez l'adresse.",
            "Authentification : OAuth 2.0, type Découverte dynamique (Dynamic discovery), puis Créer et Suivant.",
            "Créez une nouvelle connexion, connectez-vous à PulseTrack et autorisez, puis Ajouter à l'agent (Add to agent).",
          ],
          snippets: [
            {
              label: "Autre possibilité : authentification Clé API (API key), type En-tête (Header), nom X-API-Key, et la clé comme valeur :",
              code: `X-API-Key: ${key}`,
              usesKey: true,
            },
          ],
          note: "Nécessite Microsoft Copilot Studio, avec une licence qui l'inclut.",
        },
        {
          id: "le-chat",
          name: "Le Chat",
          steps: [
            "Dans Le Chat de Mistral : page Connecteurs → + Ajouter un connecteur → onglet Connecteur MCP personnalisé.",
            "Nom : pulsetrack. URL du serveur : collez l'adresse. Cliquez sur Connecter.",
            "Le Chat détecte la connexion OAuth : connectez-vous à PulseTrack et autorisez.",
          ],
          note: "Il faut être administrateur de l'espace Mistral — c'est le cas par défaut sur les offres Free, Pro et Étudiant.",
        },
      ],
    };
  }

  return {
    intro:
      "One address for every assistant. Pick yours: in most cases you paste the address, sign in to PulseTrack and pick the site — no key to copy.",
    keyPlaceholderHint: "Replace YOUR_KEY with a key generated below (\"New key\" button).",
    keyInsertedHint: "The key you just generated is already filled in.",
    tabs: [
      {
        id: "claude",
        name: "Claude",
        steps: [
          "On claude.ai or in the Claude app: Settings → Connectors → Add custom connector.",
          "Name: PulseTrack. URL: paste the address above, nothing else.",
          "Click Connect, pick the site, then Allow.",
          "In a conversation, turn PulseTrack on from the tools menu and ask your question.",
        ],
        note: "Requires a paid Claude plan (Pro, Max, Team or Enterprise).",
      },
      {
        id: "chatgpt",
        name: "ChatGPT",
        steps: [
          "Settings → Apps & Connectors → Advanced settings: turn on developer mode.",
          "Go back to Apps & Connectors and click Create.",
          "Paste the address, choose OAuth authentication, then Create.",
          "Sign in to PulseTrack, pick the site, then Allow.",
        ],
        note: "Requires a paid ChatGPT plan (Plus, Pro, Business or Enterprise).",
      },
      {
        id: "claude-code",
        name: "Claude Code",
        steps: [
          "Run the command below in a terminal.",
          "Open claude, type /mcp, pick pulsetrack then Authenticate: your browser opens the PulseTrack sign-in screen.",
        ],
        snippets: [{ label: "Command", code: `claude mcp add --transport http pulsetrack ${url}` }],
      },
      {
        id: "codex",
        name: "Codex",
        steps: [
          "Codex app or editor extension: Settings → MCP servers → Add server, choose Streamable HTTP and paste the address.",
          "Click Authenticate, sign in to PulseTrack and allow, then restart Codex.",
          "From the command line: run the two commands below — the second opens your browser to sign in.",
        ],
        snippets: [
          { label: "Codex CLI", code: `codex mcp add pulsetrack --url ${url}\ncodex mcp login pulsetrack` },
          {
            label: "Alternatively, with a key — in ~/.codex/config.toml, then the variable in your terminal:",
            code: `[mcp_servers.pulsetrack]\nurl = "${url}"\nbearer_token_env_var = "PULSETRACK_API_KEY"\n\nexport PULSETRACK_API_KEY="${key}"`,
            usesKey: true,
          },
        ],
      },
      {
        id: "cursor",
        name: "Cursor",
        install: { label: "Add to Cursor", href: cursorLink(url) },
        steps: [
          "Click \"Add to Cursor\": Cursor opens with PulseTrack pre-filled, confirm the install.",
          "In Cursor Settings → MCP, click Connect next to PulseTrack, sign in and allow.",
        ],
        snippets: [
          { label: "Alternatively, with a key — in ~/.cursor/mcp.json:", code: cursorJson, usesKey: true },
        ],
      },
      {
        id: "vscode",
        name: "VS Code",
        install: { label: "Install in VS Code", href: vscodeLink(url) },
        steps: [
          "Click \"Install in VS Code\", then Install in the window that opens.",
          "On first use, VS Code asks you to authorize PulseTrack: accept, sign in and pick the site.",
          "Use PulseTrack from the chat, in Agent mode.",
        ],
        snippets: [
          { label: "Alternatively, with a key — in .vscode/mcp.json:", code: vscodeJson, usesKey: true },
        ],
      },
      {
        id: "gemini-cli",
        name: "Gemini CLI",
        steps: [
          "Run the command below in a terminal — no file to edit.",
          "In gemini, type /mcp auth pulsetrack: your browser opens, sign in and allow.",
        ],
        snippets: [
          { label: "Command", code: `gemini mcp add --transport http pulsetrack ${url}` },
          {
            label: "Alternatively, with a key:",
            code: `gemini mcp add --transport http pulsetrack ${url} --header "Authorization: Bearer ${key}"`,
            usesKey: true,
          },
        ],
      },
      {
        id: "gemini",
        name: "Gemini",
        steps: [
          "On gemini.google.com, from a computer: Settings & help → Connected Apps.",
          "Under Custom apps, click Add a custom app.",
          "Paste the address, click Next, then sign in to PulseTrack and allow.",
        ],
        note: "Google currently limits this to the United States: personal Google account, 18 or over, Gemini in English. If you don't see the menu, that's why — use Gemini CLI in the meantime.",
      },
      {
        id: "notion",
        name: "Notion",
        steps: [
          "A workspace admin first allows custom MCP servers: Settings → Connections.",
          "Open your Custom Agent → Settings → Tools & Access → Add connection → Custom MCP server.",
          "Paste the address, choose OAuth, click Connect, then allow.",
        ],
        snippets: [
          { label: "Alternatively, header authentication:", code: `Authorization: Bearer ${key}`, usesKey: true },
        ],
        note: "Notion Business and Enterprise plans only.",
      },
      {
        id: "copilot",
        name: "Copilot",
        steps: [
          "In Microsoft Copilot Studio, open your agent → Tools → Add a tool → New tool → Model Context Protocol.",
          "Name: PulseTrack. Description: \"Site traffic, insights, funnels, flows and revenue analytics\". Server URL: paste the address.",
          "Authentication: OAuth 2.0, type Dynamic discovery, then Create and Next.",
          "Create a new connection, sign in to PulseTrack and allow, then Add to agent.",
        ],
        snippets: [
          {
            label: "Alternatively: API key authentication, type Header, name X-API-Key, and the key as its value:",
            code: `X-API-Key: ${key}`,
            usesKey: true,
          },
        ],
        note: "Requires Microsoft Copilot Studio, with a licence that includes it.",
      },
      {
        id: "le-chat",
        name: "Le Chat",
        steps: [
          "In Mistral's Le Chat: Connectors page → + Add Connector → Custom MCP Connector tab.",
          "Name: pulsetrack. Server URL: paste the address. Click Connect.",
          "Le Chat detects OAuth: sign in to PulseTrack and allow.",
        ],
        note: "You need to be a Mistral workspace admin — the account owner is by default on Free, Pro and Student plans.",
      },
    ],
  };
}
