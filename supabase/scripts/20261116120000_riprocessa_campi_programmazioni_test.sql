-- Test di 20261116120000_riprocessa_campi_programmazioni.sql.
-- Gira in una transazione che fa sempre ROLLBACK: non lascia dati.
--
--   psql -v ON_ERROR_STOP=1 -f supabase/scripts/20261116120000_riprocessa_campi_programmazioni_test.sql

BEGIN;

DO $test$
DECLARE
  emit uuid := gen_random_uuid();
  cp uuid := gen_random_uuid();
  cp_altra uuid := gen_random_uuid();
  ci uuid := gen_random_uuid();
  op uuid := gen_random_uuid();
  art uuid := gen_random_uuid();
  ruolo uuid := gen_random_uuid();
  p1 uuid; p2 uuid; p_altra uuid;
  r jsonb;
  n integer;
  v_fail text := '';
  righe jsonb;
BEGIN
  INSERT INTO public.emittenti (id, codice, nome, tipo) VALUES (emit, 'riprocesso-test', 'Emittente riprocesso', 'tv_generalista');
  INSERT INTO public.campagne_programmazione (id, nome, emittente_id, anno, stato) VALUES
    (cp, 'Riprocesso test', emit, 2024, 'in_review'),
    (cp_altra, 'Altra campagna', emit, 2024, 'in_review');
  INSERT INTO public.programmazioni (emittente_id, campagna_programmazione_id, titolo, import_row_uid, ora_inizio)
    VALUES (emit, cp, 'I padroni della cittÃ', 'uid-1', NULL) RETURNING id INTO p1;
  INSERT INTO public.programmazioni (emittente_id, campagna_programmazione_id, titolo, import_row_uid, data_trasmissione, ora_inizio)
    VALUES (emit, cp, 'Gomorra', 'uid-2', '2024-03-01', '21:00') RETURNING id INTO p2;
  INSERT INTO public.programmazioni (emittente_id, campagna_programmazione_id, titolo, import_row_uid)
    VALUES (emit, cp_altra, 'Altra', 'uid-altra') RETURNING id INTO p_altra;
  INSERT INTO public.campagne_individuazione (id, nome, emittente_id, campagne_programmazione_id, anno, stato)
    VALUES (ci, 'Individuazione - Riprocesso test', emit, cp, 2024, 'completata');
  INSERT INTO public.opere (id, titolo, tipo) VALUES (op, 'Opera riprocesso', 'film');
  INSERT INTO public.artisti (id, nome, cognome) VALUES (art, 'Ri', 'Processo');
  INSERT INTO public.ruoli_tipologie (id, codice, nome, categoria) VALUES (ruolo, 'riprocesso-test', 'Ruolo', 'recitazione');
  INSERT INTO public.individuazioni (campagna_individuazioni_id, programmazione_id, opera_id, artista_id, ruolo_id, emittente_id, punteggio_matching, dettagli_matching)
    VALUES (ci, p1, op, art, ruolo, emit, 1, '{}');

  righe := jsonb_build_array(
    jsonb_build_object('import_row_uid', 'uid-1', 'data_trasmissione', '2024-12-01', 'ora_inizio', '19:30:00', 'titolo', 'I padroni della città'),
    -- invariata: nessun cambio
    jsonb_build_object('import_row_uid', 'uid-2', 'data_trasmissione', '2024-03-01', 'ora_inizio', '21:00:00', 'titolo', 'Gomorra'),
    -- valore nuovo assente: il valore attuale non si svuota
    jsonb_build_object('import_row_uid', 'uid-2', 'titolo', 'Gomorra'),
    -- riga di un'altra campagna: ignorata
    jsonb_build_object('import_row_uid', 'uid-altra', 'titolo', 'Cambiata'),
    -- riga non presente
    jsonb_build_object('import_row_uid', 'uid-inesistente', 'titolo', 'X')
  );

  -- 1) anteprima: conta senza scrivere
  r := public.riprocessa_campi_programmazioni(cp, righe, false);
  IF (r ->> 'righe_inviate')::int <> 5 THEN v_fail := v_fail || ' inviate;'; END IF;
  IF (r ->> 'ritrovate')::int <> 2 THEN v_fail := v_fail || ' ritrovate=' || (r ->> 'ritrovate') || ';'; END IF;
  IF (r -> 'cambi' ->> 'data_trasmissione')::int <> 1 THEN v_fail := v_fail || ' cambi data;'; END IF;
  IF (r -> 'cambi' ->> 'ora_inizio')::int <> 1 THEN v_fail := v_fail || ' cambi ora;'; END IF;
  IF (r -> 'cambi' ->> 'titoli')::int <> 1 THEN v_fail := v_fail || ' cambi titoli;'; END IF;
  IF jsonb_array_length(r -> 'esempi') <> 1 THEN v_fail := v_fail || ' esempi;'; END IF;
  IF (r ->> 'aggiornate')::int <> 0 THEN v_fail := v_fail || ' anteprima ha scritto;'; END IF;
  IF (SELECT titolo FROM public.programmazioni WHERE id = p1) <> 'I padroni della cittÃ' THEN v_fail := v_fail || ' anteprima titolo;'; END IF;

  -- 2) applicazione
  r := public.riprocessa_campi_programmazioni(cp, righe, true);
  IF (r ->> 'aggiornate')::int <> 1 THEN v_fail := v_fail || ' aggiornate=' || (r ->> 'aggiornate') || ';'; END IF;
  IF (SELECT titolo FROM public.programmazioni WHERE id = p1) <> 'I padroni della città' THEN v_fail := v_fail || ' titolo;'; END IF;
  IF (SELECT data_trasmissione FROM public.programmazioni WHERE id = p1) <> '2024-12-01' THEN v_fail := v_fail || ' data;'; END IF;
  IF (SELECT ora_inizio FROM public.programmazioni WHERE id = p1) <> '19:30:00' THEN v_fail := v_fail || ' ora;'; END IF;
  IF (SELECT data_trasmissione FROM public.programmazioni WHERE id = p2) <> '2024-03-01' THEN v_fail := v_fail || ' p2 data svuotata;'; END IF;
  IF (SELECT titolo FROM public.programmazioni WHERE id = p_altra) <> 'Altra' THEN v_fail := v_fail || ' altra campagna toccata;'; END IF;

  -- 3) riallineamento delle individuazioni
  n := public.riallinea_individuazioni_da_programmazioni(cp);
  IF n <> 1 THEN v_fail := v_fail || ' riallineate=' || n || ';'; END IF;
  IF (SELECT ora_inizio FROM public.individuazioni WHERE programmazione_id = p1) <> '19:30:00' THEN v_fail := v_fail || ' ora individuazione;'; END IF;
  IF (SELECT data_trasmissione FROM public.individuazioni WHERE programmazione_id = p1) <> '2024-12-01' THEN v_fail := v_fail || ' data individuazione;'; END IF;
  IF public.riallinea_individuazioni_da_programmazioni(cp) <> 0 THEN v_fail := v_fail || ' riallineamento non idempotente;'; END IF;

  -- 4) permessi: solo service_role
  IF has_function_privilege('authenticated', 'public.riprocessa_campi_programmazioni(uuid,jsonb,boolean)', 'execute')
     OR has_function_privilege('anon', 'public.riallinea_individuazioni_da_programmazioni(uuid)', 'execute') THEN
    v_fail := v_fail || ' permessi;';
  END IF;

  IF v_fail <> '' THEN
    RAISE EXCEPTION 'FAIL:%', v_fail;
  END IF;
  RAISE NOTICE 'RIEPILOGO riprocesso campi: ok';
END
$test$;

ROLLBACK;
