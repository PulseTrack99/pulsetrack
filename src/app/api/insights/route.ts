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

  /* La fenêtre de même longueur qui précède celle-ci. Une comparaison
     sur une durée différente ne compare rien. */
  const compare = searchParams.get("compare") === "1";
  const prevSince = new Date(
    new Date(since).getTime() - days * 86_400_000
  ).toISOString();

  const ask = (
    m: string,
    eventName: string | null,
    win: "current" | "previous" = "current",
    withGrain = true
  ) =>
    supabase.rpc("insights_query", {
      p_site: siteId,
      p_since: win === "current" ? since : prevSince,
      p_until: win === "current" ? null : since,
      p_measure: m,
      p_event_name: eventName,
      p_breakdown: breakdown || null,
      p_grain: withGrain ? grain : null,
      p_filters: filters.length ? filters : null,
      p_limit: 12,
    });

  const evA = searchParams.get("event_name") || null;
  const evB = searchParams.get("event_name_b") || null;
  const none = Promise.resolve({ data: null, error: null });

  /* Le total de la période est redemandé sans granularité dès qu'on en
     a besoin, et pour deux raisons distinctes.
     
     Sous formule, parce que la somme des ratios de chaque seau ne veut
     rien dire — seul le ratio des sommes en a un.
     
     Sous comparaison, parce que « visiteurs » n'est pas additif : une
     personne revue la semaine suivante compte deux fois en additionnant
     les seaux et une seule sur la période. Mesuré ici, 306 contre 302
     sur trente jours. Un écart lu sur des sommes de seaux décrirait
     autre chose que l'évolution de la période. */
  const needFlat = Boolean((formula && grain) || compare);

  // Tout en parallèle : ni une formule ni une comparaison ne doivent
  // coûter un multiple du temps d'une mesure simple.
  const [a, b, flatA, flatB, prevA, prevB, prevFlatA, prevFlatB] = await Promise.all([
    ask(measure, evA),
    formula ? ask(measureB!, evB) : none,
    needFlat ? ask(measure, evA, "current", false) : none,
    needFlat && formula ? ask(measureB!, evB, "current", false) : none,
    compare ? ask(measure, evA, "previous") : none,
    compare && formula ? ask(measureB!, evB, "previous") : none,
    compare ? ask(measure, evA, "previous", false) : none,
    compare && formula ? ask(measureB!, evB, "previous", false) : none,
  ]);

  const error = a.error ?? b.error ?? prevA.error ?? flatA.error;
  if (error) {
    if (isMissingSchema(error)) {
      return NextResponse.json({ migration_pending: true, rows: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = { bucket: string | null; group_key: string; value: number };
  type Out = Row & { value_a?: number; value_b?: number };

  const key = (r: Row) => `${r.bucket ?? ""}|${r.group_key}`;

  /** Une série, formule appliquée s'il y en a une. */
  const combine = (
    ra: { data: unknown } | null,
    rb: { data: unknown } | null
  ): Out[] => {
    const rowsA = ((ra?.data ?? []) as Row[]);
    if (!formula) return rowsA;

    const bBy = new Map(((rb?.data ?? []) as Row[]).map((r) => [key(r), Number(r.value)]));
    return rowsA
      .map((r): Out | null => {
        const va = Number(r.value);
        // Le second opérande peut n'avoir aucune ligne là où le premier
        // en a — personne n'a rien fait ce jour-là — et c'est zéro.
        const vb = bBy.get(key(r)) ?? 0;

        let value: number;
        if (formula === "ratio") {
          /* Diviser par zéro n'a pas de réponse. La ligne disparaît
             plutôt que d'afficher « 0 % de conversion » là où il n'y
             avait personne à convertir. */
          if (vb === 0) return null;
          /* Rendu en pourcentage à une décimale : l'axe du graphe
             arrondit à l'entier, et un ratio brut de 0,043 s'y
             afficherait « 0 ». */
          value = Math.round((va / vb) * 1000) / 10;
        } else if (formula === "difference") {
          value = va - vb;
        } else {
          value = va + vb;
        }
        return { ...r, value, value_a: va, value_b: vb };
      })
      .filter((r): r is Out => r !== null);
  };

  const rows = combine(a, b);
  const flat = needFlat ? combine(flatA, flatB) : [];
  const previousRows = compare ? combine(prevA, prevB) : [];
  const previousFlat = compare ? combine(prevFlatA, prevFlatB) : [];

  const totalsOf = (list: Out[]) =>
    list.map((r) => ({
      group_key: r.group_key,
      value: r.value,
      value_a: r.value_a,
      value_b: r.value_b,
    }));

  return NextResponse.json({
    rows,
    /* Le total de la période, par groupe. Nul quand la ligne elle-même
       est déjà le total. */
    period_totals: flat.length ? totalsOf(flat) : null,
    previous_rows: compare ? previousRows : null,
    previous_totals: compare ? totalsOf(previousFlat) : null,
    compare,
    /* Les deux bornes basses, pour que l'écran aligne les courbes sur un
       décalage de date plutôt que sur un rang. Un jour sans trafic
       n'ayant aucune ligne, l'alignement par rang dériverait d'un jour
       à chaque trou, et superposerait deux dates sans rapport. */
    since,
    previous_since: compare ? prevSince : null,
    measure,
    measure_b: formula ? measureB : null,
    grain,
    breakdown: breakdown || null,
    formula,
    migration_pending: false,
  });
}
