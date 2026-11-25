-- Chiama le 6 funzioni convertite da #60 come admin (get_user_role = admin).
-- La lista campagne deve restituire la riga di fixture con nome text.
-- Le cinque scalari devono tornare json/jsonb, non 42804.
-- Una sessione senza ruolo deve prendere 42501, non i dati.

SELECT set_config('request.jwt.claims', '{}', false);

DO $expect_42501$
BEGIN
  PERFORM 1
  FROM public.get_campagne_programmazione_with_counts()
  LIMIT 1;
  RAISE EXCEPTION 'atteso SQLSTATE 42501 per una sessione senza ruolo';
EXCEPTION
  WHEN insufficient_privilege THEN
    NULL;
END
$expect_42501$;

DO $expect_42501_scalar$
BEGIN
  PERFORM public.get_dashboard_metrics(DATE '2026-11-01', DATE '2026-11-30');
  RAISE EXCEPTION 'atteso SQLSTATE 42501 da get_dashboard_metrics senza ruolo';
EXCEPTION
  WHEN insufficient_privilege THEN
    NULL;
END
$expect_42501_scalar$;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}',
  false
);

DO $expect_ok$
DECLARE
  v_nome text;
  v_nome_type text;
  v_id_type text;
  v_descrizione_type text;
  v_stato_type text;
  v_emittente_id_type text;
  v_emittente_nome_type text;
  v_anno_type text;
  v_created_at_type text;
  v_updated_at_type text;
  v_created_by_type text;
  v_processing_by_type text;
  v_processing_started_at_type text;
  v_count_type text;
  v_rows integer;
  v_dash jsonb;
  v_detail jsonb;
  v_summary jsonb;
  v_alerts jsonb;
  v_progress json;
BEGIN
  SELECT
    count(*)::integer,
    min(c.nome),
    min(pg_typeof(c.id)::text),
    min(pg_typeof(c.nome)::text),
    min(pg_typeof(c.descrizione)::text),
    min(pg_typeof(c.stato)::text),
    min(pg_typeof(c.emittente_id)::text),
    min(pg_typeof(c.emittente_nome)::text),
    min(pg_typeof(c.anno)::text),
    min(pg_typeof(c.created_at)::text),
    min(pg_typeof(c.updated_at)::text),
    min(pg_typeof(c.created_by)::text),
    min(pg_typeof(c.processing_by)::text),
    min(pg_typeof(c.processing_started_at)::text),
    min(pg_typeof(c.programmazioni_count)::text)
  INTO
    v_rows,
    v_nome,
    v_id_type,
    v_nome_type,
    v_descrizione_type,
    v_stato_type,
    v_emittente_id_type,
    v_emittente_nome_type,
    v_anno_type,
    v_created_at_type,
    v_updated_at_type,
    v_created_by_type,
    v_processing_by_type,
    v_processing_started_at_type,
    v_count_type
  FROM public.get_campagne_programmazione_with_counts() AS c;

  IF v_rows IS DISTINCT FROM 1 OR v_nome IS DISTINCT FROM 'Campagna prova' THEN
    RAISE EXCEPTION 'lista campagne: righe=% nome=%', v_rows, v_nome;
  END IF;

  IF v_id_type IS DISTINCT FROM 'uuid'
     OR v_nome_type IS DISTINCT FROM 'text'
     OR v_descrizione_type IS DISTINCT FROM 'text'
     OR v_stato_type IS DISTINCT FROM 'text'
     OR v_emittente_id_type IS DISTINCT FROM 'uuid'
     OR v_emittente_nome_type IS DISTINCT FROM 'text'
     OR v_anno_type IS DISTINCT FROM 'integer'
     OR v_created_at_type IS DISTINCT FROM 'timestamp with time zone'
     OR v_updated_at_type IS DISTINCT FROM 'timestamp with time zone'
     OR v_created_by_type IS DISTINCT FROM 'uuid'
     OR v_processing_by_type IS DISTINCT FROM 'uuid'
     OR v_processing_started_at_type IS DISTINCT FROM 'timestamp with time zone'
     OR v_count_type IS DISTINCT FROM 'bigint' THEN
    RAISE EXCEPTION
      'tipi OUT inattesi: id=% nome=% descrizione=% stato=% emittente_id=% emittente_nome=% anno=% created_at=% updated_at=% created_by=% processing_by=% processing_started_at=% count=%',
      v_id_type, v_nome_type, v_descrizione_type, v_stato_type, v_emittente_id_type,
      v_emittente_nome_type, v_anno_type, v_created_at_type, v_updated_at_type,
      v_created_by_type, v_processing_by_type, v_processing_started_at_type, v_count_type;
  END IF;

  v_dash := public.get_dashboard_metrics(DATE '2026-11-01', DATE '2026-11-30');
  IF v_dash IS NULL
     OR (v_dash #>> '{stats,artisti_attivi}') IS DISTINCT FROM '1'
     OR (v_dash #>> '{stats,programmazioni_mese}') IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'get_dashboard_metrics: %', v_dash;
  END IF;

  v_detail := public.get_individuazione_detail_stats('33333333-3333-3333-3333-333333333333');
  IF v_detail IS NULL
     OR (v_detail #>> '{outcomes,totale}') IS DISTINCT FROM '1'
     OR v_detail #>> '{catalog,ruoloPrincipale,nome}' IS DISTINCT FROM 'Attore' THEN
    RAISE EXCEPTION 'get_individuazione_detail_stats: %', v_detail;
  END IF;

  v_summary := public.get_individuazione_episode_alert_summary('33333333-3333-3333-3333-333333333333');
  IF v_summary IS NULL
     OR (v_summary ->> 'totale') IS DISTINCT FROM '1'
     OR jsonb_typeof(v_summary -> 'topOpere') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'get_individuazione_episode_alert_summary: %', v_summary;
  END IF;

  v_alerts := public.get_individuazione_episode_alerts('33333333-3333-3333-3333-333333333333');
  IF v_alerts IS NULL
     OR jsonb_typeof(v_alerts) IS DISTINCT FROM 'array'
     OR jsonb_array_length(v_alerts) IS DISTINCT FROM 1
     OR v_alerts #>> '{0,operaTitolo}' IS DISTINCT FROM 'Film prova' THEN
    RAISE EXCEPTION 'get_individuazione_episode_alerts: %', v_alerts;
  END IF;

  v_progress := public.get_processing_progress('22222222-2222-2222-2222-222222222222');
  IF v_progress IS NULL
     OR v_progress ->> 'programmazioni_totali' IS DISTINCT FROM '1'
     OR v_progress ->> 'programmazioni_processate' IS DISTINCT FROM '1'
     OR v_progress ->> 'individuazioni_create' IS DISTINCT FROM '1'
     OR v_progress ->> 'campagna_individuazione_id' IS DISTINCT FROM '33333333-3333-3333-3333-333333333333' THEN
    RAISE EXCEPTION 'get_processing_progress: %', v_progress;
  END IF;
END
$expect_ok$;
