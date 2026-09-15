-- ════════════════════════════════════════════════════════════════
-- Enregistrement dynamique des clients OAuth (RFC 7591)
-- ════════════════════════════════════════════════════════════════
--
-- Claude et ChatGPT s'identifient par une fiche publiée (CIMD) : leur
-- client_id est une URL, rien à stocker. Gemini, Notion, VS Code,
-- Cursor et Le Chat font autrement : ils s'enregistrent d'abord
-- (POST /api/oauth/register) et reçoivent un identifiant. C'est cette
-- table qui s'en souvient.
--
-- Clients publics uniquement : aucun secret n'est émis ni stocké. Ce
-- qui protège le flux, c'est la liste d'adresses de retour déclarée ici
-- (vérifiée à /oauth/authorize), PKCE et l'écran de consentement.
--
-- N'importe qui peut s'enregistrer, c'est le principe. D'où la limite
-- de débit par IP côté route, et la purge des clients jamais utilisés
-- (cron purge-retention).
--
-- Lecture et écriture par le service role seulement : RLS activée,
-- aucune policy.

CREATE TABLE IF NOT EXISTS oauth_clients (
  client_id     TEXT PRIMARY KEY,
  client_name   TEXT,
  redirect_uris TEXT[] NOT NULL CHECK (cardinality(redirect_uris) BETWEEN 1 AND 10),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS oauth_clients_unused_idx
  ON oauth_clients (created_at)
  WHERE last_used_at IS NULL;

ALTER TABLE oauth_clients ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON oauth_clients FROM anon, authenticated;
