import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rate-limit";
import { getAssistantFaq } from "@/content/assistant-faq";
import { PLANS } from "@/lib/stripe";
import type { Locale } from "@/i18n/dictionaries";

/**
 * L'assistant du site vitrine, pour de vrai.
 *
 * Le widget répondait depuis une banque de FAQ appariée par mots-clés
 * (src/content/assistant-faq.ts) — instantané, gratuit, et juste. Mais
 * dès qu'une question était formulée autrement, il répondait « the
 * assistant is not wired to a live model yet », alors que la page vend
 * un copilote IA deux sections plus haut. Le démonstrateur contredisait
 * l'argument.
 *
 * La banque reste la première ligne : elle est consultée côté client,
 * donc une question courante ne coûte rien et répond en un instant.
 * Cette route ne sert que les questions qu'elle n'a pas su reconnaître.
 *
 * ── Ce que le modèle a le droit de dire ──────────────────────────
 *
 * Rien qu'il n'ait reçu. Le prompt contient la banque de FAQ et la
 * grille tarifaire lue dans src/lib/stripe.ts — la source de vérité,
 * pas une copie —, et lui interdit d'inventer un prix, une limite ou
 * une capacité. Un assistant commercial qui hallucine une
 * fonctionnalité crée une promesse que le produit devra tenir.
 *
 * ── Ce qui protège la porte ──────────────────────────────────────
 *
 * Elle est ouverte à tous, sans session : question plafonnée en
 * longueur, réponse plafonnée en jetons, et un quota par adresse IP
 * qui survit aux démarrages à froid (supabase/rate-limits.sql). Sans
 * clé API configurée, la route le dit et le widget retombe sur son
 * message de repli plutôt que d'afficher une erreur.
 */

const MODEL = "claude-haiku-4-5-20251001";
const MAX_QUESTION = 500;
const MAX_TOKENS = 400;

// Généreux pour un visiteur curieux, borné pour une boucle.
const RATE_LIMIT = 8;
const RATE_WINDOW = 600;

function planSummary(): string {
  return (Object.keys(PLANS) as (keyof typeof PLANS)[])
    .map((key) => {
      const p = PLANS[key];
      const l = p.limits;
      const caps = Object.entries(p.capabilities)
        .filter(([, on]) => on)
        .map(([name]) => name)
        .join(", ");
      return [
        `${p.name} — ${p.price} €/mois`,
        `${l.sites} site(s)`,
        `${l.events_per_month.toLocaleString("fr-FR")} événements/mois`,
        `${l.funnels < 0 ? "funnels illimités" : `${l.funnels} funnel(s)`}`,
        `${l.retention_days} jours de rétention`,
        `${l.replays_per_month} replays/mois`,
        `${l.ai_queries_per_month} questions IA/mois`,
        caps ? `inclus : ${caps}` : "aucune option incluse",
      ].join(" · ");
    })
    .join("\n");
}

function systemPrompt(locale: Locale): string {
  const faq = getAssistantFaq(locale)
    .map((e) => `Q: ${e.q}\nR: ${e.a}`)
    .join("\n\n");

  return `Tu réponds aux questions des visiteurs du site de PulseTrack, un outil d'analytics web respectueux de la vie privée.

RÈGLES ABSOLUES
- Tu ne réponds QU'À PARTIR des informations ci-dessous. Si la réponse ne s'y trouve pas, dis-le franchement et renvoie vers la page Tarifs, les pages de fonctionnalités, ou le lien de contact en pied de page.
- N'invente jamais un prix, une limite, un quota, une intégration ou une fonctionnalité. Une promesse inventée devient une promesse à tenir.
- Tu ne connais aucune donnée d'aucun client. Tu n'as accès à aucun tableau de bord. Si on te demande des chiffres, explique qu'il faut créer un compte.
- Réponds dans la langue de la question.
- Trois phrases au maximum. Ton sobre et concret, sans superlatif commercial.
- Pas de Markdown, pas de listes à puces : du texte simple.

GRILLE TARIFAIRE (source de vérité)
${planSummary()}

QUESTIONS DÉJÀ TRAITÉES (reprends ces réponses quand elles conviennent)
${faq}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const question: string = (body?.question ?? "").toString().trim();
    const locale: Locale = body?.locale === "fr" ? "fr" : "en";

    if (!question) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }
    if (question.length > MAX_QUESTION) {
      return NextResponse.json({ error: "question_too_long" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Pas une panne : le widget a un message de repli honnête.
      return NextResponse.json({ error: "unavailable" }, { status: 503 });
    }

    /* Le compteur vit en base pour survivre aux démarrages à froid : un
       Map en mémoire se réinitialise à chaque instance et n'a donc
       jamais rien limité. Service role parce qu'il n'y a pas de session
       ici — c'est précisément le point de cette route. */
    const service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const allowed = await checkRateLimit(
      service,
      `ask:${ip}`,
      RATE_LIMIT,
      RATE_WINDOW
    );
    if (!allowed) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt(locale),
        // Pas d'outils, pas d'historique : une question, une réponse.
        // Rien à travers quoi atteindre des données.
        messages: [{ role: "user", content: question }],
      }),
    });

    if (!res.ok) {
      console.error("ask: model call failed", res.status, await res.text());
      return NextResponse.json({ error: "unavailable" }, { status: 503 });
    }

    const data = await res.json();
    const answer = (data.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("")
      .trim();

    if (!answer) {
      return NextResponse.json({ error: "unavailable" }, { status: 503 });
    }

    return NextResponse.json({ answer });
  } catch (err) {
    console.error("ask error:", err);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
