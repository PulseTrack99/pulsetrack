import type { Locale } from "@/i18n/dictionaries";
import { FEATURE_SLUGS, getFeature } from "@/content/features";

/**
 * Answer bank for the landing-page assistant (src/components/marketing/assistant.tsx).
 *
 * No API call, no cost per visitor — a client-side keyword match
 * (src/lib/assistant-match.ts) picks the closest entry from this fixed
 * list. Every answer here is either lifted straight from a feature page's
 * own FAQ (single source of truth — see src/content/features.ts) or
 * hand-written against verified facts (PLANS in src/lib/stripe.ts, and
 * this session's own feature builds). Nothing is invented on the fly, so
 * nothing here can hallucinate a price, a limit or a capability that
 * doesn't exist.
 *
 * Keep PLAN_SUMMARY in sync with PLANS in src/lib/stripe.ts by hand — it
 * can't import that file directly (Stripe's SDK and STRIPE_SECRET_KEY
 * must never reach a client bundle).
 */

export interface FaqEntry {
  q: string;
  a: string;
  /** Extra synonyms to match on, beyond the words already in `q`. */
  keywords?: string[];
}

const extraEn: FaqEntry[] = [
  {
    q: "How does revenue attribution work?",
    a: "Install the tracking script, then call pulsetrack.identify(email) at signup or checkout so a session can be linked to a person. Connect a restricted, read-only Stripe key and PulseTrack matches every charge to the session — and traffic source — that produced it.",
    keywords: ["stripe", "money", "sales", "payments"],
  },
  {
    q: "Do I need a cookie banner?",
    a: "No. Consent under ePrivacy is triggered by storing or reading information on a visitor's device, and PulseTrack does neither — no cookie, no local storage. This reflects how cookie-free analytics is commonly treated, but it isn't legal advice for your specific jurisdiction.",
    keywords: ["consent", "gdpr", "rgpd", "cookies", "banner"],
  },
  {
    q: "Which plan fits 100K pageviews a month?",
    a: "Growth (€29/mo, 200K events/month). Starter tops out at 50K events/month, so it's tight for 100K pageviews once you add custom events on top — Growth gives headroom plus revenue tracking and API access.",
    keywords: ["100k", "pageviews", "volume", "traffic", "plan", "pricing", "tier"],
  },
  {
    q: "Can I invite my team?",
    a: "Yes, on any plan, at no extra cost. Invite teammates from Settings — they get the same access as you to your sites, dashboards and data, no per-seat billing.",
    keywords: ["team", "teammate", "invite", "collaborator", "seats", "members", "multi-user"],
  },
  {
    q: "Can PulseTrack alert me when traffic drops?",
    a: "Yes. Turn on a traffic-drop alert per site in Settings and PulseTrack emails you when visitors fall a set percentage below the same period last week — available on any plan, no extra cost.",
    keywords: ["alert", "notification", "drop", "email", "warning"],
  },
  {
    q: "What is session replay?",
    a: "A reconstruction of real sessions — clicks, scrolls and page changes replayed in your browser — built from recorded DOM structure, not a video capture of the screen. It's off on the Free plan and quota-limited per month starting on Starter (500/mo, more on higher plans).",
    keywords: ["replay", "recording", "record", "watch", "sessions"],
  },
  {
    q: "What is the AI copilot?",
    a: "A chat panel inside session replay that turns a plain-language question — 'show me sessions that scrolled almost nothing' — into the right filter, so you don't have to build one by hand. It runs on Claude Haiku, is unavailable on Free, and comes with a monthly query quota per plan (50 on Starter up to 1000 on Business) so it can never run away with your bill.",
    keywords: ["copilot", "ai", "assistant", "chatbot", "claude"],
  },
  {
    q: "Can I save a custom segment or cohort?",
    a: "Yes — the session replay panel has a full condition builder (duration, scroll depth, rage clicks, conversion, device, source, country, funnel step, combined with AND/OR) and you can save any non-trivial combination as a reusable cohort.",
    keywords: ["cohort", "segment", "filter", "condition", "builder"],
  },
  {
    q: "Is there an API?",
    a: "Yes, on Growth and Business. Generate a key in Settings and pull your stats over HTTP with a Bearer token — rate-limited to 60 requests per minute per key.",
    keywords: ["api", "integration", "webhook", "export", "programmatic"],
  },
  {
    q: "Can I export my data?",
    a: "CSV export is available on the Business plan — a full breakdown (summary, pages, sources, countries, devices, daily visitors) in one file. Raw data is also reachable via the API on Growth and above.",
    keywords: ["csv", "export", "download", "data"],
  },
  {
    q: "Do I need a credit card to sign up?",
    a: "No. The Free plan needs no card and is free for as long as you use it — you only add billing details when you choose to upgrade.",
    keywords: ["credit card", "trial", "free plan", "signup", "payment method"],
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, self-serve, anytime — manage or cancel your subscription from the billing portal in Settings, no email or call required.",
    keywords: ["cancel", "subscription", "billing", "downgrade", "refund"],
  },
  {
    q: "How long is data kept?",
    a: "It depends on your plan — 30 days on Free, 90 on Starter, 180 on Growth, 365 on Business. Data past that window is purged automatically every night.",
    keywords: ["retention", "storage", "keep", "delete", "purge", "history"],
  },
];

const extraFr: FaqEntry[] = [
  {
    q: "Comment fonctionne l'attribution du revenu ?",
    a: "Installez le script de suivi, puis appelez pulsetrack.identify(email) à l'inscription ou au paiement pour relier une session à une personne. Connectez une clé Stripe restreinte, en lecture seule, et PulseTrack rapproche chaque paiement de la session — et de la source de trafic — qui l'a produit.",
    keywords: ["stripe", "argent", "ventes", "paiements"],
  },
  {
    q: "Ai-je besoin d'une bannière cookies ?",
    a: "Non. Le consentement au titre d'ePrivacy est déclenché par le stockage ou la lecture d'informations sur l'appareil d'un visiteur, et PulseTrack ne fait ni l'un ni l'autre — aucun cookie, aucun stockage local. Cela reflète le traitement habituel de l'analytics sans cookie, mais ce n'est pas un conseil juridique pour votre juridiction précise.",
    keywords: ["consentement", "rgpd", "gdpr", "cookies", "banniere"],
  },
  {
    q: "Quelle offre pour 100K pages vues par mois ?",
    a: "Growth (29€/mois, 200 000 events/mois). Starter plafonne à 50 000 events/mois, donc c'est juste pour 100K pages vues dès que vous ajoutez des événements personnalisés — Growth laisse de la marge, plus le suivi du revenu et l'accès API.",
    keywords: ["100k", "pages vues", "volume", "trafic", "offre", "tarif", "plan"],
  },
  {
    q: "Puis-je inviter mon équipe ?",
    a: "Oui, sur n'importe quelle offre, sans surcoût. Invitez des collègues depuis les Paramètres — ils ont le même accès que vous à vos sites, dashboards et données, sans facturation par siège.",
    keywords: ["equipe", "collegue", "inviter", "membres", "multi-utilisateur"],
  },
  {
    q: "PulseTrack peut-il m'alerter en cas de chute de trafic ?",
    a: "Oui. Activez une alerte de chute de trafic par site dans les Paramètres et PulseTrack vous envoie un email quand les visiteurs tombent sous un certain pourcentage par rapport à la même période la semaine dernière — disponible sur toutes les offres, sans surcoût.",
    keywords: ["alerte", "notification", "chute", "email", "avertissement"],
  },
  {
    q: "Qu'est-ce que le session replay ?",
    a: "Une reconstitution des sessions réelles — clics, scrolls et changements de page rejoués dans votre navigateur — construite à partir de la structure DOM enregistrée, pas une vidéo de l'écran. C'est désactivé sur l'offre gratuite et limité par quota mensuel à partir de Starter (500/mois, plus sur les offres supérieures).",
    keywords: ["replay", "enregistrement", "regarder", "sessions"],
  },
  {
    q: "Qu'est-ce que le copilote IA ?",
    a: "Un panneau de chat dans le session replay qui transforme une question en langage naturel — « montre-moi les sessions qui ont à peine scrollé » — en le bon filtre, pour ne pas avoir à le construire à la main. Il tourne sur Claude Haiku, indisponible sur l'offre gratuite, avec un quota mensuel de requêtes par offre (50 sur Starter jusqu'à 1000 sur Business) pour qu'il ne puisse jamais faire exploser la facture.",
    keywords: ["copilote", "ia", "assistant", "chatbot", "claude"],
  },
  {
    q: "Puis-je sauvegarder un segment ou cohort personnalisé ?",
    a: "Oui — le panneau session replay a un vrai constructeur de conditions (durée, profondeur de scroll, clics de rage, conversion, appareil, source, pays, étape de funnel, combinables en ET/OU) et vous pouvez sauvegarder toute combinaison non triviale comme cohort réutilisable.",
    keywords: ["cohort", "segment", "filtre", "condition", "constructeur"],
  },
  {
    q: "Y a-t-il une API ?",
    a: "Oui, à partir de Growth et sur Business. Générez une clé dans les Paramètres et récupérez vos statistiques en HTTP avec un token Bearer — limité à 60 requêtes par minute et par clé.",
    keywords: ["api", "integration", "webhook", "export", "programmatique"],
  },
  {
    q: "Puis-je exporter mes données ?",
    a: "L'export CSV est disponible sur l'offre Business — un fichier complet (résumé, pages, sources, pays, appareils, visiteurs par jour). Les données brutes sont aussi accessibles via l'API à partir de Growth.",
    keywords: ["csv", "export", "telecharger", "donnees"],
  },
  {
    q: "Faut-il une carte bancaire pour s'inscrire ?",
    a: "Non. L'offre gratuite ne demande aucune carte et reste gratuite tant que vous l'utilisez — vous n'ajoutez des informations de facturation qu'au moment de passer à une offre payante.",
    keywords: ["carte bancaire", "essai", "offre gratuite", "inscription", "moyen de paiement"],
  },
  {
    q: "Puis-je annuler à tout moment ?",
    a: "Oui, en autonomie, à tout moment — gérez ou annulez votre abonnement depuis le portail de facturation dans les Paramètres, sans email ni appel à passer.",
    keywords: ["annuler", "abonnement", "facturation", "resiliation", "remboursement"],
  },
  {
    q: "Combien de temps les données sont-elles conservées ?",
    a: "Ça dépend de votre offre — 30 jours sur Free, 90 sur Starter, 180 sur Growth, 365 sur Business. Les données au-delà de cette fenêtre sont purgées automatiquement chaque nuit.",
    keywords: ["retention", "stockage", "conserver", "supprimer", "purge", "historique"],
  },
];

function flattenFeatureFaqs(locale: Locale): FaqEntry[] {
  return FEATURE_SLUGS.flatMap(
    (slug) => getFeature(locale, slug).faq as FaqEntry[]
  );
}

export function getAssistantFaq(locale: Locale): FaqEntry[] {
  const extra = locale === "fr" ? extraFr : extraEn;
  return [...extra, ...flattenFeatureFaqs(locale)];
}

/**
 * Screen help for the in-app assistant (src/components/assistant-panel.tsx).
 *
 * Kept apart from the bank above, which answers a prospect's questions
 * on the marketing site. These answer the questions someone has with a
 * dashboard screen already in front of them — what a number counts, how
 * to read a diagram — which the marketing FAQ never had to cover. The
 * assistant suggests these questions by screen, so every one of them
 * has to be answerable: a suggestion that returns the fallback makes
 * the assistant look broken on its own prompt.
 */
const appHelpFr: FaqEntry[] = [
  {
    q: "Comment lire le diagramme des parcours (Flows) ?",
    a: "Chaque colonne est une étape du parcours : « Entrée » est la page d'arrivée, « Étape 1 » la page suivante, et ainsi de suite. Un bloc = une page, avec le nombre de sessions et sa part de l'étape. L'épaisseur d'un trait indique combien de sessions ont suivi ce chemin. Survolez une page pour n'allumer que son parcours.",
    keywords: ["flows", "parcours", "diagramme", "colonnes", "lire", "comprendre", "etape"],
  },
  {
    q: "Que veut dire « Sortie du site » dans les Flows ?",
    a: "C'est le nombre de sessions qui se sont arrêtées à cette étape : le visiteur n'a pas ouvert de page suivante. Les blocs de sortie sont en orange et placés en bas de leur colonne, pour séparer d'un coup d'œil ceux qui ont continué de ceux qui sont partis.",
    keywords: ["sortie", "exit", "quitte", "parti", "abandon", "flows", "orange"],
  },
  {
    q: "Quelle différence entre Flows et Funnels ?",
    a: "Un funnel, vous le définissez à l'avance : vous listez les étapes attendues et PulseTrack compte qui les franchit. Les Flows font l'inverse — ils reconstituent le parcours réel des visiteurs, sans que vous ayez rien déclaré. Le funnel vérifie une hypothèse, les Flows la font émerger.",
    keywords: ["difference", "flows", "funnel", "entonnoir", "versus", "comparaison"],
  },
  {
    q: "Que compte exactement « visiteurs » et en quoi diffère-t-il de « sessions » ?",
    a: "« Visiteurs » compte les personnes distinctes, identifiées par un hash sans cookie. « Sessions » compte les visites : une même personne qui revient trois fois dans la période compte pour 1 visiteur et 3 sessions. C'est pour cela que le second chiffre est toujours supérieur ou égal au premier.",
    keywords: ["visiteurs", "sessions", "difference", "unique", "compte", "distinct"],
  },
  {
    q: "Comment est calculé le taux de rebond ?",
    a: "C'est la part des sessions qui n'ont vu qu'une seule page avant de partir. Un taux élevé n'est pas mauvais en soi : sur un article de blog ou une page de contact, lire puis repartir est le comportement normal.",
    keywords: ["rebond", "bounce", "taux", "calcul", "une seule page"],
  },
  {
    q: "À quoi correspondent les écarts en pourcentage sur l'accueil ?",
    a: "Chaque carte se compare à la période de même durée qui précède : sur 30 jours, aux 30 jours d'avant. Un tiret à la place du pourcentage signifie qu'il n'y avait rien sur la période précédente — il n'y a donc rien à comparer.",
    keywords: ["ecart", "pourcentage", "comparaison", "periode", "precedente", "evolution", "vs"],
  },
  {
    q: "Que sont les clics de rage ?",
    a: "Plusieurs clics rapprochés au même endroit, signe qu'un visiteur insiste sur quelque chose qui ne réagit pas — un faux bouton, un lien mort, une image qui semble cliquable. C'est le signal le plus direct d'une frustration sur une page.",
    keywords: ["rage", "clics", "frustration", "colere", "insiste", "faux bouton"],
  },
  {
    q: "Comment lire la profondeur de scroll ?",
    a: "Chaque palier indique la part des sessions qui sont descendues au moins jusque-là. Si 30 % seulement atteignent la moitié de la page, tout ce qui se trouve en dessous n'est vu que par une minorité — utile pour décider où placer un bouton important.",
    keywords: ["scroll", "profondeur", "defilement", "palier", "descendu", "heatmap"],
  },
  {
    q: "Comment créer un funnel ?",
    a: "Écran Funnels, bouton « Créer un funnel ». Donnez-lui un nom, puis décrivez chaque étape par une URL exacte, une URL qui contient un mot, ou un événement. Le funnel est créé sur le site affiché dans le menu de gauche. Vous verrez ensuite combien de visiteurs franchissent chaque étape et où ils abandonnent.",
    keywords: ["creer", "funnel", "entonnoir", "etapes", "nouveau", "ajouter"],
  },
  {
    q: "Comment brancher Claude ou ChatGPT sur mes données ?",
    a: "Paramètres → Accès API. Copiez l'URL du connecteur MCP et collez-la dans Claude ou ChatGPT : vous vous connectez en un clic avec votre compte PulseTrack, aucune clé n'est jamais visible. Vous pouvez ensuite poser vos questions d'analytics directement à votre assistant.",
    keywords: ["claude", "chatgpt", "gemini", "mcp", "connecteur", "brancher", "assistant", "ia"],
  },
  {
    q: "Quelle clé Stripe dois-je créer pour le suivi du revenu ?",
    a: "Une clé restreinte (elle commence par rk_), avec l'accès en lecture seule sur Charges et Customers, et rien d'autre. PulseTrack lit vos paiements et ne peut rien y modifier. Vous la créez dans Stripe → Developers → API keys.",
    keywords: ["stripe", "cle", "restreinte", "rk", "lecture", "revenu", "charges", "customers"],
  },
  {
    q: "Comment installer le script de suivi ?",
    a: "Menu de gauche → « Gérer mes sites » → « Installation », ou « + Créer » → « Nouveau site » pour un nouveau domaine. Vous copiez une ligne de script et la collez dans le <head> de vos pages — sur Webflow, Shopify ou WordPress, dans le champ « code personnalisé / head » du thème. Le guide se coche tout seul dès la première visite reçue.",
    keywords: ["installer", "installation", "script", "suivi", "tracking", "coller", "poser", "mettre", "balise", "tag", "head"],
  },
  {
    q: "Comment vérifier que mon script est bien installé ?",
    a: "Menu de gauche → « Gérer mes sites ». Chaque site affiche son état : « Données reçues » avec la date de la dernière visite, ou « En attente de données » si rien n'est encore arrivé. Le bouton « Installation » ouvre un guide qui se coche tout seul dès que la première visite est enregistrée.",
    keywords: ["script", "installation", "installe", "verifier", "fonctionne", "marche", "donnees"],
  },
  {
    q: "Où changer de site quand j'en ai plusieurs ?",
    a: "En haut du menu de gauche : le sélecteur affiche le site courant et son domaine. Ce choix pilote tous les écrans à la fois — accueil, funnels, flows, replays, heatmaps et revenu suivent le site sélectionné.",
    keywords: ["changer", "site", "selecteur", "plusieurs", "basculer", "switch", "projet"],
  },
];

/** The in-app assistant's bank: screen help first, then everything the
 *  marketing chatbot already answers. */
export function getAppHelpFaq(locale: Locale): FaqEntry[] {
  const appHelp = locale === "fr" ? appHelpFr : appHelpEn;
  return [...appHelp, ...getAssistantFaq(locale)];
}

/** English screen help — the mirror of appHelpFr. Both lists have to
 *  cover the assistant's own per-screen suggestions, or the assistant
 *  falls back on questions it proposed itself. */
const appHelpEn: FaqEntry[] = [
  {
    q: "How do I read the paths diagram (Flows)?",
    a: "Each column is a step in the journey: \"Entry\" is the landing page, \"Step 1\" the page after it, and so on. A block is one page, with the number of sessions and its share of that step. Line thickness shows how many sessions took that path. Hover a page to light up only its route.",
    keywords: ["flows", "paths", "diagram", "columns", "read", "understand", "journey", "step"],
  },
  {
    q: "What does \"Left the site\" mean in Flows?",
    a: "It's the number of sessions that stopped at that step — the visitor never opened another page. Exit blocks are coral and sit at the bottom of their column, so you can separate at a glance the people who carried on from the ones who left.",
    keywords: ["exit", "left", "leave", "dropped", "abandon", "flows", "coral", "orange"],
  },
  {
    q: "What is the difference between Flows and Funnels?",
    a: "A funnel is something you define up front: you list the steps you expect and PulseTrack counts who clears them. Flows do the opposite — they reconstruct the journeys visitors actually took, with nothing declared in advance. A funnel tests a hypothesis; Flows surface one.",
    keywords: ["difference", "flows", "funnel", "versus", "compare", "between"],
  },
  {
    q: "What does \"visitors\" count, and how is it different from \"sessions\"?",
    a: "Visitors counts distinct people, identified by a cookie-free hash. Sessions counts visits: one person coming back three times in the period is 1 visitor and 3 sessions. That's why the second number is always equal to or higher than the first.",
    keywords: ["visitors", "sessions", "difference", "unique", "count", "distinct", "people"],
  },
  {
    q: "How is bounce rate calculated?",
    a: "It's the share of sessions that saw exactly one page before leaving. A high rate isn't automatically bad: on a blog post or a contact page, reading and leaving is the normal behaviour.",
    keywords: ["bounce", "rate", "calculated", "single", "page", "one"],
  },
  {
    q: "What do the percentage changes on the home screen compare against?",
    a: "Each card compares to the equal-length period immediately before: over 30 days, to the previous 30 days. A dash instead of a percentage means there was nothing in the previous period, so there is nothing to compare against.",
    keywords: ["percentage", "change", "compare", "previous", "period", "delta", "growth", "dash"],
  },
  {
    q: "What are rage clicks?",
    a: "Several rapid clicks in the same spot — the sign that a visitor is insisting on something that doesn't respond: a fake button, a dead link, an image that looks clickable. It's the most direct signal of frustration on a page.",
    keywords: ["rage", "clicks", "frustration", "angry", "repeated", "fake button", "dead"],
  },
  {
    q: "How do I read scroll depth?",
    a: "Each band shows the share of sessions that got at least that far down. If only 30% reach the middle of the page, everything below that is seen by a minority — useful when deciding where to put an important button.",
    keywords: ["scroll", "depth", "band", "reached", "down", "heatmap", "fold"],
  },
  {
    q: "How do I create a funnel?",
    a: "On the Funnels screen, click \"Create a funnel\". Give it a name, then describe each step by exact URL, URL contains, or event. The funnel is created on the site selected in the left menu. You'll then see how many visitors clear each step and where they drop off.",
    keywords: ["create", "funnel", "steps", "new", "add", "build", "make"],
  },
  {
    q: "How do I connect Claude or ChatGPT to my data?",
    a: "Settings → API access. Copy the MCP connector URL and paste it into Claude or ChatGPT: you sign in with your PulseTrack account in one click, and no key is ever shown. You can then ask your analytics questions straight to your assistant.",
    keywords: ["claude", "chatgpt", "gemini", "mcp", "connector", "connect", "assistant", "ai"],
  },
  {
    q: "Which Stripe key do I need for revenue tracking?",
    a: "A restricted key (it starts with rk_), with read-only access to Charges and Customers and nothing else. PulseTrack reads your payments and cannot modify anything. You create it in Stripe → Developers → API keys.",
    keywords: ["stripe", "key", "restricted", "read", "revenue", "charges", "customers"],
  },
  {
    q: "How do I install the tracking script?",
    a: "Left menu → \"Manage sites\" → \"Install\", or \"+ Create\" → \"New site\" for a new domain. You copy one line of script and paste it into the <head> of your pages — on Webflow, Shopify or WordPress, into the theme's \"custom code / head\" field. The guide ticks itself off as soon as the first visit arrives.",
    keywords: ["install", "installation", "script", "tracking", "paste", "add", "setup", "tag", "head", "snippet"],
  },
  {
    q: "How do I check that my script is installed correctly?",
    a: "Left menu → \"Manage sites\". Each site shows its state: \"Data received\" with the date of the last visit, or \"Waiting for data\" if nothing has arrived yet. The \"Install\" button opens a guide that ticks itself off the moment the first visit is recorded.",
    keywords: ["script", "installed", "check", "verify", "working", "data", "receiving"],
  },
  {
    q: "Where do I switch site when I have several?",
    a: "At the top of the left menu: the switcher shows the current site and its domain. That choice drives every screen at once — home, funnels, flows, replays, heatmaps and revenue all follow the selected site.",
    keywords: ["switch", "site", "selector", "several", "multiple", "change", "project"],
  },
];
