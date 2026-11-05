-- Rollback di 20261105120000_harden_function_privileges.sql.
-- NON è una migration: non sta in supabase/migrations e non parte da solo.
--
-- Eseguirlo a mano, in un'unica transazione (il BEGIN/COMMIT qui sotto).
-- Non applicarlo insieme alla migration: riporta i grant e i search_path
-- allo stato misurato il 5/11/2026.
--
-- get_user_role() e get_user_artista_id() non sono toccate: non c'è nulla
-- da ripristinare.
--
-- I grant delle funzioni solo-service_role e di quelle authenticated tornano
-- a PUBLIC, anon, authenticated e service_role.
-- Le 39 firme con proconfig nullo tornano a search_path non impostato
-- (RESET, non search_path vuoto).
-- Le firme che avevano già search_path = public non vengono riscritte.

BEGIN;

DO $rollback_preflight$
DECLARE
  fn text;
  missing text[] := ARRAY[]::text[];
  fns text[] := ARRAY[
    'public._rasi_cms_exec(text)',
    'public._rasi_exec_json(text)',
    'public.acquire_campagna_processing_lock(uuid,uuid,numeric)',
    'public.artist_mandate_covers_year(uuid,integer,uuid[])',
    'public.audit_log_auth_user_change()',
    'public.audit_log_row_change()',
    'public.build_match_key(text,integer)',
    'public.build_match_key_strict(text,integer)',
    'public.check_campagna_processing_lock(uuid,numeric)',
    'public.derive_programmazione_episode_signals(integer,integer,text,text,text,text)',
    'public.finalize_campagna_individuazione(uuid,uuid)',
    'public.find_opera_candidates(uuid,real,integer)',
    'public.get_campagna_unprocessed_programmazione_ids(uuid,uuid,integer)',
    'public.get_campagne_individuazione_with_counts()',
    'public.get_campagne_programmazione_with_counts()',
    'public.get_dashboard_stats()',
    'public.get_individuazione_episode_alert_summary(uuid)',
    'public.get_individuazione_episode_alerts(uuid)',
    'public.get_individuazione_processing_progress(uuid)',
    'public.get_processing_progress(uuid)',
    'public.get_user_email_by_id(uuid)',
    'public.init_campagna_individuazione(uuid,text,text,uuid[])',
    'public.match_programmazione_to_partecipazioni(uuid,numeric)',
    'public.match_programmazione_to_partecipazioni(uuid,numeric,uuid[])',
    'public.match_programmazione_to_partecipazioni(uuid,numeric,uuid[],integer,integer)',
    'public.match_programmazione_to_partecipazioni(uuid,numeric,uuid[],integer,integer,uuid[])',
    'public.nome_persona_key(text)',
    'public.normalize_diritto_nome(text)',
    'public.notify_individuazione_change()',
    'public.notify_ripartizione_change()',
    'public.process_batch_individuazioni(uuid,integer,integer)',
    'public.process_campagna_individuazione(uuid,text,text)',
    'public.process_campagna_individuazione_optimized(uuid,text,text,integer)',
    'public.process_films_batch(uuid,uuid,integer,integer)',
    'public.process_programmazioni_chunk(uuid,uuid[],numeric)',
    'public.process_programmazioni_chunk(uuid,uuid[],numeric,uuid[])',
    'public.process_programmazioni_chunk(uuid,uuid[],numeric,uuid[],integer,integer,uuid[])',
    'public.release_campagna_processing_lock(uuid,uuid,text)',
    'public.score_year_overlap(integer,integer,integer,integer,integer,integer)',
    'public.search_artisti_fuzzy(text,real)',
    'public.search_opere_fuzzy(text,real)',
    'public.trg_alias_normalize()',
    'public.trg_opere_sync_match_keys()',
    'public.trg_programmazioni_sync_match_keys()',
    'public.update_search_vector()',
    'public.update_updated_at_column()',
    'public.year_range_bounds(integer,integer)',
    'public.year_ranges_overlap(integer,integer,integer,integer)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    IF to_regprocedure(fn) IS NULL THEN
      missing := array_append(missing, fn);
    END IF;
  END LOOP;
  IF cardinality(missing) > 0 THEN
    RAISE EXCEPTION 'firme assenti, rollback annullato: %', missing;
  END IF;
END
$rollback_preflight$;

DO $rollback_grants$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public._rasi_cms_exec(text)',
    'public._rasi_exec_json(text)',
    'public.acquire_campagna_processing_lock(uuid,uuid,numeric)',
    'public.audit_log_auth_user_change()',
    'public.audit_log_row_change()',
    'public.check_campagna_processing_lock(uuid,numeric)',
    'public.finalize_campagna_individuazione(uuid,uuid)',
    'public.get_campagna_unprocessed_programmazione_ids(uuid,uuid,integer)',
    'public.get_campagne_individuazione_with_counts()',
    'public.get_dashboard_stats()',
    'public.get_individuazione_processing_progress(uuid)',
    'public.init_campagna_individuazione(uuid,text,text,uuid[])',
    'public.notify_ripartizione_change()',
    'public.process_programmazioni_chunk(uuid,uuid[],numeric)',
    'public.process_programmazioni_chunk(uuid,uuid[],numeric,uuid[])',
    'public.process_programmazioni_chunk(uuid,uuid[],numeric,uuid[],integer,integer,uuid[])',
    'public.release_campagna_processing_lock(uuid,uuid,text)',
    'public.update_updated_at_column()',
    'public.get_campagne_programmazione_with_counts()',
    'public.get_individuazione_episode_alert_summary(uuid)',
    'public.get_individuazione_episode_alerts(uuid)',
    'public.get_processing_progress(uuid)'
  ];
BEGIN
  -- Stato misurato il 5/11/2026: EXECUTE per PUBLIC, anon, authenticated
  -- e service_role. authenticated e service_role c'erano già; si rigranta
  -- tutto così il ripristino non dipende da ciò che la migration ha lasciato.
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %s TO PUBLIC, anon, authenticated, service_role',
      fn
    );
    RAISE NOTICE 'grant aperti ripristinati: %', fn;
  END LOOP;
END
$rollback_grants$;

DO $rollback_search_path$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public._rasi_cms_exec(text)',
    'public._rasi_exec_json(text)',
    'public.acquire_campagna_processing_lock(uuid,uuid,numeric)',
    'public.artist_mandate_covers_year(uuid,integer,uuid[])',
    'public.build_match_key(text,integer)',
    'public.build_match_key_strict(text,integer)',
    'public.check_campagna_processing_lock(uuid,numeric)',
    'public.derive_programmazione_episode_signals(integer,integer,text,text,text,text)',
    'public.finalize_campagna_individuazione(uuid,uuid)',
    'public.find_opera_candidates(uuid,real,integer)',
    'public.get_campagna_unprocessed_programmazione_ids(uuid,uuid,integer)',
    'public.get_dashboard_stats()',
    'public.init_campagna_individuazione(uuid,text,text,uuid[])',
    'public.match_programmazione_to_partecipazioni(uuid,numeric)',
    'public.match_programmazione_to_partecipazioni(uuid,numeric,uuid[])',
    'public.match_programmazione_to_partecipazioni(uuid,numeric,uuid[],integer,integer)',
    'public.match_programmazione_to_partecipazioni(uuid,numeric,uuid[],integer,integer,uuid[])',
    'public.nome_persona_key(text)',
    'public.normalize_diritto_nome(text)',
    'public.notify_individuazione_change()',
    'public.notify_ripartizione_change()',
    'public.process_batch_individuazioni(uuid,integer,integer)',
    'public.process_campagna_individuazione(uuid,text,text)',
    'public.process_campagna_individuazione_optimized(uuid,text,text,integer)',
    'public.process_films_batch(uuid,uuid,integer,integer)',
    'public.process_programmazioni_chunk(uuid,uuid[],numeric)',
    'public.process_programmazioni_chunk(uuid,uuid[],numeric,uuid[])',
    'public.process_programmazioni_chunk(uuid,uuid[],numeric,uuid[],integer,integer,uuid[])',
    'public.release_campagna_processing_lock(uuid,uuid,text)',
    'public.score_year_overlap(integer,integer,integer,integer,integer,integer)',
    'public.search_artisti_fuzzy(text,real)',
    'public.search_opere_fuzzy(text,real)',
    'public.trg_alias_normalize()',
    'public.trg_opere_sync_match_keys()',
    'public.trg_programmazioni_sync_match_keys()',
    'public.update_search_vector()',
    'public.update_updated_at_column()',
    'public.year_range_bounds(integer,integer)',
    'public.year_ranges_overlap(integer,integer,integer,integer)'
  ];
BEGIN
  IF cardinality(fns) <> 39 THEN
    RAISE EXCEPTION 'elenco search_path: attese 39 firme, trovate %', cardinality(fns);
  END IF;
  FOREACH fn IN ARRAY fns LOOP
    -- proconfig era NULL. RESET, non SET search_path = '': un search_path
    -- vuoto non è lo stato precedente.
    EXECUTE format('ALTER FUNCTION %s RESET search_path', fn);
    RAISE NOTICE 'search_path resettato: %', fn;
  END LOOP;
END
$rollback_search_path$;

-- Corpo precedente, dalla lettura del 5/11/2026: la funzione è plpgsql
-- SECURITY DEFINER e il corpo misurato è
--   RETURN (SELECT email FROM auth.users WHERE id = user_id)
-- con search_path = public, auth, pg_temp (migration 20261020122804).
-- Il catalogo non riporta provolatile. 20261020122804 non la dichiara
-- STABLE, quindi qui non si aggiunge STABLE (il default plpgsql è VOLATILE).
-- Se in produzione risultasse STABLE, questo rollback la riporta a VOLATILE:
-- confrontare pg_get_functiondef prima di eseguire.
-- I grant precedenti restano authenticated e service_role, senza PUBLIC e
-- senza anon (già revocati da 20261020122804).
CREATE OR REPLACE FUNCTION public.get_user_email_by_id(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $get_user_email_by_id_prev$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = user_id);
END;
$get_user_email_by_id_prev$;

ALTER FUNCTION public.get_user_email_by_id(uuid)
  SET search_path = public, auth, pg_temp;

REVOKE ALL ON FUNCTION public.get_user_email_by_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_email_by_id(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_user_email_by_id(uuid) IS
  'Returns the email for a given auth.users id; used for audit UI (updated_by / activity feed).';

COMMIT;
