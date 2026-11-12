-- Fissa search_path sulle quattro funzioni LANGUAGE sql che l'advisor
-- function_search_path_mutable segnala ancora su jdflzupcfwdcajxfobfj
-- (lettura del 12/11/2026): build_match_key_strict, build_match_key,
-- year_ranges_overlap, year_range_bounds.
--
-- ALTER FUNCTION, non CREATE OR REPLACE: firma, linguaggio, volatilità,
-- PARALLEL SAFE, proprietario, grant e corpo restano quelli già in
-- catalogo. Si aggiunge solo il parametro.
--
-- Scelta: search_path = public, pg_temp.
-- I corpi non citano oggetti di estensione. In public ci sono pg_trgm,
-- http e btree_gin, ma queste quattro usano solo funzioni di pg_catalog
-- (regexp_replace, lower, trim, replace, translate, length, least,
-- greatest, coalesce) e due chiamate già qualificate:
--   public.build_match_key_strict(text, integer)
--   public.year_range_bounds(integer, integer)
-- pg_catalog non è nell'elenco: Postgres lo cerca comunque prima degli
-- schemi del path, quindi i nomi di sistema si risolvono come oggi.
-- pg_temp sta in coda e non precede public.
-- search_path = '' darebbe gli stessi valori su questi corpi. Non si
-- usa, per restare allineati alle altre funzioni del progetto e per
-- continuare a risolvere un eventuale nome di public se un corpo
-- futuro lo citasse senza schema.
--
-- Costo noto, già misurato prima di escluderle da
-- 20261105120000_harden_function_privileges.sql: una funzione SQL con
-- una clausola SET non viene più inlined. build_match_key in un WHERE
-- su 5000 titoli passava da 91 ms a 319 ms; year_ranges_overlap, con
-- SET anche su year_range_bounds, circa 11 volte. I valori restituiti
-- non cambiano. Il matcher e i trigger che ricalcolano le chiavi
-- restano corretti, più lenti sulle scansioni riga per riga.
--
-- Non revoca EXECUTE su public.get_user_role() né su
-- public.get_user_artista_id(). Sono SECURITY DEFINER ed eseguibili da
-- anon, e l'advisor anon_security_definer_function_executable le
-- segnala. Le policy RLS sono TO public e le chiamano: togliere
-- EXECUTE a anon e a PUBLIC farebbe fallire la query anon con
-- "permission denied for function" invece di applicare la policy.
-- config_tables_public_read su ruoli_tipologie è USING (true) e non
-- chiama la funzione, ma convive con ruoli_tipologie_select_policy,
-- che la chiama, sullo stesso SELECT: le policy permissiva si sommano
-- in OR e Postgres valuta anche la seconda. Le SELECT pubbliche di
-- pages non chiamano get_user_role(); le policy di scrittura di pages,
-- documents e bandi_news sì. In public non ci sono viste.
-- Se policy e viste raggiungibili da anon spariscono, la migration
-- fallisce senza revocare: il REVOKE va deciso a parte, non in
-- silenzio.
--
-- get_user_email_by_id(uuid) non si riscrive. Il corpo già in catalogo
-- (20261105120000) restituisce l'email solo se user_id = auth.uid()
-- oppure se get_user_role() è admin o operatore; altrimenti NULL.
-- Un artista non legge l'email di un altro utente. I chiamanti in
-- src/ sono la scheda opera (updated_by) e il feed attività: il
-- middleware manda il ruolo artista su /dashboard/profilo, quindi
-- quelle pagine non sono un chiamante artista. La migration fallisce
-- se il guard sparisce dal corpo.
--
-- Le funzioni SECURITY DEFINER eseguibili da authenticated
-- (delete_campagna_*_safe a tre argomenti, get_campagne_programmazione_with_counts,
-- get_dashboard_metrics, get_individuazione_detail_stats,
-- get_individuazione_episode_alert_summary, get_individuazione_episode_alerts,
-- get_processing_progress) hanno già il guard 42501 da 20261106220000.
-- Non si toccano. La migration fallisce se il guard manca.
-- Restano senza guard, e fuori da questo intervento:
--   delete_campagna_individuazione_safe(uuid)  — solo service_role
--   get_individuazione_processing_progress(uuid) — solo service_role
-- Un guard su get_user_role() le chiuderebbe anche a service_role,
-- che non ha un ruolo applicativo. Non è una modifica da una riga.
--
-- Idempotente. La CLI Supabase avvolge il file in una transazione:
-- niente BEGIN interno, niente CREATE INDEX CONCURRENTLY.
-- Non applicare al progetto jdflzupcfwdcajxfobfj senza OK esplicito.

DO $pin_helper_search_path_preflight$
DECLARE
  fn text;
  def text;
  v_policies int;
  fns text[] := ARRAY[
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
  IF cardinality(fns) <> 4 OR cardinality(guarded) <> 8 THEN
    RAISE EXCEPTION 'elenchi preflight non allineati';
  END IF;

  FOREACH fn IN ARRAY fns LOOP
    IF to_regprocedure(fn) IS NULL THEN
      RAISE EXCEPTION 'firma assente, search_path non impostato: %', fn;
    END IF;
  END LOOP;

  -- Prima degli ALTER: se il preflight fallisce, un psql senza
  -- transazione esterna non lascia il search_path a metà.
  SELECT count(*)
    INTO v_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (roles::text = '{public}' OR roles::text LIKE '%anon%')
    AND (
      COALESCE(qual, '') ~* 'get_user_role|get_user_artista_id'
      OR COALESCE(with_check, '') ~* 'get_user_role|get_user_artista_id'
    );
  IF COALESCE(v_policies, 0) = 0 THEN
    RAISE EXCEPTION
      'nessuna policy TO public/anon chiama get_user_role o get_user_artista_id: non si revoca in questa migration';
  END IF;

  def := pg_get_functiondef('public.get_user_email_by_id(uuid)'::regprocedure);
  IF def NOT LIKE '%auth.uid()%'
     OR def NOT LIKE '%public.get_user_role()%'
     OR def NOT LIKE '%''admin''%'
     OR def NOT LIKE '%''operatore''%'
     OR def NOT LIKE '%RETURN NULL%' THEN
    RAISE EXCEPTION 'get_user_email_by_id senza guard: migration interrotta prima del search_path';
  END IF;

  FOREACH fn IN ARRAY guarded LOOP
    IF to_regprocedure(fn) IS NULL THEN
      RAISE EXCEPTION 'firma staff assente: %', fn;
    END IF;
    def := pg_get_functiondef(to_regprocedure(fn));
    IF def NOT LIKE '%ERRCODE = ''42501''%'
       OR def NOT LIKE '%get_user_role()%' THEN
      RAISE EXCEPTION 'guard 42501 assente, migration interrotta: %', fn;
    END IF;
  END LOOP;
END
$pin_helper_search_path_preflight$;

ALTER FUNCTION public.build_match_key_strict(text, integer)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.build_match_key(text, integer)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.year_range_bounds(integer, integer)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.year_ranges_overlap(integer, integer, integer, integer)
  SET search_path = public, pg_temp;

DO $pin_helper_search_path_verify$
DECLARE
  fn text;
  proc regprocedure;
  bad text[] := ARRAY[]::text[];
  def text;
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
  v_policies int;
  v_views int;
  v_bounds record;
  v_key text;
BEGIN
  IF cardinality(helper) <> 4 OR cardinality(guarded) <> 8 THEN
    RAISE EXCEPTION 'elenchi di verifica non allineati';
  END IF;

  FOREACH fn IN ARRAY helper LOOP
    proc := to_regprocedure(fn);
    IF proc IS NULL THEN
      bad := array_append(bad, fn || ': assente');
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM unnest(COALESCE((SELECT p.proconfig FROM pg_proc p WHERE p.oid = proc), ARRAY[]::text[])) AS cfg
      WHERE replace(cfg, ' ', '') = 'search_path=public,pg_temp'
    ) THEN
      bad := array_append(bad, fn || ': search_path');
    END IF;

    -- I grant non cambiano: anon, PUBLIC, authenticated e service_role
    -- potevano eseguire gli helper e continuano a poterlo fare.
    IF NOT has_function_privilege('anon', proc, 'EXECUTE')
       OR NOT has_function_privilege('public', proc, 'EXECUTE')
       OR NOT has_function_privilege('authenticated', proc, 'EXECUTE')
       OR NOT has_function_privilege('service_role', proc, 'EXECUTE') THEN
      bad := array_append(bad, fn || ': grant');
    END IF;

    IF (SELECT p.prosecdef FROM pg_proc p WHERE p.oid = proc) THEN
      bad := array_append(bad, fn || ': prosecdef');
    END IF;

    def := pg_get_functiondef(proc);
    IF def ~* 'similarity\s*\(|unaccent\s*\(|word_similarity\s*\(' THEN
      bad := array_append(bad, fn || ': cita un''estensione, rivalutare search_path');
    END IF;
  END LOOP;

  v_key := public.build_match_key_strict('MADAMA (LA)', 2020);
  IF v_key IS DISTINCT FROM 'madama::2020' THEN
    bad := array_append(bad, 'build_match_key_strict MADAMA (LA) = ' || COALESCE(v_key, '<null>'));
  END IF;

  v_key := public.build_match_key_strict('Show: Season 2', NULL);
  IF v_key IS DISTINCT FROM 'show' THEN
    bad := array_append(bad, 'build_match_key_strict Show: Season 2 = ' || COALESCE(v_key, '<null>'));
  END IF;

  v_key := public.build_match_key_strict('FILM THE THING', NULL);
  IF v_key IS DISTINCT FROM 'thing' THEN
    bad := array_append(bad, 'build_match_key_strict FILM THE THING = ' || COALESCE(v_key, '<null>'));
  END IF;

  v_key := public.build_match_key('Vikings 5', NULL);
  IF v_key IS DISTINCT FROM 'vikings' THEN
    bad := array_append(bad, 'build_match_key Vikings 5 = ' || COALESCE(v_key, '<null>'));
  END IF;

  v_key := public.build_match_key_strict(NULL, 1999);
  IF v_key IS DISTINCT FROM '' THEN
    bad := array_append(bad, 'build_match_key_strict NULL = ' || COALESCE(v_key, '<null>'));
  END IF;

  SELECT b.range_start, b.range_end
    INTO v_bounds
  FROM public.year_range_bounds(2015, 2010) AS b;
  IF v_bounds.range_start IS DISTINCT FROM 2010
     OR v_bounds.range_end IS DISTINCT FROM 2015 THEN
    bad := array_append(bad, 'year_range_bounds(2015, 2010)');
  END IF;

  IF public.year_ranges_overlap(2010, 2012, 2012, 2014) IS DISTINCT FROM true
     OR public.year_ranges_overlap(2010, 2011, 2013, 2014) IS DISTINCT FROM false
     OR public.year_ranges_overlap(2012, 2010, 2011, 2011) IS DISTINCT FROM true THEN
    bad := array_append(bad, 'year_ranges_overlap');
  END IF;

  -- get_user_role / get_user_artista_id: si lasciano eseguibili da anon
  -- solo perché una policy o una vista raggiungibile da anon le chiama.
  SELECT count(*)
    INTO v_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (
      roles::text = '{public}'
      OR roles::text LIKE '%anon%'
    )
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

  IF COALESCE(v_policies, 0) = 0 AND COALESCE(v_views, 0) = 0 THEN
    RAISE EXCEPTION
      'nessuna policy TO public/anon e nessuna vista di public chiama get_user_role o get_user_artista_id: non si revoca in questa migration, va deciso un REVOKE esplicito';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ruoli_tipologie'
      AND policyname = 'ruoli_tipologie_select_policy'
      AND roles::text = '{public}'
      AND COALESCE(qual, '') ~* 'get_user_role'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ruoli_tipologie'
      AND policyname = 'config_tables_public_read'
      AND roles::text = '{public}'
      AND COALESCE(qual, '') !~* 'get_user_role'
      AND COALESCE(with_check, '') !~* 'get_user_role'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pages'
      AND cmd = 'INSERT'
      AND roles::text = '{public}'
      AND COALESCE(with_check, '') ~* 'get_user_role'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artisti'
      AND cmd = 'SELECT'
      AND roles::text = '{public}'
      AND COALESCE(qual, '') ~* 'get_user_artista_id'
  ) THEN
    bad := array_append(bad, 'policy anon di riferimento assente o cambiata');
  END IF;

  IF NOT has_function_privilege('anon', 'public.get_user_role()'::regprocedure, 'EXECUTE')
     OR NOT has_function_privilege('public', 'public.get_user_role()'::regprocedure, 'EXECUTE')
     OR NOT has_function_privilege('anon', 'public.get_user_artista_id()'::regprocedure, 'EXECUTE')
     OR NOT has_function_privilege('public', 'public.get_user_artista_id()'::regprocedure, 'EXECUTE') THEN
    bad := array_append(bad, 'EXECUTE anon/PUBLIC su get_user_role o get_user_artista_id');
  END IF;

  def := pg_get_functiondef('public.get_user_email_by_id(uuid)'::regprocedure);
  IF def NOT LIKE '%auth.uid()%'
     OR def NOT LIKE '%public.get_user_role()%'
     OR def NOT LIKE '%''admin''%'
     OR def NOT LIKE '%''operatore''%'
     OR def NOT LIKE '%RETURN NULL%' THEN
    bad := array_append(bad, 'get_user_email_by_id: guard assente, non si lascia il corpo com''è');
  END IF;

  FOREACH fn IN ARRAY guarded LOOP
    proc := to_regprocedure(fn);
    IF proc IS NULL THEN
      bad := array_append(bad, fn || ': assente');
      CONTINUE;
    END IF;
    def := pg_get_functiondef(proc);
    IF def NOT LIKE '%ERRCODE = ''42501''%'
       OR def NOT LIKE '%insufficient_privilege%'
       OR def NOT LIKE '%get_user_role()%'
       OR def NOT LIKE '%''admin''%'
       OR def NOT LIKE '%''operatore''%' THEN
      bad := array_append(bad, fn || ': guard 42501 assente');
    END IF;
  END LOOP;

  -- delete_campagna_individuazione_safe(uuid) è nel repo ed è solo
  -- service_role. get_individuazione_processing_progress(uuid) c'è in
  -- produzione (solo service_role, senza guard) ma non ha un CREATE
  -- nelle migration: su un database costruito solo dal repo può mancare.
  -- In entrambi i casi non si aggiunge un guard.
  proc := to_regprocedure('public.delete_campagna_individuazione_safe(uuid)');
  IF proc IS NULL THEN
    bad := array_append(bad, 'delete_campagna_individuazione_safe(uuid) assente');
  ELSIF pg_get_functiondef(proc) LIKE '%42501%' THEN
    bad := array_append(bad, 'delete_campagna_individuazione_safe(uuid) riscritto');
  END IF;

  proc := to_regprocedure('public.get_individuazione_processing_progress(uuid)');
  IF proc IS NOT NULL AND pg_get_functiondef(proc) LIKE '%42501%' THEN
    bad := array_append(bad, 'get_individuazione_processing_progress riscritto');
  END IF;

  IF cardinality(bad) > 0 THEN
    RAISE EXCEPTION 'pin search_path helper annullato: %', bad;
  END IF;

  RAISE NOTICE
    'search_path helper fissato. Policy anon che chiamano get_user_role/get_user_artista_id: %. Viste: %. Grant anon lasciati.',
    v_policies, v_views;
END
$pin_helper_search_path_verify$;
