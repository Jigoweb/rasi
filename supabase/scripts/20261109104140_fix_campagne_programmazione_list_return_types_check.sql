-- Verifica dopo 20261109104140_fix_campagne_programmazione_list_return_types.sql.
--
-- Il check di #60 (20261106220000_role_guard_staff_functions_check.sql)
-- controlla grant, search_path e presenza del guard, ma non esegue la
-- funzione: per questo non ha visto l'errore 42804 di RETURN QUERY.
-- Questo script la chiama davvero come un admin, dentro una transazione
-- annullata. La funzione è STABLE: non scrive nulla.
--
-- Esito atteso: ruolo = admin e campagne = numero di righe di
-- campagne_programmazione. Un errore 42804 vuol dire che la fix non è
-- applicata.

BEGIN;

SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (
      SELECT u.id
      FROM auth.users u
      WHERE u.raw_app_meta_data ->> 'ruolo' = 'admin'
      ORDER BY u.created_at
      LIMIT 1
    ),
    'role', 'authenticated'
  )::text,
  true
);

SET LOCAL ROLE authenticated;

SELECT
  public.get_user_role() AS ruolo,
  (SELECT count(*) FROM public.get_campagne_programmazione_with_counts()) AS campagne;

ROLLBACK;

SELECT count(*) AS campagne_in_tabella FROM public.campagne_programmazione;
