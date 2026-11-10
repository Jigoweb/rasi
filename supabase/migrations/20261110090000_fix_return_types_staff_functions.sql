-- Allinea il RETURN QUERY di get_campagne_programmazione_with_counts()
-- ai tipi dichiarati in RETURNS TABLE.
--
-- Contesto: 20261106220000 (#60) ha convertito 6 funzioni da LANGUAGE sql
-- a plpgsql perché il guard usa RAISE. In plpgsql RETURN QUERY confronta
-- gli OID delle colonne (atttypid), senza cast di assegnazione. SQLSTATE
-- 42804 ('structure of query does not match function result type') scatta
-- anche con zero righe. Il primo disallineamento in produzione è
-- campagne_programmazione.nome: character varying, mentre l'OUT è text.
--
-- Audit colonna per colonna (catalogo produzione jdflzupcfwdcajxfobfj,
-- 2026-11-10, information_schema.columns) contro RETURNS TABLE:
--   id                      uuid         cp.id                         uuid            ok
--   nome                    text         cp.nome                       varchar         CAST ::text
--   descrizione             text         cp.descrizione                text            ok
--   stato                   text         cp.stato::text                enum → text     ok (cast già in #60)
--   emittente_id            uuid         cp.emittente_id               uuid            ok
--   emittente_nome          text         e.nome                        text            ok
--   anno                    integer      cp.anno                       integer         ok
--   created_at              timestamptz  cp.created_at                 timestamptz     ok
--   updated_at              timestamptz  cp.updated_at                 timestamptz     ok
--   created_by              uuid         cp.created_by                 uuid            ok
--   processing_by           uuid         cp.processing_by              uuid            ok
--   processing_started_at   timestamptz  cp.processing_started_at      timestamptz     ok
--   programmazioni_count    bigint       cp.programmazioni_count       bigint          ok
--
-- Le altre cinque funzioni convertite da #60 non usano RETURN QUERY.
-- Restituiscono uno scalare con RETURN (sottoquery) e plpgsql applica il
-- cast di assegnazione. Il controllo stretto sugli OID non le riguarda;
-- non vengono ricreate.
--   get_dashboard_metrics(date, date)
--     RETURNS jsonb. RETURN (SELECT jsonb_build_object(...)) è jsonb.
--     I varchar (artisti.nome/cognome, opere.titolo/titolo_originale,
--     campagne_*.nome) entrano in concat_ws o jsonb_build_object, che
--     accettano qualsiasi tipo e non producono una tupla OUT.
--   get_individuazione_detail_stats(uuid)
--     RETURNS jsonb, stesso RETURN (sottoquery). ruoli_tipologie.nome è
--     varchar(100) e finisce in jsonb_build_object. punteggio_matching è
--     numeric e resta dentro la sottoquery.
--   get_individuazione_episode_alert_summary(uuid)
--     RETURNS jsonb. opere.titolo varchar(500) è argomento di jsonb.
--   get_individuazione_episode_alerts(uuid)
--     RETURNS jsonb. COALESCE fra text e opere.titolo varchar risolve a
--     text prima di jsonb_build_object. date e time sono input jsonb.
--   get_processing_progress(uuid)
--     RETURNS json. json_build_object restituisce json, OID identico.
--     COUNT(*) bigint e MAX(timestamptz) sono input di json, non colonne
--     OUT. Più righe da campagne_individuazione restano l'errore
--     preesistente "query returned more than one row", non 42804.
--
-- Le due delete non hanno RETURN QUERY. RETURN jsonb_build_object è
-- jsonb; SELECT INTO record non confronta gli OID con un RETURNS TABLE.
-- COUNT(*) INTO integer e MIN(varchar) INTO text usano il cast di
-- assegnazione. Non si toccano.
--
-- Lettura catalogo del 2026-11-10: il corpo live aveva già cp.nome::text,
-- più ::text identitari su descrizione ed e.nome (già text). Quella modifica
-- non è in git. Qui si registra solo il cast necessario, cp.nome::text; le
-- altre espressioni restano quelle di #60. Riapplicarla su quel corpo toglie
-- i cast identitari e lascia i tipi allineati.
--
-- Invariato rispetto a #60, oltre al cast: guard per primo, firma,
-- RETURNS, STABLE, SECURITY DEFINER, search_path = public, nessun GRANT
-- (CREATE OR REPLACE conserva l'ACL di #58).
--
-- La CLI Supabase avvolge il file in una transazione: niente BEGIN interno.
-- Va applicata solo dopo un ok esplicito. Non è stata eseguita su produzione
-- da questa modifica.

CREATE TEMP TABLE _rasi_20261110090000_fn_before ON COMMIT DROP AS
SELECT
  p.oid,
  md5(pg_get_functiondef(p.oid)) AS def_md5,
  p.provolatile,
  p.prosecdef,
  p.proconfig,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
  has_function_privilege('public', p.oid, 'EXECUTE') AS public_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_execute
FROM pg_proc p
WHERE p.oid = ANY (ARRAY[
  'public.delete_campagna_individuazione_safe(uuid, uuid, integer)',
  'public.delete_campagna_programmazione_safe(uuid, uuid, integer)',
  'public.get_campagne_programmazione_with_counts()',
  'public.get_dashboard_metrics(date, date)',
  'public.get_individuazione_detail_stats(uuid)',
  'public.get_individuazione_episode_alert_summary(uuid)',
  'public.get_individuazione_episode_alerts(uuid)',
  'public.get_processing_progress(uuid)'
]::regprocedure[]);

CREATE OR REPLACE FUNCTION public.get_campagne_programmazione_with_counts()
 RETURNS TABLE(id uuid, nome text, descrizione text, stato text, emittente_id uuid, emittente_nome text, anno integer, created_at timestamp with time zone, updated_at timestamp with time zone, created_by uuid, processing_by uuid, processing_started_at timestamp with time zone, programmazioni_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN

  IF public.get_user_role() IS DISTINCT FROM 'admin'::public.ruolo_utente
     AND public.get_user_role() IS DISTINCT FROM 'operatore'::public.ruolo_utente THEN
    RAISE EXCEPTION 'insufficient_privilege'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    cp.id,
    cp.nome::text,
    cp.descrizione,
    cp.stato::text,
    cp.emittente_id,
    e.nome AS emittente_nome,
    cp.anno,
    cp.created_at,
    cp.updated_at,
    cp.created_by,
    cp.processing_by,
    cp.processing_started_at,
    cp.programmazioni_count
  FROM campagne_programmazione cp
  LEFT JOIN emittenti e ON e.id = cp.emittente_id
  ORDER BY cp.created_at DESC;
END;
$function$;

DO $assert_return_types$
DECLARE
  v_fn regprocedure := 'public.get_campagne_programmazione_with_counts()'::regprocedure;
  v_def text;
  v_mismatch text;
  v_changed text;
BEGIN
  IF (SELECT count(*) FROM _rasi_20261110090000_fn_before) <> 8 THEN
    RAISE EXCEPTION 'snapshot incompleto: attese 8 firme, trovate %',
      (SELECT count(*) FROM _rasi_20261110090000_fn_before);
  END IF;

  SELECT string_agg(b.oid::regprocedure::text, ', ' ORDER BY b.oid::regprocedure::text)
    INTO v_changed
  FROM _rasi_20261110090000_fn_before b
  JOIN pg_proc p ON p.oid = b.oid
  WHERE b.oid <> v_fn::oid
    AND (
      md5(pg_get_functiondef(p.oid)) IS DISTINCT FROM b.def_md5
      OR p.provolatile IS DISTINCT FROM b.provolatile
      OR p.prosecdef IS DISTINCT FROM b.prosecdef
      OR p.proconfig IS DISTINCT FROM b.proconfig
      OR has_function_privilege('anon', p.oid, 'EXECUTE') IS DISTINCT FROM b.anon_execute
      OR has_function_privilege('public', p.oid, 'EXECUTE') IS DISTINCT FROM b.public_execute
      OR has_function_privilege('authenticated', p.oid, 'EXECUTE') IS DISTINCT FROM b.authenticated_execute
      OR has_function_privilege('service_role', p.oid, 'EXECUTE') IS DISTINCT FROM b.service_role_execute
    );

  IF v_changed IS NOT NULL THEN
    RAISE EXCEPTION 'modificata una funzione fuori scope: %', v_changed;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM _rasi_20261110090000_fn_before b
    JOIN pg_proc p ON p.oid = b.oid
    WHERE b.oid = v_fn::oid
      AND md5(pg_get_functiondef(p.oid)) IS DISTINCT FROM b.def_md5
      AND p.provolatile IS NOT DISTINCT FROM b.provolatile
      AND p.prosecdef IS NOT DISTINCT FROM b.prosecdef
      AND p.proconfig IS NOT DISTINCT FROM b.proconfig
      AND has_function_privilege('anon', p.oid, 'EXECUTE') IS NOT DISTINCT FROM b.anon_execute
      AND has_function_privilege('public', p.oid, 'EXECUTE') IS NOT DISTINCT FROM b.public_execute
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE') IS NOT DISTINCT FROM b.authenticated_execute
      AND has_function_privilege('service_role', p.oid, 'EXECUTE') IS NOT DISTINCT FROM b.service_role_execute
  ) THEN
    RAISE EXCEPTION 'la funzione lista campagne non ha solo il corpo aggiornato (firma, ACL, volatility o search_path cambiati, oppure il corpo è identico)';
  END IF;

  v_def := pg_get_functiondef(v_fn);
  IF v_def !~ 'cp\.nome::text'
     OR v_def NOT LIKE '%ERRCODE = ''42501''%'
     OR v_def NOT LIKE '%insufficient_privilege%'
     OR v_def NOT LIKE '%get_user_role()%'
     OR v_def NOT LIKE '%RETURN QUERY%' THEN
    RAISE EXCEPTION 'corpo atteso assente (cast nome::text o guard)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM unnest(COALESCE((SELECT p.proconfig FROM pg_proc p WHERE p.oid = v_fn::oid), ARRAY[]::text[])) AS cfg
    WHERE replace(cfg, ' ', '') = 'search_path=public'
  ) THEN
    RAISE EXCEPTION 'search_path atteso public, trovato %',
      (SELECT p.proconfig FROM pg_proc p WHERE p.oid = v_fn::oid);
  END IF;

  -- Stessi espressi del RETURN QUERY, con pg_typeof su zero righe.
  -- Il RIGHT JOIN tiene una riga tipizzata anche a tabella vuota, senza
  -- chiamare la funzione (il guard non entra in gioco).
  WITH body AS (
    SELECT
      cp.id,
      cp.nome::text AS nome,
      cp.descrizione,
      cp.stato::text AS stato,
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
  actual AS (
    SELECT v.ord, v.col, v.actual
    FROM typed
    CROSS JOIN LATERAL (
      VALUES
        (1, 'id', pg_typeof(typed.id)::text),
        (2, 'nome', pg_typeof(typed.nome)::text),
        (3, 'descrizione', pg_typeof(typed.descrizione)::text),
        (4, 'stato', pg_typeof(typed.stato)::text),
        (5, 'emittente_id', pg_typeof(typed.emittente_id)::text),
        (6, 'emittente_nome', pg_typeof(typed.emittente_nome)::text),
        (7, 'anno', pg_typeof(typed.anno)::text),
        (8, 'created_at', pg_typeof(typed.created_at)::text),
        (9, 'updated_at', pg_typeof(typed.updated_at)::text),
        (10, 'created_by', pg_typeof(typed.created_by)::text),
        (11, 'processing_by', pg_typeof(typed.processing_by)::text),
        (12, 'processing_started_at', pg_typeof(typed.processing_started_at)::text),
        (13, 'programmazioni_count', pg_typeof(typed.programmazioni_count)::text)
    ) AS v(ord, col, actual)
  ),
  declared AS (
    SELECT u.ord, u.name AS col, format_type(u.typ, NULL) AS expected
    FROM pg_proc p
    CROSS JOIN LATERAL unnest(p.proargnames, p.proargmodes, p.proallargtypes)
      WITH ORDINALITY AS u(name, mode, typ, ord)
    WHERE p.oid = v_fn::oid
      AND u.mode = 't'
  )
  SELECT string_agg(
    format('%s: query %s <> dichiarato %s', COALESCE(a.col, d.col), a.actual, d.expected),
    ', ' ORDER BY COALESCE(a.ord, d.ord)
  )
    INTO v_mismatch
  FROM declared d
  FULL JOIN actual a ON a.col = d.col
  WHERE a.actual IS DISTINCT FROM d.expected
     OR a.col IS NULL
     OR d.col IS NULL;

  IF v_mismatch IS NOT NULL THEN
    RAISE EXCEPTION 'RETURN QUERY non allineato al RETURNS TABLE: %', v_mismatch;
  END IF;
END
$assert_return_types$;
