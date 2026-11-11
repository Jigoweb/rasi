-- Test di 20261111155000_list_partecipazioni_opera_note_separate.sql.
-- Gira in una transazione che fa sempre ROLLBACK: non lascia dati.
--
-- Prerequisiti: 20261111143000 (#66), 20261111150000 (#65), 20261111155000.
--   psql -v ON_ERROR_STOP=1 -f supabase/scripts/20261111155000_list_partecipazioni_opera_note_test.sql
--
-- Controlli:
--   la funzione risponde dopo il DROP di partecipazioni.note;
--   oltre 1000 partecipazioni: total_opera reale, pagina da 50;
--   operatore: legge la nota e la trova con la ricerca;
--   artista: chiamando la funzione non riceve il testo della nota.

BEGIN;

DO $test$
DECLARE
  v_opera uuid := '33333333-3333-4333-8333-333333333333';
  v_ruolo uuid := '55555555-5555-4555-8555-555555555555';
  v_art_a uuid := '11111111-1111-4111-8111-111111111111';
  v_user_op uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  v_user_a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_part_a uuid;
  v_res jsonb;
  v_fail int := 0;
  v_pass int := 0;
BEGIN
  INSERT INTO public.opere (id, titolo, tipo, stato_validazione)
  VALUES (v_opera, 'Opera grande', 'serie_tv', 'validato');
  INSERT INTO public.ruoli_tipologie (id, codice, nome, categoria)
  VALUES (v_ruolo, 'note-test-ruolo', 'Ruolo test note', 'recitazione');

  INSERT INTO public.artisti (id, nome, cognome, stato, stato_validazione)
  VALUES (v_art_a, 'Ada', 'Nota', 'attivo', 'validato');
  INSERT INTO public.artisti (id, nome, cognome, stato)
  SELECT gen_random_uuid(), 'Comparsa', 'N' || g, 'attivo' FROM generate_series(1, 1200) g;

  INSERT INTO public.partecipazioni (artista_id, opera_id, ruolo_id)
  SELECT a.id, v_opera, v_ruolo FROM public.artisti a
  WHERE a.cognome LIKE 'N%' OR a.id = v_art_a;

  SELECT id INTO v_part_a FROM public.partecipazioni WHERE artista_id = v_art_a AND opera_id = v_opera;
  INSERT INTO public.partecipazioni_note (partecipazione_id, note) VALUES (v_part_a, 'nota riservata zeta');

  INSERT INTO auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
    ('00000000-0000-0000-0000-000000000000', v_user_op, 'authenticated', 'authenticated', 'note-op@example.invalid',
     jsonb_build_object('ruolo', 'operatore'), '{}'::jsonb, now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_user_a, 'authenticated', 'authenticated', 'note-art@example.invalid',
     jsonb_build_object('ruolo', 'artista', 'artista_id', v_art_a::text), '{}'::jsonb, now(), now());

  -- operatore
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_user_op::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  v_res := public.list_partecipazioni_opera(v_opera);
  IF (v_res->>'total_opera')::int = 1201 AND jsonb_array_length(v_res->'rows') = 50 THEN
    v_pass := v_pass + 1; RAISE NOTICE 'PASS total_opera=1201, pagina da 50';
  ELSE
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL total_opera=% righe=%', v_res->>'total_opera', jsonb_array_length(v_res->'rows');
  END IF;

  v_res := public.list_partecipazioni_opera(v_opera, 50, 0, 'zeta');
  IF (v_res->>'total')::int = 1 AND v_res->'rows'->0->>'note' = 'nota riservata zeta' THEN
    v_pass := v_pass + 1; RAISE NOTICE 'PASS operatore trova e legge la nota';
  ELSE
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL operatore ricerca nota: %', left(v_res::text, 200);
  END IF;

  EXECUTE 'RESET ROLE';

  -- artista
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_user_a::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  v_res := public.list_partecipazioni_opera(v_opera, 50, 0, 'Ada');
  IF (v_res->>'total')::int = 1 AND (v_res->'rows'->0->'note') = 'null'::jsonb THEN
    v_pass := v_pass + 1; RAISE NOTICE 'PASS artista non riceve il testo della nota';
  ELSE
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL artista: %', left(v_res::text, 200);
  END IF;

  v_res := public.list_partecipazioni_opera(v_opera, 50, 0, 'zeta');
  IF (v_res->>'total')::int = 0 THEN
    v_pass := v_pass + 1; RAISE NOTICE 'PASS artista non trova righe cercando il testo della nota';
  ELSE
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL artista trova % righe per testo nota', v_res->>'total';
  END IF;

  EXECUTE 'RESET ROLE';

  RAISE NOTICE 'RIEPILOGO pass=% fail=%', v_pass, v_fail;
  IF v_fail > 0 THEN
    RAISE EXCEPTION '% controlli falliti', v_fail;
  END IF;
END
$test$;

ROLLBACK;
