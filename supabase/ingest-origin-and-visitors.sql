-- ════════════════════════════════════════════════════════════════
-- 1. Événements refusés pour origine étrangère
-- ════════════════════════════════════════════════════════════════
--
-- Les routes d'ingestion (/api/track, /api/heatmap, /api/heatmap/
-- snapshot, /api/replay/ingest) refusent désormais un envoi dont
-- l'origine n'est pas le domaine déclaré du site : sans ça, quiconque
-- lit l'identifiant d'un site dans son code peut y injecter de faux
-- chiffres et consommer son quota.
--
-- Un refus ne doit pas être silencieux. Si le domaine d'un client est
-- mal saisi, ses vrais événements seraient perdus sans que rien ne le
-- dise ; on compte donc les refus par origine et par jour, et l'écran
-- des sites les affiche.
--
-- Bornée : vingt origines distinctes au plus par site et par jour (un
-- script qui invente des en-têtes Origin ne remplit pas la table), et
-- purgée après trente jours par le cron purge-retention.

CREATE TABLE IF NOT EXISTS ingest_rejections (
  site_id   UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  origin    TEXT NOT NULL,
  day       DATE NOT NULL DEFAULT current_date,
  hits      INTEGER NOT NULL DEFAULT 1,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (site_id, origin, day)
);

ALTER TABLE ingest_rejections ENABLE ROW LEVEL SECURITY;

-- Lecture pour qui a accès au site (propriétaire ou équipier) ; aucune
-- écriture autrement que par la fonction ci-dessous, en service role.
DROP POLICY IF EXISTS ingest_rejections_read ON ingest_rejections;
CREATE POLICY ingest_rejections_read ON ingest_rejections
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM sites s WHERE s.id = ingest_rejections.site_id AND has_account_access(s.user_id)));

REVOKE ALL ON ingest_rejections FROM anon;
REVOKE INSERT, UPDATE, DELETE ON ingest_rejections FROM authenticated;
GRANT SELECT ON ingest_rejections TO authenticated;

CREATE OR REPLACE FUNCTION record_ingest_rejection(p_site UUID, p_origin TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  o TEXT := left(coalesce(p_origin, ''), 253);
BEGIN
  UPDATE ingest_rejections
     SET hits = hits + 1, last_seen = now()
   WHERE site_id = p_site AND origin = o AND day = current_date;
  IF FOUND THEN
    RETURN;
  END IF;

  IF (SELECT count(*) FROM ingest_rejections WHERE site_id = p_site AND day = current_date) >= 20 THEN
    RETURN;
  END IF;

  INSERT INTO ingest_rejections (site_id, origin)
  VALUES (p_site, o)
  ON CONFLICT (site_id, origin, day)
  DO UPDATE SET hits = ingest_rejections.hits + 1, last_seen = now();
END;
$$;

REVOKE ALL ON FUNCTION record_ingest_rejection(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_ingest_rejection(UUID, TEXT) TO service_role;

-- ════════════════════════════════════════════════════════════════
-- 2. L'écran Visiteurs, agrégé en base
-- ════════════════════════════════════════════════════════════════
--
-- /api/visitors lisait jusqu'à 3 000 événements et les regroupait en
-- JavaScript : plus le site était actif, plus la route était lente, et
-- au-delà du plafond l'écran ne montrait qu'une tranche. Ici Postgres
-- regroupe tout, et ne renvoie que les visiteurs affichés.
--
-- SECURITY INVOKER : la RLS de events s'applique à l'appelant, comme
-- pour la lecture directe que cette fonction remplace.
--
-- Mêmes règles que l'ancien regroupement : appareil, navigateur et pays
-- du dernier événement ; source du premier événement qui en a une.

CREATE OR REPLACE FUNCTION site_visitors(p_site UUID, p_since TIMESTAMPTZ, p_limit INTEGER DEFAULT 200)
RETURNS TABLE (
  visitor_id     TEXT,
  sessions       BIGINT,
  pageviews      BIGINT,
  events         BIGINT,
  pages          BIGINT,
  first_at       TIMESTAMPTZ,
  last_at        TIMESTAMPTZ,
  device         TEXT,
  browser        TEXT,
  country        TEXT,
  source         TEXT,
  session_ids    TEXT[],
  total_visitors BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH g AS (
    SELECT
      e.visitor_id,
      count(DISTINCT e.session_id)                                    AS sessions,
      count(*) FILTER (WHERE e.type = 'pageview')                     AS pageviews,
      count(*) FILTER (WHERE e.type = 'event')                        AS events,
      count(DISTINCT e.path)                                          AS pages,
      min(e.created_at)                                               AS first_at,
      max(e.created_at)                                               AS last_at,
      (array_agg(e.device  ORDER BY e.created_at DESC))[1]            AS device,
      (array_agg(e.browser ORDER BY e.created_at DESC))[1]            AS browser,
      (array_agg(e.country ORDER BY e.created_at DESC))[1]            AS country,
      (array_agg(e.source  ORDER BY e.created_at ASC)
         FILTER (WHERE e.source IS NOT NULL))[1]                      AS source,
      array_agg(DISTINCT e.session_id) FILTER (WHERE e.session_id IS NOT NULL) AS session_ids
    FROM events e
    WHERE e.site_id = p_site
      AND e.created_at >= p_since
      AND e.visitor_id IS NOT NULL
    GROUP BY e.visitor_id
  )
  SELECT g.*, count(*) OVER () AS total_visitors
  FROM g
  ORDER BY g.last_at DESC
  LIMIT least(greatest(coalesce(p_limit, 200), 1), 500);
$$;

REVOKE ALL ON FUNCTION site_visitors(UUID, TIMESTAMPTZ, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION site_visitors(UUID, TIMESTAMPTZ, INTEGER) TO authenticated, service_role;
