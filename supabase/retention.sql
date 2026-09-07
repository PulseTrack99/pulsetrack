-- ════════════════════════════════════════════════════════════════
-- Rétention — les gens reviennent-ils ?
--
-- La seule question du produit qui exige de suivre quelqu'un à travers
-- les jours, et c'est aussi la seule chose que notre identifiant de
-- visiteur refuse de faire : il vient d'un sel détruit chaque nuit.
-- La rétention ne porte donc que sur les personnes que le client nous a
-- nommées avec pulsetrack.identify(email), et l'écran le dit.
--
-- Ce n'est pas une limite qu'on subit, c'est le même modèle que les
-- outils qui affichent des profils : leur identité vient aussi de
-- l'application de leur client.
--
-- Deux décisions qui changent le chiffre :
--
--   L'activité est mesurée sur les *événements* des sessions liées à
--   un e-mail, pas sur les lignes d'identification. Compter ces
--   dernières mesurerait la fréquence des appels à identify(), pas le
--   retour des gens.
--
--   La cohorte de quelqu'un est sa première période *active*, pas la
--   date de son inscription. Une personne inscrite en janvier et
--   revenue en mars appartient à mars pour cette lecture : on regarde
--   des habitudes de retour, pas des anniversaires.
--
-- Nécessite supabase/revenue.sql (session_identities).
-- À lancer dans l'éditeur SQL Supabase.
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION retention_cohorts(
  p_site  UUID,
  p_since TIMESTAMPTZ,
  -- 'day' | 'week' | 'month'
  p_grain TEXT DEFAULT 'week'
)
RETURNS TABLE (
  cohort       DATE,
  period_index INT,
  people       BIGINT
)
LANGUAGE sql
STABLE
-- SECURITY DEFINER, contrairement aux autres fonctions de ce projet :
-- session_identities a la RLS active et aucune politique, donc personne
-- ne peut la lire en session. Une fonction INVOKER ne renverrait rien à
-- ceux à qui elle est justement accordée.
--
-- Le droit d'accès est donc vérifié ici, explicitement, par la même
-- règle que partout ailleurs (has_account_access, supabase/team.sql).
-- Un appelant sans accès au site obtient zéro ligne, pas une erreur qui
-- lui apprendrait que le site existe.
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH allowed AS (
    SELECT 1
    FROM sites s
    WHERE s.id = p_site AND has_account_access(s.user_id)
  ),
  ident AS (
    SELECT DISTINCT email, session_id
    FROM session_identities
    WHERE site_id = p_site
      AND EXISTS (SELECT 1 FROM allowed)
  ),
  -- Une ligne par personne et par période où elle a fait quelque chose.
  activity AS (
    SELECT DISTINCT
      i.email,
      date_trunc(
        CASE WHEN p_grain IN ('day', 'week', 'month') THEN p_grain ELSE 'week' END,
        e.created_at
      ) AS bucket
    FROM ident i
    JOIN events e
      ON e.site_id = p_site
     AND e.session_id = i.session_id
    WHERE e.created_at >= p_since
      AND e.created_at <  now()
  ),
  first_seen AS (
    SELECT email, min(bucket) AS cohort
    FROM activity
    GROUP BY email
  )
  SELECT
    f.cohort::DATE,
    -- Les seaux sont déjà tronqués à la granularité, donc les
    -- soustractions de dates tombent juste pour le jour et la semaine ;
    -- le mois passe par les années et les mois, une différence en jours
    -- n'étant pas constante.
    CASE
      WHEN p_grain = 'day'   THEN (a.bucket::DATE - f.cohort::DATE)
      WHEN p_grain = 'month' THEN
        (EXTRACT(YEAR FROM a.bucket)::INT - EXTRACT(YEAR FROM f.cohort)::INT) * 12
        + (EXTRACT(MONTH FROM a.bucket)::INT - EXTRACT(MONTH FROM f.cohort)::INT)
      ELSE (a.bucket::DATE - f.cohort::DATE) / 7
    END::INT AS period_index,
    count(DISTINCT a.email)::BIGINT
  FROM activity a
  JOIN first_seen f ON f.email = a.email
  GROUP BY 1, 2
  ORDER BY 1, 2;
$$;

-- CREATE FUNCTION accorde EXECUTE au pseudo-rôle PUBLIC par défaut, et
-- anon en fait partie : révoquer PUBLIC est le seul moyen de le retirer
-- vraiment. Même piège que has_account_access (supabase/team.sql).
REVOKE EXECUTE ON FUNCTION retention_cohorts(UUID, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION retention_cohorts(UUID, TIMESTAMPTZ, TEXT) TO authenticated;
