-- Supabase may keep explicit role grants even after revoking PUBLIC. Remove the
-- legacy delete overload from client roles and keep only the authenticated UI
-- overload exposed to signed-in users.

REVOKE EXECUTE ON FUNCTION public.delete_campagna_individuazione_safe(uuid)
  FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.delete_campagna_individuazione_safe(uuid, uuid, integer)
  FROM anon;

GRANT EXECUTE ON FUNCTION public.delete_campagna_individuazione_safe(uuid)
  TO service_role;

GRANT EXECUTE ON FUNCTION public.delete_campagna_individuazione_safe(uuid, uuid, integer)
  TO authenticated, service_role;
