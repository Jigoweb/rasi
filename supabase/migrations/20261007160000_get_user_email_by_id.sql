-- Expose auth user email lookup for audit displays (activity feed, opera updated_by).
-- Already referenced by the app types and opere.service; missing from local base schema.

create or replace function public.get_user_email_by_id(user_id uuid)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.email::text
  from auth.users u
  where u.id = get_user_email_by_id.user_id;
$$;

revoke all on function public.get_user_email_by_id(uuid) from public;
grant execute on function public.get_user_email_by_id(uuid) to authenticated;
grant execute on function public.get_user_email_by_id(uuid) to service_role;

comment on function public.get_user_email_by_id(uuid) is
  'Returns the email for a given auth.users id; used for audit UI (updated_by / activity feed).';
