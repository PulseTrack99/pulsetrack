-- ════════════════════════════════════════════════════════════════
-- Les trois promesses que la page Funnels faisait sans code derrière.
--
-- Le site vitrine vend, depuis toujours :
--
--   « Comparaison d'un même funnel entre sources de trafic »
--   « Temps de conversion pour chaque étape »
--   « Abandon exprimé en visiteurs et en euros »
--
-- La route n'acceptait qu'un paramètre, `period`, et ne rendait qu'un
-- nombre par étape. Les trois sont construites ici.
--
-- ── La chaîne, écrite une fois ───────────────────────────────────
--
-- Les trois fonctions posent la même question de départ — qui a
-- franchi quelle étape, dans l'ordre — et ne diffèrent que par ce
-- qu'elles en font. La construction de la chaîne de CTE vit donc dans
-- funnel_chain(), et les trois l'appellent. Trois copies auraient
-- dérivé au premier correctif.
--
-- Tout raisonne par visitor_id depuis supabase/funnel-visitors.sql :
-- un funnel suit une personne, pas une visite.
--
-- À lancer dans l'éditeur SQL Supabase.
-- ════════════════════════════════════════════════════════════════

-- ── Le constructeur de chaîne ────────────────────────────────────
--
-- Rend le corps d'un WITH : s0, s1, … sN, où s{i} contient les
-- visiteurs ayant franchi l'étape i et l'instant où ils l'ont fait.
-- s0 porte en plus la source de l'événement d'entrée, dont la
-- comparaison par source a besoin et que les autres ignorent.
--
-- Rien du paramétrage n'est interpolé sans %L. p_steps est parcouru
-- par index, et un match_type inconnu ne matche rien plutôt que tout.
CREATE OR REPLACE FUNCTION funnel_chain(
  p_site  UUID,
  p_since TIMESTAMPTZ,
  p_steps JSONB,
  p_until TIMESTAMPTZ DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
-- STABLE et non IMMUTABLE : sans borne haute explicite la chaîne
-- contient now(), donc le résultat change d'un appel à l'autre.
STABLE
SET search_path = public
AS $$
DECLARE
  n     INT := jsonb_array_length(p_steps);
  i     INT;
  mtype TEXT;
  mval  TEXT;
  cond  TEXT;
  ctes  TEXT := '';
  ub    TEXT := format('%L::timestamptz', COALESCE(p_until, now()));
BEGIN
  IF n IS NULL OR n = 0 THEN
    RETURN NULL;
  END IF;

  FOR i IN 0..n - 1 LOOP
    mtype := p_steps -> i ->> 'match_type';
    mval  := p_steps -> i ->> 'match_value';

    cond := CASE mtype
      WHEN 'path'          THEN format('e.path = %L', mval)
      WHEN 'path_contains' THEN format('e.path LIKE %L', '%' || mval || '%')
      WHEN 'event'         THEN format('e.type = %L AND e.event_name = %L', 'event', mval)
      ELSE 'false'
    END;

    IF i = 0 THEN
      -- La source retenue est celle de l'événement d'entrée le plus
      -- ancien : c'est le canal par lequel la personne est arrivée
      -- dans le funnel, pas le dernier qu'elle ait touché.
      ctes := format(
        's0 AS (SELECT e.visitor_id, min(e.created_at) AS t, '
        || '(array_agg(COALESCE(NULLIF(e.source, %L), %L) ORDER BY e.created_at))[1] AS src '
        || 'FROM events e WHERE e.site_id = %L AND e.created_at >= %L AND e.created_at <= %s '
        || 'AND e.visitor_id IS NOT NULL AND %s GROUP BY e.visitor_id)',
        '', 'Direct', p_site, p_since, ub, cond
      );
    ELSE
      ctes := ctes || format(
        ', s%s AS (SELECT e.visitor_id, min(e.created_at) AS t FROM events e '
        || 'JOIN s%s p ON p.visitor_id = e.visitor_id '
        || 'WHERE e.site_id = %L AND e.created_at > p.t AND e.created_at <= %s AND %s '
        || 'GROUP BY e.visitor_id)',
        i, i - 1, p_site, ub, cond
      );
    END IF;
  END LOOP;

  RETURN ctes;
END;
$$;

-- ── Étapes : combien, et en combien de temps ─────────────────────
--
-- median_seconds est le temps écoulé depuis l'étape précédente, en
-- médiane. Médiane et non moyenne : une poignée de gens qui reviennent
-- trois jours plus tard décaleraient la moyenne au point de ne plus
-- décrire personne. Nul sur la première étape, qui n'a pas de
-- précédente.
DROP FUNCTION IF EXISTS funnel_results(UUID, TIMESTAMPTZ, JSONB, TIMESTAMPTZ);

CREATE FUNCTION funnel_results(
  p_site  UUID,
  p_since TIMESTAMPTZ,
  p_steps JSONB,
  p_until TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (step_index INT, visitors BIGINT, median_seconds NUMERIC)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  n       INT := jsonb_array_length(p_steps);
  i       INT;
  ctes    TEXT := funnel_chain(p_site, p_since, p_steps, p_until);
  selects TEXT := '';
BEGIN
  IF ctes IS NULL THEN
    RETURN;
  END IF;

  FOR i IN 0..n - 1 LOOP
    IF i > 0 THEN
      selects := selects || ' UNION ALL ';
    END IF;

    IF i = 0 THEN
      selects := selects || 'SELECT 0::INT, count(*)::BIGINT, NULL::NUMERIC FROM s0';
    ELSE
      selects := selects || format(
        'SELECT %s::INT, count(*)::BIGINT, '
        || 'percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (c.t - p.t)))::NUMERIC '
        || 'FROM s%s c JOIN s%s p ON p.visitor_id = c.visitor_id',
        i, i, i - 1
      );
    END IF;
  END LOOP;

  RETURN QUERY EXECUTE 'WITH ' || ctes || ' ' || selects || ' ORDER BY 1';
END;
$$;

REVOKE EXECUTE ON FUNCTION funnel_results(UUID, TIMESTAMPTZ, JSONB, TIMESTAMPTZ) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION funnel_results(UUID, TIMESTAMPTZ, JSONB, TIMESTAMPTZ) TO authenticated;

-- ── Le même funnel, canal par canal ──────────────────────────────
--
-- Entrés et arrivés au bout, par source d'entrée. Assez pour répondre
-- à la seule question qui compte ici : quel canal amène des gens qui
-- vont jusqu'au bout, et lequel amène du passage.
CREATE OR REPLACE FUNCTION funnel_by_source(
  p_site  UUID,
  p_since TIMESTAMPTZ,
  p_steps JSONB,
  p_until TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (source TEXT, entered BIGINT, completed BIGINT)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  n    INT  := jsonb_array_length(p_steps);
  ctes TEXT := funnel_chain(p_site, p_since, p_steps, p_until);
BEGIN
  IF ctes IS NULL THEN
    RETURN;
  END IF;

  -- LEFT JOIN, pour qu'une source qui n'a converti personne apparaisse
  -- à zéro plutôt que de disparaître : c'est précisément celle qu'on
  -- veut voir.
  RETURN QUERY EXECUTE format(
    'WITH %s SELECT s0.src::TEXT, count(*)::BIGINT, '
    || 'count(f.visitor_id)::BIGINT FROM s0 LEFT JOIN s%s f ON f.visitor_id = s0.visitor_id '
    || 'GROUP BY 1 ORDER BY 2 DESC, 1',
    ctes, n - 1
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION funnel_by_source(UUID, TIMESTAMPTZ, JSONB, TIMESTAMPTZ) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION funnel_by_source(UUID, TIMESTAMPTZ, JSONB, TIMESTAMPTZ) TO authenticated;

-- ── Ce que vaut un visiteur arrivé au bout ───────────────────────
--
-- Le chaînon qui manquait pour chiffrer un abandon. Le revenu est relié
-- à une session par le rapprochement Stripe (revenue_events.session_id,
-- posé par le sync), et une session appartient à un visiteur : on
-- remonte donc du paiement à la personne.
--
-- Rendu brut, sans division : la route calcule la valeur moyenne et la
-- multiplie par les perdus de chaque étape. L'écran doit pouvoir
-- montrer sur quoi repose l'estimation — combien de gens, combien
-- d'euros — plutôt qu'un montant tombé du ciel.
--
-- Les visiteurs arrivés au bout sans rien payer comptent au
-- dénominateur : la valeur moyenne d'une conversion inclut ceux qui ne
-- rapportent rien, sans quoi elle décrirait les acheteurs et non les
-- convertis, et surestimerait chaque abandon.
CREATE OR REPLACE FUNCTION funnel_value(
  p_site  UUID,
  p_since TIMESTAMPTZ,
  p_steps JSONB,
  p_until TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (completed BIGINT, revenue_cents BIGINT, payers BIGINT, currency TEXT)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  n    INT  := jsonb_array_length(p_steps);
  ctes TEXT := funnel_chain(p_site, p_since, p_steps, p_until);
  ub   TEXT := format('%L::timestamptz', COALESCE(p_until, now()));
BEGIN
  IF ctes IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY EXECUTE format(
    'WITH %s, '
    -- Les sessions des seuls visiteurs arrivés au bout.
    || 'sess AS (SELECT DISTINCT e.session_id, e.visitor_id FROM events e '
    || '  JOIN s%s f ON f.visitor_id = e.visitor_id '
    || '  WHERE e.site_id = %L AND e.session_id IS NOT NULL), '
    || 'paid AS (SELECT s.visitor_id, r.amount, r.currency FROM revenue_events r '
    || '  JOIN sess s ON s.session_id = r.session_id '
    || '  WHERE r.site_id = %L AND r.stripe_created_at >= %L AND r.stripe_created_at <= %s) '
    || 'SELECT (SELECT count(*) FROM s%s)::BIGINT, '
    || '       COALESCE((SELECT sum(amount) FROM paid), 0)::BIGINT, '
    || '       (SELECT count(DISTINCT visitor_id) FROM paid)::BIGINT, '
    || '       COALESCE((SELECT currency FROM paid LIMIT 1), %L)::TEXT',
    ctes, n - 1, p_site, p_site, p_since, ub, n - 1, 'eur'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION funnel_value(UUID, TIMESTAMPTZ, JSONB, TIMESTAMPTZ) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION funnel_value(UUID, TIMESTAMPTZ, JSONB, TIMESTAMPTZ) TO authenticated;

-- funnel_chain ne lit aucune table : elle assemble une chaîne de
-- caractères. Elle reste néanmoins hors de portée d'anon, n'ayant
-- aucune raison d'être appelée sans session.
REVOKE EXECUTE ON FUNCTION funnel_chain(UUID, TIMESTAMPTZ, JSONB, TIMESTAMPTZ) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION funnel_chain(UUID, TIMESTAMPTZ, JSONB, TIMESTAMPTZ) TO authenticated;

-- ── Contrôles ────────────────────────────────────────────────────
-- Une seule signature par nom, et pas d'anon dans les droits :
--   select proname, pg_get_function_identity_arguments(oid), proacl
--     from pg_proc where proname like 'funnel_%';
--
-- La somme des `entered` de funnel_by_source doit égaler le `visitors`
-- de la première étape de funnel_results, sur les mêmes paramètres.

-- ── Tant qu'on y est ─────────────────────────────────────────────
--
-- funnel_dropoff_sessions, qui alimente le filtre « montre-moi les
-- sessions qui ont décroché à cette étape » du Session Replay,
-- traînait le même droit hérité : PUBLIC et anon dans proacl. Elle est
-- SECURITY INVOKER comme les autres, donc la RLS refusait déjà anon —
-- mais un droit d'appel sans session n'a pas de raison d'exister.
REVOKE EXECUTE ON FUNCTION funnel_dropoff_sessions(UUID, TIMESTAMPTZ, INT) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION funnel_dropoff_sessions(UUID, TIMESTAMPTZ, INT) TO authenticated;
