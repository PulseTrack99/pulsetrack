-- ════════════════════════════════════════════════════════════════
-- Export planifié — envoyer les événements bruts ailleurs.
--
-- Pour les croiser avec un CRM, une facturation, un entrepôt. Les
-- connecteurs natifs par entrepôt (BigQuery, Snowflake) demanderaient
-- de stocker les identifiants de service du client, et ce projet a
-- déjà une table qui garde un secret tiers en clair
-- (stripe_connections) : on n'en ajoute pas une seconde.
--
-- La version retenue est un webhook signé. Le client donne une URL
-- HTTPS ; nous y envoyons les événements par lots, signés HMAC pour
-- qu'il puisse vérifier que c'est nous. Il branche ensuite ce qu'il
-- veut derrière — une fonction qui écrit dans son entrepôt, un Zapier,
-- un script.
--
-- ── Aucun secret dans cette table ────────────────────────────────
--
-- La clé de signature n'est pas stockée : elle se dérive du secret
-- serveur et de l'identifiant de la destination (src/lib/export.ts).
-- On la recalcule quand il faut signer ou l'afficher, et il n'y a
-- rien à chiffrer, rien à faire fuir en lisant la table.
--
-- ── Le curseur ───────────────────────────────────────────────────
--
-- `cursor` retient l'horodatage du dernier événement livré avec succès.
-- La livraison est « au moins une fois » : un lot refusé est renvoyé
-- au passage suivant, depuis le même curseur. Le destinataire doit donc
-- dédoublonner sur l'identifiant d'événement, et l'écran le dit.
--
-- À lancer dans l'éditeur SQL Supabase.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS export_destinations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id     UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  -- Nul au départ : l'export commence à la création de la destination,
  -- pas au premier événement du site. Déverser tout l'historique d'un
  -- coup sur une URL qu'on vient de brancher surprendrait plus qu'il
  -- ne servirait.
  cursor      TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  last_status INT,
  last_error  TEXT,
  last_sent   INT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_export_destinations_enabled
  ON export_destinations (enabled) WHERE enabled;

ALTER TABLE export_destinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their export destinations" ON export_destinations;
CREATE POLICY "Users manage their export destinations"
  ON export_destinations FOR ALL
  USING (site_id IN (SELECT id FROM sites WHERE has_account_access(sites.user_id)))
  WITH CHECK (site_id IN (SELECT id FROM sites WHERE has_account_access(sites.user_id)));
