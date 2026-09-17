import type { Locale } from "@/i18n/dictionaries";

/**
 * La démo animée de la page d'accueil (src/components/marketing/product-tour.tsx).
 *
 * Deux minutes pour montrer le produit entier, sans inscription et sans
 * vidéo : les scènes réutilisent les panneaux de l'aperçu produit, donc
 * ce que le visiteur voit ressemble à l'application, et une capture ne
 * peut pas vieillir sans qu'on s'en aperçoive.
 *
 * Chaque scène dit une chose et une seule. Les durées sont en secondes,
 * et la somme tient sous deux minutes : une démo qu'on ne regarde pas
 * jusqu'au bout ne sert à rien.
 */

export type SceneKey =
  | "install"
  | "analytics"
  | "live"
  | "funnels"
  | "revenue"
  | "heatmap"
  | "experiments"
  | "ai"
  | "privacy"
  | "cta";

export interface TourScene {
  key: SceneKey;
  /** Durée d'affichage, en secondes. */
  seconds: number;
  chapter: string;
  eyebrow: string;
  title: string;
  body: string;
}

export interface TourContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  play: string;
  pause: string;
  replay: string;
  previous: string;
  next: string;
  duration: string;
  reducedMotion: string;
  dashboardLink: string;
  scenes: TourScene[];
}

const en: TourContent = {
  eyebrow: "Two-minute tour",
  title: "The whole product, in two minutes",
  subtitle: "No signup, no video call. The tour plays on its own — pause or jump to a chapter whenever you like.",
  play: "Play",
  pause: "Pause",
  replay: "Replay",
  previous: "Previous chapter",
  next: "Next chapter",
  duration: "2 min",
  reducedMotion: "Motion is reduced on your device, so the tour is shown as a list you can read at your own pace.",
  dashboardLink: "Explore a filled dashboard →",
  scenes: [
    {
      key: "install",
      seconds: 12,
      chapter: "Install",
      eyebrow: "One line",
      title: "Paste one script, data flows in seconds",
      body: "No tag manager, no consent banner to configure. A 3.7 KB script, and nothing is stored on your visitors' devices.",
    },
    {
      key: "analytics",
      seconds: 14,
      chapter: "Analytics",
      eyebrow: "The basics, done right",
      title: "Visitors, pages, sources, countries",
      body: "Every figure is computed from your own data, never sampled. Compare periods and split by any field.",
    },
    {
      key: "live",
      seconds: 10,
      chapter: "Real-time",
      eyebrow: "Right now",
      title: "See who is on the site this minute",
      body: "Launch day, a newsletter, a post taking off: watch the pages fill up as it happens.",
    },
    {
      key: "funnels",
      seconds: 14,
      chapter: "Funnels",
      eyebrow: "Where you lose people",
      title: "Step by step, and what it costs",
      body: "Build the path from landing page to payment. Each step shows the drop-off, the time to convert and the revenue lost.",
    },
    {
      key: "revenue",
      seconds: 16,
      chapter: "Revenue",
      eyebrow: "The heart of it",
      title: "Which channel actually pays",
      body: "Connect Stripe with a read-only key. Every payment goes back to the source that produced it — revenue per channel, in euros.",
    },
    {
      key: "heatmap",
      seconds: 14,
      chapter: "Behaviour",
      eyebrow: "Beyond the numbers",
      title: "Heatmaps and session replay",
      body: "Clicks, scroll depth and rage clicks on your real page, plus recorded sessions to watch where people hesitate.",
    },
    {
      key: "experiments",
      seconds: 12,
      chapter: "Experiments",
      eyebrow: "Decide, don't guess",
      title: "A/B tests and feature flags",
      body: "Run a test, get a clear verdict on significance, and roll a feature out to a share of your visitors.",
    },
    {
      key: "ai",
      seconds: 14,
      chapter: "AI",
      eyebrow: "Ask in plain language",
      title: "An assistant here, and in your own tools",
      body: "Ask questions inside PulseTrack, or connect Claude, ChatGPT, Cursor and friends to your data through the MCP server.",
    },
    {
      key: "privacy",
      seconds: 10,
      chapter: "Privacy",
      eyebrow: "By design",
      title: "No cookie, hosted in Europe",
      body: "Anonymous identifiers rotate every day, nothing is written to the device, and your data stays in the European Union.",
    },
    {
      key: "cta",
      seconds: 8,
      chapter: "Start",
      eyebrow: "Your turn",
      title: "Free plan, one minute to install",
      body: "Start free, no card. Upgrade the day your traffic — or your revenue — needs it.",
    },
  ],
};

const fr: TourContent = {
  eyebrow: "Démo en deux minutes",
  title: "Tout le produit, en deux minutes",
  subtitle: "Sans inscription et sans rendez-vous. La démo se joue toute seule — mettez en pause ou sautez à un chapitre quand vous voulez.",
  play: "Lecture",
  pause: "Pause",
  replay: "Revoir",
  previous: "Chapitre précédent",
  next: "Chapitre suivant",
  duration: "2 min",
  reducedMotion: "Les animations sont réduites sur votre appareil : la démo s'affiche en liste, à lire à votre rythme.",
  dashboardLink: "Explorer un tableau de bord rempli →",
  scenes: [
    {
      key: "install",
      seconds: 12,
      chapter: "Installation",
      eyebrow: "Une ligne",
      title: "Un script à coller, des données en quelques secondes",
      body: "Pas de gestionnaire de balises, pas de bannière à configurer. Un script de 3,7 Ko, et rien n'est stocké sur l'appareil de vos visiteurs.",
    },
    {
      key: "analytics",
      seconds: 14,
      chapter: "Analytics",
      eyebrow: "Les bases, bien faites",
      title: "Visiteurs, pages, sources, pays",
      body: "Chaque chiffre est calculé sur vos données, jamais échantillonné. Comparez les périodes et découpez par n'importe quel champ.",
    },
    {
      key: "live",
      seconds: 10,
      chapter: "Temps réel",
      eyebrow: "Maintenant",
      title: "Voyez qui est sur le site à la minute",
      body: "Jour de lancement, newsletter, publication qui décolle : regardez les pages se remplir en direct.",
    },
    {
      key: "funnels",
      seconds: 14,
      chapter: "Funnels",
      eyebrow: "Où vous perdez du monde",
      title: "Étape par étape, et ce que ça coûte",
      body: "Construisez le chemin de la page d'arrivée au paiement. Chaque étape montre l'abandon, le temps de conversion et le revenu perdu.",
    },
    {
      key: "revenue",
      seconds: 16,
      chapter: "Revenu",
      eyebrow: "Le cœur du produit",
      title: "Quel canal paie vraiment",
      body: "Connectez Stripe avec une clé en lecture seule. Chaque paiement remonte à la source qui l'a amené — le revenu par canal, en euros.",
    },
    {
      key: "heatmap",
      seconds: 14,
      chapter: "Comportement",
      eyebrow: "Au-delà des chiffres",
      title: "Heatmaps et replay de sessions",
      body: "Clics, profondeur de scroll et clics de rage sur votre vraie page, plus les sessions enregistrées pour voir où les gens hésitent.",
    },
    {
      key: "experiments",
      seconds: 12,
      chapter: "Expériences",
      eyebrow: "Décider, pas deviner",
      title: "Tests A/B et feature flags",
      body: "Lancez un test, obtenez un verdict clair sur la significativité, et ouvrez une fonctionnalité à une partie de vos visiteurs.",
    },
    {
      key: "ai",
      seconds: 14,
      chapter: "IA",
      eyebrow: "Demandez en français",
      title: "Un assistant ici, et dans vos propres outils",
      body: "Posez vos questions dans PulseTrack, ou branchez Claude, ChatGPT, Cursor et les autres sur vos données via le serveur MCP.",
    },
    {
      key: "privacy",
      seconds: 10,
      chapter: "Vie privée",
      eyebrow: "Par conception",
      title: "Sans cookie, hébergé en Europe",
      body: "Les identifiants anonymes changent chaque jour, rien n'est écrit sur l'appareil, et vos données restent dans l'Union européenne.",
    },
    {
      key: "cta",
      seconds: 8,
      chapter: "Démarrer",
      eyebrow: "À vous",
      title: "Offre gratuite, une minute pour installer",
      body: "Commencez gratuitement, sans carte. Vous changerez d'offre le jour où votre trafic — ou votre revenu — le demandera.",
    },
  ],
};

export function tourContent(locale: Locale): TourContent {
  return locale === "fr" ? fr : en;
}

/** Durée totale de la démo, en secondes. */
export function tourSeconds(locale: Locale): number {
  return tourContent(locale).scenes.reduce((s, scene) => s + scene.seconds, 0);
}
