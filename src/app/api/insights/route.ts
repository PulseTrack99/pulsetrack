import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * The one screen whose question comes from the person asking it.
 *
 * Everything else answers something decided in advance — the home shows
 * traffic, funnels show a path someone configured. Nothing could answer
 * "how many visitors from LinkedIn fired checkout_completed, by week,
 * split by plan". This can.
 *
 * The shapes below are validated here and again in SQL. Not because one
 * of the two is unreliable, but because a rejected value should produce
 * a 400 that names the problem rather than an empty chart the person has
 * to interpret.
 */

const MEASURES = ["pageviews", "sessions", "visitors", "events", "event_visitors"] as const;
const GRAINS = ["day", "week", "month"] as const;

/**
 * Combiner deux mesures en une troisième.
 *
 * Sans ça, l'écran compte mais ne calcule pas : lire « 312 visiteurs »
 * et « 47 inscriptions » côte à côte laisse la division à la tête du
 * lecteur, et c'est justement le chiffre qu'il cherchait.
 *
 * Aucune migration : les deux opérandes sont deux appels à
 * insights_query, lancés en parallèle et recollés ici par (seau,
 * groupe). Le SQL déjà éprouvé ne bouge pas.
 */
const FORMULAS = ["ratio", "difference", "sum"] as const;

/** Breakdown and filter fields, mirroring insights_dimension in SQL.
 *  A custom event property is addressed as `prop:<key>`. */
const FIELDS = [
  "path", "source", "country", "device", "browser",
  "language", "utm_medium", "utm_campaign", "event_name", "referrer",
] as const;

const PERIODS: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90, "180d": 180, "365d": 365 };

function isField(v: string): boolean {
  return (FIELDS as readonly string[]).includes(v) || /^prop:[\w.-]{1,60}$/.test(v);
}

function isMissingSchema(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return (
    err.code === "42883" ||
    err.code === "42P01" ||
    err.code === "PGRST202" ||
    /does not exist|schema cache/i.test(err.message ?? "")
  );
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("site_id");
  if (!siteId) return NextResponse.json({ error: "site_id is required" }, { status: 400 });

  const measure = searchParams.get("measure") ?? "pageviews";
  if (!(MEASURES as readonly string[]).includes(measure)) {
    return NextResponse.json({ error: "unknown measure" }, { status: 400 });
  }

  const grainRaw = searchParams.get("grain");
  // No grain is a legitimate request, not a missing one: it asks for a
  // ranking over the whole period rather than a line over time.
  const grain = grainRaw && (GRAINS as readonly string[]).includes(grainRaw) ? grainRaw : null;

  const breakdown = searchParams.get("breakdown");
  if (breakdown && !isField(breakdown)) {
    return NextResponse.json({ error: "unknown breakdown field" }, { status: 400 });
  }

  let filters: { field: string; value: string }[] = [];
  const rawFilters = searchParams.get("filters");
  if (rawFilters) {
    try {
      const parsed = JSON.parse(rawFilters);
      if (!Array.isArray(parsed)) throw new Error("not an array");
      filters = parsed.slice(0, 8);
    } catch {
      return NextResponse.json({ error: "filters must be a JSON array" }, { status: 400 });
    }
    for (const f of filters) {
      if (!f || typeof f.field !== "string" || typeof f.value !== "string" || !isField(f.field)) {
        return NextResponse.json({ error: "invalid filter" }, { status: 400 });
      }
    }
  }

  const days = PERIODS[searchParams.get("period") ?? "30d"] ?? 30;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const formulaRaw = searchParams.get("formula");
  const formula =
    formulaRaw && (FORMULAS as readonly string[]).includes(formulaRaw) ? formulaRaw : null;

  const measureB = searchParams.get("measure_b");
  if (formula && !(MEASURES as readonly string[]).includes(measureB ?? "")) {
    return NextResponse.json(
      { error: "a formula needs a valid measure_b" },
      { status: 400 }
    );
  }

  const ask = (m: string, eventName: string | null) =>
    supabase.rpc("insights_query", {
      p_site: siteId,
      p_since: since,
      p_until: null,
      p_measure: m,
      p_event_name: eventName,
      p_breakdown: breakdown || null,
      p_grain: grain,
      p_filters: filters.length ? filters : null,
      p_limit: 12,
    });

  /* Sans granularité, pour le total de la période.
   *
   * Un ratio par semaine ne se totalise pas en additionnant les
   * semaines : « visiteurs » n'est pas additif, puisqu'une même
   * personne revue la semaine suivante compte deux fois dans la somme
   * et une seule sur la période. Mesuré ici : 306 visiteurs en
   * additionnant les jours, 302 sur les trente jours.
   *
   * Le total est donc redemandé sans granularité, ce qui donne le taux
   * de la période — celui que l'accueil affiche, et celui qu'on cite. */
  const askFlat = (m: string, eventName: string | null) =>
    supabase.rpc("insights_query", {
      p_site: siteId,
      p_since: since,
      p_until: null,
      p_measure: m,
      p_event_name: eventName,
      p_breakdown: breakdown || null,
      p_grain: null,
      p_filters: filters.length ? filters : null,
      p_limit: 12,
    });

  // Tout en parallèle : une formule ne doit pas coûter le double du
  // temps d'une mesure simple.
  const [a, b, flatA, flatB] = await Promise.all([
    ask(measure, searchParams.get("event_name") || null),
    formula
      ? ask(measureB!, searchParams.get("event_name_b") || null)
      : Promise.resolve({ data: null, error: null }),
    formula && grain
      ? askFlat(measure, searchParams.get("event_name") || null)
      : Promise.resolve({ data: null, error: null }),
    formula && grain
      ? askFlat(measureB!, searchParams.get("event_name_b") || null)
      : Promise.resolve({ data: null, error: null }),
  ]);

  const error = a.error ?? b.error;
  if (error) {
    if (isMissingSchema(error)) {
      return NextResponse.json({ migration_pending: true, rows: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = { bucket: string | null; group_key: string; value: number };
  const rowsA = (a.data ?? []) as Row[];

  if (!formula) {
    return NextResponse.json({
      rows: rowsA,
      measure,
      grain,
      breakdown: breakdown || null,
      formula: null,
      migration_pending: false,
    });
  }

  /* Recollage par (seau, groupe). Le second opérande peut ne pas avoir
     de ligne là où le premier en a — personne n'a rien fait ce jour-là —
     et c'est zéro, pas une absence. */
  const key = (r: Row) => `${r.bucket ?? ""}|${r.group_key}`;
  const bByKey = new Map(((b.data ?? []) as Row[]).map((r) => [key(r), Number(r.value)]));

  const rows = rowsA
    .map((r) => {
      const va = Number(r.value);
      const vb = bByKey.get(key(r)) ?? 0;

      let value: number;
      if (formula === "ratio") {
        // Diviser par zéro n'a pas de réponse. La ligne disparaît plutôt
        // que d'afficher un zéro qui se lirait comme « 0 % de
        // conversion » là où il n'y avait personne à convertir.
        if (vb === 0) return null;
        // Rendu en pourcentage, à une décimale : l'axe du graphe arrondit
        // à l'entier, et un ratio brut de 0,043 s'y afficherait « 0 ».
        value = Math.round((va / vb) * 1000) / 10;
      } else if (formula === "difference") {
        value = va - vb;
      } else {
        value = va + vb;
      }

      // value_a et value_b remontent pour que l'écran puisse recomposer
      // le total : la somme des ratios de chaque seau ne vaut rien, seul
      // le ratio des sommes veut dire quelque chose.
      return { ...r, value, value_a: va, value_b: vb };
    })
    .filter((r) => r !== null);

  /* Le total de la période, par groupe. Absent sans granularité :
     la ligne elle-même est déjà le total. */
  const flatBByGroup = new Map(
    ((flatB.data ?? []) as Row[]).map((r) => [r.group_key, Number(r.value)])
  );
  const period_totals = ((flatA.data ?? []) as Row[]).map((r) => {
    const va = Number(r.value);
    const vb = flatBByGroup.get(r.group_key) ?? 0;
    return {
      group_key: r.group_key,
      value:
        formula === "ratio"
          ? vb === 0
            ? null
            : Math.round((va / vb) * 1000) / 10
          : formula === "difference"
            ? va - vb
            : va + vb,
      value_a: va,
      value_b: vb,
    };
  });

  return NextResponse.json({
    rows,
    period_totals: period_totals.length ? period_totals : null,
    measure,
    measure_b: measureB,
    grain,
    breakdown: breakdown || null,
    formula,
    migration_pending: false,
  });
}
