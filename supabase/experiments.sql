-- ════════════════════════════════════════════════════════════════
-- Experiments — laquelle des deux versions gagne, et est-ce du bruit.
--
-- Les flags décidaient *qui voit quoi*. Ici on ajoute la seule chose
-- qui manquait : savoir laquelle des versions convertit mieux, et si
-- l'écart veut dire quelque chose.
--
-- ── Pourquoi il n'y a pas de table d'expositions ─────────────────
--
-- La première idée était d'enregistrer qui a vu quelle version, dans
-- sa propre table. C'était une écriture sur le chemin le plus chaud du
-- produit — celui appelé à chaque chargement de page chez chaque
-- client — pour une donnée qui ressemble trait pour trait à un
-- événement.
--
-- L'exposition est donc un événement comme un autre, nommé
-- « $exposure », avec l'expérience et la version dans ses propriétés.
-- Elle hérite d'un coup de tout ce qui existe déjà : l'ingestion, le
-- quota du plan, la purge de rétention, et l'effacement d'une personne
-- au titre de l'article 17. Une table à part aurait fallu recâbler les
-- quatre, et la quatrième aurait été oubliée.
--
-- ── Ce que le sujet de mesure peut être ──────────────────────────
--
-- L'affectation vient du même hachage que les flags, donc du même
-- identifiant : celui du client s'il le passe, sinon le visitor_id
-- valable la journée. La mesure regroupe par visitor_id, qui est sur
-- chaque événement.
--
-- La conséquence est honnête et l'écran la dit : sans identifiant
-- stable, une expérience mesure des journées, pas des personnes. C'est
-- suffisant pour un test dont la conversion suit l'exposition de
-- quelques minutes — un bouton, un titre, un formulaire — et ça ne
-- l'est pas pour un test dont l'effet met des jours à se voir.
--
-- Nécessite supabase/feature-flags.sql (même famille, même écran).
-- À lancer dans l'éditeur SQL Supabase.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS experiments (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id      UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  -- Ce que le client écrit dans son code : pulsetrack.variant('...').
  key          TEXT NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  -- [{"key":"control","weight":50},{"key":"b","weight":50}]
  -- La première est la référence : c'est à elle que les autres sont
  -- comparées, et c'est elle qui répond quand l'expérience est arrêtée.
  variants     JSONB NOT NULL,
  -- Le nom de l'événement qui compte comme conversion.
  metric_event TEXT NOT NULL,
  -- 'draft' | 'running' | 'stopped'
  status       TEXT NOT NULL DEFAULT 'draft',
  started_at   TIMESTAMPTZ,
  stopped_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (site_id, key)
);

CREATE INDEX IF NOT EXISTS idx_experiments_site
  ON experiments (site_id, status);

ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their experiments" ON experiments;
CREATE POLICY "Users manage their experiments"
  ON experiments FOR ALL
  USING (site_id IN (SELECT id FROM sites WHERE has_account_access(sites.user_id)))
  WITH CHECK (site_id IN (SELECT id FROM sites WHERE has_account_access(sites.user_id)));

-- ── Le résultat ──────────────────────────────────────────────────
--
-- Par version : combien de personnes exposées, combien ont converti.
--
-- Une conversion ne compte que si elle suit l'exposition. Sans cette
-- condition, quelqu'un qui a acheté le matin puis vu la nouvelle
-- version l'après-midi compterait comme converti par elle, et
-- l'expérience se féliciterait d'un achat qu'elle n'a pas provoqué.
CREATE OR REPLACE FUNCTION experiment_results(
  p_site   UUID,
  p_key    TEXT,
  p_metric TEXT,
  p_since  TIMESTAMPTZ
)
RETURNS TABLE (
  variant     TEXT,
  subjects    BIGINT,
  conversions BIGINT
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH exposure AS (
    -- La première exposition de chaque personne à chaque version. Une
    -- même personne peut recharger la page dix fois ; elle n'a été
    -- exposée qu'une.
    SELECT DISTINCT ON (e.visitor_id)
      e.visitor_id,
      e.event_props ->> 'variant' AS variant,
      e.created_at AS seen_at
    FROM events e
    WHERE e.site_id = p_site
      AND e.type = 'event'
      AND e.event_name = '$exposure'
      AND e.event_props ->> 'experiment' = p_key
      AND e.visitor_id IS NOT NULL
      AND e.created_at >= p_since
    ORDER BY e.visitor_id, e.created_at
  ),
  converted AS (
    SELECT DISTINCT x.visitor_id, x.variant
    FROM exposure x
    JOIN events c
      ON c.site_id = p_site
     AND c.visitor_id = x.visitor_id
     AND c.type = 'event'
     AND c.event_name = p_metric
     AND c.created_at > x.seen_at
  )
  SELECT
    x.variant,
    count(*)::BIGINT,
    count(c.visitor_id)::BIGINT
  FROM exposure x
  LEFT JOIN converted c
    ON c.visitor_id = x.visitor_id AND c.variant = x.variant
  WHERE x.variant IS NOT NULL
  GROUP BY x.variant
  ORDER BY x.variant;
$$;

-- Sert la recherche d'expositions : une expérience ne lit que ses
-- propres événements, sur une période.
CREATE INDEX IF NOT EXISTS idx_events_exposure
  ON events (site_id, event_name, created_at DESC)
  WHERE type = 'event';

-- CREATE FUNCTION accorde EXECUTE à PUBLIC par défaut, et anon en fait
-- partie. Voir supabase/revoke-public-execute.sql.
REVOKE EXECUTE ON FUNCTION experiment_results(UUID, TEXT, TEXT, TIMESTAMPTZ) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION experiment_results(UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;

-- ── Contrôle ─────────────────────────────────────────────────────
-- La somme des `subjects` doit égaler le nombre de personnes distinctes
-- ayant reçu un $exposure pour cette expérience : chacune appartient à
-- une version et une seule.
