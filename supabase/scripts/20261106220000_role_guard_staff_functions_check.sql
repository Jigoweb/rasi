-- Verifica read-only dopo 20261106220000_role_guard_staff_functions.sql.
-- Solo SELECT: non modifica grant, corpi, search_path, dati.
--
-- Ogni riga di firma deve avere esito = ok. La riga RIEPILOGO è ok solo
-- se non ci sono assenti o fail.
--
-- Le otto funzioni staff devono contenere il guard 42501. L'overload
-- delete_campagna_individuazione_safe(uuid) e le tre helper di ruolo non
-- devono contenerlo: la migration non le riscrive.
-- I grant attesi sono quelli post-#58, invariati da questa migration.

WITH expected (
  signature,
  atteso_anon,
  atteso_public,
  atteso_authenticated,
  atteso_service_role,
  atteso_search_path,
  atteso_volatile,
  atteso_guard
) AS (
  VALUES
    ('delete_campagna_individuazione_safe(uuid, uuid, integer)'::text, false, false, true, true, 'search_path=public,pg_temp'::text, 'v'::text, true),
    ('delete_campagna_programmazione_safe(uuid, uuid, integer)'::text, false, false, true, true, 'search_path=public,pg_temp'::text, 'v'::text, true),
    ('get_campagne_programmazione_with_counts()'::text, false, false, true, true, 'search_path=public'::text, 's'::text, true),
    ('get_dashboard_metrics(date, date)'::text, false, false, true, true, 'search_path=public,pg_temp'::text, 's'::text, true),
    ('get_individuazione_detail_stats(uuid)'::text, false, false, true, true, 'search_path=public'::text, 's'::text, true),
    ('get_individuazione_episode_alert_summary(uuid)'::text, false, false, true, true, 'search_path=public'::text, 's'::text, true),
    ('get_individuazione_episode_alerts(uuid)'::text, false, false, true, true, 'search_path=public'::text, 's'::text, true),
    ('get_processing_progress(uuid)'::text, false, false, true, true, 'search_path=public'::text, 's'::text, true),
    ('delete_campagna_individuazione_safe(uuid)'::text, false, false, false, true, 'search_path=public,pg_temp'::text, 'v'::text, false),
    ('get_user_artista_id()'::text, true, true, true, true, 'search_path=public'::text, 's'::text, false),
    ('get_user_email_by_id(uuid)'::text, false, false, true, true, 'search_path=public,auth,pg_temp'::text, 's'::text, false),
    ('get_user_role()'::text, true, true, true, true, 'search_path=public'::text, 's'::text, false)
),
report AS (
  SELECT
    e.signature,
    p.oid::regprocedure::text AS firma_db,
    l.lanname,
    p.provolatile,
    p.prosecdef,
    p.proconfig,
    CASE WHEN p.oid IS NULL THEN NULL ELSE has_function_privilege('anon', p.oid, 'EXECUTE') END AS anon_execute,
    CASE WHEN p.oid IS NULL THEN NULL ELSE has_function_privilege('public', p.oid, 'EXECUTE') END AS public_execute,
    CASE WHEN p.oid IS NULL THEN NULL ELSE has_function_privilege('authenticated', p.oid, 'EXECUTE') END AS authenticated_execute,
    CASE WHEN p.oid IS NULL THEN NULL ELSE has_function_privilege('service_role', p.oid, 'EXECUTE') END AS service_role_execute,
    e.atteso_guard,
    CASE
      WHEN p.oid IS NULL THEN 'assente'
      WHEN has_function_privilege('anon', p.oid, 'EXECUTE') IS DISTINCT FROM e.atteso_anon
        OR has_function_privilege('public', p.oid, 'EXECUTE') IS DISTINCT FROM e.atteso_public
        OR has_function_privilege('authenticated', p.oid, 'EXECUTE') IS DISTINCT FROM e.atteso_authenticated
        OR has_function_privilege('service_role', p.oid, 'EXECUTE') IS DISTINCT FROM e.atteso_service_role
        THEN 'fail'
      WHEN NOT EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
        WHERE replace(cfg, ' ', '') = e.atteso_search_path
      ) THEN 'fail'
      WHEN p.prosecdef IS DISTINCT FROM true THEN 'fail'
      WHEN p.provolatile IS DISTINCT FROM e.atteso_volatile THEN 'fail'
      WHEN l.lanname IS DISTINCT FROM 'plpgsql' AND e.atteso_guard THEN 'fail'
      WHEN e.atteso_guard AND (
        pg_get_functiondef(p.oid) NOT LIKE '%ERRCODE = ''42501''%'
        OR pg_get_functiondef(p.oid) NOT LIKE '%insufficient_privilege%'
        OR pg_get_functiondef(p.oid) NOT LIKE '%get_user_role()%'
        OR pg_get_functiondef(p.oid) NOT LIKE '%''admin''%'
        OR pg_get_functiondef(p.oid) NOT LIKE '%''operatore''%'
      ) THEN 'fail'
      WHEN e.atteso_guard AND e.signature LIKE 'delete_%'
        AND pg_get_functiondef(p.oid) NOT LIKE '%auth.uid() IS DISTINCT FROM p_user_id%' THEN 'fail'
      WHEN NOT e.atteso_guard
        AND pg_get_functiondef(p.oid) LIKE '%42501%' THEN 'fail'
      ELSE 'ok'
    END AS esito
  FROM expected e
  LEFT JOIN LATERAL (
    SELECT pr.*
    FROM pg_proc pr
    WHERE pr.oid = to_regprocedure('public.' || e.signature)
  ) AS p ON true
  LEFT JOIN pg_language l ON l.oid = p.prolang
)
SELECT
  report.signature,
  report.firma_db,
  report.lanname,
  report.provolatile,
  report.prosecdef,
  report.proconfig,
  report.anon_execute,
  report.public_execute,
  report.authenticated_execute,
  report.service_role_execute,
  report.atteso_guard,
  report.esito
FROM report
UNION ALL
SELECT
  'RIEPILOGO'::text,
  NULL::text,
  NULL::name,
  NULL::"char",
  NULL::boolean,
  NULL::text[],
  NULL::boolean,
  NULL::boolean,
  NULL::boolean,
  NULL::boolean,
  NULL::boolean,
  CASE
    WHEN count(*) FILTER (WHERE esito <> 'ok') = 0 THEN 'ok'
    ELSE 'fail'
  END
FROM report
ORDER BY signature;
