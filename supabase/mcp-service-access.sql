-- ════════════════════════════════════════════════════════════════
-- Laisser le serveur MCP lire la rétention et les comptes
-- ════════════════════════════════════════════════════════════════
--
-- retention_cohorts et site_groups sont SECURITY DEFINER et vérifient
-- l'accès dans leur corps avec has_account_access(), qui compare au
-- visiteur connecté (auth.uid()). Le serveur MCP n'a pas de visiteur
-- connecté : il appelle avec le service role, après avoir lui-même
-- résolu la clé ou le jeton vers un site précis (src/app/api/mcp).
-- Pour lui, la garde renvoyait donc zéro ligne, sans erreur.
--
-- Le service role contourne déjà la RLS de toutes les tables ; l'ajouter
-- ici n'ouvre rien de nouveau. Un appel anonyme ou authentifié reste
-- soumis à la même vérification qu'avant.
--
-- group_members n'est pas touchée : elle renvoie des adresses e-mail, et
-- le serveur MCP n'expose volontairement que des agrégats par compte.
--
-- Rejouable : une fonction déjà modifiée est laissée telle quelle.

DO $$
DECLARE
  def TEXT;
BEGIN
  FOR def IN
    SELECT pg_get_functiondef(p.oid)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('retention_cohorts', 'site_groups')
  LOOP
    IF position('auth.role() = ''service_role''' IN def) = 0 THEN
      EXECUTE replace(
        def,
        'has_account_access(s.user_id)',
        '(has_account_access(s.user_id) OR auth.role() = ''service_role'')'
      );
    END IF;
  END LOOP;
END $$;
