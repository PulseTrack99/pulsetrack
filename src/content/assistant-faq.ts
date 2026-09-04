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
