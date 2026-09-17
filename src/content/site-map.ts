import type { Locale } from "@/i18n/dictionaries";

/**
 * Le plan du site public : le menu et le pied de page, en une seule liste.
 *
 * Avant, chaque langue avait sa copie des liens dans les dictionnaires,
 * et le pied de page la sienne : une page ajoutée d'un côté manquait de
 * l'autre, et un lien mort pouvait survivre dans une copie oubliée.
 *
 * Chaque lien est vérifié au build (scripts/check-site-links.mjs) : il
 * doit mener à une page qui existe. Une section sans lien ne s'affiche
 * pas — le menu Solutions n'apparaît qu'avec au moins un cas d'usage.
 */

type Text = Record<Locale, string>;

export type NavIcon =
  | "analytics"
  | "realtime"
  | "funnels"
  | "dashboards"
  | "heatmaps"
  | "revenue"
  | "ai"
  | "privacy"
  | "compare"
  | "saas"
  | "docs"
  | "install";

export interface NavLink {
  href: string;
  icon: NavIcon;
  title: Text;
  blurb: Text;
}

export interface NavGroup {
  title: Text;
  links: NavLink[];
}

export const NAV_LABELS = {
  platform: { en: "Platform", fr: "Plateforme" },
  solutions: { en: "Solutions", fr: "Solutions" },
  resources: { en: "Resources", fr: "Ressources" },
  compare: { en: "Compare", fr: "Comparer" },
  product: { en: "Product", fr: "Produit" },
  pricing: { en: "Pricing", fr: "Tarifs" },
} satisfies Record<string, Text>;

export const PLATFORM: NavGroup[] = [
  {
    title: { en: "Analyze", fr: "Analyser" },
    links: [
      {
        href: "/features/analytics",
        icon: "analytics",
        title: { en: "Web analytics", fr: "Analytics web" },
        blurb: { en: "Traffic, sources, pages, devices", fr: "Trafic, sources, pages, appareils" },
      },
      {
        href: "/features/realtime",
        icon: "realtime",
        title: { en: "Real-time", fr: "Temps réel" },
        blurb: { en: "Who is on your site right now", fr: "Qui est sur votre site maintenant" },
      },
      {
        href: "/features/funnels",
        icon: "funnels",
        title: { en: "Funnels", fr: "Funnels" },
        blurb: { en: "Find the step that loses people", fr: "Trouvez l'étape qui vous fait perdre" },
      },
    ],
  },
  {
    title: { en: "Understand & earn", fr: "Comprendre et vendre" },
    links: [
      {
        href: "/features/revenue",
        icon: "revenue",
        title: { en: "Revenue attribution", fr: "Attribution du revenu" },
        blurb: { en: "Tie every euro to its source", fr: "Reliez chaque euro à sa source" },
      },
      {
        href: "/features/heatmaps",
        icon: "heatmaps",
        title: { en: "Heatmaps", fr: "Heatmaps" },
        blurb: { en: "See where attention actually goes", fr: "Voyez où va vraiment l'attention" },
      },
      {
        href: "/features/dashboards",
        icon: "dashboards",
        title: { en: "Public dashboards", fr: "Dashboards publics" },
        blurb: { en: "Share numbers without seats", fr: "Partagez sans créer de comptes" },
      },
    ],
  },
  {
    title: { en: "AI & trust", fr: "IA et confiance" },
    links: [
      {
        href: "/docs/mcp",
        icon: "ai",
        title: { en: "MCP server", fr: "Serveur MCP" },
        blurb: {
          en: "Ask your data from Claude, ChatGPT, Cursor…",
          fr: "Interrogez vos données depuis Claude, ChatGPT, Cursor…",
        },
      },
      {
        href: "/features/privacy",
        icon: "privacy",
        title: { en: "Cookie-free by design", fr: "Sans cookie par conception" },
        blurb: { en: "No banner, data hosted in the EU", fr: "Pas de bannière, données hébergées en Europe" },
      },
    ],
  },
];

export const SOLUTIONS: NavLink[] = [
  {
    href: "/use-cases/b2b-saas",
    icon: "saas",
    title: { en: "B2B SaaS", fr: "SaaS B2B" },
    blurb: { en: "From first visit to paid account", fr: "De la première visite au compte payant" },
  },
];

export const COMPARE: NavLink[] = [
  {
    href: "/compare/google-analytics",
    icon: "compare",
    title: { en: "vs Google Analytics 4", fr: "vs Google Analytics 4" },
    blurb: { en: "Cookies, revenue, AI: an honest comparison", fr: "Cookies, revenu, IA : le comparatif honnête" },
  },
];

export const RESOURCES: NavLink[] = [
  {
    href: "/docs/mcp",
    icon: "docs",
    title: { en: "MCP documentation", fr: "Documentation MCP" },
    blurb: { en: "Connect your AI assistant", fr: "Connectez votre assistant IA" },
  },
  {
    href: "/#tour",
    icon: "docs",
    title: { en: "Two-minute tour", fr: "Démo en deux minutes" },
    blurb: { en: "The whole product, animated", fr: "Tout le produit, en animation" },
  },
  {
    href: "/#how",
    icon: "install",
    title: { en: "Install in one line", fr: "Installer en une ligne" },
    blurb: { en: "The script and where to paste it", fr: "Le script et où le coller" },
  },
];

/** Les colonnes du pied de page, tirées des mêmes listes que le menu. */
export function footerColumns(locale: Locale): { title: string; links: { label: string; href: string }[] }[] {
  const label = (links: NavLink[]) => links.map((l) => ({ label: l.title[locale], href: l.href }));
  return [
    {
      title: NAV_LABELS.product[locale],
      links: [...label(PLATFORM.flatMap((g) => g.links)), { label: NAV_LABELS.pricing[locale], href: "/#pricing" }],
    },
    { title: NAV_LABELS.compare[locale], links: label(COMPARE) },
    { title: NAV_LABELS.solutions[locale], links: label(SOLUTIONS) },
    { title: NAV_LABELS.resources[locale], links: label(RESOURCES) },
  ].filter((col) => col.links.length > 0);
}
