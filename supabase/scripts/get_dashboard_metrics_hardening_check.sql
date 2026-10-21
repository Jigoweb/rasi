-- Verifica read-only di public.get_dashboard_metrics, dopo
-- 20261021110000_harden_get_dashboard_metrics.sql.
-- Solo SELECT: non modifica grant, corpi, dati.
--
-- Valori attesi per ogni overload:
--   prosecdef                         true
--   proconfig                         search_path=public, pg_temp
--   has_function_privilege anon       false
--   has_function_privilege PUBLIC     false
--   has_function_privilege authenticated  true
--   has_function_privilege service_role   true
--
-- proacl è riportato così com'è (il testo dipende dall'owner).
-- La seconda query esplode l'ACL: grantee 0 è PUBLIC.
-- Se non c'è nessuna firma, la prima query restituisce una riga
-- esito = assente.

SELECT
  report.signature,
  report.prosecdef,
  report.proconfig,
  report.proacl,
  report.anon_execute,
  report.public_execute,
  report.authenticated_execute,
  report.service_role_execute,
  report.atteso_prosecdef,
  report.atteso_search_path,
  report.atteso_anon_execute,
  report.atteso_public_execute,
  report.atteso_authenticated_execute,
  report.atteso_service_role_execute,
  report.esito
FROM (
  SELECT
    p.oid::regprocedure::text AS signature,
    p.prosecdef,
    p.proconfig,
    p.proacl::text AS proacl,
    has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
    has_function_privilege('public', p.oid, 'EXECUTE') AS public_execute,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
    has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_execute,
    true AS atteso_prosecdef,
    'search_path=public, pg_temp' AS atteso_search_path,
    false AS atteso_anon_execute,
    false AS atteso_public_execute,
    true AS atteso_authenticated_execute,
    true AS atteso_service_role_execute,
    CASE
      WHEN p.prosecdef
        AND has_function_privilege('anon', p.oid, 'EXECUTE') = false
        AND has_function_privilege('public', p.oid, 'EXECUTE') = false
        AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
        AND has_function_privilege('service_role', p.oid, 'EXECUTE')
        AND EXISTS (
          SELECT 1
          FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
          WHERE replace(cfg, ' ', '') = 'search_path=public,pg_temp'
        )
      THEN 'ok'
      ELSE 'fail'
    END AS esito
  FROM pg_proc p
  JOIN pg_namespace nsp ON nsp.oid = p.pronamespace
  WHERE nsp.nspname = 'public'
    AND p.proname = 'get_dashboard_metrics'

  UNION ALL

  SELECT
    '(nessuna firma)' AS signature,
    NULL::boolean AS prosecdef,
    NULL::text[] AS proconfig,
    NULL::text AS proacl,
    NULL::boolean AS anon_execute,
    NULL::boolean AS public_execute,
    NULL::boolean AS authenticated_execute,
    NULL::boolean AS service_role_execute,
    true AS atteso_prosecdef,
    'search_path=public, pg_temp' AS atteso_search_path,
    false AS atteso_anon_execute,
    false AS atteso_public_execute,
    true AS atteso_authenticated_execute,
    true AS atteso_service_role_execute,
    'assente' AS esito
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace nsp ON nsp.oid = p.pronamespace
    WHERE nsp.nspname = 'public'
      AND p.proname = 'get_dashboard_metrics'
  )
) AS report
ORDER BY report.signature;

SELECT
  p.oid::regprocedure::text AS signature,
  CASE
    WHEN acl.grantee = 0 THEN 'PUBLIC'
    ELSE pg_get_userbyid(acl.grantee)
  END AS grantee,
  acl.privilege_type,
  acl.is_grantable
FROM pg_proc p
JOIN pg_namespace nsp ON nsp.oid = p.pronamespace
LEFT JOIN LATERAL aclexplode(
  COALESCE(p.proacl, acldefault('f', p.proowner))
) AS acl ON true
WHERE nsp.nspname = 'public'
  AND p.proname = 'get_dashboard_metrics'
ORDER BY 1, 2, 3;
