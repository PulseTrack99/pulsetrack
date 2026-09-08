-- ════════════════════════════════════════════════════════════════
-- Fermer, d'un coup, le droit d'exécution hérité par PUBLIC.
--
-- Corrigé quatre fois au fil de l'audit — retention_cohorts,
-- funnel_results, funnel_dropoff_sessions, les trois fonctions du
-- temps réel — avant d'admettre que ce n'était pas une série
-- d'oublis mais un défaut systémique.
--
-- La cause : CREATE FUNCTION accorde EXECUTE au pseudo-rôle PUBLIC par
-- défaut, et anon en fait partie. Chaque fonction écrite depuis le
-- début du projet est donc née appelable sans session, et rien dans le
-- projet ne rattrapait ça. Corriger fonction par fonction, au fil des
-- rencontres, laissait le prochain oubli arriver.
--
-- ── Ce que ça valait, exactement ─────────────────────────────────
--
-- Aucune fuite, et c'est vérifié plutôt que supposé : les fonctions
-- concernées sont toutes SECURITY INVOKER, donc elles lisent events,
-- interactions et le reste sous la RLS de l'appelant. Avec la seule
-- clé publique, la politique appelle has_account_access, qu'anon n'a
-- pas le droit d'exécuter, et la requête s'arrête sur un 42501.
--
-- Ce qui restait ouvert est plus modeste et bien réel : le droit de
-- faire *travailler* la base sans être connecté, avec une clé présente
-- dans le bundle de chaque page. Une agrégation refusée coûte moins
-- qu'une agrégation réussie, mais elle n'est pas gratuite.
--
-- ── Pourquoi révoquer suffit ─────────────────────────────────────
--
-- Les seize fonctions visées portent déjà `authenticated` dans leur
-- ACL. Il n'y a donc rien à accorder — seulement à retirer. C'est
-- volontaire : un balayage qui accorderait `authenticated` à tout ce
-- qu'il touche finirait par ouvrir aux utilisateurs connectés une
-- fonction qui n'aurait dû rester qu'au service role.
--
-- Les fonctions de déclencheur sont exclues. Elles ne sont pas
-- appelables directement — Postgres refuse « trigger functions can
-- only be called as triggers » — et toucher à leurs droits pour rien
-- risquerait de casser une écriture pour aucun gain.
--
-- ── Vérifié avant de lancer ──────────────────────────────────────
--
-- Aucun chemin n'a besoin d'anon : /api/track, /api/replay/gate,
-- /api/replay/ingest, /api/public/[shareId], /api/heatmap, les trois
-- crons, /api/mcp et /api/v1/* passent tous par le service role, qui
-- ignore ces droits. Toutes les routes appelant une RPC avec une
-- session sont des écrans du tableau de bord, donc `authenticated`.
--
-- Rejouable : relancer ce fichier après avoir ajouté des fonctions
-- referme ce que CREATE FUNCTION vient de rouvrir.
--
-- À lancer dans l'éditeur SQL Supabase.
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE
  f RECORD;
  n INT := 0;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname = 'public'
      -- Non appelables directement : rien à y gagner, un risque à y perdre.
      AND pg_get_function_result(p.oid) <> 'trigger'
      AND (
        p.proacl IS NULL  -- ACL par défaut = PUBLIC a EXECUTE
        OR EXISTS (
          SELECT 1 FROM unnest(p.proacl) a
          WHERE a::text LIKE '=%' OR a::text LIKE 'anon=%'
        )
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, PUBLIC', f.sig);
    RAISE NOTICE 'révoqué : %', f.sig;
    n := n + 1;
  END LOOP;

  RAISE NOTICE '% fonction(s) refermée(s).', n;
END;
$$;

-- ── Contrôle ─────────────────────────────────────────────────────
-- Doit ne rien renvoyer. Toute ligne est une fonction encore appelable
-- sans session.
--
--   SELECT p.oid::regprocedure, p.proacl
--   FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
--   WHERE ns.nspname = 'public'
--     AND pg_get_function_result(p.oid) <> 'trigger'
--     AND (p.proacl IS NULL
--          OR EXISTS (SELECT 1 FROM unnest(p.proacl) a
--                     WHERE a::text LIKE '=%' OR a::text LIKE 'anon=%'));

-- ── Ce que le linter signale encore, et pourquoi c'est voulu ─────
--
-- Après ce balayage, l'avis de sécurité Supabase ne contient plus
-- aucun avertissement tourné vers l'extérieur pour anon. Restent :
--
--   RLS active sans politique, sur daily_salts, session_identities,
--   oauth_codes et rate_limits (niveau INFO). C'est le bon réglage :
--   ces tables n'appartiennent qu'au service role. Le sel quotidien
--   lisible en session annulerait tout l'anonymat du modèle, et
--   session_identities est l'index qui relie un e-mail à des sessions.
--
--   Cinq fonctions SECURITY DEFINER appelables par authenticated :
--   has_account_access, usage_summary, replays_this_month,
--   copilot_queries_this_month, retention_cohorts. Elles doivent
--   l'être — c'est précisément leur raison d'exister, lire une table
--   qu'une session ne peut pas lire. Le garde-fou n'est pas dans les
--   droits mais dans leur corps : les quatre qui prennent un
--   identifiant en paramètre portent has_account_access(p_user), et
--   retention_cohorts porte la même vérification sur le site. Vérifié
--   sur la définition réelle en base, pas sur le fichier.
--
--   La protection contre les mots de passe compromis, désactivée. Un
--   réglage de la console Auth, pas du schéma.
