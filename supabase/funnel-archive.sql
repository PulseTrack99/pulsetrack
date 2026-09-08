-- ════════════════════════════════════════════════════════════════
-- Archiver un funnel — et pouvoir revenir en arrière.
--
-- Jusqu'ici un funnel créé ne pouvait plus jamais disparaître : aucun
-- DELETE sur /api/funnels/[id], aucun bouton dans l'écran. Sur l'offre
-- Free, qui donne exactement un funnel, une faute de frappe au premier
-- essai bloquait le compte à vie sans autre issue que payer.
--
-- On archive plutôt qu'on supprime : les étapes et l'historique
-- restent, la carte quitte la liste, et le funnel ne compte plus dans
-- le plafond du plan. Rien n'est perdu, tout est réversible.
--
-- ── Le piège que ça ouvre ────────────────────────────────────────
--
-- Le plafond vit dans un trigger BEFORE INSERT. Restaurer un funnel
-- n'est pas un INSERT mais un UPDATE, donc en l'état un compte Free
-- pourrait archiver cinq funnels puis les restaurer tous les cinq et
-- se retrouver avec cinq funnels actifs sur une offre qui en vend un.
--
-- Le trigger couvre donc aussi l'UPDATE, et ne se déclenche que quand
-- une ligne (re)devient active. Au moment BEFORE, la ligne porte
-- encore son ancienne valeur : elle est donc absente du décompte des
-- actifs, exactement comme une ligne pas encore insérée. Le même
-- comptage sert les deux cas sans correction.
--
-- À lancer dans l'éditeur SQL Supabase.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE funnels ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- La liste et le décompte du plafond ne lisent que les actifs, et un
-- index partiel ne porte que sur eux : les archives ne pèsent ni sur
-- sa taille ni sur son maintien.
CREATE INDEX IF NOT EXISTS idx_funnels_active
  ON funnels(site_id)
  WHERE archived_at IS NULL;

CREATE OR REPLACE FUNCTION enforce_funnel_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner UUID;
  lim   INT;
  cnt   INT;
BEGIN
  -- Un funnel qui arrive archivé, ou qui reste archivé, ne consomme
  -- rien. Et une modification qui ne touche pas à l'archivage (un
  -- renommage) ne doit pas se faire refuser parce que le compte est
  -- plein — c'est déjà le cas, elle garde archived_at NULL des deux
  -- côtés et sort ici.
  IF NEW.archived_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.archived_at IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO owner FROM sites WHERE id = NEW.site_id;
  IF owner IS NULL THEN
    RAISE EXCEPTION 'unknown_site' USING ERRCODE = 'foreign_key_violation';
  END IF;

  SELECT max_funnels INTO lim
  FROM plan_limits WHERE plan = current_plan(owner);

  IF lim IS NULL THEN lim := 1; END IF;
  IF lim < 0 THEN RETURN NEW; END IF;

  -- Compté sur tous les sites du propriétaire, comme la grille
  -- tarifaire le formule (« 5 funnels », pas « 5 par site »), et sur
  -- les seuls actifs.
  SELECT count(*) INTO cnt
  FROM funnels f JOIN sites s ON s.id = f.site_id
  WHERE s.user_id = owner
    AND f.archived_at IS NULL;

  IF cnt >= lim THEN
    RAISE EXCEPTION 'funnel_limit_reached:%', lim
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_funnel_limit ON funnels;
CREATE TRIGGER trg_funnel_limit
  BEFORE INSERT OR UPDATE OF archived_at ON funnels
  FOR EACH ROW EXECUTE FUNCTION enforce_funnel_limit();

-- ── Contrôles ────────────────────────────────────────────────────
-- Un compte Free avec un funnel actif : archiver doit passer, et
-- restaurer doit être refusé tant qu'un autre est actif.
--
--   update funnels set archived_at = now() where id = '…';   -- ok
--   insert into funnels (site_id, name) values ('…', 'B');   -- ok, 1 actif
--   update funnels set archived_at = null where id = '…';    -- funnel_limit_reached:1
