-- ════════════════════════════════════════════════════════════════
-- Clés API : permission de modification pour le serveur MCP
-- ════════════════════════════════════════════════════════════════
--
-- Les outils MCP d'écriture (créer un tableau de bord, régler un flag,
-- démarrer un A/B test…) n'agissent que si la connexion l'autorise.
-- Pour OAuth, c'est le choix « Lecture et modification » de l'écran de
-- consentement, enregistré dans oauth_tokens.scope. Pour une clé API,
-- c'est cette colonne, cochée à la création.
--
-- Fausse par défaut : toutes les clés existantes restent en lecture
-- seule, et une clé ne gagne jamais ce droit sans qu'on le lui donne.

ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS can_write BOOLEAN NOT NULL DEFAULT false;
