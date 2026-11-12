-- Note delle partecipazioni invisibili al ruolo artista.
-- Gira in una transazione che fa sempre ROLLBACK: non modifica dati permanenti.
--
-- Prerequisito: migration 20261111150000_partecipazioni_note_nascoste_artista.sql
-- già applicata (colonna partecipazioni.note assente, tabella partecipazioni_note presente).
--
-- Esecuzione:
--   psql -v ON_ERROR_STOP=1 -f supabase/scripts/20261111150000_partecipazioni_note_rls_test.sql
--
-- Output: NOTICE PASS o FAIL. Un FAIL termina con EXCEPTION.

BEGIN;

DO $note_rls$
DECLARE
  v_art uuid := '11111111-1111-4111-8111-111111111171';
  v_user_artista uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa71';
  v_user_admin uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb71';
  v_user_operatore uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccc71';
  v_user_readonly uuid := 'dddddddd-dddd-4ddd-8ddd-dddddddddd71';
  v_opera uuid := '33333333-3333-4333-8333-333333333371';
  v_ruolo uuid := '55555555-5555-4555-8555-555555555571';
  v_part uuid := '77777777-7777-4777-8777-777777777771';
  v_count int;
  v_text text;
  v_pass int := 0;
  v_fail int := 0;
  v_policies int;
  v_all int;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'partecipazioni'
      AND column_name = 'note'
  ) THEN
    RAISE EXCEPTION 'partecipazioni.note esiste ancora: applicare prima la migration';
  END IF;

  IF to_regclass('public.partecipazioni_note') IS NULL THEN
    RAISE EXCEPTION 'partecipazioni_note assente: applicare prima la migration';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'partecipazioni'
      AND policyname = 'partecipazioni_select_policy'
      AND cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'partecipazioni_select_policy mancante: la migration non deve toccare la RLS di #62/#63';
  END IF;

  -- Postgres riscrive (select public.get_user_role()) in
  -- (SELECT get_user_role() AS get_user_role): è l'initplan, non la chiamata per riga.
  SELECT count(*) INTO v_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'partecipazioni_note';

  SELECT count(*) INTO v_all
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'partecipazioni_note'
    AND cmd = 'ALL';

  IF v_policies = 4 AND v_all = 0 AND NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'partecipazioni_note'
      AND (
        -- Dopo 20261112090100 le policy usano anche i controlli di ruolo
        -- (select is_opere_editor()) e partecipazione_modificabile(partecipazione_id),
        -- che dipende dalla riga e quindi non può essere un initplan.
        (qual IS NOT NULL AND qual !~* '(select\s+(get_user_role|is_staff|is_staff_reader|is_opere_editor)\s*\(\s*\)\s+as\s+\w+|partecipazione_modificabile\s*\(\s*partecipazione_id\s*\))')
        OR (with_check IS NOT NULL AND with_check !~* '(select\s+(get_user_role|is_staff|is_staff_reader|is_opere_editor)\s*\(\s*\)\s+as\s+\w+|partecipazione_modificabile\s*\(\s*partecipazione_id\s*\))')
      )
  ) THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS policy note spezzate e con controlli di ruolo initplan o partecipazione_modificabile';
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL policy note policies=% all=%', v_policies, v_all;
  END IF;

  INSERT INTO public.artisti (id, nome, cognome, stato, stato_validazione)
  VALUES (v_art, 'Nota', 'Nascosta', 'attivo', 'validato');

  INSERT INTO public.opere (id, titolo, tipo, stato_validazione)
  VALUES (v_opera, 'Opera note nascoste', 'film', 'validato');

  INSERT INTO public.ruoli_tipologie (id, codice, nome, categoria)
  VALUES (v_ruolo, 'note-test-ruolo', 'Ruolo note', 'recitazione');

  INSERT INTO public.partecipazioni (id, artista_id, opera_id, ruolo_id, personaggio)
  VALUES (v_part, v_art, v_opera, v_ruolo, 'Protagonista');

  INSERT INTO public.partecipazioni_note (partecipazione_id, note)
  VALUES (v_part, 'nota riservata staff');

  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  VALUES
    (
      '00000000-0000-0000-0000-000000000000', v_user_artista, 'authenticated', 'authenticated',
      'note-artista@example.invalid',
      jsonb_build_object('ruolo', 'artista', 'artista_id', v_art::text),
      '{}'::jsonb, now(), now()
    ),
    (
      '00000000-0000-0000-0000-000000000000', v_user_admin, 'authenticated', 'authenticated',
      'note-admin@example.invalid',
      jsonb_build_object('ruolo', 'admin'),
      '{}'::jsonb, now(), now()
    ),
    (
      '00000000-0000-0000-0000-000000000000', v_user_operatore, 'authenticated', 'authenticated',
      'note-operatore@example.invalid',
      jsonb_build_object('ruolo', 'operatore'),
      '{}'::jsonb, now(), now()
    ),
    (
      '00000000-0000-0000-0000-000000000000', v_user_readonly, 'authenticated', 'authenticated',
      'note-readonly@example.invalid',
      jsonb_build_object('ruolo', 'readonly'),
      '{}'::jsonb, now(), now()
    );

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_user_artista::text,
      'role', 'authenticated',
      'app_metadata', jsonb_build_object('ruolo', 'artista', 'artista_id', v_art::text)
    )::text,
    true
  );
  EXECUTE 'SET LOCAL ROLE authenticated';

  SELECT count(*) INTO v_count FROM public.partecipazioni WHERE id = v_part;
  SELECT n.note INTO v_text
  FROM public.partecipazioni p
  LEFT JOIN public.partecipazioni_note n ON n.partecipazione_id = p.id
  WHERE p.id = v_part;

  IF v_count = 1 AND v_text IS NULL THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS artista vede la partecipazione e non la nota';
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL artista partecipazioni=% nota=%', v_count, v_text;
  END IF;

  SELECT count(*) INTO v_count FROM public.partecipazioni_note;
  IF v_count = 0 THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS artista non legge partecipazioni_note';
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL artista legge % note', v_count;
  END IF;

  BEGIN
    INSERT INTO public.partecipazioni_note (partecipazione_id, note)
    VALUES (v_part, 'tentativo artista');
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL artista ha scritto una nota';
  EXCEPTION WHEN insufficient_privilege THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS artista non scrive partecipazioni_note';
  END;

  EXECUTE 'RESET ROLE';

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_user_admin::text,
      'role', 'authenticated',
      'app_metadata', jsonb_build_object('ruolo', 'admin')
    )::text,
    true
  );
  EXECUTE 'SET LOCAL ROLE authenticated';

  SELECT note INTO v_text FROM public.partecipazioni_note WHERE partecipazione_id = v_part;
  IF v_text = 'nota riservata staff' THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS admin legge la nota';
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL admin nota=%', v_text;
  END IF;

  UPDATE public.partecipazioni_note SET note = 'nota aggiornata admin' WHERE partecipazione_id = v_part;
  SELECT note INTO v_text FROM public.partecipazioni_note WHERE partecipazione_id = v_part;
  IF v_text = 'nota aggiornata admin' THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS admin aggiorna la nota';
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL admin update nota=%', v_text;
  END IF;

  EXECUTE 'RESET ROLE';

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_user_operatore::text,
      'role', 'authenticated',
      'app_metadata', jsonb_build_object('ruolo', 'operatore')
    )::text,
    true
  );
  EXECUTE 'SET LOCAL ROLE authenticated';

  SELECT note INTO v_text FROM public.partecipazioni_note WHERE partecipazione_id = v_part;
  IF v_text = 'nota aggiornata admin' THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS operatore legge la nota';
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL operatore nota=%', v_text;
  END IF;

  EXECUTE 'RESET ROLE';

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_user_readonly::text,
      'role', 'authenticated',
      'app_metadata', jsonb_build_object('ruolo', 'readonly')
    )::text,
    true
  );
  EXECUTE 'SET LOCAL ROLE authenticated';

  SELECT note INTO v_text FROM public.partecipazioni_note WHERE partecipazione_id = v_part;
  IF v_text = 'nota aggiornata admin' THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS readonly legge la nota';
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL readonly nota=%', v_text;
  END IF;

  BEGIN
    UPDATE public.partecipazioni_note SET note = 'tentativo readonly' WHERE partecipazione_id = v_part;
    SELECT note INTO v_text FROM public.partecipazioni_note WHERE partecipazione_id = v_part;
    IF v_text = 'nota aggiornata admin' THEN
      v_pass := v_pass + 1;
      RAISE NOTICE 'PASS readonly non aggiorna la nota';
    ELSE
      v_fail := v_fail + 1;
      RAISE NOTICE 'FAIL readonly ha cambiato la nota in %', v_text;
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS readonly non aggiorna la nota';
  END;

  EXECUTE 'RESET ROLE';

  IF v_fail > 0 THEN
    RAISE EXCEPTION 'partecipazioni_note rls test FAILED pass=% fail=%', v_pass, v_fail;
  END IF;

  RAISE NOTICE 'PASS partecipazioni_note rls test (% checks)', v_pass;
END
$note_rls$;

ROLLBACK;
