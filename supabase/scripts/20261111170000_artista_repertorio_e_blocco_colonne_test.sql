-- Test di 20261111170000_artista_repertorio_e_blocco_colonne.sql.
-- Gira in una transazione che fa sempre ROLLBACK: non lascia dati.
--
-- Esecuzione (database locale o di staging, mai produzione senza OK):
--   psql -v ON_ERROR_STOP=1 -f supabase/scripts/20261111170000_artista_repertorio_e_blocco_colonne_test.sql
--
-- Controlli:
--   A5  l'artista vede la propria partecipazione anche se opera e artista
--       sono da validare (caso "Pinco Panco" / opera "Test");
--       non vede quella di un altro artista;
--       readonly continua a non vedere partecipazioni non validate.
--   Blocco colonne  l'artista può cambiare nome e contatti, non può cambiare
--       stato, data_fine_mandato, diritti_attivi, codice_ipn, stato_validazione;
--       l'operatore può cambiare stato.
-- Se un controllo fallisce lo script termina con EXCEPTION.

BEGIN;

DO $test$
DECLARE
  v_art_a uuid := '11111111-1111-4111-8111-111111111111';
  v_art_b uuid := '22222222-2222-4222-8222-222222222222';
  v_user_a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_user_ro uuid := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  v_user_op uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  v_opera_a uuid := '33333333-3333-4333-8333-333333333333';
  v_opera_b uuid := '44444444-4444-4444-8444-444444444444';
  v_ruolo uuid := '55555555-5555-4555-8555-555555555555';
  v_n int;
  v_ok boolean;
  v_fail int := 0;
  v_pass int := 0;
  v_col text;
  v_sql text;
BEGIN
  -- Dati: artista A e la sua opera sono entrambi da validare (caso Pinco Panco).
  INSERT INTO public.artisti (id, nome, cognome, stato, stato_validazione)
  VALUES
    (v_art_a, 'Pinco', 'Panco', 'attivo', 'da_validare'),
    (v_art_b, 'Altro', 'Artista', 'attivo', 'da_validare');

  INSERT INTO public.opere (id, titolo, tipo, stato_validazione)
  VALUES
    (v_opera_a, 'Test', 'film', 'da_validare'),
    (v_opera_b, 'Test B', 'film', 'da_validare');

  INSERT INTO public.ruoli_tipologie (id, codice, nome, categoria)
  VALUES (v_ruolo, 'a5-test-ruolo', 'Ruolo test A5', 'recitazione');

  INSERT INTO public.partecipazioni (artista_id, opera_id, ruolo_id)
  VALUES (v_art_a, v_opera_a, v_ruolo), (v_art_b, v_opera_b, v_ruolo);

  INSERT INTO auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
    ('00000000-0000-0000-0000-000000000000', v_user_a, 'authenticated', 'authenticated', 'a5-artista@example.invalid',
     jsonb_build_object('ruolo', 'artista', 'artista_id', v_art_a::text), '{}'::jsonb, now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_user_ro, 'authenticated', 'authenticated', 'a5-readonly@example.invalid',
     jsonb_build_object('ruolo', 'readonly'), '{}'::jsonb, now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_user_op, 'authenticated', 'authenticated', 'a5-operatore@example.invalid',
     jsonb_build_object('ruolo', 'operatore'), '{}'::jsonb, now(), now());

  -- ---------------------------------------------------------------- artista
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', v_user_a::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  SELECT count(*) INTO v_n FROM public.partecipazioni WHERE artista_id = v_art_a;
  IF v_n = 1 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS artista vede la propria partecipazione su opera da validare';
  ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL artista propria partecipazione count=% atteso=1', v_n; END IF;

  SELECT count(*) INTO v_n FROM public.partecipazioni WHERE artista_id = v_art_b;
  IF v_n = 0 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS artista non vede le partecipazioni altrui';
  ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL artista vede partecipazioni altrui count=%', v_n; END IF;

  -- Campi consentiti
  BEGIN
    UPDATE public.artisti
      SET nome_arte = 'Pinco P.', contatti = '{"email":"pinco@example.invalid"}'::jsonb,
          indirizzo = '{"citta":"Roma"}'::jsonb
      WHERE id = v_art_a;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n = 1 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS artista aggiorna nome_arte, contatti, indirizzo';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL artista update consentito row_count=%', v_n; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL artista update consentito errore: %', SQLERRM;
  END;

  -- Campi bloccati, uno per volta
  FOREACH v_col IN ARRAY ARRAY['stato', 'data_fine_mandato', 'diritti_attivi', 'codice_ipn', 'stato_validazione', 'is_rasi'] LOOP
    v_sql := CASE v_col
      WHEN 'stato' THEN 'UPDATE public.artisti SET stato = ''cessato'' WHERE id = $1'
      WHEN 'data_fine_mandato' THEN 'UPDATE public.artisti SET data_fine_mandato = DATE ''2030-01-01'' WHERE id = $1'
      WHEN 'diritti_attivi' THEN 'UPDATE public.artisti SET diritti_attivi = ''["X"]''::jsonb WHERE id = $1'
      WHEN 'codice_ipn' THEN 'UPDATE public.artisti SET codice_ipn = ''IPN-TEST'' WHERE id = $1'
      WHEN 'stato_validazione' THEN 'UPDATE public.artisti SET stato_validazione = ''validato'' WHERE id = $1'
      WHEN 'is_rasi' THEN 'UPDATE public.artisti SET is_rasi = false WHERE id = $1'
    END;
    v_ok := false;
    BEGIN
      EXECUTE v_sql USING v_art_a;
    EXCEPTION WHEN insufficient_privilege THEN
      v_ok := true;
    END;
    IF v_ok THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS artista non può modificare %', v_col;
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL artista ha modificato %', v_col; END IF;
  END LOOP;

  EXECUTE 'RESET ROLE';

  -- --------------------------------------------------------------- readonly
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', v_user_ro::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  SELECT count(*) INTO v_n FROM public.partecipazioni WHERE artista_id IN (v_art_a, v_art_b);
  IF v_n = 0 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS readonly non vede partecipazioni non validate (invariato)';
  ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL readonly vede % partecipazioni non validate', v_n; END IF;

  EXECUTE 'RESET ROLE';

  -- -------------------------------------------------------------- operatore
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', v_user_op::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  SELECT count(*) INTO v_n FROM public.partecipazioni WHERE artista_id IN (v_art_a, v_art_b);
  IF v_n = 2 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS operatore vede tutte le partecipazioni';
  ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL operatore vede % partecipazioni, attese 2', v_n; END IF;

  BEGIN
    UPDATE public.artisti SET stato = 'sospeso', data_fine_mandato = DATE '2030-01-01' WHERE id = v_art_a;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n = 1 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS operatore modifica stato e mandato';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL operatore update row_count=%', v_n; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL operatore update errore: %', SQLERRM;
  END;

  EXECUTE 'RESET ROLE';

  RAISE NOTICE 'RIEPILOGO pass=% fail=%', v_pass, v_fail;
  IF v_fail > 0 THEN
    RAISE EXCEPTION '% controlli falliti', v_fail;
  END IF;
END
$test$;

ROLLBACK;
