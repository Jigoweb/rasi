-- Chiude l'RPC anonima di public.get_user_email_by_id(uuid).
--
-- In produzione la funzione è quella storica (migration 20260224123629,
-- plpgsql SECURITY DEFINER, owner postgres). L'ACL misurato è
-- {=X/postgres, postgres=X/postgres, anon=X/postgres, authenticated=X/postgres,
-- service_role=X/postgres}: EXECUTE per PUBLIC e, in più, un grant esplicito
-- ad anon. proconfig è NULL, quindi search_path non è fissato.
--
-- 20261007160000 crea la funzione (e revoca PUBLIC) solo se manca. Su un
-- database dove esiste già non cambia né i grant né il search_path. Questa
-- migration non fa CREATE OR REPLACE: il corpo plpgsql di produzione resta
-- com'è.
--
-- I chiamanti dell'app usano il client browser con sessione (ruolo
-- authenticated) oppure, se mai venisse usata dal worker, service_role.
-- Nessun chiamante legittimo gira come anon.

ALTER FUNCTION public.get_user_email_by_id(uuid)
  SET search_path = public, auth, pg_temp;

REVOKE ALL ON FUNCTION public.get_user_email_by_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_email_by_id(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.get_user_email_by_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_email_by_id(uuid) TO service_role;
