import type { FaqEntry } from "@/content/assistant-faq";

/**
 * Picks the closest predefined answer for the landing-page assistant —
 * plain keyword overlap, no model, no network call. Deliberately simple:
 * this only ever has to beat "show the generic fallback", not understand
 * language. See src/content/assistant-faq.ts for the answer bank.
 */

const STOPWORDS = new Set([
  // EN
  "the", "a", "an", "is", "are", "do", "does", "did", "for", "with", "in",
  "on", "my", "i", "you", "your", "how", "what", "which", "need", "of",
  "to", "it", "this", "that", "can", "have", "has", "and", "or", "about",
  // FR
  "le", "la", "les", "de", "des", "un", "une", "est", "ce", "que", "qui",
  "pour", "avec", "dans", "sur", "mon", "ma", "mes", "vous", "je", "ai",
  "il", "elle", "comment", "quoi", "du", "au", "aux", "et", "ou", "a",
  "besoin", "faut", "puis",
]);

const DIACRITICS = /[̀-ͯ]/g;

function tokenize(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(DIACRITICS, "") // strip accents so "bannière"/"banniere" match
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * Returns the best-matching entry's answer, or null if nothing clears
 * the overlap threshold — callers fall back to the generic disclaimer.
 */
export function findAnswer(query: string, entries: FaqEntry[]): string | null {
  const qTokens = new Set(tokenize(query));
  if (qTokens.size === 0) return null;

  let best: { score: number; a: string } | null = null;
  for (const entry of entries) {
    const hay = tokenize(`${entry.q} ${entry.keywords?.join(" ") ?? ""}`);
    const hTokens = new Set(hay);
    let score = 0;
    for (const w of qTokens) if (hTokens.has(w)) score++;
    if (score > 0 && (!best || score > best.score)) best = { score, a: entry.a };
  }

  if (!best) return null;
  // Require a good chunk of the visitor's meaningful words to actually
  // show up in the matched entry — otherwise stay with the fallback
  // rather than confidently answering the wrong question.
  return best.score / qTokens.size >= 0.4 ? best.a : null;
}
