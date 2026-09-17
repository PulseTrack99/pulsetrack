/**
 * Le site de démonstration public — https://pulsetrack.eu/public/demo
 *
 * Un visiteur doit pouvoir voir à quoi ressemble un tableau de bord
 * rempli avant de s'inscrire. Nos propres chiffres sont trop maigres
 * pour ça, et ceux d'un client ne nous appartiennent pas : ce script
 * fabrique donc 90 jours de trafic plausible pour un site fictif.
 *
 * Ce n'est jamais présenté comme du trafic réel : la page publique
 * affiche un bandeau « données de démonstration », et le site s'appelle
 * « Démo PulseTrack ».
 *
 * Les données respectent le modèle du produit : l'identifiant visiteur
 * change chaque jour (comme le sel quotidien côté serveur), donc une
 * même personne revenue le lendemain compte deux fois sur la période.
 * Un jeu de données qui l'ignorerait ferait mentir le tableau.
 *
 * Lancement :
 *   node --env-file=.env.local scripts/seed-demo.mjs
 *
 * Rejouable : il efface les événements du site de démo avant de
 * réécrire, et ne touche à aucun autre site.
 */

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const OWNER_EMAIL = "claude-verif@pulsetrack.eu";
const SITE_NAME = "Démo PulseTrack";
const SITE_DOMAIN = "demo.pulsetrack.eu";
const SHARE_ID = "demo";
const DAYS = 90;

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/* ── Le site fictif ──────────────────────────────────────────────── */

const SOURCES = [
  { name: "Google", referrer: "https://www.google.com/", weight: 30 },
  { name: "Direct", referrer: null, weight: 22 },
  { name: "LinkedIn", referrer: "https://www.linkedin.com/", weight: 12 },
  { name: "Reddit", referrer: "https://www.reddit.com/", weight: 9 },
  { name: "ChatGPT", referrer: "https://chatgpt.com/", weight: 8 },
  { name: "Product Hunt", referrer: "https://www.producthunt.com/", weight: 6 },
  { name: "Newsletter", referrer: "https://buttondown.email/", weight: 5, utm: { medium: "email", campaign: "weekly-digest" } },
  { name: "X", referrer: "https://x.com/", weight: 4 },
  { name: "Perplexity", referrer: "https://www.perplexity.ai/", weight: 4 },
];

const LANDING = [
  { path: "/", title: "Aurora — écrivez vos notes, pas vos dossiers", weight: 34 },
  { path: "/pricing", title: "Tarifs — Aurora", weight: 18 },
  { path: "/blog/notes-et-productivite", title: "Prendre des notes qui servent vraiment", weight: 14 },
  { path: "/features/sync", title: "Synchronisation — Aurora", weight: 12 },
  { path: "/blog/lancement-v2", title: "Aurora v2 est là", weight: 10 },
  { path: "/docs/demarrer", title: "Démarrer avec Aurora", weight: 7 },
  { path: "/changelog", title: "Nouveautés — Aurora", weight: 5 },
];

const NEXT_PAGES = [
  { path: "/", title: "Aurora — écrivez vos notes, pas vos dossiers", weight: 14 },
  { path: "/pricing", title: "Tarifs — Aurora", weight: 15 },
  { path: "/features/sync", title: "Synchronisation — Aurora", weight: 18 },
  { path: "/docs/demarrer", title: "Démarrer avec Aurora", weight: 16 },
  { path: "/signup", title: "Créer un compte — Aurora", weight: 14 },
  { path: "/blog/notes-et-productivite", title: "Prendre des notes qui servent vraiment", weight: 12 },
  { path: "/changelog", title: "Nouveautés — Aurora", weight: 9 },
  { path: "/faq", title: "Questions fréquentes — Aurora", weight: 7 },
];

const COUNTRIES = [
  { code: "FR", language: "fr-FR", weight: 34 },
  { code: "BE", language: "fr-BE", weight: 8 },
  { code: "CH", language: "fr-CH", weight: 6 },
  { code: "DE", language: "de-DE", weight: 9 },
  { code: "GB", language: "en-GB", weight: 8 },
  { code: "US", language: "en-US", weight: 13 },
  { code: "CA", language: "en-CA", weight: 5 },
  { code: "ES", language: "es-ES", weight: 6 },
  { code: "IT", language: "it-IT", weight: 5 },
  { code: "NL", language: "nl-NL", weight: 6 },
];

const DEVICES = [
  { device: "Desktop", weight: 56, widths: [1280, 1440, 1512, 1920] },
  { device: "Mobile", weight: 38, widths: [375, 390, 414, 430] },
  { device: "Tablet", weight: 6, widths: [768, 820, 1024] },
];

const BROWSERS = [
  { name: "Chrome", weight: 52 },
  { name: "Safari", weight: 24 },
  { name: "Firefox", weight: 11 },
  { name: "Edge", weight: 9 },
  { name: "Other", weight: 4 },
];

/* ── Tirages ─────────────────────────────────────────────────────── */

function pick(list) {
  const total = list.reduce((s, x) => s + x.weight, 0);
  let n = Math.random() * total;
  for (const item of list) {
    n -= item.weight;
    if (n <= 0) return item;
  }
  return list[list.length - 1];
}

const between = (min, max) => min + Math.random() * (max - min);
const id = () => randomBytes(16).toString("hex");

/* ── Une journée ─────────────────────────────────────────────────── */

function visitorsFor(dayIndex, date) {
  // Croissance douce sur la période, creux le week-end, bruit léger.
  const growth = 110 + (dayIndex / DAYS) * 140;
  const weekend = [0, 6].includes(date.getUTCDay()) ? 0.62 : 1;
  return Math.max(12, Math.round(growth * weekend * between(0.85, 1.15)));
}

function sessionAt(date) {
  // Journée de travail européenne, avec une trace le soir.
  const hour = Math.random() < 0.82 ? Math.floor(between(8, 20)) : Math.floor(between(20, 24));
  const d = new Date(date);
  d.setUTCHours(hour, Math.floor(between(0, 60)), Math.floor(between(0, 60)), 0);
  return d;
}

function buildDay(siteId, dayIndex, date) {
  const rows = [];
  const visitors = visitorsFor(dayIndex, date);

  for (let v = 0; v < visitors; v++) {
    // L'identifiant change chaque jour : c'est le modèle du produit.
    const visitor_id = id();
    const session_id = id();
    const source = pick(SOURCES);
    const country = pick(COUNTRIES);
    const deviceInfo = pick(DEVICES);
    const browser = pick(BROWSERS).name;
    const screen_width = deviceInfo.widths[Math.floor(Math.random() * deviceInfo.widths.length)];
    const landing = pick(LANDING);
    const start = sessionAt(date);

    // 42 % des sessions ne voient qu'une page : c'est le rebond.
    const depth = Math.random() < 0.42 ? 1 : Math.min(6, 2 + Math.floor(Math.random() * 4));

    const common = {
      site_id: siteId,
      source: source.name,
      referrer: source.referrer,
      utm_medium: source.utm?.medium ?? null,
      utm_campaign: source.utm?.campaign ?? null,
      country: country.code,
      language: country.language,
      device: deviceInfo.device,
      browser,
      screen_width,
      session_id,
      visitor_id,
    };

    let at = start;
    let page = landing;
    let sessionSeconds = 0;
    for (let p = 0; p < depth; p++) {
      const duration = Math.round(between(12, p === 0 ? 120 : 210));
      rows.push({
        ...common,
        type: "pageview",
        path: page.path,
        title: page.title,
        duration,
        created_at: at.toISOString(),
      });
      sessionSeconds += duration;
      at = new Date(at.getTime() + (duration + between(2, 25)) * 1000);
      page = pick(NEXT_PAGES);
    }

    /* Le « leave » que le tracker envoie en quittant : c est lui, et lui
       seul, qui alimente la durée moyenne (stats_overview). */
    rows.push({
      ...common,
      type: "leave",
      path: page.path,
      duration: Math.round(sessionSeconds),
      created_at: at.toISOString(),
    });

    const fired = (name, chance, props = null) => {
      if (Math.random() >= chance) return;
      rows.push({
        ...common,
        type: "event",
        path: page.path,
        event_name: name,
        event_props: props,
        created_at: new Date(at.getTime() + between(1, 40) * 1000).toISOString(),
      });
    };

    fired("doc_searched", depth > 1 ? 0.14 : 0.03);
    fired("signup_started", depth > 2 ? 0.16 : 0.02);
    fired("checkout_completed", depth > 2 ? 0.05 : 0.004, {
      plan: Math.random() < 0.65 ? "starter" : "growth",
    });
  }

  return rows;
}

/* ── Exécution ───────────────────────────────────────────────────── */

async function main() {
  const { data: users, error: userErr } = await db.auth.admin.listUsers({ perPage: 200 });
  if (userErr) throw userErr;
  const owner = users.users.find((u) => u.email === OWNER_EMAIL);
  if (!owner) throw new Error(`compte ${OWNER_EMAIL} introuvable`);

  let { data: site } = await db.from("sites").select("id").eq("domain", SITE_DOMAIN).maybeSingle();
  if (!site) {
    const { data, error } = await db
      .from("sites")
      .insert({ user_id: owner.id, name: SITE_NAME, domain: SITE_DOMAIN, public_share_id: SHARE_ID })
      .select("id")
      .single();
    if (error) throw error;
    site = data;
    console.log(`site de démo créé : ${site.id}`);
  } else {
    await db.from("sites").update({ name: SITE_NAME, public_share_id: SHARE_ID }).eq("id", site.id);
    console.log(`site de démo existant : ${site.id}`);
  }

  const { count: before } = await db
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("site_id", site.id);
  if (before) {
    await db.from("events").delete().eq("site_id", site.id);
    console.log(`${before} anciens événements supprimés`);
  }

  const midnight = new Date();
  midnight.setUTCHours(0, 0, 0, 0);

  let written = 0;
  for (let i = 0; i < DAYS; i++) {
    const date = new Date(midnight.getTime() - (DAYS - 1 - i) * 86_400_000);
    const rows = buildDay(site.id, i, date).filter((r) => new Date(r.created_at) <= new Date());
    for (let from = 0; from < rows.length; from += 500) {
      const { error } = await db.from("events").insert(rows.slice(from, from + 500));
      if (error) throw error;
    }
    written += rows.length;
  }

  console.log(`${written} événements écrits sur ${DAYS} jours — /public/${SHARE_ID}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
