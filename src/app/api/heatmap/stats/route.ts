import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, planHas } from "@/lib/plan";
import { isMissingSchema } from "@/lib/schema-guard";

/**
 * Tout ce que la vue heatmap affiche, en une question.
 *
 * Cette route enchaînait une quinzaine d'allers-retours PostgREST —
 * balayage des pages, trois comptages par appareil, deux totaux, trois
 * échantillons paginés, dont plusieurs séquentiels — ce qui en faisait
 * la route la plus lente du produit, la seule au-dessus de 400 ms sur
 * un site quasi vide.
 *
 * Deux conséquences de fond, au-delà de la vitesse :
 *
 *   Le classement des éléments, la profondeur de scroll et les clics
 *   morts venaient d'un échantillon de 5 000 lignes puis étaient remis
 *   à l'échelle, alors que les clics et les clics de rage étaient
 *   exacts. La même carte mélangeait deux natures de nombre. Tout est
 *   exact désormais ; seul le nuage reste plafonné, parce que c'est
 *   une limite d'affichage et non de calcul.
 *
 *   La source et le pays vivent sur events, pas sur interactions, donc
 *   « segmentation par appareil, source ou pays » — vendue par le site
 *   vitrine — était infaisable ici sans transporter une liste de
 *   sessions. La fonction SQL les joint (supabase/heatmap-stats.sql).
 */

const PERIODS: Record<string, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

interface Stats {
  path: string;
  device: string;
  devices: { device: string; count: number }[];
  sources: string[];
  countries: string[];
  pages: { path: string; count: number }[];
  summary: {
    clicks: number;
    rage_clicks: number;
    sessions: number;
    dead_clicks: number;
    avg_scroll: number;
  };
  geometry: { viewport_w: number; doc_h: number };
  points: { x: number; y: number }[];
  rage_points: { x: number; y: number }[];
  elements: {
    selector: string;
    text: string;
    clicks: number;
    interactive: boolean;
    share: number;
  }[];
  rage_spots: { selector: string; text: string; count: number }[];
  scroll_bands: { depth: number; reached: number; pct: number }[];
  points_capped: boolean;
  points_shown: number;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("site_id");
    const period = searchParams.get("period") || "30d";

    // "all" est l'absence de filtre, pas une valeur à chercher en base.
    const asFilter = (v: string | null) => (v && v !== "all" ? v : null);

    if (!siteId) {
      return NextResponse.json({ error: "site_id is required" }, { status: 400 });
    }

    // No .eq("user_id", user.id) — RLS already scopes this to sites
    // the caller owns or was added to as a team member.
    const { data: site } = await supabase
      .from("sites")
      .select("id, domain")
      .eq("id", siteId)
      .maybeSingle();

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const plan = await getUserPlan(supabase, user.id);
    if (!planHas(plan, "heatmaps")) {
      return NextResponse.json(
        { error: "upgrade_required", plan, feature: "heatmaps" },
        { status: 402 }
      );
    }

    const days = PERIODS[period] ?? 30;
    const since = new Date(Date.now() - days * 86_400_000).toISOString();

    const { data, error } = await supabase.rpc("heatmap_stats", {
      p_site: siteId,
      // Vide plutôt que nul : la fonction choisit alors la page la plus
      // active, ce qui évite un aller-retour rien que pour la trouver.
      p_path: searchParams.get("path") || "",
      p_since: since,
      p_device: asFilter(searchParams.get("device")),
      p_source: asFilter(searchParams.get("source")),
      p_country: asFilter(searchParams.get("country")),
    });

    if (error) {
      if (isMissingSchema(error)) {
        return NextResponse.json(
          { error: "migration_pending", file: "supabase/heatmap-stats.sql" },
          { status: 503 }
        );
      }
      console.error("Heatmap stats error:", error);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    const s = data as Stats;

    /* La structure de la page, pour le calque sous la chaleur. `dom` est
       l'arbre rrweb que le tableau de bord reconstruit quand il existe ;
       `elements` est le repli en boîtes pour les pages capturées avant
       rrweb, ou dont la sérialisation a été refusée.

       Séparé de l'agrégat : c'est une autre table, une autre clé, et
       une ligne au plus. */
    const { data: snapshot } = await supabase
      .from("page_snapshots")
      .select("viewport_w, doc_h, elements, dom, dom_bytes, captured_at")
      .eq("site_id", siteId)
      .eq("path", s.path)
      .eq("device", s.device)
      .maybeSingle();

    return NextResponse.json({
      site: { domain: site.domain },
      path: s.path,
      period,
      device: s.device,
      devices: s.devices,
      sources: s.sources,
      countries: s.countries,
      // Renvoyés tels quels pour que l'écran puisse montrer ce qui est
      // filtré, y compris quand la valeur demandée n'existait pas.
      source: asFilter(searchParams.get("source")),
      country: asFilter(searchParams.get("country")),
      /* Le calque et la chaleur doivent être dessinés aux mêmes
         proportions ou ils ne se superposeront pas : la capture
         l'emporte quand elle existe. */
      geometry: snapshot
        ? { viewport_w: snapshot.viewport_w, doc_h: snapshot.doc_h }
        : s.geometry,
      snapshot: snapshot
        ? {
            elements: snapshot.elements ?? [],
            dom: snapshot.dom ?? null,
            dom_bytes: snapshot.dom_bytes ?? null,
            captured_at: snapshot.captured_at,
          }
        : null,
      pages: s.pages,
      summary: s.summary,
      // Ne dit plus « ces chiffres sont estimés » mais « le nuage
      // n'affiche pas tous les points » : les chiffres sont exacts.
      points_capped: s.points_capped,
      points_shown: s.points_shown,
      points: s.points,
      rage_points: s.rage_points,
      elements: s.elements,
      rage_spots: s.rage_spots,
      scroll_bands: s.scroll_bands,
    });
  } catch (err) {
    console.error("Heatmap stats error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
