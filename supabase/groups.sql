-- ════════════════════════════════════════════════════════════════
-- Comptes — « quel client décroche », pas « quelle personne ».
--
-- Le seul manque face à Mixpanel qui fermait une porte commerciale.
-- Tout le produit raisonnait par personne, or une entreprise qui vend
-- à d'autres entreprises ne se demande pas si Marie s'est connectée :
-- elle se demande si *Acme* est en train de partir. Trois personnes
-- actives chez un client qui en compte quarante, c'est un compte
-- perdu, et aucun écran ne pouvait le dire.
--
-- ── D'où vient l'appartenance ────────────────────────────────────
--
-- Du client, comme l'identité. Il appelle pulsetrack.group("acme-42",
-- "Acme Corp") et nous savons que cette session appartient à ce
-- compte. Rien n'est deviné, rien n'est déduit d'un domaine d'e-mail :
-- le pistage ne saurait pas le faire, et l'inventer produirait des
-- regroupements faux que personne ne pourrait corriger.
--
-- Même modèle que session_identities, donc : une table d'index, RLS
-- active et aucune politique — service role uniquement — et des
-- fonctions SECURITY DEFINER qui vérifient l'accès au site
-- explicitement, puisqu'aucune session ne peut lire la table.
--
-- ── Ce qu'une personne et un compte ont en commun ────────────────
--
-- Les deux durent au-delà de la journée, contrairement au visiteur
-- anonyme dont le sel est détruit chaque nuit. C'est pour cette raison
-- que les comptes se comptent en personnes identifiées et en
-- sessions, jamais en visiteurs : additionner des visiteurs sur trente
-- jours donnerait des visiteurs-jours, et un compte paraîtrait dix
-- fois plus vivant qu'il ne l'est.
--
-- Nécessite supabase/revenue.sql (session_identities, revenue_events).
-- À lancer dans l'éditeur SQL Supabase.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS session_groups (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id    UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  -- L'identifiant du compte chez le client : sa clé, pas la nôtre.
  group_id   TEXT NOT NULL,
  -- Le nom lisible, s'il l'envoie. Il peut changer sans que
  -- l'identifiant bouge, donc c'est le plus récent qui est retenu.
  group_name TEXT,
  joined_at  TIMESTAMPTZ DEFAULT now(),
  -- Une session appartient à un compte à la fois. Un second appel la
  -- déplace plutôt que d'en créer une seconde appartenance.
  UNIQUE (site_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_session_groups_group
  ON session_groups (site_id, group_id);
CREATE INDEX IF NOT EXISTS idx_session_groups_session
  ON session_groups (site_id, session_id);

-- Aucune politique, volontairement : la table relie des sessions à des
-- comptes, et rien n'a besoin de la lire en session. Les écrans
-- passent par les fonctions ci-dessous.
ALTER TABLE session_groups ENABLE ROW LEVEL SECURITY;

-- ── La liste des comptes ─────────────────────────────────────────
--
-- Une ligne par compte, avec de quoi répondre à « lequel décroche » :
-- combien de personnes distinctes, combien de sessions, quand pour la
-- dernière fois, et combien il a rapporté.
CREATE OR REPLACE FUNCTION site_groups(
  p_site  UUID,
  p_since TIMESTAMPTZ
)
RETURNS TABLE (
  group_id      TEXT,
  group_name    TEXT,
  people        BIGINT,
  sessions      BIGINT,
  events        BIGINT,
  pageviews     BIGINT,
  first_seen    TIMESTAMPTZ,
  last_seen     TIMESTAMPTZ,
  revenue_cents BIGINT
)
LANGUAGE sql
STABLE
-- session_groups n'a aucune politique : une fonction INVOKER ne
-- renverrait rien à ceux à qui elle est justement accordée. Le droit
-- d'accès est donc vérifié ici, par la même règle que partout
-- ailleurs, et un appelant sans accès obtient zéro ligne plutôt
-- qu'une erreur qui lui apprendrait que le site existe.
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH allowed AS (
    SELECT 1 FROM sites s
    WHERE s.id = p_site AND has_account_access(s.user_id)
  ),
  g AS (
    SELECT sg.session_id, sg.group_id, sg.group_name, sg.joined_at
    FROM session_groups sg
    WHERE sg.site_id = p_site AND EXISTS (SELECT 1 FROM allowed)
  ),
  ev AS (
    SELECT g.group_id,
           count(*)                                        AS events,
           count(*) FILTER (WHERE e.type = 'pageview')      AS pageviews,
           count(DISTINCT e.session_id)                     AS sessions,
           min(e.created_at)                                AS first_seen,
           max(e.created_at)                                AS last_seen
    FROM g
    JOIN events e ON e.site_id = p_site AND e.session_id = g.session_id
    WHERE e.created_at >= p_since AND e.created_at < now()
    GROUP BY g.group_id
  ),
  -- Les personnes du compte : celles que le client nous a nommées.
  -- Une session sans identify() gonflerait le compte sans dire qui.
  ppl AS (
    SELECT g.group_id, count(DISTINCT si.email) AS people
    FROM g
    JOIN session_identities si
      ON si.site_id = p_site AND si.session_id = g.session_id
    GROUP BY g.group_id
  ),
  rev AS (
    SELECT g.group_id, sum(r.amount)::BIGINT AS revenue_cents
    FROM g
    JOIN revenue_events r
      ON r.site_id = p_site AND r.session_id = g.session_id
    WHERE r.stripe_created_at >= p_since
    GROUP BY g.group_id
  ),
  -- Le nom le plus récemment déclaré : il peut changer sans que
  -- l'identifiant bouge, et c'est le dernier qui fait foi.
  names AS (
    -- session_id départage les égalités : deux appels dans la même
    -- microseconde laisseraient sinon le tri choisir au hasard, et le
    -- nom du compte changerait d'un rafraîchissement à l'autre.
    SELECT DISTINCT ON (group_id) group_id, group_name
    FROM g WHERE group_name IS NOT NULL
    ORDER BY group_id, joined_at DESC, session_id DESC
  )
  SELECT
    ev.group_id,
    COALESCE(names.group_name, ev.group_id),
    COALESCE(ppl.people, 0)::BIGINT,
    ev.sessions::BIGINT,
    ev.events::BIGINT,
    ev.pageviews::BIGINT,
    ev.first_seen,
    ev.last_seen,
    COALESCE(rev.revenue_cents, 0)::BIGINT
  FROM ev
  LEFT JOIN ppl   ON ppl.group_id   = ev.group_id
  LEFT JOIN rev   ON rev.group_id   = ev.group_id
  LEFT JOIN names ON names.group_id = ev.group_id
  ORDER BY ev.last_seen DESC NULLS LAST;
$$;

-- ── Qui, dans un compte ──────────────────────────────────────────
--
-- Le pas suivant, une fois qu'un compte inquiète : voir les personnes
-- qui le composent et quand chacune est passée pour la dernière fois.
CREATE OR REPLACE FUNCTION group_members(
  p_site  UUID,
  p_group TEXT,
  p_since TIMESTAMPTZ
)
RETURNS TABLE (
  email     TEXT,
  sessions  BIGINT,
  events    BIGINT,
  last_seen TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH allowed AS (
    SELECT 1 FROM sites s
    WHERE s.id = p_site AND has_account_access(s.user_id)
  ),
  g AS (
    SELECT sg.session_id
    FROM session_groups sg
    WHERE sg.site_id = p_site AND sg.group_id = p_group
      AND EXISTS (SELECT 1 FROM allowed)
  ),
  named AS (
    SELECT DISTINCT si.email, si.session_id
    FROM g
    JOIN session_identities si
      ON si.site_id = p_site AND si.session_id = g.session_id
  )
  SELECT
    named.email,
    count(DISTINCT e.session_id)::BIGINT,
    count(e.id)::BIGINT,
    max(e.created_at)
  FROM named
  JOIN events e ON e.site_id = p_site AND e.session_id = named.session_id
  WHERE e.created_at >= p_since AND e.created_at < now()
  GROUP BY named.email
  ORDER BY 4 DESC NULLS LAST;
$$;

-- CREATE FUNCTION accorde EXECUTE à PUBLIC par défaut, et anon en fait
-- partie. Voir supabase/revoke-public-execute.sql : c'est le piège
-- systémique du projet, refermé une fois pour toutes — mais toute
-- fonction nouvelle le rouvre, donc on referme ici aussi.
REVOKE EXECUTE ON FUNCTION site_groups(UUID, TIMESTAMPTZ)          FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION group_members(UUID, TEXT, TIMESTAMPTZ)  FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION site_groups(UUID, TIMESTAMPTZ)          TO authenticated;
GRANT  EXECUTE ON FUNCTION group_members(UUID, TEXT, TIMESTAMPTZ)  TO authenticated;

-- ── Contrôle ─────────────────────────────────────────────────────
-- La somme des `sessions` de site_groups ne peut pas dépasser le
-- nombre de sessions du site sur la période : une session appartient
-- à un compte au plus.
