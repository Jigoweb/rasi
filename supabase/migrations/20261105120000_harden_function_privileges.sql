-- Chiude l'esecuzione anonima (e, dove indicato, authenticated) delle
-- funzioni public segnalate dagli advisor di sicurezza, e fissa
-- search_path = public, pg_temp sulle 39 firme con proconfig nullo.
--
-- Stesso schema di 20261021110000_harden_get_dashboard_metrics.sql (#46):
--   ALTER FUNCTION ... SET search_path = public, pg_temp
--   REVOKE ALL FROM PUBLIC
--   REVOKE ALL FROM anon
--   GRANT EXECUTE ai ruoli che la chiamano davvero
-- REVOKE ALL, non solo EXECUTE: su una funzione i due coincidono, ed è
-- quello che fa #46. REVOKE solo da PUBLIC non basta: in produzione anon
-- ha anche un grant esplicito.
--
-- Differenza da #46: le firme sono esplicite (catalogo pg_proc del
-- 5/11/2026), non un ciclo su tutte le overload del nome. Una firma
-- assente fa fallire l'intera migration. Un overload nuovo, non elencato,
-- resta com'è: va chiuso a parte.
--
-- Transazione unica: la CLI Supabase avvolge il file in BEGIN/COMMIT,
-- come #46. Un BEGIN interno farebbe fallire il push
-- ("there is already a transaction in progress").
--
-- search_path = '' non è usato. I corpi citano tabelle di public senza
-- schema e similarity() di pg_trgm, installata in public. Con search_path
-- vuoto quelle funzioni non risolverebbero i nomi.
--
-- Non tocca i dati. Non tocca get_user_role() né get_user_artista_id():
-- le policy RLS sono TO public e le chiamano. Se anon perde EXECUTE, le
-- query anon su quelle tabelle vanno in errore invece di tornare 0 righe.
-- Per anon le due funzioni restituiscono NULL (auth.uid() è NULL).
--
-- Le funzioni LANGUAGE sql con una clausola SET non vengono più inlined
-- dal planner. Vale per build_match_key, build_match_key_strict,
-- nome_persona_key, year_range_bounds, year_ranges_overlap,
-- artist_mandate_covers_year e
-- match_programmazione_to_partecipazioni(uuid,numeric,uuid[],integer,integer,uuid[]).
-- Da misurare prima del merge.
--
-- BOZZA operativa: non applicata da questa PR. Va eseguita solo dopo
-- l'ok esplicito, sul database deciso da chi approva.

-- ===== service_role soltanto =====
-- Lock, elaborazione campagne, statistiche senza chiamanti nel repo,
-- trigger (EXECUTE non è controllato quando il trigger scatta) e i due
-- esecutori di SQL dinamico _rasi_*.
DO $revoke_service$
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
    'public.update_updated_at_column()'
  ];
BEGIN
  IF cardinality(fns) <> 18 THEN
    RAISE EXCEPTION 'elenco service_role: attese 18 firme, trovate %', cardinality(fns);
  END IF;

  FOREACH fn IN ARRAY fns LOOP
    IF to_regprocedure(fn) IS NULL THEN
      RAISE EXCEPTION 'firma assente (service_role): %', fn;
    END IF;
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    RAISE NOTICE 'solo service_role: %', fn;
  END LOOP;
END
$revoke_service$;

-- ===== authenticated + service_role (client browser con sessione) =====
DO $revoke_anon$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public.get_campagne_programmazione_with_counts()',
    'public.get_individuazione_episode_alert_summary(uuid)',
    'public.get_individuazione_episode_alerts(uuid)',
    'public.get_processing_progress(uuid)'
  ];
BEGIN
  IF cardinality(fns) <> 4 THEN
    RAISE EXCEPTION 'elenco authenticated: attese 4 firme, trovate %', cardinality(fns);
  END IF;

  FOREACH fn IN ARRAY fns LOOP
    IF to_regprocedure(fn) IS NULL THEN
      RAISE EXCEPTION 'firma assente (authenticated): %', fn;
    END IF;
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
    RAISE NOTICE 'authenticated + service_role: %', fn;
  END LOOP;
END
$revoke_anon$;

-- ===== search_path fisso sulle 39 firme con proconfig nullo =====
-- Include anche firme i cui grant non cambiano (matcher, chiavi,
-- trigger di normalizzazione). Non include le firme che avevano già
-- search_path = public, né get_user_email_by_id.
DO $fix_search_path$
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
    IF to_regprocedure(fn) IS NULL THEN
      RAISE EXCEPTION 'firma assente (search_path): %', fn;
    END IF;
    -- public, pg_temp: pg_temp resta in coda e non precede public.
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', fn);
    RAISE NOTICE 'search_path fissato: %', fn;
  END LOOP;
END
$fix_search_path$;

-- ===== restano eseguibili da anon =====
DO $keep_rls_helpers$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public.get_user_artista_id()',
    'public.get_user_role()'
  ];
BEGIN
  -- Non revocare. Le policy RLS TO public chiamano queste due funzioni.
  -- Il controllo fallisce la migration se anon non può più eseguirle:
  -- in quello stato le SELECT anon sulle tabelle policy andrebbero in
  -- errore invece di restituire zero righe.
  FOREACH fn IN ARRAY fns LOOP
    IF to_regprocedure(fn) IS NULL THEN
      RAISE EXCEPTION 'firma RLS assente, non si può confermare il grant anon: %', fn;
    END IF;
    IF NOT has_function_privilege('anon', to_regprocedure(fn), 'EXECUTE')
       OR NOT has_function_privilege('public', to_regprocedure(fn), 'EXECUTE') THEN
      RAISE EXCEPTION
        '% non è eseguibile da anon/PUBLIC: le policy RLS TO public la richiedono', fn;
    END IF;
    RAISE NOTICE 'lasciata eseguibile da anon (RLS): %', fn;
  END LOOP;
END
$keep_rls_helpers$;

-- get_user_email_by_id: l'email esce solo se l'id richiesto è auth.uid(),
-- oppure se public.get_user_role() è admin o operatore. Altrimenti NULL.
-- Decisione confermata: admin e operatore, non il solo admin. I chiamanti
-- (feed attività, updated_by sulla scheda opera) mostrano l'email di altri
-- utenti e quelle pagine le usano anche gli operatori.
--
-- Resta SECURITY DEFINER. search_path resta quello già fissato da
-- 20261020122804 (public, auth, pg_temp): la funzione non è fra le 39 con
-- proconfig nullo, e legge auth.uid() / auth.users. CREATE OR REPLACE non
-- aggiorna i parametri già presenti, quindi l'ALTER sotto è obbligatorio.
--
-- auth.uid() NULL (tipicamente service_role senza JWT) prende il ramo
-- NULL. Nessun chiamante del repo usa questa RPC con la service role.
CREATE OR REPLACE FUNCTION public.get_user_email_by_id(user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $get_user_email_by_id$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  IF get_user_email_by_id.user_id = auth.uid()
     OR public.get_user_role() = ANY (
       ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]
     ) THEN
    RETURN (
      SELECT u.email::text
      FROM auth.users u
      WHERE u.id = get_user_email_by_id.user_id
    );
  END IF;

  RETURN NULL;
END;
$get_user_email_by_id$;

ALTER FUNCTION public.get_user_email_by_id(uuid)
  SET search_path = public, auth, pg_temp;

REVOKE ALL ON FUNCTION public.get_user_email_by_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_email_by_id(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_user_email_by_id(uuid) IS
  'Email di auth.users solo se user_id = auth.uid(), oppure se public.get_user_role() è admin o operatore. Altrimenti NULL.';

-- ===== fallisce la transazione se un grant o un search_path non torna =====
DO $verify_privileges$
DECLARE
  r record;
  bad text[] := ARRAY[]::text[];
  proc regprocedure;
  def text;
BEGIN
  FOR r IN
    SELECT *
    FROM (VALUES
      ('public._rasi_cms_exec(text)', false, false, false, true, 'search_path=public,pg_temp', false, false),
      ('public._rasi_exec_json(text)', false, false, false, true, 'search_path=public,pg_temp', false, false),
      ('public.acquire_campagna_processing_lock(uuid,uuid,numeric)', false, false, false, true, 'search_path=public,pg_temp', true, false),
      ('public.artist_mandate_covers_year(uuid,integer,uuid[])', true, true, true, true, 'search_path=public,pg_temp', false, false),
      ('public.audit_log_auth_user_change()', false, false, false, true, 'search_path=public', true, false),
      ('public.audit_log_row_change()', false, false, false, true, 'search_path=public', true, false),
      ('public.build_match_key(text,integer)', true, true, true, true, 'search_path=public,pg_temp', false, false),
      ('public.build_match_key_strict(text,integer)', true, true, true, true, 'search_path=public,pg_temp', false, false),
      ('public.check_campagna_processing_lock(uuid,numeric)', false, false, false, true, 'search_path=public,pg_temp', true, false),
      ('public.derive_programmazione_episode_signals(integer,integer,text,text,text,text)', true, true, true, true, 'search_path=public,pg_temp', false, false),
      ('public.finalize_campagna_individuazione(uuid,uuid)', false, false, false, true, 'search_path=public,pg_temp', true, false),
      ('public.find_opera_candidates(uuid,real,integer)', true, true, true, true, 'search_path=public,pg_temp', false, false),
      ('public.get_campagna_unprocessed_programmazione_ids(uuid,uuid,integer)', false, false, false, true, 'search_path=public,pg_temp', true, false),
      ('public.get_campagne_individuazione_with_counts()', false, false, false, true, 'search_path=public', true, false),
      ('public.get_campagne_programmazione_with_counts()', false, false, true, true, 'search_path=public', true, false),
      ('public.get_dashboard_stats()', false, false, false, true, 'search_path=public,pg_temp', true, false),
      ('public.get_individuazione_episode_alert_summary(uuid)', false, false, true, true, 'search_path=public', true, false),
      ('public.get_individuazione_episode_alerts(uuid)', false, false, true, true, 'search_path=public', true, false),
      ('public.get_individuazione_processing_progress(uuid)', false, false, false, true, 'search_path=public', true, false),
      ('public.get_processing_progress(uuid)', false, false, true, true, 'search_path=public', true, false),
      ('public.get_user_email_by_id(uuid)', false, false, true, true, 'search_path=public,auth,pg_temp', true, true),
      ('public.init_campagna_individuazione(uuid,text,text,uuid[])', false, false, false, true, 'search_path=public,pg_temp', true, false),
      ('public.match_programmazione_to_partecipazioni(uuid,numeric)', true, true, true, true, 'search_path=public,pg_temp', false, false),
      ('public.match_programmazione_to_partecipazioni(uuid,numeric,uuid[])', true, true, true, true, 'search_path=public,pg_temp', false, false),
      ('public.match_programmazione_to_partecipazioni(uuid,numeric,uuid[],integer,integer)', true, true, true, true, 'search_path=public,pg_temp', false, false),
      ('public.match_programmazione_to_partecipazioni(uuid,numeric,uuid[],integer,integer,uuid[])', true, true, true, true, 'search_path=public,pg_temp', false, false),
      ('public.nome_persona_key(text)', true, true, true, true, 'search_path=public,pg_temp', false, false),
      ('public.normalize_diritto_nome(text)', true, true, true, true, 'search_path=public,pg_temp', false, false),
      ('public.notify_individuazione_change()', true, true, true, true, 'search_path=public,pg_temp', false, false),
      ('public.notify_ripartizione_change()', false, false, false, true, 'search_path=public,pg_temp', true, false),
      ('public.process_batch_individuazioni(uuid,integer,integer)', true, true, true, true, 'search_path=public,pg_temp', false, false),
      ('public.process_campagna_individuazione(uuid,text,text)', true, true, true, true, 'search_path=public,pg_temp', false, false),
      ('public.process_campagna_individuazione_optimized(uuid,text,text,integer)', true, true, true, true, 'search_path=public,pg_temp', false, false),
      ('public.process_films_batch(uuid,uuid,integer,integer)', true, true, true, true, 'search_path=public,pg_temp', false, false),
      ('public.process_programmazioni_chunk(uuid,uuid[],numeric)', false, false, false, true, 'search_path=public,pg_temp', true, false),
      ('public.process_programmazioni_chunk(uuid,uuid[],numeric,uuid[])', false, false, false, true, 'search_path=public,pg_temp', true, false),
      ('public.process_programmazioni_chunk(uuid,uuid[],numeric,uuid[],integer,integer,uuid[])', false, false, false, true, 'search_path=public,pg_temp', true, false),
      ('public.release_campagna_processing_lock(uuid,uuid,text)', false, false, false, true, 'search_path=public,pg_temp', true, false),
      ('public.score_year_overlap(integer,integer,integer,integer,integer,integer)', true, true, true, true, 'search_path=public,pg_temp', false, false),
      ('public.search_artisti_fuzzy(text,real)', true, true, true, true, 'search_path=public,pg_temp', false, false),
      ('public.search_opere_fuzzy(text,real)', true, true, true, true, 'search_path=public,pg_temp', false, false),
      ('public.trg_alias_normalize()', true, true, true, true, 'search_path=public,pg_temp', false, false),
      ('public.trg_opere_sync_match_keys()', true, true, true, true, 'search_path=public,pg_temp', false, false),
      ('public.trg_programmazioni_sync_match_keys()', true, true, true, true, 'search_path=public,pg_temp', false, false),
      ('public.update_search_vector()', true, true, true, true, 'search_path=public,pg_temp', false, false),
      ('public.update_updated_at_column()', false, false, false, true, 'search_path=public,pg_temp', true, false),
      ('public.year_range_bounds(integer,integer)', true, true, true, true, 'search_path=public,pg_temp', false, false),
      ('public.year_ranges_overlap(integer,integer,integer,integer)', true, true, true, true, 'search_path=public,pg_temp', false, false)
    ) AS v(sig, anon_ok, public_ok, auth_ok, svc_ok, path_norm, secdef, check_email)
  LOOP
    proc := to_regprocedure(r.sig);
    IF proc IS NULL THEN
      bad := array_append(bad, r.sig || ': assente');
      CONTINUE;
    END IF;

    IF has_function_privilege('anon', proc, 'EXECUTE') IS DISTINCT FROM r.anon_ok
       OR has_function_privilege('public', proc, 'EXECUTE') IS DISTINCT FROM r.public_ok
       OR has_function_privilege('authenticated', proc, 'EXECUTE') IS DISTINCT FROM r.auth_ok
       OR has_function_privilege('service_role', proc, 'EXECUTE') IS DISTINCT FROM r.svc_ok THEN
      bad := array_append(bad, r.sig || ': grant');
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM unnest(COALESCE((SELECT p.proconfig FROM pg_proc p WHERE p.oid = proc), ARRAY[]::text[])) AS cfg
      WHERE replace(cfg, ' ', '') = r.path_norm
    ) THEN
      bad := array_append(bad, r.sig || ': search_path');
    END IF;

    IF (SELECT p.prosecdef FROM pg_proc p WHERE p.oid = proc) IS DISTINCT FROM r.secdef THEN
      bad := array_append(bad, r.sig || ': prosecdef');
    END IF;

    IF r.check_email THEN
      def := pg_get_functiondef(proc);
      IF def NOT LIKE '%auth.uid()%'
         OR def NOT LIKE '%public.get_user_role()%'
         OR def NOT LIKE '%''admin''%'
         OR def NOT LIKE '%''operatore''%'
         OR def NOT LIKE '%RETURN NULL%' THEN
        bad := array_append(bad, r.sig || ': corpo');
      END IF;
    END IF;
  END LOOP;

  IF cardinality(bad) > 0 THEN
    RAISE EXCEPTION 'verifica privilegi fallita, migration annullata: %', bad;
  END IF;

  RAISE NOTICE 'hardening funzioni public: verifica interna ok';
END
$verify_privileges$;
