-- ════════════════════════════════════════════════════════════════
-- Les funnels comptent des visiteurs, comme le reste du produit.
--
-- funnel_results groupait par session_id et rendait une colonne
-- nommée « sessions », que la route renommait « visitors » et que
-- l'écran affichait « visiteurs ». C'est exactement l'erreur déjà
-- corrigée dans stats_overview, puis dans les sources, les pays et le
-- graphe quotidien : le mot disait une chose, le calcul en faisait une
-- autre. Le funnel était le dernier endroit à ne pas avoir suivi.
--
-- Conséquence attendue : les chiffres baissent. Une personne revenue
-- deux fois dans la période comptait deux fois en haut du funnel, elle
-- compte une fois. C'est la même personne qui apparaît maintenant sur
-- l'accueil et dans le funnel.
--
-- ── Ce que ça change aussi, en mieux ─────────────────────────────
--
-- La chaîne d'étapes exige que chaque étape suive la précédente. En
-- raisonnant par session, quelqu'un qui voyait la page de tarifs le
-- matin et s'inscrivait l'après-midi, dans une autre session, ne
-- convertissait jamais. En raisonnant par visiteur il convertit — le
-- visitor_id est stable sur la journée. C'est aussi ce que fait
-- Mixpanel : un funnel suit une personne, pas une visite.
--
-- Au-delà de la journée, ni l'un ni l'autre ne relie : le sel qui
-- produit le visitor_id est détruit chaque nuit. C'est le prix du
-- « sans cookie », et il est assumé partout ailleurs dans l'écran.
--
-- ── Pourquoi ce fichier a dû être réécrit ────────────────────────
--
-- La première version ne supprimait que la signature à trois
-- arguments décrite par stats-functions.sql. La base, elle, portait
-- aussi une surcharge à quatre arguments — p_until, une borne haute
-- ajoutée pour la comparaison semaine sur semaine des insights
-- hebdomadaires — que le dépôt n'avait jamais enregistrée. Recréer la
-- version à trois arguments à côté d'elle a rendu tout appel nommé
-- ambigu, et PostgREST a refusé de choisir (PGRST203) : plus aucun
-- funnel ne s'affichait.
--
-- La leçon est celle de l'audit lui-même : les fichiers décrivent
-- l'intention, la base décrit ce qui tourne. On vérifie la signature
-- vivante avant d'écrire un DROP.
--
-- Une seule fonction subsiste donc, à quatre arguments, p_until ayant
-- une valeur par défaut : les trois appelants qui n'en passent que
-- trois (l'écran Funnels, l'assistant, le connecteur MCP) continuent
-- de fonctionner sans changement.
--
-- ── Les événements sans visitor_id ───────────────────────────────
--
-- Ils sont ignorés, exactement comme stats_overview les ignore déjà
-- (count(DISTINCT visitor_id) ne compte pas les NULL). Les faire
-- basculer sur session_id gonflerait le funnel par rapport à
-- l'accueil, et on retomberait sur le défaut qu'on corrige ici. En
-- base ils sont sept, tous du 5 août 2026, antérieurs au hachage de
-- visiteur — aucune route d'ingestion n'en produit plus.
--
-- À lancer dans l'éditeur SQL Supabase.
-- ════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS funnel_results(UUID, TIMESTAMPTZ, JSONB);
DROP FUNCTION IF EXISTS funnel_results(UUID, TIMESTAMPTZ, JSONB, TIMESTAMPTZ);

CREATE FUNCTION funnel_results(
  p_site  UUID,
  p_since TIMESTAMPTZ,
  -- [{"match_type":"path|path_contains|event","match_value":"..."}]
  p_steps JSONB,
  -- Borne haute, pour demander une fenêtre passée plutôt que « depuis ».
  p_until TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (step_index INT, visitors BIGINT)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  n        INT := jsonb_array_length(p_steps);
  i        INT;
  mtype    TEXT;
  mval     TEXT;
  cond     TEXT;
  ctes     TEXT := '';
  selects  TEXT := '';
  sql      TEXT;
  until_expr TEXT := format('%L::timestamptz', COALESCE(p_until, now()));
BEGIN
  IF n IS NULL OR n = 0 THEN
    RETURN;
  END IF;

  FOR i IN 0..n - 1 LOOP
    mtype := p_steps -> i ->> 'match_type';
    mval  := p_steps -> i ->> 'match_value';

    cond := CASE mtype
      WHEN 'path'          THEN format('e.path = %L', mval)
      WHEN 'path_contains' THEN format('e.path LIKE %L', '%' || mval || '%')
      WHEN 'event'         THEN format('e.type = %L AND e.event_name = %L', 'event', mval)
      -- An unknown match type matches nothing, rather than everything.
      ELSE 'false'
    END;

    -- Le chaînage se fait sur visitor_id, et l'index
    -- (site_id, visitor_id, created_at DESC) le sert directement.
    IF i = 0 THEN
      ctes := format(
        's0 AS (SELECT e.visitor_id, min(e.created_at) AS t FROM events e '
        || 'WHERE e.site_id = %L AND e.created_at >= %L AND e.created_at <= %s '
        || 'AND e.visitor_id IS NOT NULL AND %s GROUP BY e.visitor_id)',
        p_site, p_since, until_expr, cond
      );
    ELSE
      ctes := ctes || format(
        ', s%s AS (SELECT e.visitor_id, min(e.created_at) AS t FROM events e '
        || 'JOIN s%s p ON p.visitor_id = e.visitor_id '
        || 'WHERE e.site_id = %L AND e.created_at > p.t AND e.created_at <= %s AND %s '
        || 'GROUP BY e.visitor_id)',
        i, i - 1, p_site, until_expr, cond
      );
    END IF;

    IF i > 0 THEN
      selects := selects || ' UNION ALL ';
    END IF;
    selects := selects || format('SELECT %s::INT, count(*)::BIGINT FROM s%s', i, i);
  END LOOP;

  sql := 'WITH ' || ctes || ' ' || selects || ' ORDER BY 1';
  RETURN QUERY EXECUTE sql;
END;
$$;

-- CREATE FUNCTION accorde EXECUTE au pseudo-rôle PUBLIC par défaut, et
-- anon en fait partie : révoquer PUBLIC seul ne suffit pas quand anon
-- détient en plus un droit nominatif, hérité des versions précédentes.
-- Même piège que retention_cohorts, relevé par le linter de la base.
--
-- Rien ne fuyait : la fonction est SECURITY INVOKER, donc elle lit
-- events sous la RLS de l'appelant, et anon s'y fait refuser. Mais
-- c'était un droit d'appel sans session, avec une clé publique
-- présente dans le bundle de chaque page.
REVOKE EXECUTE ON FUNCTION funnel_results(UUID, TIMESTAMPTZ, JSONB, TIMESTAMPTZ) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION funnel_results(UUID, TIMESTAMPTZ, JSONB, TIMESTAMPTZ) TO authenticated;

-- ── Contrôles ────────────────────────────────────────────────────
-- Une seule ligne doit revenir, et sans anon dans les droits :
--   select pg_get_function_identity_arguments(oid), proacl
--     from pg_proc where proname = 'funnel_results';
--
-- Et la première étape d'un funnel sur une page doit tomber sur le
-- même nombre que l'accueil et Insights pour cette page et cette
-- période. Avant ce correctif elle donnait le nombre de sessions.
