-- Verifica read-only dopo 20261109104140_fix_campagne_programmazione_list_return_types.sql.
-- Solo SELECT: non modifica grant, corpi, dati, e non chiama le funzioni.
-- Una sessione non-staff riceverebbe 42501 dal guard prima del RETURN QUERY,
-- quindi questo script non farebbe emergere il 42804. I tipi del RETURN QUERY
-- si leggono con pg_typeof su una query LIMIT 0 (zero righe, anche a tabella vuota).
--
-- Ogni riga deve avere esito = ok. RIEPILOGO è ok solo se non ci sono fail.
--
-- Sezioni:
--   colonna   tipo dell'espressione nel RETURN QUERY (con i cast) vs OUT dichiarato
--   sorgente  tipo della colonna senza il cast. Se il corpo di produzione
--             ha un cast (anche identitario), quel token deve esserci.
--   firma     linguaggio, volatility, search_path, SECURITY DEFINER, guard, grant,
--             presenza o assenza di RETURN QUERY
--
-- Grant attesi: quelli post-#58, invariati da #60 e da questa migration.

WITH fn AS (
  SELECT pg_get_functiondef('public.get_campagne_programmazione_with_counts()'::regprocedure) AS src
),
body AS (
  SELECT
    cp.id,
    cp.nome::text AS nome,
    cp.descrizione::text AS descrizione,
    cp.stato::text AS stato,
    cp.emittente_id,
    e.nome::text AS emittente_nome,
    cp.anno,
    cp.created_at,
    cp.updated_at,
    cp.created_by,
    cp.processing_by,
    cp.processing_started_at,
    cp.programmazioni_count
  FROM public.campagne_programmazione cp
  LEFT JOIN public.emittenti e ON e.id = cp.emittente_id
  LIMIT 0
),
bare AS (
  SELECT
    cp.id,
    cp.nome,
    cp.descrizione,
    cp.stato,
    cp.emittente_id,
    e.nome AS emittente_nome,
    cp.anno,
    cp.created_at,
    cp.updated_at,
    cp.created_by,
    cp.processing_by,
    cp.processing_started_at,
    cp.programmazioni_count
  FROM public.campagne_programmazione cp
  LEFT JOIN public.emittenti e ON e.id = cp.emittente_id
  LIMIT 0
),
typed AS (
  SELECT body.*
  FROM body
  RIGHT JOIN (SELECT 1) AS anchor(x) ON true
),
bared AS (
  SELECT bare.*
  FROM bare
  RIGHT JOIN (SELECT 1) AS anchor(x) ON true
),
actual AS (
  SELECT v.ord, v.col, v.actual, v.bare_type, v.cast_token
  FROM typed
  CROSS JOIN bared
  CROSS JOIN LATERAL (
    VALUES
      (1, 'id', pg_typeof(typed.id)::text, pg_typeof(bared.id)::text, NULL::text),
      (2, 'nome', pg_typeof(typed.nome)::text, pg_typeof(bared.nome)::text, 'cp.nome::text'),
      (3, 'descrizione', pg_typeof(typed.descrizione)::text, pg_typeof(bared.descrizione)::text, 'cp.descrizione::text'),
      (4, 'stato', pg_typeof(typed.stato)::text, pg_typeof(bared.stato)::text, 'cp.stato::text'),
      (5, 'emittente_id', pg_typeof(typed.emittente_id)::text, pg_typeof(bared.emittente_id)::text, NULL::text),
      (6, 'emittente_nome', pg_typeof(typed.emittente_nome)::text, pg_typeof(bared.emittente_nome)::text, 'e.nome::text'),
      (7, 'anno', pg_typeof(typed.anno)::text, pg_typeof(bared.anno)::text, NULL::text),
      (8, 'created_at', pg_typeof(typed.created_at)::text, pg_typeof(bared.created_at)::text, NULL::text),
      (9, 'updated_at', pg_typeof(typed.updated_at)::text, pg_typeof(bared.updated_at)::text, NULL::text),
      (10, 'created_by', pg_typeof(typed.created_by)::text, pg_typeof(bared.created_by)::text, NULL::text),
      (11, 'processing_by', pg_typeof(typed.processing_by)::text, pg_typeof(bared.processing_by)::text, NULL::text),
      (12, 'processing_started_at', pg_typeof(typed.processing_started_at)::text, pg_typeof(bared.processing_started_at)::text, NULL::text),
      (13, 'programmazioni_count', pg_typeof(typed.programmazioni_count)::text, pg_typeof(bared.programmazioni_count)::text, NULL::text)
  ) AS v(ord, col, actual, bare_type, cast_token)
),
declared AS (
  SELECT u.ord::integer AS ord, u.name AS col, format_type(u.typ, NULL) AS expected
  FROM pg_proc p
  CROSS JOIN LATERAL unnest(p.proargnames, p.proargmodes, p.proallargtypes)
    WITH ORDINALITY AS u(name, mode, typ, ord)
  WHERE p.oid = to_regprocedure('public.get_campagne_programmazione_with_counts()')
    AND u.mode = 't'
),
colonne AS (
  SELECT
    'colonna'::text AS sezione,
    COALESCE(a.col, d.col) AS oggetto,
    d.expected AS atteso,
    a.actual AS rilevato,
    CASE
      WHEN a.actual IS NOT DISTINCT FROM d.expected AND a.col IS NOT NULL AND d.col IS NOT NULL THEN 'ok'
      ELSE 'fail'
    END AS esito
  FROM declared d
  FULL JOIN actual a ON a.col = d.col
),
sorgenti AS (
  SELECT
    'sorgente'::text AS sezione,
    a.col AS oggetto,
    d.expected AS atteso,
    a.bare_type || CASE
      WHEN a.cast_token IS NULL THEN ''
      WHEN fn.src LIKE '%' || a.cast_token || '%' THEN ' cast ' || a.cast_token
      ELSE ' cast ' || a.cast_token || ' ASSENTE'
    END AS rilevato,
    CASE
      WHEN d.expected IS NULL OR a.actual IS DISTINCT FROM d.expected THEN 'fail'
      WHEN a.cast_token IS NOT NULL AND fn.src NOT LIKE '%' || a.cast_token || '%' THEN 'fail'
      WHEN a.bare_type IS DISTINCT FROM d.expected AND a.cast_token IS NULL THEN 'fail'
      ELSE 'ok'
    END AS esito
  FROM actual a
  LEFT JOIN declared d ON d.col = a.col
  CROSS JOIN fn
),
expected (
  signature,
  atteso_volatile,
  atteso_search_path,
  atteso_guard,
  atteso_return_query,
  atteso_result,
  atteso_auth_uid
) AS (
  VALUES
    ('delete_campagna_individuazione_safe(uuid, uuid, integer)'::text, 'v'::text, 'search_path=public,pg_temp'::text, true, false, 'jsonb'::text, true),
    ('delete_campagna_programmazione_safe(uuid, uuid, integer)'::text, 'v'::text, 'search_path=public,pg_temp'::text, true, false, 'jsonb'::text, true),
    ('get_campagne_programmazione_with_counts()'::text, 's'::text, 'search_path=public'::text, true, true, 'record'::text, false),
    ('get_dashboard_metrics(date, date)'::text, 's'::text, 'search_path=public,pg_temp'::text, true, false, 'jsonb'::text, false),
    ('get_individuazione_detail_stats(uuid)'::text, 's'::text, 'search_path=public'::text, true, false, 'jsonb'::text, false),
    ('get_individuazione_episode_alert_summary(uuid)'::text, 's'::text, 'search_path=public'::text, true, false, 'jsonb'::text, false),
    ('get_individuazione_episode_alerts(uuid)'::text, 's'::text, 'search_path=public'::text, true, false, 'jsonb'::text, false),
    ('get_processing_progress(uuid)'::text, 's'::text, 'search_path=public'::text, true, false, 'json'::text, false)
),
firme AS (
  SELECT
    'firma'::text AS sezione,
    e.signature AS oggetto,
    (
      'plpgsql ' || e.atteso_volatile || ' ' || e.atteso_search_path
      || ' result=' || e.atteso_result
      || ' return_query=' || e.atteso_return_query::text
      || ' secdef grant=authenticated+service_role'
    ) AS atteso,
    CASE
      WHEN p.oid IS NULL THEN 'assente'
      ELSE concat_ws(
        ' ',
        l.lanname,
        p.provolatile::text,
        pg_get_function_result(p.oid),
        'return_query=' || (position('RETURN QUERY' IN pg_get_functiondef(p.oid)) > 0)::text,
        'secdef=' || p.prosecdef::text,
        'anon=' || has_function_privilege('anon', p.oid, 'EXECUTE')::text,
        'public=' || has_function_privilege('public', p.oid, 'EXECUTE')::text,
        'authenticated=' || has_function_privilege('authenticated', p.oid, 'EXECUTE')::text,
        'service_role=' || has_function_privilege('service_role', p.oid, 'EXECUTE')::text
      )
    END AS rilevato,
    CASE
      WHEN p.oid IS NULL THEN 'fail'
      WHEN l.lanname IS DISTINCT FROM 'plpgsql' THEN 'fail'
      WHEN p.provolatile::text IS DISTINCT FROM e.atteso_volatile THEN 'fail'
      WHEN p.prosecdef IS DISTINCT FROM true THEN 'fail'
      WHEN pg_get_function_result(p.oid) IS DISTINCT FROM e.atteso_result
        AND NOT (e.atteso_return_query AND pg_get_function_result(p.oid) LIKE 'TABLE(%') THEN 'fail'
      WHEN (position('RETURN QUERY' IN pg_get_functiondef(p.oid)) > 0) IS DISTINCT FROM e.atteso_return_query THEN 'fail'
      WHEN NOT EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
        WHERE replace(cfg, ' ', '') = e.atteso_search_path
      ) THEN 'fail'
      WHEN has_function_privilege('anon', p.oid, 'EXECUTE')
        OR has_function_privilege('public', p.oid, 'EXECUTE')
        OR NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
        OR NOT has_function_privilege('service_role', p.oid, 'EXECUTE') THEN 'fail'
      WHEN e.atteso_guard AND (
        pg_get_functiondef(p.oid) NOT LIKE '%ERRCODE = ''42501''%'
        OR pg_get_functiondef(p.oid) NOT LIKE '%insufficient_privilege%'
        OR pg_get_functiondef(p.oid) NOT LIKE '%get_user_role()%'
        OR pg_get_functiondef(p.oid) NOT LIKE '%''admin''%'
        OR pg_get_functiondef(p.oid) NOT LIKE '%''operatore''%'
      ) THEN 'fail'
      WHEN e.atteso_auth_uid
        AND pg_get_functiondef(p.oid) NOT LIKE '%auth.uid() IS DISTINCT FROM p_user_id%' THEN 'fail'
      WHEN NOT e.atteso_return_query
        AND e.signature LIKE 'get_%'
        AND position('RETURN (' IN pg_get_functiondef(p.oid)) = 0 THEN 'fail'
      ELSE 'ok'
    END AS esito
  FROM expected e
  LEFT JOIN LATERAL (
    SELECT pr.*
    FROM pg_proc pr
    WHERE pr.oid = to_regprocedure('public.' || e.signature)
  ) AS p ON true
  LEFT JOIN pg_language l ON l.oid = p.prolang
),
report AS (
  SELECT * FROM colonne
  UNION ALL
  SELECT * FROM sorgenti
  UNION ALL
  SELECT sezione, oggetto, atteso, rilevato, esito FROM firme
)
SELECT sezione, oggetto, atteso, rilevato, esito
FROM report
UNION ALL
SELECT
  'RIEPILOGO'::text,
  count(*) FILTER (WHERE esito <> 'ok')::text,
  NULL::text,
  NULL::text,
  CASE
    WHEN count(*) FILTER (WHERE esito <> 'ok') = 0 THEN 'ok'
    ELSE 'fail'
  END
FROM report
ORDER BY sezione, oggetto;
