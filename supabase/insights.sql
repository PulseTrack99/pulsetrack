-- ════════════════════════════════════════════════════════════════
-- Insights — une question qu'on n'avait pas prévue.
--
-- Tous les autres écrans répondent à une question fixée d'avance :
-- l'accueil montre le trafic, les funnels montrent un parcours défini.
-- Aucun ne répond à « combien de visiteurs venus de LinkedIn ont
-- déclenché checkout_completed, par semaine, ventilés par plan ».
-- Cette fonction est la seule du projet dont la question vient de
-- l'utilisateur et non du développeur.
--
-- Une seule fonction plutôt qu'une par combinaison : mesure,
-- ventilation, filtres et granularité sont des paramètres, validés ici
-- par des CASE fermés. Rien de ce que l'appelant envoie n'est concaténé
-- dans du SQL — un nom de champ inconnu ne renvoie pas une erreur
-- exploitable, il renvoie NULL et ne correspond à rien.
--
-- SECURITY INVOKER (le défaut) : la fonction ne voit que ce que la RLS
-- de l'appelant laisse voir sur events. Aucun contrôle de propriété
-- n'est nécessaire ici, et aucun ne serait suffisant ailleurs.
--
-- À lancer dans l'éditeur SQL Supabase.
-- ════════════════════════════════════════════════════════════════

-- Les champs sur lesquels on peut ventiler ou filtrer. Un seul endroit,
-- pour que la ventilation et le filtre ne puissent pas diverger.
--
-- Le préfixe « prop: » désigne une clé de event_props : 'prop:plan'
-- lit event_props->>'plan'. C'est ce qui rend l'écran utile aux
-- événements personnalisés, dont on ne connaît pas les clés à l'avance.
CREATE OR REPLACE FUNCTION insights_dimension(e events, p_field TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_field LIKE 'prop:%' THEN e.event_props ->> substr(p_field, 6)
    WHEN p_field = 'path'          THEN e.path
    WHEN p_field = 'source'        THEN COALESCE(NULLIF(e.source, ''), 'Direct')
    WHEN p_field = 'country'       THEN COALESCE(NULLIF(e.country, ''), 'Unknown')
    WHEN p_field = 'device'        THEN e.device
    WHEN p_field = 'browser'       THEN e.browser
    WHEN p_field = 'language'      THEN e.language
    WHEN p_field = 'utm_medium'    THEN e.utm_medium
    WHEN p_field = 'utm_campaign'  THEN e.utm_campaign
    WHEN p_field = 'event_name'    THEN e.event_name
    WHEN p_field = 'referrer'      THEN e.referrer
    ELSE NULL
  END;
$$;

GRANT EXECUTE ON FUNCTION insights_dimension(events, TEXT) TO authenticated;


CREATE OR REPLACE FUNCTION insights_query(
  p_site       UUID,
  p_since      TIMESTAMPTZ,
  p_until      TIMESTAMPTZ DEFAULT NULL,
  -- 'pageviews' | 'sessions' | 'visitors' | 'events' | 'event_visitors'
  p_measure    TEXT DEFAULT 'pageviews',
  -- Restreint aux événements portant ce nom. NULL = tous.
  p_event_name TEXT DEFAULT NULL,
  -- Champ de ventilation, ou NULL pour une seule série.
  p_breakdown  TEXT DEFAULT NULL,
  -- 'day' | 'week' | 'month', ou NULL pour un classement sans temps.
  p_grain      TEXT DEFAULT 'day',
  -- [{"field":"source","value":"Google"}, …] — toutes doivent matcher.
  p_filters    JSONB DEFAULT NULL,
  -- Nombre de groupes rendus, les plus gros d'abord.
  p_limit      INT DEFAULT 12
)
RETURNS TABLE (bucket TIMESTAMPTZ, group_key TEXT, value BIGINT)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH bounds AS (
    SELECT p_since AS lo, COALESCE(p_until, now()) AS hi
  ),
  base AS (
    SELECT
      -- date_trunc n'accepte pas NULL : sans granularité, tout tombe
      -- dans un seul seau et le résultat est un classement.
      CASE
        WHEN p_grain IN ('day', 'week', 'month')
          THEN date_trunc(p_grain, e.created_at)
        ELSE (SELECT lo FROM bounds)
      END AS bucket,
      COALESCE(insights_dimension(e, p_breakdown), 'Autre') AS group_key,
      e.visitor_id,
      e.session_id
    FROM events e, bounds
    WHERE e.site_id = p_site
      AND e.created_at >= bounds.lo
      AND e.created_at <  bounds.hi
      AND CASE p_measure
            WHEN 'pageviews'      THEN e.type = 'pageview'
            WHEN 'sessions'       THEN e.type = 'pageview'
            WHEN 'visitors'       THEN e.type = 'pageview'
            WHEN 'events'         THEN e.type = 'event'
            WHEN 'event_visitors' THEN e.type = 'event'
            ELSE false
          END
      AND (p_event_name IS NULL OR e.event_name = p_event_name)
      -- Chaque filtre doit correspondre : on cherche donc l'absence
      -- d'un filtre qui ne correspond pas.
      AND (
        p_filters IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(p_filters) AS f
          WHERE insights_dimension(e, f ->> 'field') IS DISTINCT FROM (f ->> 'value')
        )
      )
  ),
  grouped AS (
    SELECT
      b.bucket,
      b.group_key,
      CASE p_measure
        WHEN 'visitors'       THEN count(DISTINCT b.visitor_id)
        WHEN 'event_visitors' THEN count(DISTINCT b.visitor_id)
        WHEN 'sessions'       THEN count(DISTINCT b.session_id)
        ELSE count(*)
      END::BIGINT AS value
    FROM base b
    GROUP BY b.bucket, b.group_key
  ),
  -- Les plus gros groupes sur l'ensemble de la période, pas sur le
  -- dernier seau : sinon la légende changerait à chaque jour ajouté.
  top_groups AS (
    SELECT g.group_key
    FROM grouped g
    GROUP BY g.group_key
    ORDER BY sum(g.value) DESC
    LIMIT GREATEST(p_limit, 1)
  )
  SELECT g.bucket, g.group_key, g.value
  FROM grouped g
  WHERE p_breakdown IS NULL
     OR g.group_key IN (SELECT group_key FROM top_groups)
  ORDER BY g.bucket, g.value DESC;
$$;

GRANT EXECUTE ON FUNCTION insights_query(
  UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, JSONB, INT
) TO authenticated;


-- ── Les valeurs disponibles pour un champ ──────────────────────
-- Alimente les listes déroulantes de filtre : proposer « Google » plutôt
-- que de laisser taper un nom de source au hasard.
CREATE OR REPLACE FUNCTION insights_values(
  p_site UUID, p_since TIMESTAMPTZ, p_field TEXT, p_limit INT DEFAULT 50
)
RETURNS TABLE (value TEXT, hits BIGINT)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT insights_dimension(e, p_field) AS value, count(*)::BIGINT
  FROM events e
  WHERE e.site_id = p_site
    AND e.created_at >= p_since
    AND insights_dimension(e, p_field) IS NOT NULL
  GROUP BY 1
  ORDER BY 2 DESC
  LIMIT GREATEST(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION insights_values(UUID, TIMESTAMPTZ, TEXT, INT) TO authenticated;


-- ── Les clés de propriétés réellement envoyées ─────────────────
-- Pour que la ventilation puisse proposer « prop:plan » sans que
-- personne ait à deviner que cette clé existe.
CREATE OR REPLACE FUNCTION insights_property_keys(
  p_site UUID, p_since TIMESTAMPTZ, p_limit INT DEFAULT 40
)
RETURNS TABLE (key TEXT, hits BIGINT)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT k, count(*)::BIGINT
  FROM events e
  CROSS JOIN LATERAL jsonb_object_keys(COALESCE(e.event_props, '{}'::jsonb)) AS k
  WHERE e.site_id = p_site
    AND e.type = 'event'
    AND e.created_at >= p_since
  GROUP BY k
  ORDER BY 2 DESC
  LIMIT GREATEST(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION insights_property_keys(UUID, TIMESTAMPTZ, INT) TO authenticated;
