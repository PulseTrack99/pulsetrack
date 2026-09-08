-- ════════════════════════════════════════════════════════════════
-- Le temps réel compte des visiteurs, comme le reste du produit.
--
-- Les trois fonctions du direct exposent une colonne nommée
-- `visitors` calculée en count(DISTINCT session_id). L'écran affiche
-- « visiteurs actifs ». La migration qui avait réparé stats_overview,
-- puis les sources, les pays et le graphe quotidien, ne les avait pas
-- touchées.
--
-- L'écart pratique est faible et il faut le dire : sur une fenêtre de
-- cinq minutes, une session est presque toujours une personne. Il
-- apparaît quand même dans deux cas réels — quelqu'un qui ouvre deux
-- onglets comptait pour deux, et sur la sparkline de trente minutes
-- une session qui expire et repart comptait une seconde fois.
--
-- Ce n'est donc pas une correction de chiffre, c'est une correction de
-- vocabulaire : dans un produit qui a fait l'effort de distinguer une
-- visite d'une personne, le même mot doit désigner la même chose
-- partout, sinon aucun des deux ne veut plus rien dire.
--
-- Les signatures et les noms de colonnes ne changent pas, donc
-- CREATE OR REPLACE remplace réellement ici : pas de seconde surcharge
-- à craindre, et les appelants n'ont rien à changer.
--
-- À lancer dans l'éditeur SQL Supabase.
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION realtime_pages(
  p_site UUID, p_minutes INT DEFAULT 5, p_limit INT DEFAULT 10
)
RETURNS TABLE (path TEXT, visitors BIGINT)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(path, ''), '/'), count(DISTINCT visitor_id)::BIGINT
  FROM events
  WHERE site_id = p_site
    AND created_at >= now() - make_interval(mins => p_minutes)
  GROUP BY 1
  ORDER BY 2 DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION realtime_active(p_site UUID, p_minutes INT DEFAULT 5)
RETURNS BIGINT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT count(DISTINCT visitor_id)::BIGINT
  FROM events
  WHERE site_id = p_site
    AND created_at >= now() - make_interval(mins => p_minutes);
$$;

-- Par minute. Seules les minutes avec du trafic reviennent ; la route
-- complète la série pour que la sparkline garde une largeur fixe.
CREATE OR REPLACE FUNCTION realtime_sparkline(p_site UUID, p_minutes INT DEFAULT 30)
RETURNS TABLE (minute TIMESTAMPTZ, visitors BIGINT)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT date_trunc('minute', created_at), count(DISTINCT visitor_id)::BIGINT
  FROM events
  WHERE site_id = p_site
    AND created_at >= now() - make_interval(mins => p_minutes)
  GROUP BY 1
  ORDER BY 1;
$$;

-- Le droit hérité, encore : les trois portaient PUBLIC et anon dans
-- proacl. Elles sont SECURITY INVOKER, donc la RLS d'events refusait
-- déjà anon — mais un droit d'appel sans session n'a pas lieu d'être,
-- et le direct n'est jamais servi à un visiteur anonyme : le tableau
-- de bord public passe par le service role et ne montre pas le direct.
REVOKE EXECUTE ON FUNCTION realtime_pages(UUID, INT, INT)  FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION realtime_active(UUID, INT)      FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION realtime_sparkline(UUID, INT)   FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION realtime_pages(UUID, INT, INT)  TO authenticated;
GRANT  EXECUTE ON FUNCTION realtime_active(UUID, INT)      TO authenticated;
GRANT  EXECUTE ON FUNCTION realtime_sparkline(UUID, INT)   TO authenticated;

-- ── Contrôle ─────────────────────────────────────────────────────
-- Une personne ouvrant deux onglets doit compter pour une :
--   realtime_active doit rendre 1, et non 2, pour deux session_id
--   partageant un visitor_id dans la fenêtre.
