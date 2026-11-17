-- Verifica dopo 20261112120000_pin_helper_search_path.sql.
-- Solo lettura, più un SET LOCAL ROLE annullato dal ROLLBACK finale:
-- non modifica grant, corpi, search_path né dati.
--
-- Prerequisito: la migration è già applicata.
--
-- Esecuzione:
--   psql -v ON_ERROR_STOP=1 -f supabase/scripts/20261112120000_pin_helper_search_path_check.sql
--
-- Output: NOTICE PASS. Un controllo mancato termina con EXCEPTION.
--
-- Lo script 20261105120000_harden_function_privileges_check.sql descrive
-- lo stato di quella migration e si aspetta ancora search_path nullo
-- sulle quattro helper. Dopo questo intervento quel controllo, su
-- quelle quattro firme, non è più lo stato corrente.

BEGIN;

DO $pin_helper_search_path_check$
DECLARE
  fn text;
  proc regprocedure;
  def text;
  v_policies int;
  v_views int;
  v_bounds record;
  v_regrant boolean;
  helper text[] := ARRAY[
    'public.build_match_key_strict(text,integer)',
    'public.build_match_key(text,integer)',
    'public.year_range_bounds(integer,integer)',
    'public.year_ranges_overlap(integer,integer,integer,integer)'
  ];
  guarded text[] := ARRAY[
    'public.delete_campagna_individuazione_safe(uuid,uuid,integer)',
    'public.delete_campagna_programmazione_safe(uuid,uuid,integer)',
    'public.get_campagne_programmazione_with_counts()',
    'public.get_dashboard_metrics(date,date)',
    'public.get_individuazione_detail_stats(uuid)',
    'public.get_individuazione_episode_alert_summary(uuid)',
    'public.get_individuazione_episode_alerts(uuid)',
    'public.get_processing_progress(uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY helper LOOP
    proc := to_regprocedure(fn);
    IF proc IS NULL THEN
      RAISE EXCEPTION 'FAIL firma assente: %', fn;
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM unnest(COALESCE((SELECT p.proconfig FROM pg_proc p WHERE p.oid = proc), ARRAY[]::text[])) AS cfg
      WHERE replace(cfg, ' ', '') = 'search_path=public,pg_temp'
    ) THEN
      RAISE EXCEPTION 'FAIL search_path: %', fn;
    END IF;
    IF (SELECT p.prosecdef FROM pg_proc p WHERE p.oid = proc)
       OR (SELECT l.lanname FROM pg_proc p JOIN pg_language l ON l.oid = p.prolang WHERE p.oid = proc) IS DISTINCT FROM 'sql'
       OR (SELECT p.provolatile FROM pg_proc p WHERE p.oid = proc) IS DISTINCT FROM 'i' THEN
      RAISE EXCEPTION 'FAIL linguaggio, volatilità o security definer: %', fn;
    END IF;
    IF NOT has_function_privilege('anon', proc, 'EXECUTE')
       OR NOT has_function_privilege('public', proc, 'EXECUTE')
       OR NOT has_function_privilege('authenticated', proc, 'EXECUTE')
       OR NOT has_function_privilege('service_role', proc, 'EXECUTE') THEN
      RAISE EXCEPTION 'FAIL grant helper modificati: %', fn;
    END IF;
    def := pg_get_functiondef(proc);
    IF def ~* 'similarity\s*\(|unaccent\s*\(|word_similarity\s*\(' THEN
      RAISE EXCEPTION 'FAIL il corpo cita un''estensione: %', fn;
    END IF;
  END LOOP;
  RAISE NOTICE 'PASS search_path, linguaggio e grant delle quattro helper';

  IF public.build_match_key_strict('MADAMA (LA)', 2020) IS DISTINCT FROM 'madama::2020'
     OR public.build_match_key_strict('Show: Season 2', NULL) IS DISTINCT FROM 'show'
     OR public.build_match_key_strict('FILM THE THING', NULL) IS DISTINCT FROM 'thing'
     OR public.build_match_key_strict(NULL, 1999) IS DISTINCT FROM ''
     OR public.build_match_key_strict('   ', 1) IS DISTINCT FROM ''
     OR public.build_match_key('Vikings 5', NULL) IS DISTINCT FROM 'vikings'
     OR public.build_match_key('Show: Part 2', 2019) IS DISTINCT FROM 'show::2019' THEN
    RAISE EXCEPTION 'FAIL chiavi di match diverse dal contratto';
  END IF;

  SELECT b.range_start, b.range_end
    INTO v_bounds
  FROM public.year_range_bounds(2015, 2010) AS b;
  IF v_bounds.range_start IS DISTINCT FROM 2010
     OR v_bounds.range_end IS DISTINCT FROM 2015 THEN
    RAISE EXCEPTION 'FAIL year_range_bounds';
  END IF;

  SELECT b.range_start, b.range_end
    INTO v_bounds
  FROM public.year_range_bounds(2010, NULL) AS b;
  IF v_bounds.range_start IS DISTINCT FROM 2010
     OR v_bounds.range_end IS DISTINCT FROM 2010 THEN
    RAISE EXCEPTION 'FAIL year_range_bounds con fine nulla';
  END IF;

  IF public.year_ranges_overlap(2010, 2012, 2012, 2014) IS DISTINCT FROM true
     OR public.year_ranges_overlap(2010, 2011, 2013, 2014) IS DISTINCT FROM false
     OR public.year_ranges_overlap(2012, 2010, 2011, 2011) IS DISTINCT FROM true
     OR public.year_ranges_overlap(NULL, NULL, 2010, 2011) IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL year_ranges_overlap';
  END IF;
  RAISE NOTICE 'PASS valori di match e di intervallo';

  SELECT count(*)
    INTO v_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (roles::text = '{public}' OR roles::text LIKE '%anon%')
    AND (
      COALESCE(qual, '') ~* 'get_user_role|get_user_artista_id'
      OR COALESCE(with_check, '') ~* 'get_user_role|get_user_artista_id'
    );

  SELECT count(*)
    INTO v_views
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('v', 'm')
    AND pg_get_viewdef(c.oid, true) ~* 'get_user_role|get_user_artista_id';

  IF v_policies < 1 THEN
    RAISE EXCEPTION 'FAIL nessuna policy anon/public chiama get_user_role o get_user_artista_id';
  END IF;
  IF v_views <> 0 THEN
    RAISE EXCEPTION 'FAIL viste inattese che chiamano le helper di ruolo: %', v_views;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ruoli_tipologie'
      AND policyname = 'config_tables_public_read'
      AND roles::text = '{public}'
      AND COALESCE(qual, '') !~* 'get_user_role'
      AND COALESCE(with_check, '') !~* 'get_user_role'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ruoli_tipologie'
      AND policyname = 'ruoli_tipologie_select_policy'
      AND roles::text = '{public}'
      AND COALESCE(qual, '') ~* 'get_user_role'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pages'
      AND cmd = 'INSERT'
      AND roles::text = '{public}'
      AND COALESCE(with_check, '') ~* 'get_user_role'
  ) THEN
    RAISE EXCEPTION 'FAIL policy di riferimento (ruoli_tipologie o pages) assente';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pages'
      AND cmd = 'SELECT'
      AND (
        COALESCE(qual, '') ~* 'get_user_role|get_user_artista_id'
        OR COALESCE(with_check, '') ~* 'get_user_role|get_user_artista_id'
      )
  ) THEN
    RAISE EXCEPTION 'FAIL una SELECT di pages chiama get_user_role: rivalutare il grant anon';
  END IF;

  IF NOT has_function_privilege('anon', 'public.get_user_role()'::regprocedure, 'EXECUTE')
     OR NOT has_function_privilege('public', 'public.get_user_role()'::regprocedure, 'EXECUTE')
     OR NOT has_function_privilege('anon', 'public.get_user_artista_id()'::regprocedure, 'EXECUTE')
     OR NOT has_function_privilege('public', 'public.get_user_artista_id()'::regprocedure, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL EXECUTE anon/PUBLIC revocato sulle helper RLS';
  END IF;
  RAISE NOTICE 'PASS grant anon lasciati: % policy pubbliche, % viste', v_policies, v_views;

  def := pg_get_functiondef('public.get_user_email_by_id(uuid)'::regprocedure);
  IF def NOT LIKE '%auth.uid()%'
     OR def NOT LIKE '%public.get_user_role()%'
     OR def NOT LIKE '%''admin''%'
     OR def NOT LIKE '%''operatore''%'
     OR def NOT LIKE '%RETURN NULL%'
     OR def NOT LIKE '%SECURITY DEFINER%' THEN
    RAISE EXCEPTION 'FAIL guard di get_user_email_by_id assente';
  END IF;
  RAISE NOTICE 'PASS get_user_email_by_id: guard admin/operatore oppure auth.uid()';

  -- Il bootstrap locale, dopo le migration, esegue GRANT ALL ON ALL
  -- ROUTINES ai ruoli API. Quel passo riallarga i grant che le
  -- migration avevano chiuso. Su un database in cui i grant delle
  -- migration sono intatti (anon non esegue get_dashboard_metrics) i
  -- controlli sotto sono vincolanti.
  v_regrant := has_function_privilege(
    'anon',
    'public.get_dashboard_metrics(date,date)'::regprocedure,
    'EXECUTE'
  );

  FOREACH fn IN ARRAY guarded LOOP
    proc := to_regprocedure(fn);
    IF proc IS NULL THEN
      RAISE EXCEPTION 'FAIL firma staff assente: %', fn;
    END IF;
    def := pg_get_functiondef(proc);
    IF def NOT LIKE '%ERRCODE = ''42501''%'
       OR def NOT LIKE '%get_user_role()%'
       OR def NOT LIKE '%''admin''%'
       OR def NOT LIKE '%''operatore''%' THEN
      RAISE EXCEPTION 'FAIL guard assente: %', fn;
    END IF;
    IF NOT v_regrant
       AND (
         has_function_privilege('anon', proc, 'EXECUTE')
         OR has_function_privilege('public', proc, 'EXECUTE')
       ) THEN
      RAISE EXCEPTION 'FAIL funzione staff eseguibile da anon o PUBLIC: %', fn;
    END IF;
  END LOOP;

  IF NOT v_regrant
     AND (
       has_function_privilege('anon', 'public.get_user_email_by_id(uuid)'::regprocedure, 'EXECUTE')
       OR has_function_privilege('public', 'public.get_user_email_by_id(uuid)'::regprocedure, 'EXECUTE')
     ) THEN
    RAISE EXCEPTION 'FAIL get_user_email_by_id eseguibile da anon o PUBLIC';
  END IF;

  proc := to_regprocedure('public.delete_campagna_individuazione_safe(uuid)');
  IF proc IS NULL THEN
    RAISE EXCEPTION 'FAIL delete_campagna_individuazione_safe(uuid) assente';
  END IF;
  IF pg_get_functiondef(proc) LIKE '%42501%' THEN
    RAISE EXCEPTION 'FAIL delete_campagna_individuazione_safe(uuid) ha un guard non previsto';
  END IF;
  IF NOT v_regrant
     AND (
       has_function_privilege('anon', proc, 'EXECUTE')
       OR has_function_privilege('authenticated', proc, 'EXECUTE')
     ) THEN
    RAISE EXCEPTION 'FAIL delete_campagna_individuazione_safe(uuid) eseguibile da anon o authenticated';
  END IF;

  -- Presente in produzione, non creata dalle migration del repo.
  proc := to_regprocedure('public.get_individuazione_processing_progress(uuid)');
  IF proc IS NULL THEN
    RAISE NOTICE 'PASS get_individuazione_processing_progress assente in questo database';
  ELSE
    IF pg_get_functiondef(proc) LIKE '%42501%' THEN
      RAISE EXCEPTION 'FAIL get_individuazione_processing_progress ha un guard non previsto';
    END IF;
    IF NOT v_regrant
       AND (
         has_function_privilege('anon', proc, 'EXECUTE')
         OR has_function_privilege('authenticated', proc, 'EXECUTE')
       ) THEN
      RAISE EXCEPTION 'FAIL get_individuazione_processing_progress eseguibile da anon o authenticated';
    END IF;
    RAISE NOTICE 'PASS get_individuazione_processing_progress senza guard di ruolo';
  END IF;

  IF v_regrant THEN
    RAISE NOTICE 'PASS corpi staff; grant API riallargati dal bootstrap locale, controllo grant non vincolante';
  ELSE
    RAISE NOTICE 'PASS otto funzioni authenticated con guard 42501 e senza EXECUTE anon';
    RAISE NOTICE 'PASS follow-up: due overload solo service_role, senza guard di ruolo';
  END IF;
END
$pin_helper_search_path_check$;

-- La SELECT anon su ruoli_tipologie deve arrivare alle policy, non
-- morire su "permission denied for function get_user_role".
DO $pin_helper_anon_select$
DECLARE
  v_role text;
  v_seen int;
BEGIN
  PERFORM set_config('role', 'anon', true);
  SELECT public.get_user_role()::text INTO v_role;
  IF v_role IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL get_user_role() come anon = %', v_role;
  END IF;
  IF public.get_user_artista_id() IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL get_user_artista_id() come anon non è NULL';
  END IF;

  IF has_table_privilege('anon', 'public.ruoli_tipologie', 'SELECT') THEN
    SELECT count(*) INTO v_seen FROM public.ruoli_tipologie;
    RAISE NOTICE 'PASS anon legge ruoli_tipologie (%) senza errore sulla funzione', v_seen;
  ELSE
    RAISE NOTICE 'PASS get_user_role anon è NULL; SELECT su ruoli_tipologie non concessa in questo database';
  END IF;

  PERFORM set_config('role', 'none', true);
END
$pin_helper_anon_select$;

ROLLBACK;
