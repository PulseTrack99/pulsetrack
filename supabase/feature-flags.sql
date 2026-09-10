-- ════════════════════════════════════════════════════════════════
-- Feature flags — un interrupteur à distance dans l'app du client.
--
-- Changement de nature pour ce produit : jusqu'ici PulseTrack observe,
-- ici il décide de ce que l'application de son client affiche. Une
-- erreur ne fausse plus un graphe, elle casse une page.
--
-- ── Ce qui a décidé de la conception ─────────────────────────────
--
-- Un déploiement progressif à 30 % doit donner la *même* réponse à la
-- même personne, sinon la fonctionnalité clignote d'une visite à
-- l'autre et personne ne peut plus rien mesurer. Il faut donc une clé
-- de répartition stable.
--
-- Or la nôtre ne l'est pas : le visitor_id vient d'un sel détruit
-- chaque nuit, exprès. Bucketer dessus ferait apparaître et
-- disparaître la fonctionnalité tous les jours.
--
-- La clé est donc fournie, par ordre de préférence :
--
--   1. l'identifiant que le client nous passe — le sien, stable,
--      celui de son propre système d'authentification ;
--   2. à défaut, l'identifiant de session, stable une visite durant.
--
-- Ce second cas est honnête mais limité, et l'écran le dit : sans
-- identifiant, un visiteur anonyme peut basculer de groupe entre deux
-- visites. Stocker quoi que ce soit sur son appareil pour l'éviter
-- reviendrait à poser un cookie, ce que tout le produit refuse.
--
-- ── Ce qui n'est délibérément pas ici ────────────────────────────
--
-- Aucune assignation n'est enregistrée. Le résultat se recalcule à
-- chaque évaluation à partir d'un hachage de (clé du flag, identifiant),
-- ce qui donne le même verdict sans conserver la moindre ligne par
-- personne. C'est aussi pourquoi le hachage inclut la clé du flag :
-- sans elle, les mêmes 10 % de gens tomberaient dans le premier décile
-- de *tous* les flags, et deux déploiements à 10 % toucheraient
-- exactement le même public.
--
-- À lancer dans l'éditeur SQL Supabase.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS feature_flags (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id     UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  -- Ce que le client écrit dans son code : pulsetrack.enabled('...').
  key         TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  -- L'interrupteur principal. Éteint, le flag répond faux à tout le
  -- monde quel que soit le pourcentage — c'est le geste d'urgence.
  enabled     BOOLEAN NOT NULL DEFAULT false,
  -- Part du public qui voit la fonctionnalité quand l'interrupteur est
  -- allumé. 0 laisse le flag prêt sans exposer personne.
  rollout     SMALLINT NOT NULL DEFAULT 100 CHECK (rollout BETWEEN 0 AND 100),
  archived_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (site_id, key)
);

-- Sert l'évaluation, qui est appelée à chaque chargement de page chez
-- le client : c'est la requête la plus chaude du produit après
-- l'ingestion, et elle ne lit que les flags vivants d'un site.
CREATE INDEX IF NOT EXISTS idx_feature_flags_live
  ON feature_flags (site_id)
  WHERE archived_at IS NULL;

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Configuration, pas donnée de visiteur : la même règle d'accès que
-- partout ailleurs, donc un équipier gère les flags comme le
-- propriétaire. L'évaluation publique, elle, passe par le service role
-- et ne dépend pas de cette politique.
DROP POLICY IF EXISTS "Users manage their feature flags" ON feature_flags;
CREATE POLICY "Users manage their feature flags"
  ON feature_flags FOR ALL
  USING (site_id IN (SELECT id FROM sites WHERE has_account_access(sites.user_id)))
  WITH CHECK (site_id IN (SELECT id FROM sites WHERE has_account_access(sites.user_id)));

-- ── Contrôle ─────────────────────────────────────────────────────
-- Un flag éteint doit répondre faux quel que soit son pourcentage, et
-- deux flags a 10 % ne doivent pas toucher le meme public : c'est ce
-- que verifie la route d'evaluation, pas le schema.
