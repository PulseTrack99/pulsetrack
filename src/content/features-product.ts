import type { FeaturePage } from "./features";

/**
 * Quatre pages de fonctionnalités : expériences A/B, feature flags,
 * alertes, et accès aux données (API, exports).
 *
 * Ces quatre-là écrivent ou sortent des données, donc chaque phrase est
 * adossée au code : la façon dont une version est tirée au sort, le
 * seuil qui déclenche une alerte, la signature d'un export.
 */

export type ProductSlug = "experiments" | "feature-flags" | "alerts" | "api-export";

export const productEn: Record<ProductSlug, FeaturePage> = {
  experiments: {
    art: "experiments",
    eyebrow: "A/B testing",
    title: "Decide with a number,",
    titleAccent: "not with an opinion",
    subtitle:
      "Show two versions, count the conversions, and get a clear verdict: is the difference real, or is it noise that will vanish next week?",
    metaTitle: "A/B testing with a significance verdict",
    metaDescription:
      "Run A/B tests on your site, count conversions per variant and get a statistical verdict at 95% — plus how many more visitors you would need to decide.",
    highlights: [
      {
        title: "A verdict, not a leaderboard",
        body: "Every comparison carries a p-value and says plainly whether the gap is significant at 95%. Declaring a winner on thirty visitors is worse than saying nothing.",
      },
      {
        title: "How many more people you need",
        body: "When the result is not conclusive yet, the screen estimates the sample per variant that would settle it — so you know whether to wait or to stop.",
      },
      {
        title: "Assignment that never drifts",
        body: "A person always gets the same variant: the choice is a hash of the experiment key and their identifier, computed the same way in the browser and on the server.",
      },
    ],
    steps: [
      {
        title: "Create the experiment",
        body: "A key your code will use, two to five variants with their weights, and the custom event that counts as a conversion. It starts as a draft: nobody is exposed yet.",
      },
      {
        title: "Read the variant in your code",
        body: "Ask the tracker which variant this visitor gets, and render accordingly. The exposure is recorded at that moment, not before.",
      },
      {
        title: "Start, then stop when it is decided",
        body: "Results count from the start, so a test relaunched later never inherits the figures of the previous run.",
      },
    ],
    faq: [
      {
        q: "Which statistical test is used?",
        a: "A two-proportion z-test at 95%, two-sided, against the first variant as control. The p-value and the sample needed are shown next to each variant.",
      },
      {
        q: "Does the same person always see the same version?",
        a: "Yes, as long as their identifier is stable — the visitor identifier within a day, or the identity you provide with identify(). The experiment key is part of the hash, so two tests running at once do not split the same people the same way.",
      },
      {
        q: "Can I run an experiment without writing code?",
        a: "No. PulseTrack decides who sees what and counts the results; rendering the variant stays in your own code, where it belongs.",
      },
      {
        q: "Which plan includes experiments?",
        a: "All of them, including the free plan. Only your monthly event allowance applies.",
      },
    ],
    related: ["feature-flags", "funnels", "insights"],
  },

  "feature-flags": {
    art: "flags",
    eyebrow: "Feature flags",
    title: "Ship it to ten percent",
    titleAccent: "before everyone",
    subtitle:
      "Turn a feature on for a share of your visitors, watch what happens, and turn it off in one click if it goes wrong — no deploy, no rollback.",
    metaTitle: "Feature flags — progressive rollout without a deploy",
    metaDescription:
      "Switch a feature on for part of your visitors, adjust the rollout percentage and turn it off instantly. Deterministic assignment, evaluated server-side.",
    highlights: [
      {
        title: "Born off, always",
        body: "A new flag is created disabled whatever its percentage. Creating and exposing in one gesture removes the second when you reread the key before anyone sees it.",
      },
      {
        title: "A percentage that means something",
        body: "At 25%, the same quarter of your visitors keeps the feature: the share is a hash of the flag key and the person, not a coin flip on every page.",
      },
      {
        title: "Off means off, immediately",
        body: "Flags are evaluated on each page load, so switching one off stops the feature without a deploy and without waiting for a cache.",
      },
    ],
    steps: [
      {
        title: "Create the flag",
        body: "A key for your code, a name for your team. It stays off until you decide otherwise.",
      },
      {
        title: "Ask the tracker",
        body: "Read the flag in your code to decide what to render for this visitor.",
      },
      {
        title: "Open it progressively",
        body: "10%, then 50%, then everyone — or back to zero if something breaks. Archive the flag once the feature is permanent.",
      },
    ],
    faq: [
      {
        q: "Can I rename a flag key?",
        a: "No. The key is written in your code, and renaming it here would silently turn the feature off. Names and descriptions can be changed freely.",
      },
      {
        q: "Are flags evaluated before the page renders?",
        a: "Flags are fetched with the page's first measurement call, so a feature can flash if you render before reading it. For anything visible, read the flag before painting or hide the block until the answer arrives.",
      },
      {
        q: "What happens if PulseTrack is unreachable?",
        a: "Your code keeps the value it already had, and a flag that was never answered stays off. The tracker never blocks your page.",
      },
      {
        q: "Can I target specific accounts?",
        a: "Not yet. Today a flag is a percentage of visitors; targeting by account or by identified user is on the roadmap.",
      },
    ],
    related: ["experiments", "insights", "accounts"],
  },

  alerts: {
    art: "alerts",
    eyebrow: "Alerts",
    title: "Know it today,",
    titleAccent: "not at the end of the month",
    subtitle:
      "A traffic collapse, a form that stopped converting: PulseTrack checks every day and writes to you by e-mail, Slack or Discord — and once a week, tells you what changed.",
    metaTitle: "Traffic alerts by e-mail, Slack and Discord",
    metaDescription:
      "Get an alert when traffic drops past your threshold, by e-mail and on Slack or Discord, plus a weekly digest of what really moved on your site.",
    highlights: [
      {
        title: "A threshold you choose",
        body: "Set the drop that deserves an alert — 30%, 50% — compared with the same recent days. Below it, silence: an alert that fires for nothing is an alert nobody reads.",
      },
      {
        title: "E-mail, Slack or Discord",
        body: "The e-mail always goes out; add a Slack or Discord webhook and the same alert lands in the channel your team actually watches.",
      },
      {
        title: "A weekly digest, written for you",
        body: "Once a week, PulseTrack looks for real moves in funnels, revenue and bounce rate, and asks an AI to turn them into a short summary — only when something crossed the threshold.",
      },
    ],
    steps: [
      {
        title: "Set the threshold",
        body: "One rule per site, with the drop that matters to you.",
      },
      {
        title: "Add a webhook, if you want one",
        body: "Paste a Slack or Discord incoming-webhook URL. Only those two hosts are accepted, so the alert cannot be pointed anywhere else.",
      },
      {
        title: "Mark the causes",
        body: "Add an annotation on the day of a release or a campaign: the next drop will be read against what you actually did.",
      },
    ],
    faq: [
      {
        q: "When is the check run?",
        a: "Once a day, in the morning. The weekly digest goes out on Monday morning.",
      },
      {
        q: "Will I get an alert every day if traffic stays low?",
        a: "No. An alert is sent when the drop is detected, not repeated as long as the situation lasts.",
      },
      {
        q: "Does the weekly digest need a paid plan?",
        a: "It uses the same AI capability as the assistant, so it starts with the Starter plan. Drop alerts by e-mail and webhook work on every plan.",
      },
      {
        q: "Can I alert on something other than traffic?",
        a: "Traffic drop is the rule available today. Revenue and funnel thresholds are the next ones planned.",
      },
    ],
    related: ["analytics", "realtime", "insights"],
  },

  "api-export": {
    art: "api",
    eyebrow: "API and exports",
    title: "Your data stays",
    titleAccent: "yours",
    subtitle:
      "Read the same figures as the dashboard from your own scripts, export the raw events, or have them delivered to your URL every day — signed, so you know they come from us.",
    metaTitle: "Analytics API and raw data export",
    metaDescription:
      "A read API for the same figures as the dashboard, cursor-paginated raw events, CSV export and a signed daily delivery to your own endpoint.",
    highlights: [
      {
        title: "A read API, and an MCP server",
        body: "Query your statistics with a key, at 60 requests a minute. The same data is available to Claude, ChatGPT or Cursor through the MCP server, with no key to copy.",
      },
      {
        title: "Raw events, page by page",
        body: "Walk your entire event history with a cursor, without ever losing or repeating a row — to load it into your own warehouse or your notebook.",
      },
      {
        title: "A daily delivery, signed",
        body: "Point PulseTrack at an HTTPS URL of yours: every night it sends what happened since the last one, with a signature you verify before trusting the payload.",
      },
    ],
    steps: [
      {
        title: "Create a key",
        body: "Settings, API access. A key belongs to one site and can be revoked at any time.",
      },
      {
        title: "Read, or be delivered to",
        body: "Call the API when you need it, or register an export URL and let the nightly run push to you.",
      },
      {
        title: "Verify the signature",
        body: "Each delivery carries a timestamp and a signature computed with your own secret, so a forged payload is detected before it reaches your database.",
      },
    ],
    faq: [
      {
        q: "Which plan includes the API?",
        a: "The API and scheduled exports come with the Growth plan and above. CSV export and the raw event endpoint are part of the Business plan.",
      },
      {
        q: "What happens if my endpoint is down?",
        a: "The cursor does not move, so nothing is lost: the next run resumes exactly where the last successful delivery stopped.",
      },
      {
        q: "Can the export URL be an internal address?",
        a: "No. Only HTTPS is accepted, and addresses that resolve to private or loopback ranges are refused — a destination inside your network cannot be reached from ours.",
      },
      {
        q: "Does the export contain personal data?",
        a: "It contains the events as recorded, including any custom properties you send. What you put in an event is what comes out, so send what you need and nothing more.",
      },
    ],
    related: ["dashboards", "insights", "privacy"],
  },
};

export const productFr: Record<ProductSlug, FeaturePage> = {
  experiments: {
    art: "experiments",
    eyebrow: "Tests A/B",
    title: "Décidez avec un chiffre,",
    titleAccent: "pas avec un avis",
    subtitle:
      "Montrez deux versions, comptez les conversions, et obtenez un verdict clair : l'écart est-il réel, ou est-ce du bruit qui aura disparu la semaine prochaine ?",
    metaTitle: "Tests A/B avec verdict de significativité",
    metaDescription:
      "Lancez des tests A/B sur votre site, comptez les conversions par version et obtenez un verdict statistique à 95 % — avec le nombre de visiteurs qu'il faudrait pour trancher.",
    highlights: [
      {
        title: "Un verdict, pas un classement",
        body: "Chaque comparaison porte sa p-value et dit clairement si l'écart est significatif à 95 %. Annoncer un gagnant sur trente visiteurs est pire que de ne rien annoncer.",
      },
      {
        title: "Combien de monde il vous manque",
        body: "Quand le résultat n'est pas encore concluant, l'écran estime l'échantillon par version qui trancherait — vous savez s'il faut attendre ou arrêter.",
      },
      {
        title: "Une affectation qui ne dérive pas",
        body: "Une personne obtient toujours la même version : le choix est un hachage de la clé du test et de son identifiant, calculé de la même façon dans le navigateur et sur le serveur.",
      },
    ],
    steps: [
      {
        title: "Créez l'expérience",
        body: "Une clé pour votre code, deux à cinq versions avec leurs poids, et l'événement personnalisé qui compte comme conversion. Elle naît en brouillon : personne n'est encore exposé.",
      },
      {
        title: "Lisez la version dans votre code",
        body: "Demandez au tracker quelle version revient à ce visiteur, et affichez en conséquence. L'exposition est enregistrée à ce moment-là, pas avant.",
      },
      {
        title: "Démarrez, puis arrêtez quand c'est tranché",
        body: "Les résultats comptent depuis le démarrage : une expérience relancée plus tard n'hérite jamais des chiffres de l'essai précédent.",
      },
    ],
    faq: [
      {
        q: "Quel test statistique est utilisé ?",
        a: "Un test z de comparaison de deux proportions à 95 %, bilatéral, contre la première version prise comme référence. La p-value et l'échantillon nécessaire sont affichés à côté de chaque version.",
      },
      {
        q: "La même personne voit-elle toujours la même version ?",
        a: "Oui, tant que son identifiant est stable — l'identifiant visiteur dans la journée, ou l'identité que vous fournissez avec identify(). La clé du test entre dans le hachage : deux tests menés en même temps ne découpent donc pas les gens de la même façon.",
      },
      {
        q: "Puis-je lancer un test sans écrire de code ?",
        a: "Non. PulseTrack décide qui voit quoi et compte les résultats ; l'affichage de la version reste dans votre code, là où il doit être.",
      },
      {
        q: "Quelle offre inclut les expériences ?",
        a: "Toutes, y compris l'offre gratuite. Seul votre quota mensuel d'événements s'applique.",
      },
    ],
    related: ["feature-flags", "funnels", "insights"],
  },

  "feature-flags": {
    art: "flags",
    eyebrow: "Feature flags",
    title: "Ouvrez à dix pour cent",
    titleAccent: "avant tout le monde",
    subtitle:
      "Activez une fonctionnalité pour une partie de vos visiteurs, regardez ce qui se passe, et coupez-la en un clic si ça tourne mal — sans déploiement, sans retour arrière.",
    metaTitle: "Feature flags — déploiement progressif sans redéployer",
    metaDescription:
      "Activez une fonctionnalité pour une partie de vos visiteurs, réglez le pourcentage et coupez-la instantanément. Affectation déterministe, évaluée côté serveur.",
    highlights: [
      {
        title: "Éteint à la naissance, toujours",
        body: "Un nouveau flag est créé désactivé, quel que soit son pourcentage. Créer et exposer d'un même geste supprimerait la seconde où l'on relit la clé avant que quiconque ne voie quoi que ce soit.",
      },
      {
        title: "Un pourcentage qui veut dire quelque chose",
        body: "À 25 %, c'est le même quart de vos visiteurs qui garde la fonctionnalité : la part est un hachage de la clé et de la personne, pas un tirage à chaque page.",
      },
      {
        title: "Éteint veut dire éteint, tout de suite",
        body: "Les flags sont évalués à chaque chargement de page : couper l'un d'eux arrête la fonctionnalité sans déploiement et sans attendre un cache.",
      },
    ],
    steps: [
      {
        title: "Créez le flag",
        body: "Une clé pour votre code, un nom pour votre équipe. Il reste éteint tant que vous n'en décidez pas autrement.",
      },
      {
        title: "Demandez au tracker",
        body: "Lisez le flag dans votre code pour décider quoi afficher à ce visiteur.",
      },
      {
        title: "Ouvrez progressivement",
        body: "10 %, puis 50 %, puis tout le monde — ou retour à zéro si quelque chose casse. Archivez le flag une fois la fonctionnalité définitive.",
      },
    ],
    faq: [
      {
        q: "Puis-je renommer la clé d'un flag ?",
        a: "Non. La clé est écrite dans votre code, et la renommer ici éteindrait la fonctionnalité en silence. Le nom et la description, eux, se modifient librement.",
      },
      {
        q: "Les flags sont-ils évalués avant l'affichage ?",
        a: "Les flags arrivent avec le premier appel de mesure de la page : une fonctionnalité peut donc apparaître brièvement si vous affichez avant de lire. Pour tout ce qui est visible, lisez le flag avant de peindre, ou masquez le bloc jusqu'à la réponse.",
      },
      {
        q: "Que se passe-t-il si PulseTrack est injoignable ?",
        a: "Votre code garde la valeur qu'il avait déjà, et un flag jamais répondu reste éteint. Le tracker ne bloque jamais votre page.",
      },
      {
        q: "Puis-je cibler des comptes précis ?",
        a: "Pas encore. Aujourd'hui un flag est un pourcentage de visiteurs ; le ciblage par compte ou par utilisateur identifié est prévu.",
      },
    ],
    related: ["experiments", "insights", "accounts"],
  },

  alerts: {
    art: "alerts",
    eyebrow: "Alertes",
    title: "Le savoir aujourd'hui,",
    titleAccent: "pas à la fin du mois",
    subtitle:
      "Un trafic qui s'effondre, un formulaire qui ne convertit plus : PulseTrack vérifie chaque jour et vous écrit par e-mail, Slack ou Discord — et une fois par semaine, vous dit ce qui a changé.",
    metaTitle: "Alertes de trafic par e-mail, Slack et Discord",
    metaDescription:
      "Recevez une alerte quand le trafic chute au-delà de votre seuil, par e-mail et sur Slack ou Discord, plus un résumé hebdomadaire de ce qui a vraiment bougé.",
    highlights: [
      {
        title: "Un seuil que vous choisissez",
        body: "Fixez la chute qui mérite une alerte — 30 %, 50 % — par rapport aux mêmes jours récents. En dessous, silence : une alerte qui se déclenche pour rien est une alerte que plus personne ne lit.",
      },
      {
        title: "E-mail, Slack ou Discord",
        body: "L'e-mail part toujours ; ajoutez un webhook Slack ou Discord et la même alerte arrive dans le salon que votre équipe regarde vraiment.",
      },
      {
        title: "Un résumé hebdomadaire, rédigé",
        body: "Une fois par semaine, PulseTrack cherche les vrais mouvements dans les funnels, le revenu et le taux de rebond, et demande à une IA d'en faire un court résumé — seulement si quelque chose a dépassé le seuil.",
      },
    ],
    steps: [
      {
        title: "Réglez le seuil",
        body: "Une règle par site, avec la chute qui compte pour vous.",
      },
      {
        title: "Ajoutez un webhook, si vous voulez",
        body: "Collez une URL de webhook Slack ou Discord. Seuls ces deux hôtes sont acceptés : l'alerte ne peut pas être dirigée ailleurs.",
      },
      {
        title: "Marquez les causes",
        body: "Posez une annotation le jour d'une mise en production ou d'une campagne : la prochaine chute se lira à la lumière de ce que vous avez fait.",
      },
    ],
    faq: [
      {
        q: "À quel moment la vérification a-t-elle lieu ?",
        a: "Une fois par jour, le matin. Le résumé hebdomadaire part le lundi matin.",
      },
      {
        q: "Vais-je recevoir une alerte chaque jour si le trafic reste bas ?",
        a: "Non. Une alerte part quand la chute est détectée, et n'est pas répétée tant que la situation dure.",
      },
      {
        q: "Le résumé hebdomadaire demande-t-il une offre payante ?",
        a: "Il utilise la même capacité IA que l'assistant : il commence avec l'offre Starter. Les alertes de chute par e-mail et webhook fonctionnent dans toutes les offres.",
      },
      {
        q: "Puis-je alerter sur autre chose que le trafic ?",
        a: "La chute de trafic est la règle disponible aujourd'hui. Les seuils sur le revenu et les funnels sont les prochains prévus.",
      },
    ],
    related: ["analytics", "realtime", "insights"],
  },

  "api-export": {
    art: "api",
    eyebrow: "API et exports",
    title: "Vos données",
    titleAccent: "restent les vôtres",
    subtitle:
      "Lisez les mêmes chiffres que le tableau de bord depuis vos scripts, exportez les événements bruts, ou faites-les livrer chaque jour à votre URL — signés, pour savoir qu'ils viennent bien de nous.",
    metaTitle: "API analytics et export des données brutes",
    metaDescription:
      "Une API de lecture sur les mêmes chiffres que le tableau de bord, les événements bruts paginés par curseur, l'export CSV et une livraison quotidienne signée vers votre URL.",
    highlights: [
      {
        title: "Une API de lecture, et un serveur MCP",
        body: "Interrogez vos statistiques avec une clé, à 60 requêtes par minute. Les mêmes données sont accessibles à Claude, ChatGPT ou Cursor via le serveur MCP, sans clé à copier.",
      },
      {
        title: "Les événements bruts, page par page",
        body: "Parcourez tout votre historique avec un curseur, sans jamais perdre ni répéter une ligne — pour alimenter votre entrepôt ou votre carnet d'analyse.",
      },
      {
        title: "Une livraison quotidienne, signée",
        body: "Indiquez une URL HTTPS à vous : chaque nuit, PulseTrack envoie ce qui s'est passé depuis la dernière fois, avec une signature que vous vérifiez avant de faire confiance au contenu.",
      },
    ],
    steps: [
      {
        title: "Créez une clé",
        body: "Paramètres, Accès API. Une clé appartient à un seul site et se révoque à tout moment.",
      },
      {
        title: "Lisez, ou faites-vous livrer",
        body: "Appelez l'API quand vous en avez besoin, ou enregistrez une URL d'export et laissez le passage de nuit vous pousser les données.",
      },
      {
        title: "Vérifiez la signature",
        body: "Chaque envoi porte un horodatage et une signature calculée avec votre propre secret : un contenu falsifié est détecté avant d'entrer dans votre base.",
      },
    ],
    faq: [
      {
        q: "Quelle offre inclut l'API ?",
        a: "L'API et les exports planifiés viennent avec l'offre Growth et au-delà. L'export CSV et l'accès aux événements bruts font partie de l'offre Business.",
      },
      {
        q: "Que se passe-t-il si mon serveur est en panne ?",
        a: "Le curseur n'avance pas, donc rien n'est perdu : le passage suivant reprend exactement où la dernière livraison réussie s'est arrêtée.",
      },
      {
        q: "L'URL d'export peut-elle être une adresse interne ?",
        a: "Non. Seul HTTPS est accepté, et les adresses qui pointent vers des plages privées ou de bouclage sont refusées : une destination à l'intérieur de votre réseau ne peut pas être atteinte depuis le nôtre.",
      },
      {
        q: "L'export contient-il des données personnelles ?",
        a: "Il contient les événements tels qu'enregistrés, y compris les propriétés personnalisées que vous envoyez. Ce que vous mettez dans un événement en ressort : envoyez ce dont vous avez besoin, et rien de plus.",
      },
    ],
    related: ["dashboards", "insights", "privacy"],
  },
};
