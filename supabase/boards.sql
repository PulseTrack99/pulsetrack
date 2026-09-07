-- ════════════════════════════════════════════════════════════════
-- Tableaux de bord — des documents, pas des grilles.
--
-- Tous les écrans du produit répondent à une question décidée par le
-- développeur. Un tableau inverse ça : le client compose sa page, et
-- surtout il peut écrire *entre* les graphiques ce qu'il faut y
-- chercher. C'est ce qui sépare un rapport qu'on transmet à son équipe
-- d'une collection de chiffres que chacun interprète à sa façon.
--
-- Un bloc est soit du texte, soit un titre, soit une question posée à
-- insights_query — la même fonction que l'écran Insights, donc un
-- tableau n'a aucune capacité d'analyse qui lui soit propre. Ce qu'on
-- épingle est la requête, pas son résultat : le tableau se recalcule.
--
-- Nécessite supabase/insights.sql.
-- À lancer dans l'éditeur SQL Supabase.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS boards (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id     uuid REFERENCES sites(id) ON DELETE CASCADE,
  name        text NOT NULL,
  -- Une phrase sous le titre, comme le chapeau d'un article : à quoi
  -- sert ce tableau et pour qui.
  description text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boards_site ON boards(site_id, created_at DESC);

CREATE TABLE IF NOT EXISTS board_blocks (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id  uuid REFERENCES boards(id) ON DELETE CASCADE,
  -- Un entier clairsemé plutôt qu'une liste chaînée : réordonner ne
  -- doit pas pouvoir casser le document si une écriture échoue.
  position  int NOT NULL DEFAULT 0,
  kind      text NOT NULL CHECK (kind IN ('heading', 'text', 'insight')),
  -- Deux largeurs suffisent. Un vrai moteur de mise en page serait une
  -- fonctionnalité à part entière, et personne ne l'a demandée.
  width     text NOT NULL DEFAULT 'full' CHECK (width IN ('full', 'half')),
  -- heading/text : { "text": "…" }
  -- insight      : { "title": "…", "measure": "…", "event_name": …,
  --                  "breakdown": …, "grain": …, "filters": [ … ] }
  config    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_board_blocks_board ON board_blocks(board_id, position);

ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_blocks ENABLE ROW LEVEL SECURITY;

-- Même règle d'accès que toutes les tables rattachées à un site :
-- propriétaire, ou membre actif de son compte (has_account_access,
-- supabase/team.sql).
DROP POLICY IF EXISTS "Users manage their boards" ON boards;
CREATE POLICY "Users manage their boards"
  ON boards FOR ALL
  USING (site_id IN (SELECT id FROM sites WHERE has_account_access(sites.user_id)))
  WITH CHECK (site_id IN (SELECT id FROM sites WHERE has_account_access(sites.user_id)));

-- Les blocs héritent de l'accès de leur tableau : un bloc n'existe pas
-- sans lui, et il n'y a donc rien à autoriser séparément.
DROP POLICY IF EXISTS "Users manage their board blocks" ON board_blocks;
CREATE POLICY "Users manage their board blocks"
  ON board_blocks FOR ALL
  USING (
    board_id IN (
      SELECT b.id FROM boards b
      JOIN sites s ON s.id = b.site_id
      WHERE has_account_access(s.user_id)
    )
  )
  WITH CHECK (
    board_id IN (
      SELECT b.id FROM boards b
      JOIN sites s ON s.id = b.site_id
      WHERE has_account_access(s.user_id)
    )
  );
