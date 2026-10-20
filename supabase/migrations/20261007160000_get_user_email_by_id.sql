-- Lookup email auth per le UI di audit (feed attività, updated_by sulle opere).
-- In produzione la funzione esiste già (migration storica create_get_user_email_function,
-- plpgsql SECURITY DEFINER, stessa firma user_id uuid -> text, EXECUTE anche a PUBLIC/anon).
-- Non sostituirla: CREATE OR REPLACE cambierebbe linguaggio, search_path e i grant.
-- Su un database locale senza la funzione, la crea.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_user_email_by_id'
      AND pg_get_function_identity_arguments(p.oid) = 'user_id uuid'
  ) THEN
    RETURN;
  END IF;

  CREATE FUNCTION public.get_user_email_by_id(user_id uuid)
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, auth
  AS $fn$
    SELECT u.email::text
    FROM auth.users u
    WHERE u.id = get_user_email_by_id.user_id;
  $fn$;

  REVOKE ALL ON FUNCTION public.get_user_email_by_id(uuid) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.get_user_email_by_id(uuid) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.get_user_email_by_id(uuid) TO service_role;

  COMMENT ON FUNCTION public.get_user_email_by_id(uuid) IS
    'Returns the email for a given auth.users id; used for audit UI (updated_by / activity feed).';
END $$;
