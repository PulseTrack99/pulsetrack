-- ════════════════════════════════════════════════════════════════
-- La heatmap, en une question au lieu de quinze.
--
-- Trois choses d'un coup, parce qu'elles ont la même cause :
--
--  1. « Segmentation par appareil, source ou pays », vendue par le site
--     vitrine, dont seul `device` existait. La source et le pays vivent
--     sur events, pas sur interactions — impossible à filtrer en
--     PostgREST paginé sans transporter une liste de sessions.
--
--  2. La route la plus lente du produit (608 ms sur un site quasi vide,
--     la seule au-dessus de 400 ms) : balayage des pages, trois
--     comptages par appareil, deux totaux, trois échantillons paginés,
--     dont plusieurs séquentiels.
--
--  3. Des chiffres échantillonnés présentés à côté de totaux exacts.
--     Le classement des éléments, la profondeur de scroll et les clics
--     morts venaient d'un échantillon de 5 000 lignes puis étaient mis
--     à l'échelle ; les clics et les clics de rage, eux, étaient exacts.
--     La même carte mélangeait donc deux natures de nombre.
--
-- Agréger en base résout les trois : la source et le pays deviennent
-- joignables, il n'y a plus qu'un aller-retour, et plus rien n'est
-- estimé — seul le nuage de points reste plafonné, parce que c'est une
-- limite d'affichage et non de calcul.
--
-- ── Comment source et pays sont retrouvés ────────────────────────
--
-- Une interaction connaît sa session, et une session a une source et un
-- pays, portés par ses événements. On reconstruit donc une table
-- session → (source, pays) en prenant le premier événement de chaque
-- session : c'est le canal par lequel la personne est arrivée, pas le
-- dernier qu'elle ait touché. Les clics d'une session sans événement
-- correspondant gardent des filtres nuls et ne ressortent que sans
-- filtre — ils existent, on ne sait simplement pas d'où ils viennent.
--
-- SECURITY INVOKER, comme le reste : la fonction lit interactions et
-- events sous la RLS de l'appelant, donc l'accès au site est déjà
-- tranché par les politiques et n'a pas à être revérifié ici.
--
-- À lancer dans l'éditeur SQL Supabase.
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION heatmap_stats(
  p_site    UUID,
  p_path    TEXT,
  p_since   TIMESTAMPTZ,
  -- NULL = pas de filtre. 'all' est traduit en NULL par la route.
  p_device  TEXT DEFAULT NULL,
  p_source  TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  -- Plafond du nuage : au-delà, les points se recouvrent sans rien
  -- ajouter, et la charge utile grossit pour rien.
  p_points  INT DEFAULT 4000
)
RETURNS JSONB
LANGUAGE sql
STABLE
SET search_path = public
AS $$
WITH
-- Source et pays de chaque session, pris sur son premier événement.
sess AS (
  SELECT DISTINCT ON (e.session_id)
    e.session_id,
    COALESCE(NULLIF(e.source, ''), 'Direct')   AS source,
    COALESCE(NULLIF(e.country, ''), 'Unknown') AS country
  FROM events e
  WHERE e.site_id = p_site
    AND e.created_at >= p_since
    AND e.session_id IS NOT NULL
  ORDER BY e.session_id, e.created_at
),
-- Toutes les interactions de la période, enrichies.
enriched AS (
  SELECT i.*, s.source, s.country
  FROM interactions i
  LEFT JOIN sess s ON s.session_id = i.session_id
  WHERE i.site_id = p_site
    AND i.created_at >= p_since
),
-- Les pages qui ont de la donnée, pour le sélecteur. Indépendant du
-- chemin demandé : c'est la liste dans laquelle on choisit.
pages AS (
  SELECT path, count(*) AS n
  FROM enriched
  GROUP BY 1
  ORDER BY 2 DESC
  LIMIT 50
),
-- Sans chemin demandé, la page la plus active. La route peut donc
-- afficher quelque chose au premier chargement sans un aller-retour
-- rien que pour savoir quelle page proposer.
target AS (
  SELECT COALESCE(NULLIF(p_path, ''), (SELECT path FROM pages LIMIT 1), '/') AS path
),
-- Sur la page retenue, avant tout filtre : de quoi peupler les menus
-- et décider de l'appareil.
page_rows AS (
  SELECT e.* FROM enriched e, target WHERE e.path = target.path
),
dev AS (
  SELECT device, count(*) AS n
  FROM page_rows
  WHERE type = 'click' AND device IS NOT NULL
  GROUP BY 1
),
-- Un ratio x veut dire un autre endroit sur un écran de 390 px et sur
-- un de 1440 : empiler les deux produit un nuage qui ne correspond à
-- aucune mise en page réelle. On retient donc l'appareil demandé s'il
-- a des données, sinon le mieux pourvu.
resolved AS (
  SELECT COALESCE(
    (SELECT d.device FROM dev d WHERE d.device = p_device),
    (SELECT d.device FROM dev d ORDER BY d.n DESC LIMIT 1),
    'Desktop'
  ) AS device
),
scoped AS (
  SELECT r.*
  FROM page_rows r, resolved
  WHERE r.device = resolved.device
    AND (p_source  IS NULL OR r.source  = p_source)
    AND (p_country IS NULL OR r.country = p_country)
),
clicks AS (
  SELECT * FROM scoped
  WHERE type = 'click' AND x_ratio IS NOT NULL AND y_px IS NOT NULL AND doc_h > 0
),
rage AS (
  SELECT * FROM scoped
  WHERE type = 'rage' AND x_ratio IS NOT NULL AND y_px IS NOT NULL AND doc_h > 0
),
depths AS (
  SELECT scroll_pct FROM scoped WHERE type = 'scroll' AND scroll_pct > 0
),
totals AS (
  SELECT
    (SELECT count(*) FROM scoped WHERE type = 'click')::BIGINT AS clicks,
    (SELECT count(*) FROM scoped WHERE type = 'rage')::BIGINT  AS rage_clicks,
    (SELECT count(DISTINCT session_id) FROM scoped
      WHERE type IN ('click', 'scroll') AND session_id IS NOT NULL)::BIGINT AS sessions,
    -- Exact, et non plus une part d'échantillon remise à l'échelle.
    (SELECT count(*) FROM scoped
      WHERE type = 'click' AND COALESCE(interactive, false) = false)::BIGINT AS dead_clicks,
    (SELECT round(avg(scroll_pct)) FROM depths)::INT AS avg_scroll
)
SELECT jsonb_build_object(
  'path',    (SELECT path FROM target),
  'device',  (SELECT device FROM resolved),
  'devices', COALESCE((SELECT jsonb_agg(jsonb_build_object('device', device, 'count', n)
                       ORDER BY n DESC) FROM dev WHERE n > 0), '[]'::jsonb),
  -- Les valeurs réellement présentes, pour ne proposer que des filtres
  -- qui donnent quelque chose.
  'sources',   COALESCE((SELECT jsonb_agg(DISTINCT source)  FROM page_rows WHERE source  IS NOT NULL), '[]'::jsonb),
  'countries', COALESCE((SELECT jsonb_agg(DISTINCT country) FROM page_rows WHERE country IS NOT NULL), '[]'::jsonb),
  'pages',   COALESCE((SELECT jsonb_agg(jsonb_build_object('path', path, 'count', n)
                       ORDER BY n DESC) FROM pages), '[]'::jsonb),
  'summary', (SELECT jsonb_build_object(
                'clicks', clicks, 'rage_clicks', rage_clicks, 'sessions', sessions,
                'dead_clicks', dead_clicks, 'avg_scroll', COALESCE(avg_scroll, 0)
              ) FROM totals),
  'geometry', jsonb_build_object(
      'viewport_w', COALESCE((SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY viewport_w)
                              FROM clicks WHERE viewport_w > 0), 0)::INT,
      'doc_h',      COALESCE((SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY doc_h)
                              FROM clicks WHERE doc_h > 0), 0)::INT),
  'points', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                        'x', round(x_ratio::numeric, 4),
                        'y', round(least(1, y_px::numeric / doc_h), 4)))
                      FROM (SELECT * FROM clicks ORDER BY created_at DESC LIMIT p_points) c), '[]'::jsonb),
  'rage_points', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                        'x', round(x_ratio::numeric, 4),
                        'y', round(least(1, y_px::numeric / doc_h), 4)))
                      FROM (SELECT * FROM rage ORDER BY created_at DESC LIMIT p_points) r), '[]'::jsonb),
  'elements', COALESCE((SELECT jsonb_agg(e ORDER BY (e->>'clicks')::BIGINT DESC) FROM (
                  SELECT jsonb_build_object(
                    'selector', selector,
                    'text', COALESCE(max(elem_text), ''),
                    'clicks', count(*),
                    'interactive', bool_or(COALESCE(interactive, false)),
                    'share', round(100.0 * count(*)
                             / NULLIF((SELECT clicks FROM totals), 0), 1)
                  ) AS e
                  FROM scoped
                  WHERE type = 'click' AND selector IS NOT NULL
                  GROUP BY selector
                  ORDER BY count(*) DESC
                  LIMIT 15) x), '[]'::jsonb),
  'rage_spots', COALESCE((SELECT jsonb_agg(e ORDER BY (e->>'count')::BIGINT DESC) FROM (
                  SELECT jsonb_build_object(
                    'selector', selector,
                    'text', COALESCE(max(elem_text), ''),
                    'count', count(*)
                  ) AS e
                  FROM scoped
                  WHERE type = 'rage' AND selector IS NOT NULL
                  GROUP BY selector
                  ORDER BY count(*) DESC
                  LIMIT 8) y), '[]'::jsonb),
  -- Chaque palier est la part des lectures allées au moins jusque-là,
  -- donc la courbe ne peut que descendre.
  'scroll_bands', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                      'depth', d * 10,
                      'reached', (SELECT count(*) FROM depths WHERE scroll_pct >= d * 10),
                      'pct', COALESCE(round(100.0 * (SELECT count(*) FROM depths WHERE scroll_pct >= d * 10)
                             / NULLIF((SELECT count(*) FROM depths), 0)), 0)::INT
                    ) ORDER BY d) FROM generate_series(1, 10) d), '[]'::jsonb),
  -- Plus rien n'est estimé : seul le nuage est plafonné, et il le dit.
  'points_capped', (SELECT count(*) FROM clicks) > p_points,
  'points_shown',  LEAST((SELECT count(*) FROM clicks), p_points)
);
$$;

REVOKE EXECUTE ON FUNCTION heatmap_stats(UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, INT) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION heatmap_stats(UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, INT) TO authenticated;

-- Sert la reconstruction session → source/pays, qui balaie les
-- événements du site sur la période.
CREATE INDEX IF NOT EXISTS idx_events_session_first
  ON events (site_id, session_id, created_at);

-- ── Contrôles ────────────────────────────────────────────────────
-- summary.clicks doit égaler la somme des `clicks` de `elements` quand
-- la page a moins de quinze sélecteurs distincts, et la première bande
-- de scroll doit être la plus haute des dix.
