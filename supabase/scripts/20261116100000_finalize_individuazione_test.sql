-- Test di 20261116100000_finalize_individuazione_usa_programmazioni_count.sql.
-- Gira in una transazione che fa sempre ROLLBACK: non lascia dati.
--
--   psql -v ON_ERROR_STOP=1 -f supabase/scripts/20261116100000_finalize_individuazione_test.sql
--
-- Controlla che finalize_campagna_individuazione:
--   - usi campagne_programmazione.programmazioni_count come totale;
--   - ricada su COUNT(*) quando il contatore è nullo o zero;
--   - calcoli le statistiche sulle individuazioni come prima;
--   - chiuda la campagna (completata / individuata).

BEGIN;

DO $test$
DECLARE
  emit uuid := gen_random_uuid();
  cp uuid := gen_random_uuid();
  ci uuid := gen_random_uuid();
  op1 uuid := gen_random_uuid();
  op2 uuid := gen_random_uuid();
  art1 uuid := gen_random_uuid();
  art2 uuid := gen_random_uuid();
  ruolo uuid := gen_random_uuid();
  p1 uuid; p2 uuid; p3 uuid;
  r jsonb;
  s jsonb;
  v_fail text := '';
BEGIN
  INSERT INTO public.emittenti (id, codice, nome, tipo) VALUES (emit, 'finalize-test-emit', 'Emittente finalize', 'tv_generalista');
  INSERT INTO public.campagne_programmazione (id, nome, emittente_id, anno, stato) VALUES (cp, 'Finalize test', emit, 2026, 'in_review');
  INSERT INTO public.programmazioni (emittente_id, campagna_programmazione_id, titolo) VALUES (emit, cp, 'A') RETURNING id INTO p1;
  INSERT INTO public.programmazioni (emittente_id, campagna_programmazione_id, titolo) VALUES (emit, cp, 'B') RETURNING id INTO p2;
  INSERT INTO public.programmazioni (emittente_id, campagna_programmazione_id, titolo) VALUES (emit, cp, 'C') RETURNING id INTO p3;
  INSERT INTO public.campagne_individuazione (id, nome, emittente_id, campagne_programmazione_id, anno, stato)
    VALUES (ci, 'Individuazione - Finalize test', emit, cp, 2026, 'in_corso');
  INSERT INTO public.opere (id, titolo, tipo) VALUES (op1, 'Opera F1', 'film'), (op2, 'Opera F2', 'film');
  INSERT INTO public.artisti (id, nome, cognome) VALUES (art1, 'Uno', 'Finalize'), (art2, 'Due', 'Finalize');
  INSERT INTO public.ruoli_tipologie (id, codice, nome, categoria) VALUES (ruolo, 'finalize-test', 'Ruolo finalize', 'recitazione');
  -- 3 individuazioni su 2 programmazioni, 2 artisti, 2 opere
  INSERT INTO public.individuazioni (campagna_individuazioni_id, programmazione_id, opera_id, artista_id, ruolo_id, emittente_id, punteggio_matching, dettagli_matching) VALUES
    (ci, p1, op1, art1, ruolo, emit, 1, '{}'),
    (ci, p1, op1, art2, ruolo, emit, 1, '{}'),
    (ci, p2, op2, art1, ruolo, emit, 1, '{}');

  -- 1) contatore valorizzato: il totale viene dal contatore (qui volutamente 1000)
  UPDATE public.campagne_programmazione SET programmazioni_count = 1000 WHERE id = cp;
  r := public.finalize_campagna_individuazione(ci, cp);
  s := r -> 'statistiche';
  IF (r ->> 'success')::boolean IS DISTINCT FROM true THEN v_fail := v_fail || ' success;'; END IF;
  IF (s ->> 'programmazioni_totali')::int <> 1000 THEN v_fail := v_fail || ' totale da contatore=' || (s ->> 'programmazioni_totali') || ';'; END IF;
  IF (s ->> 'programmazioni_con_match')::int <> 2 THEN v_fail := v_fail || ' con_match;'; END IF;
  IF (s ->> 'programmazioni_senza_match')::int <> 998 THEN v_fail := v_fail || ' senza_match;'; END IF;
  IF (s ->> 'individuazioni_create')::int <> 3 THEN v_fail := v_fail || ' individuazioni;'; END IF;
  IF (s ->> 'artisti_distinti')::int <> 2 THEN v_fail := v_fail || ' artisti;'; END IF;
  IF (s ->> 'opere_distinte')::int <> 2 THEN v_fail := v_fail || ' opere;'; END IF;
  IF (SELECT stato::text FROM public.campagne_individuazione WHERE id = ci) <> 'completata' THEN v_fail := v_fail || ' stato ci;'; END IF;
  IF (SELECT stato::text FROM public.campagne_programmazione WHERE id = cp) <> 'individuata' THEN v_fail := v_fail || ' stato cp;'; END IF;
  IF (SELECT is_individuated FROM public.campagne_programmazione WHERE id = cp) IS DISTINCT FROM true THEN v_fail := v_fail || ' is_individuated;'; END IF;

  -- 2) contatore a zero (colonna NOT NULL DEFAULT 0, mai aggiornata): ripiego su COUNT(*) delle programmazioni (3)
  PERFORM set_config('rasi.skip_programmazioni_count_trigger', 'on', true);
  UPDATE public.campagne_programmazione SET programmazioni_count = 0 WHERE id = cp;
  r := public.finalize_campagna_individuazione(ci, cp);
  s := r -> 'statistiche';
  IF (s ->> 'programmazioni_totali')::int <> 3 THEN v_fail := v_fail || ' fallback count=' || coalesce(s ->> 'programmazioni_totali', 'NULL') || ';'; END IF;
  IF (s ->> 'programmazioni_senza_match')::int <> 1 THEN v_fail := v_fail || ' fallback senza_match;'; END IF;

  IF v_fail <> '' THEN
    RAISE EXCEPTION 'FAIL:%', v_fail;
  END IF;
  RAISE NOTICE 'RIEPILOGO finalize_campagna_individuazione: ok';
END
$test$;

ROLLBACK;
