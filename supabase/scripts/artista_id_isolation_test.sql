-- Test di isolamento artista. Gira in una transazione che fa sempre ROLLBACK.
-- Non modifica dati permanenti. Non usa l'utente produzione
-- 2caf7dfe-9801-4416-867e-f5f284987a58 (va eliminato prima della migration):
-- l'artista senza app_metadata.artista_id e solo sintetico, creato qui e
-- annullato dal ROLLBACK.
--
-- Prerequisito: migration 20261020212235_artista_id_app_metadata.sql gia applicata
-- (get_user_artista_id legge solo app_metadata; il ramo pubblico di
-- partecipazioni/individuazioni non vale per ruolo=artista).
--
-- Esecuzione:
--   psql -v ON_ERROR_STOP=1 -f supabase/scripts/artista_id_isolation_test.sql
--
-- Output: una riga NOTICE PASS o FAIL per ogni controllo. Se un controllo
-- fallisce lo script termina con EXCEPTION (exit code diverso da 0) e la
-- transazione viene annullata.

BEGIN;

DO $isolation$
DECLARE
  v_art_a uuid := '11111111-1111-4111-8111-111111111111';
  v_art_b uuid := '22222222-2222-4222-8222-222222222222';
  v_user_a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_user_b uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  v_user_u uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  v_opera_a uuid := '33333333-3333-4333-8333-333333333333';
  v_opera_b uuid := '44444444-4444-4444-8444-444444444444';
  v_ruolo uuid := '55555555-5555-4555-8555-555555555555';
  v_emittente uuid := '66666666-6666-4666-8666-666666666666';
  v_camp_prog uuid := '77777777-7777-4777-8777-777777777777';
  v_prog_a uuid := '88888888-8888-4888-8888-888888888888';
  v_prog_b uuid := '99999999-9999-4999-8999-999999999999';
  v_camp_ind uuid := 'aaaa1111-1111-4111-8111-111111111111';
  v_ind_a uuid := 'bbbb1111-1111-4111-8111-111111111111';
  v_ind_b uuid := 'bbbb2222-2222-4222-8222-222222222222';
  v_camp_rip uuid := 'cccc1111-1111-4111-8111-111111111111';
  v_own int;
  v_other int;
  v_seen uuid;
  v_fail int := 0;
  v_pass int := 0;
  v_label text;
BEGIN
  PERFORM set_config('rasi.skip_programmazioni_count_trigger', 'on', true);

  INSERT INTO public.artisti (id, nome, cognome, stato, stato_validazione)
  VALUES
    (v_art_a, 'Iso', 'ArtistaA', 'attivo', 'validato'),
    (v_art_b, 'Iso', 'ArtistaB', 'attivo', 'validato');

  INSERT INTO public.opere (id, titolo, tipo, stato_validazione)
  VALUES
    (v_opera_a, 'Opera isolamento A', 'film', 'validato'),
    (v_opera_b, 'Opera isolamento B', 'film', 'validato');

  INSERT INTO public.ruoli_tipologie (id, codice, nome, categoria)
  VALUES (v_ruolo, 'iso-test-ruolo', 'Ruolo isolamento', 'recitazione');

  INSERT INTO public.partecipazioni (artista_id, opera_id, ruolo_id)
  VALUES (v_art_a, v_opera_a, v_ruolo), (v_art_b, v_opera_b, v_ruolo);

  INSERT INTO public.emittenti (id, codice, nome, tipo)
  VALUES (v_emittente, 'iso-test-emittente', 'Emittente isolamento', 'tv_generalista');

  INSERT INTO public.campagne_programmazione (id, nome, emittente_id, anno)
  VALUES (v_camp_prog, 'Campagna isolamento', v_emittente, 2026);

  INSERT INTO public.programmazioni (id, emittente_id, campagna_programmazione_id, titolo)
  VALUES
    (v_prog_a, v_emittente, v_camp_prog, 'Trasmissione A'),
    (v_prog_b, v_emittente, v_camp_prog, 'Trasmissione B');

  INSERT INTO public.campagne_individuazione (
    id, nome, emittente_id, campagne_programmazione_id, anno
  )
  VALUES (v_camp_ind, 'Individuazione isolamento', v_emittente, v_camp_prog, 2026);

  INSERT INTO public.individuazioni (
    id, campagna_individuazioni_id, programmazione_id, opera_id,
    artista_id, ruolo_id, emittente_id, punteggio_matching, dettagli_matching, stato
  )
  VALUES
    (v_ind_a, v_camp_ind, v_prog_a, v_opera_a, v_art_a, v_ruolo, v_emittente, 90, '{}'::jsonb, 'individuato'),
    (v_ind_b, v_camp_ind, v_prog_b, v_opera_b, v_art_b, v_ruolo, v_emittente, 90, '{}'::jsonb, 'individuato');

  INSERT INTO public.campagne_ripartizione (
    id, nome, periodo_riferimento_inizio, periodo_riferimento_fine, importo_totale_disponibile
  )
  VALUES (v_camp_rip, 'Ripartizione isolamento', DATE '2026-01-01', DATE '2026-12-31', 100);

  -- chk_importi: importo_netto = lordo - trattenuta_collecting - COALESCE(altre_trattenute, 0)
  INSERT INTO public.ripartizioni (
    campagna_ripartizione_id, artista_id,
    importo_lordo, trattenuta_collecting, altre_trattenute, importo_netto
  )
  VALUES
    (v_camp_rip, v_art_a, 10, 0, 0, 10),
    (v_camp_rip, v_art_b, 20, 0, 0, 20);

  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  VALUES
    (
      '00000000-0000-0000-0000-000000000000', v_user_a, 'authenticated', 'authenticated',
      'iso-a@example.invalid',
      jsonb_build_object('ruolo', 'artista', 'artista_id', v_art_a::text),
      jsonb_build_object('artista_id', v_art_b::text),
      now(), now()
    ),
    (
      '00000000-0000-0000-0000-000000000000', v_user_b, 'authenticated', 'authenticated',
      'iso-b@example.invalid',
      jsonb_build_object('ruolo', 'artista', 'artista_id', v_art_b::text),
      jsonb_build_object('artista_id', v_art_a::text),
      now(), now()
    ),
    (
      '00000000-0000-0000-0000-000000000000', v_user_u, 'authenticated', 'authenticated',
      'iso-unlinked@example.invalid',
      jsonb_build_object('ruolo', 'artista'),
      jsonb_build_object('artista_id', v_art_a::text),
      now(), now()
    );

  -- Artista A: app_metadata proprio, user_metadata dell'altro.
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_user_a::text,
      'role', 'authenticated',
      'app_metadata', jsonb_build_object('ruolo', 'artista', 'artista_id', v_art_a::text),
      'user_metadata', jsonb_build_object('artista_id', v_art_b::text)
    )::text,
    true
  );
  EXECUTE 'SET LOCAL ROLE authenticated';

  v_label := 'artist_a';
  SELECT public.get_user_artista_id() INTO v_seen;
  IF v_seen = v_art_a THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS % get_user_artista_id ignora user_metadata e restituisce il proprio id', v_label;
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL % get_user_artista_id=% atteso=%', v_label, v_seen, v_art_a;
  END IF;

  SELECT count(*) INTO v_own FROM public.artisti WHERE id = v_art_a;
  SELECT count(*) INTO v_other FROM public.artisti WHERE id = v_art_b;
  IF v_own = 1 AND v_other = 0 THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS % artisti own=1 other=0', v_label;
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL % artisti own=% other=%', v_label, v_own, v_other;
  END IF;

  SELECT count(*) INTO v_own FROM public.partecipazioni WHERE artista_id = v_art_a;
  SELECT count(*) INTO v_other FROM public.partecipazioni WHERE artista_id = v_art_b;
  IF v_own = 1 AND v_other = 0 THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS % partecipazioni own=1 other=0', v_label;
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL % partecipazioni own=% other=%', v_label, v_own, v_other;
  END IF;

  SELECT count(*) INTO v_own FROM public.individuazioni WHERE artista_id = v_art_a;
  SELECT count(*) INTO v_other FROM public.individuazioni WHERE artista_id = v_art_b;
  IF v_own = 1 AND v_other = 0 THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS % individuazioni own=1 other=0', v_label;
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL % individuazioni own=% other=%', v_label, v_own, v_other;
  END IF;

  SELECT count(*) INTO v_own FROM public.ripartizioni WHERE artista_id = v_art_a;
  SELECT count(*) INTO v_other FROM public.ripartizioni WHERE artista_id = v_art_b;
  IF v_own = 1 AND v_other = 0 THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS % ripartizioni own=1 other=0', v_label;
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL % ripartizioni own=% other=%', v_label, v_own, v_other;
  END IF;

  EXECUTE 'RESET ROLE';

  -- Artista B: stesso schema, id invertiti.
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_user_b::text,
      'role', 'authenticated',
      'app_metadata', jsonb_build_object('ruolo', 'artista', 'artista_id', v_art_b::text),
      'user_metadata', jsonb_build_object('artista_id', v_art_a::text)
    )::text,
    true
  );
  EXECUTE 'SET LOCAL ROLE authenticated';

  v_label := 'artist_b';
  SELECT public.get_user_artista_id() INTO v_seen;
  IF v_seen = v_art_b THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS % get_user_artista_id ignora user_metadata e restituisce il proprio id', v_label;
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL % get_user_artista_id=% atteso=%', v_label, v_seen, v_art_b;
  END IF;

  SELECT count(*) INTO v_own FROM public.artisti WHERE id = v_art_b;
  SELECT count(*) INTO v_other FROM public.artisti WHERE id = v_art_a;
  IF v_own = 1 AND v_other = 0 THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS % artisti own=1 other=0', v_label;
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL % artisti own=% other=%', v_label, v_own, v_other;
  END IF;

  SELECT count(*) INTO v_own FROM public.partecipazioni WHERE artista_id = v_art_b;
  SELECT count(*) INTO v_other FROM public.partecipazioni WHERE artista_id = v_art_a;
  IF v_own = 1 AND v_other = 0 THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS % partecipazioni own=1 other=0', v_label;
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL % partecipazioni own=% other=%', v_label, v_own, v_other;
  END IF;

  SELECT count(*) INTO v_own FROM public.individuazioni WHERE artista_id = v_art_b;
  SELECT count(*) INTO v_other FROM public.individuazioni WHERE artista_id = v_art_a;
  IF v_own = 1 AND v_other = 0 THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS % individuazioni own=1 other=0', v_label;
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL % individuazioni own=% other=%', v_label, v_own, v_other;
  END IF;

  SELECT count(*) INTO v_own FROM public.ripartizioni WHERE artista_id = v_art_b;
  SELECT count(*) INTO v_other FROM public.ripartizioni WHERE artista_id = v_art_a;
  IF v_own = 1 AND v_other = 0 THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS % ripartizioni own=1 other=0', v_label;
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL % ripartizioni own=% other=%', v_label, v_own, v_other;
  END IF;

  EXECUTE 'RESET ROLE';

  -- Sintetico, non l'utente produzione: ruolo artista, niente app_metadata.artista_id,
  -- user_metadata che rivendica l'artista A. Deve vedere zero righe.
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_user_u::text,
      'role', 'authenticated',
      'app_metadata', jsonb_build_object('ruolo', 'artista'),
      'user_metadata', jsonb_build_object('artista_id', v_art_a::text)
    )::text,
    true
  );
  EXECUTE 'SET LOCAL ROLE authenticated';

  v_label := 'synthetic_unlinked';
  SELECT public.get_user_artista_id() INTO v_seen;
  IF v_seen IS NULL THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS % get_user_artista_id e NULL (niente fallback su user_metadata)', v_label;
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL % get_user_artista_id=% atteso NULL', v_label, v_seen;
  END IF;

  SELECT count(*) INTO v_own FROM public.artisti WHERE id IN (v_art_a, v_art_b);
  SELECT count(*) INTO v_other FROM public.partecipazioni WHERE artista_id IN (v_art_a, v_art_b);
  IF v_own = 0 AND v_other = 0 THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS % artisti=0 partecipazioni=0', v_label;
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL % artisti=% partecipazioni=%', v_label, v_own, v_other;
  END IF;

  SELECT count(*) INTO v_own FROM public.individuazioni WHERE artista_id IN (v_art_a, v_art_b);
  SELECT count(*) INTO v_other FROM public.ripartizioni WHERE artista_id IN (v_art_a, v_art_b);
  IF v_own = 0 AND v_other = 0 THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS % individuazioni=0 ripartizioni=0', v_label;
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL % individuazioni=% ripartizioni=%', v_label, v_own, v_other;
  END IF;

  EXECUTE 'RESET ROLE';

  IF v_fail > 0 THEN
    RAISE EXCEPTION 'artista_id isolation test FAILED pass=% fail=%', v_pass, v_fail;
  END IF;

  RAISE NOTICE 'PASS artista_id isolation test (% checks)', v_pass;
END
$isolation$;

ROLLBACK;
