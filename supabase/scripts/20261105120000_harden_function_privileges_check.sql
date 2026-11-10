-- Verifica read-only dopo 20261105120000_harden_function_privileges.sql.
-- Solo SELECT: non modifica grant, corpi, search_path, dati.
--
-- Ogni riga di firma deve avere esito = ok. La riga RIEPILOGO è ok solo
-- se non ci sono assenti o fail. get_user_role e get_user_artista_id sono
-- nell'elenco per confermare che anon e PUBLIC possono ancora eseguirle.
--
-- atteso_search_path NULL significa: search_path non impostato. Vale per
-- build_match_key, build_match_key_strict, year_range_bounds e
-- year_ranges_overlap. La migration non le tocca: sono LANGUAGE sql
-- inlinabili e un SET le rallenta (build_match_key su 5000 titoli da
-- 91 ms a 319 ms; year_ranges_overlap circa 11 volte). L'avviso advisor
-- su queste quattro è accettato.

WITH expected (
  signature,
  atteso_anon,
  atteso_public,
  atteso_authenticated,
  atteso_service_role,
  atteso_search_path,
  atteso_prosecdef,
  controlla_corpo_email
) AS (
  VALUES
    ('_rasi_cms_exec(text)'::text, false, false, false, true, 'search_path=public,pg_temp'::text, false, false),
    ('_rasi_exec_json(text)'::text, false, false, false, true, 'search_path=public,pg_temp'::text, false, false),
    ('acquire_campagna_processing_lock(uuid,uuid,numeric)'::text, false, false, false, true, 'search_path=public,pg_temp'::text, true, false),
    ('artist_mandate_covers_year(uuid,integer,uuid[])'::text, true, true, true, true, 'search_path=public,pg_temp'::text, false, false),
    ('audit_log_auth_user_change()'::text, false, false, false, true, 'search_path=public'::text, true, false),
    ('audit_log_row_change()'::text, false, false, false, true, 'search_path=public'::text, true, false),
    ('build_match_key(text,integer)'::text, true, true, true, true, NULL::text, false, false),
    ('build_match_key_strict(text,integer)'::text, true, true, true, true, NULL::text, false, false),
    ('check_campagna_processing_lock(uuid,numeric)'::text, false, false, false, true, 'search_path=public,pg_temp'::text, true, false),
    ('derive_programmazione_episode_signals(integer,integer,text,text,text,text)'::text, true, true, true, true, 'search_path=public,pg_temp'::text, false, false),
    ('finalize_campagna_individuazione(uuid,uuid)'::text, false, false, false, true, 'search_path=public,pg_temp'::text, true, false),
    ('find_opera_candidates(uuid,real,integer)'::text, true, true, true, true, 'search_path=public,pg_temp'::text, false, false),
    ('get_campagna_unprocessed_programmazione_ids(uuid,uuid,integer)'::text, false, false, false, true, 'search_path=public,pg_temp'::text, true, false),
    ('get_campagne_individuazione_with_counts()'::text, false, false, false, true, 'search_path=public'::text, true, false),
    ('get_campagne_programmazione_with_counts()'::text, false, false, true, true, 'search_path=public'::text, true, false),
    ('get_dashboard_stats()'::text, false, false, false, true, 'search_path=public,pg_temp'::text, true, false),
    ('get_individuazione_episode_alert_summary(uuid)'::text, false, false, true, true, 'search_path=public'::text, true, false),
    ('get_individuazione_episode_alerts(uuid)'::text, false, false, true, true, 'search_path=public'::text, true, false),
    ('get_individuazione_processing_progress(uuid)'::text, false, false, false, true, 'search_path=public'::text, true, false),
    ('get_processing_progress(uuid)'::text, false, false, true, true, 'search_path=public'::text, true, false),
    ('get_user_artista_id()'::text, true, true, true, true, 'search_path=public'::text, true, false),
    ('get_user_email_by_id(uuid)'::text, false, false, true, true, 'search_path=public,auth,pg_temp'::text, true, true),
    ('get_user_role()'::text, true, true, true, true, 'search_path=public'::text, true, false),
    ('init_campagna_individuazione(uuid,text,text,uuid[])'::text, false, false, false, true, 'search_path=public,pg_temp'::text, true, false),
    ('match_programmazione_to_partecipazioni(uuid,numeric)'::text, true, true, true, true, 'search_path=public,pg_temp'::text, false, false),
    ('match_programmazione_to_partecipazioni(uuid,numeric,uuid[])'::text, true, true, true, true, 'search_path=public,pg_temp'::text, false, false),
    ('match_programmazione_to_partecipazioni(uuid,numeric,uuid[],integer,integer)'::text, true, true, true, true, 'search_path=public,pg_temp'::text, false, false),
    ('match_programmazione_to_partecipazioni(uuid,numeric,uuid[],integer,integer,uuid[])'::text, true, true, true, true, 'search_path=public,pg_temp'::text, false, false),
    ('nome_persona_key(text)'::text, true, true, true, true, 'search_path=public,pg_temp'::text, false, false),
    ('normalize_diritto_nome(text)'::text, true, true, true, true, 'search_path=public,pg_temp'::text, false, false),
    ('notify_individuazione_change()'::text, true, true, true, true, 'search_path=public,pg_temp'::text, false, false),
    ('notify_ripartizione_change()'::text, false, false, false, true, 'search_path=public,pg_temp'::text, true, false),
    ('process_batch_individuazioni(uuid,integer,integer)'::text, true, true, true, true, 'search_path=public,pg_temp'::text, false, false),
    ('process_campagna_individuazione(uuid,text,text)'::text, true, true, true, true, 'search_path=public,pg_temp'::text, false, false),
    ('process_campagna_individuazione_optimized(uuid,text,text,integer)'::text, true, true, true, true, 'search_path=public,pg_temp'::text, false, false),
    ('process_films_batch(uuid,uuid,integer,integer)'::text, true, true, true, true, 'search_path=public,pg_temp'::text, false, false),
    ('process_programmazioni_chunk(uuid,uuid[],numeric)'::text, false, false, false, true, 'search_path=public,pg_temp'::text, true, false),
    ('process_programmazioni_chunk(uuid,uuid[],numeric,uuid[])'::text, false, false, false, true, 'search_path=public,pg_temp'::text, true, false),
    ('process_programmazioni_chunk(uuid,uuid[],numeric,uuid[],integer,integer,uuid[])'::text, false, false, false, true, 'search_path=public,pg_temp'::text, true, false),
    ('release_campagna_processing_lock(uuid,uuid,text)'::text, false, false, false, true, 'search_path=public,pg_temp'::text, true, false),
    ('score_year_overlap(integer,integer,integer,integer,integer,integer)'::text, true, true, true, true, 'search_path=public,pg_temp'::text, false, false),
    ('search_artisti_fuzzy(text,real)'::text, true, true, true, true, 'search_path=public,pg_temp'::text, false, false),
    ('search_opere_fuzzy(text,real)'::text, true, true, true, true, 'search_path=public,pg_temp'::text, false, false),
    ('trg_alias_normalize()'::text, true, true, true, true, 'search_path=public,pg_temp'::text, false, false),
    ('trg_opere_sync_match_keys()'::text, true, true, true, true, 'search_path=public,pg_temp'::text, false, false),
    ('trg_programmazioni_sync_match_keys()'::text, true, true, true, true, 'search_path=public,pg_temp'::text, false, false),
    ('update_search_vector()'::text, true, true, true, true, 'search_path=public,pg_temp'::text, false, false),
    ('update_updated_at_column()'::text, false, false, false, true, 'search_path=public,pg_temp'::text, true, false),
    ('year_range_bounds(integer,integer)'::text, true, true, true, true, NULL::text, false, false),
    ('year_ranges_overlap(integer,integer,integer,integer)'::text, true, true, true, true, NULL::text, false, false)
),
report AS (
  SELECT
    e.signature,
    p.oid::regprocedure::text AS firma_db,
    p.prosecdef,
    p.proconfig,
    p.proacl::text AS proacl,
    CASE WHEN p.oid IS NULL THEN NULL ELSE has_function_privilege('anon', p.oid, 'EXECUTE') END AS anon_execute,
    CASE WHEN p.oid IS NULL THEN NULL ELSE has_function_privilege('public', p.oid, 'EXECUTE') END AS public_execute,
    CASE WHEN p.oid IS NULL THEN NULL ELSE has_function_privilege('authenticated', p.oid, 'EXECUTE') END AS authenticated_execute,
    CASE WHEN p.oid IS NULL THEN NULL ELSE has_function_privilege('service_role', p.oid, 'EXECUTE') END AS service_role_execute,
    e.atteso_anon,
    e.atteso_public,
    e.atteso_authenticated,
    e.atteso_service_role,
    e.atteso_search_path,
    e.atteso_prosecdef,
    CASE
      WHEN p.oid IS NULL THEN 'assente'
      WHEN has_function_privilege('anon', p.oid, 'EXECUTE') IS DISTINCT FROM e.atteso_anon
        OR has_function_privilege('public', p.oid, 'EXECUTE') IS DISTINCT FROM e.atteso_public
        OR has_function_privilege('authenticated', p.oid, 'EXECUTE') IS DISTINCT FROM e.atteso_authenticated
        OR has_function_privilege('service_role', p.oid, 'EXECUTE') IS DISTINCT FROM e.atteso_service_role
        THEN 'fail'
      WHEN e.atteso_search_path IS NULL AND EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
        WHERE replace(cfg, ' ', '') LIKE 'search_path=%'
      ) THEN 'fail'
      WHEN e.atteso_search_path IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
        WHERE replace(cfg, ' ', '') = e.atteso_search_path
      ) THEN 'fail'
      WHEN p.prosecdef IS DISTINCT FROM e.atteso_prosecdef THEN 'fail'
      WHEN e.controlla_corpo_email AND (
        pg_get_functiondef(p.oid) NOT LIKE '%auth.uid()%'
        OR pg_get_functiondef(p.oid) NOT LIKE '%get_user_role()%'
        OR pg_get_functiondef(p.oid) NOT LIKE '%''admin''%'
        OR pg_get_functiondef(p.oid) NOT LIKE '%''operatore''%'
        OR pg_get_functiondef(p.oid) NOT LIKE '%RETURN NULL%'
      ) THEN 'fail'
      ELSE 'ok'
    END AS esito
  FROM expected e
  LEFT JOIN LATERAL (
    SELECT pr.*
    FROM pg_proc pr
    WHERE pr.oid = to_regprocedure('public.' || e.signature)
  ) AS p ON true
)
SELECT
  report.signature,
  report.firma_db,
  report.prosecdef,
  report.proconfig,
  report.proacl,
  report.anon_execute,
  report.public_execute,
  report.authenticated_execute,
  report.service_role_execute,
  report.atteso_anon,
  report.atteso_public,
  report.atteso_authenticated,
  report.atteso_service_role,
  report.atteso_search_path,
  report.atteso_prosecdef,
  report.esito
FROM report
UNION ALL
SELECT
  'RIEPILOGO'::text,
  NULL::text,
  NULL::boolean,
  NULL::text[],
  NULL::text,
  NULL::boolean,
  NULL::boolean,
  NULL::boolean,
  NULL::boolean,
  NULL::boolean,
  NULL::boolean,
  NULL::boolean,
  NULL::boolean,
  NULL::text,
  NULL::boolean,
  CASE
    WHEN count(*) FILTER (WHERE esito <> 'ok') = 0 THEN 'ok'
    ELSE 'fail'
  END
FROM report
ORDER BY signature;

SELECT
  p.oid::regprocedure::text AS signature,
  CASE
    WHEN acl.grantee = 0 THEN 'PUBLIC'
    ELSE pg_get_userbyid(acl.grantee)
  END AS grantee,
  acl.privilege_type,
  acl.is_grantable
FROM pg_proc p
LEFT JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) AS acl ON true
WHERE p.oid = ANY (ARRAY[
  to_regprocedure('public._rasi_cms_exec(text)'),
  to_regprocedure('public._rasi_exec_json(text)'),
  to_regprocedure('public.acquire_campagna_processing_lock(uuid,uuid,numeric)'),
  to_regprocedure('public.artist_mandate_covers_year(uuid,integer,uuid[])'),
  to_regprocedure('public.audit_log_auth_user_change()'),
  to_regprocedure('public.audit_log_row_change()'),
  to_regprocedure('public.build_match_key(text,integer)'),
  to_regprocedure('public.build_match_key_strict(text,integer)'),
  to_regprocedure('public.check_campagna_processing_lock(uuid,numeric)'),
  to_regprocedure('public.derive_programmazione_episode_signals(integer,integer,text,text,text,text)'),
  to_regprocedure('public.finalize_campagna_individuazione(uuid,uuid)'),
  to_regprocedure('public.find_opera_candidates(uuid,real,integer)'),
  to_regprocedure('public.get_campagna_unprocessed_programmazione_ids(uuid,uuid,integer)'),
  to_regprocedure('public.get_campagne_individuazione_with_counts()'),
  to_regprocedure('public.get_campagne_programmazione_with_counts()'),
  to_regprocedure('public.get_dashboard_stats()'),
  to_regprocedure('public.get_individuazione_episode_alert_summary(uuid)'),
  to_regprocedure('public.get_individuazione_episode_alerts(uuid)'),
  to_regprocedure('public.get_individuazione_processing_progress(uuid)'),
  to_regprocedure('public.get_processing_progress(uuid)'),
  to_regprocedure('public.get_user_artista_id()'),
  to_regprocedure('public.get_user_email_by_id(uuid)'),
  to_regprocedure('public.get_user_role()'),
  to_regprocedure('public.init_campagna_individuazione(uuid,text,text,uuid[])'),
  to_regprocedure('public.match_programmazione_to_partecipazioni(uuid,numeric)'),
  to_regprocedure('public.match_programmazione_to_partecipazioni(uuid,numeric,uuid[])'),
  to_regprocedure('public.match_programmazione_to_partecipazioni(uuid,numeric,uuid[],integer,integer)'),
  to_regprocedure('public.match_programmazione_to_partecipazioni(uuid,numeric,uuid[],integer,integer,uuid[])'),
  to_regprocedure('public.nome_persona_key(text)'),
  to_regprocedure('public.normalize_diritto_nome(text)'),
  to_regprocedure('public.notify_individuazione_change()'),
  to_regprocedure('public.notify_ripartizione_change()'),
  to_regprocedure('public.process_batch_individuazioni(uuid,integer,integer)'),
  to_regprocedure('public.process_campagna_individuazione(uuid,text,text)'),
  to_regprocedure('public.process_campagna_individuazione_optimized(uuid,text,text,integer)'),
  to_regprocedure('public.process_films_batch(uuid,uuid,integer,integer)'),
  to_regprocedure('public.process_programmazioni_chunk(uuid,uuid[],numeric)'),
  to_regprocedure('public.process_programmazioni_chunk(uuid,uuid[],numeric,uuid[])'),
  to_regprocedure('public.process_programmazioni_chunk(uuid,uuid[],numeric,uuid[],integer,integer,uuid[])'),
  to_regprocedure('public.release_campagna_processing_lock(uuid,uuid,text)'),
  to_regprocedure('public.score_year_overlap(integer,integer,integer,integer,integer,integer)'),
  to_regprocedure('public.search_artisti_fuzzy(text,real)'),
  to_regprocedure('public.search_opere_fuzzy(text,real)'),
  to_regprocedure('public.trg_alias_normalize()'),
  to_regprocedure('public.trg_opere_sync_match_keys()'),
  to_regprocedure('public.trg_programmazioni_sync_match_keys()'),
  to_regprocedure('public.update_search_vector()'),
  to_regprocedure('public.update_updated_at_column()'),
  to_regprocedure('public.year_range_bounds(integer,integer)'),
  to_regprocedure('public.year_ranges_overlap(integer,integer,integer,integer)')
]::regprocedure[])
ORDER BY 1, 2, 3;
