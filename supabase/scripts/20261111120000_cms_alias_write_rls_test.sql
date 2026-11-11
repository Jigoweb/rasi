-- Prova RLS sulle scritture di pages, documents, bandi_news, opera_aliases.
-- Gira in una transazione che fa sempre ROLLBACK: non lascia utenti né righe.
--
-- Utenti sintetici, email @example.invalid, creati qui e annullati dal
-- ROLLBACK. Nessun dato personale, nessun collegamento al progetto di
-- produzione.
--
-- Prerequisito: migration 20261111120000_restrict_cms_alias_writes_to_admin.sql
-- già applicata. La funzione attuale get_user_role() legge
-- auth.users.raw_app_meta_data.ruolo. Una versione precedente, ancora
-- presente su qualche DB locale non riallineato, leggeva
-- raw_user_meta_data.ruolo e in mancanza restituiva 'readonly'.
-- Gli utenti di prova hanno il ruolo in entrambi i campi, così la policy
-- vede admin / operatore / artista in entrambi i casi.
-- Il ruolo authenticated deve avere GRANT di INSERT/UPDATE/DELETE/SELECT
-- (li ha sia in locale dopo bootstrap, sia sul branch).
--
-- Esecuzione, su un branch Supabase o sul Postgres locale, mai in produzione:
--   psql -v ON_ERROR_STOP=1 -f supabase/scripts/20261111120000_cms_alias_write_rls_test.sql
--
-- Output: una riga NOTICE PASS o FAIL per ogni controllo. Se un controllo
-- fallisce lo script termina con EXCEPTION (exit code diverso da 0).

BEGIN;

DO $rls$
DECLARE
  v_artista uuid := 'a11a1111-1111-4111-8111-111111111a11';
  v_operatore uuid := 'b22b2222-2222-4222-8222-222222222b22';
  v_admin uuid := 'c33c3333-3333-4333-8333-333333333c33';
  v_opera uuid := 'd44d4444-4444-4444-8444-444444444d44';
  v_page_pub uuid := 'e55e5555-5555-4555-8555-555555555e55';
  v_page_draft uuid := 'e66e6666-6666-4666-8666-666666666e66';
  v_doc uuid := 'f77f7777-7777-4777-8777-777777777f77';
  v_news uuid := 'a88a8888-8888-4888-8888-888888888a88';
  v_alias uuid := 'b99b9999-9999-4999-8999-999999999b99';
  v_pass int := 0;
  v_fail int := 0;
  v_n int;
  v_title text;
  v_role text;
  v_uid uuid;
  v_new_page uuid;
  v_new_doc uuid;
  v_new_news uuid;
  v_new_alias uuid;
  v_sqlstate text;
  v_sqlerrm text;
BEGIN
  IF to_regprocedure('public.get_user_role()') IS NULL THEN
    RAISE EXCEPTION 'get_user_role() assente';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND policyname = 'pages_insert_admin'
  ) THEN
    RAISE EXCEPTION 'migration non applicata: manca pages_insert_admin';
  END IF;

  INSERT INTO public.opere (id, titolo, tipo)
  VALUES (v_opera, 'Opera test RLS', 'film');

  INSERT INTO public.pages (id, category, slug, title, template_type, is_published)
  VALUES
    (v_page_pub, 'rls-test', 'pubblicata', 'Pagina pubblicata RLS', 'institutional', true),
    (v_page_draft, 'rls-test', 'bozza', 'Pagina bozza RLS', 'institutional', false);

  INSERT INTO public.documents (id, title, file_url, category)
  VALUES (v_doc, 'Documento RLS', 'https://example.invalid/rls.pdf', 'modulistica');

  INSERT INTO public.bandi_news (id, slug, title, status)
  VALUES (v_news, 'rls-test-bando', 'Bando RLS', 'active');

  INSERT INTO public.opera_aliases (id, opera_id, alias_titolo, alias_titolo_norm, source)
  VALUES (v_alias, v_opera, 'Titolo alias RLS', 'titolo alias rls', 'manual');

  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  VALUES
    (
      '00000000-0000-0000-0000-000000000000', v_artista, 'authenticated', 'authenticated',
      'rls-artista@example.invalid',
      jsonb_build_object('ruolo', 'artista'),
      jsonb_build_object('ruolo', 'artista'),
      now(), now()
    ),
    (
      '00000000-0000-0000-0000-000000000000', v_operatore, 'authenticated', 'authenticated',
      'rls-operatore@example.invalid',
      jsonb_build_object('ruolo', 'operatore'),
      jsonb_build_object('ruolo', 'operatore'),
      now(), now()
    ),
    (
      '00000000-0000-0000-0000-000000000000', v_admin, 'authenticated', 'authenticated',
      'rls-admin@example.invalid',
      jsonb_build_object('ruolo', 'admin'),
      jsonb_build_object('ruolo', 'admin'),
      now(), now()
    );

  -- Artista e operatore: scrittura negata, lettura invariata.
  FOREACH v_role IN ARRAY ARRAY['artista', 'operatore']
  LOOP
    v_uid := CASE v_role WHEN 'artista' THEN v_artista ELSE v_operatore END;

    EXECUTE 'RESET ROLE';
    PERFORM set_config(
      'request.jwt.claims',
      jsonb_build_object(
        'sub', v_uid::text,
        'role', 'authenticated',
        'email', 'rls-' || v_role || '@example.invalid',
        'app_metadata', jsonb_build_object('ruolo', v_role)
      )::text,
      true
    );
    EXECUTE 'SET LOCAL ROLE authenticated';

    IF public.get_user_role()::text IS DISTINCT FROM v_role THEN
      v_fail := v_fail + 1;
      RAISE NOTICE 'FAIL % get_user_role=%', v_role, public.get_user_role();
    ELSE
      v_pass := v_pass + 1;
      RAISE NOTICE 'PASS % get_user_role', v_role;
    END IF;

    BEGIN
      INSERT INTO public.pages (category, slug, title, template_type, is_published)
      VALUES ('rls-test', 'ins-' || v_role, 'Tentativo pagina', 'institutional', false);
      v_fail := v_fail + 1;
      RAISE NOTICE 'FAIL % pages INSERT riuscito', v_role;
    EXCEPTION WHEN insufficient_privilege THEN
      GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_sqlerrm = MESSAGE_TEXT;
      IF v_sqlerrm ILIKE '%row-level security%' THEN
        v_pass := v_pass + 1;
        RAISE NOTICE 'PASS % pages INSERT negato da RLS', v_role;
      ELSE
        v_fail := v_fail + 1;
        RAISE NOTICE 'FAIL % pages INSERT % %', v_role, v_sqlstate, v_sqlerrm;
      END IF;
    END;

    UPDATE public.pages SET title = 'Tentativo pagina ' || v_role WHERE id = v_page_draft;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n = 0 THEN
      v_pass := v_pass + 1;
      RAISE NOTICE 'PASS % pages UPDATE 0 righe', v_role;
    ELSE
      v_fail := v_fail + 1;
      RAISE NOTICE 'FAIL % pages UPDATE righe=%', v_role, v_n;
    END IF;

    DELETE FROM public.pages WHERE id = v_page_draft;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n = 0 THEN
      v_pass := v_pass + 1;
      RAISE NOTICE 'PASS % pages DELETE 0 righe', v_role;
    ELSE
      v_fail := v_fail + 1;
      RAISE NOTICE 'FAIL % pages DELETE righe=%', v_role, v_n;
    END IF;

    BEGIN
      INSERT INTO public.documents (title, file_url, category)
      VALUES ('Tentativo doc ' || v_role, 'https://example.invalid/x.pdf', 'norme');
      v_fail := v_fail + 1;
      RAISE NOTICE 'FAIL % documents INSERT riuscito', v_role;
    EXCEPTION WHEN insufficient_privilege THEN
      GET STACKED DIAGNOSTICS v_sqlerrm = MESSAGE_TEXT;
      IF v_sqlerrm ILIKE '%row-level security%' THEN
        v_pass := v_pass + 1;
        RAISE NOTICE 'PASS % documents INSERT negato da RLS', v_role;
      ELSE
        v_fail := v_fail + 1;
        RAISE NOTICE 'FAIL % documents INSERT %', v_role, v_sqlerrm;
      END IF;
    END;

    UPDATE public.documents SET title = 'Tentativo doc ' || v_role WHERE id = v_doc;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n = 0 THEN
      v_pass := v_pass + 1;
      RAISE NOTICE 'PASS % documents UPDATE 0 righe', v_role;
    ELSE
      v_fail := v_fail + 1;
      RAISE NOTICE 'FAIL % documents UPDATE righe=%', v_role, v_n;
    END IF;

    DELETE FROM public.documents WHERE id = v_doc;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n = 0 THEN
      v_pass := v_pass + 1;
      RAISE NOTICE 'PASS % documents DELETE 0 righe', v_role;
    ELSE
      v_fail := v_fail + 1;
      RAISE NOTICE 'FAIL % documents DELETE righe=%', v_role, v_n;
    END IF;

    BEGIN
      INSERT INTO public.bandi_news (slug, title, status)
      VALUES ('rls-ins-' || v_role, 'Tentativo bando', 'closed');
      v_fail := v_fail + 1;
      RAISE NOTICE 'FAIL % bandi_news INSERT riuscito', v_role;
    EXCEPTION WHEN insufficient_privilege THEN
      GET STACKED DIAGNOSTICS v_sqlerrm = MESSAGE_TEXT;
      IF v_sqlerrm ILIKE '%row-level security%' THEN
        v_pass := v_pass + 1;
        RAISE NOTICE 'PASS % bandi_news INSERT negato da RLS', v_role;
      ELSE
        v_fail := v_fail + 1;
        RAISE NOTICE 'FAIL % bandi_news INSERT %', v_role, v_sqlerrm;
      END IF;
    END;

    UPDATE public.bandi_news SET title = 'Tentativo bando ' || v_role WHERE id = v_news;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n = 0 THEN
      v_pass := v_pass + 1;
      RAISE NOTICE 'PASS % bandi_news UPDATE 0 righe', v_role;
    ELSE
      v_fail := v_fail + 1;
      RAISE NOTICE 'FAIL % bandi_news UPDATE righe=%', v_role, v_n;
    END IF;

    DELETE FROM public.bandi_news WHERE id = v_news;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n = 0 THEN
      v_pass := v_pass + 1;
      RAISE NOTICE 'PASS % bandi_news DELETE 0 righe', v_role;
    ELSE
      v_fail := v_fail + 1;
      RAISE NOTICE 'FAIL % bandi_news DELETE righe=%', v_role, v_n;
    END IF;

    BEGIN
      INSERT INTO public.opera_aliases (opera_id, alias_titolo, alias_titolo_norm, source)
      VALUES (v_opera, 'Tentativo alias ' || v_role, 'tentativo', 'manual');
      v_fail := v_fail + 1;
      RAISE NOTICE 'FAIL % opera_aliases INSERT riuscito', v_role;
    EXCEPTION WHEN insufficient_privilege THEN
      GET STACKED DIAGNOSTICS v_sqlerrm = MESSAGE_TEXT;
      IF v_sqlerrm ILIKE '%row-level security%' THEN
        v_pass := v_pass + 1;
        RAISE NOTICE 'PASS % opera_aliases INSERT negato da RLS', v_role;
      ELSE
        v_fail := v_fail + 1;
        RAISE NOTICE 'FAIL % opera_aliases INSERT %', v_role, v_sqlerrm;
      END IF;
    END;

    UPDATE public.opera_aliases SET notes = 'tentativo ' || v_role WHERE id = v_alias;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n = 0 THEN
      v_pass := v_pass + 1;
      RAISE NOTICE 'PASS % opera_aliases UPDATE 0 righe', v_role;
    ELSE
      v_fail := v_fail + 1;
      RAISE NOTICE 'FAIL % opera_aliases UPDATE righe=%', v_role, v_n;
    END IF;

    DELETE FROM public.opera_aliases WHERE id = v_alias;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n = 0 THEN
      v_pass := v_pass + 1;
      RAISE NOTICE 'PASS % opera_aliases DELETE 0 righe', v_role;
    ELSE
      v_fail := v_fail + 1;
      RAISE NOTICE 'FAIL % opera_aliases DELETE righe=%', v_role, v_n;
    END IF;
  END LOOP;

  -- Lettura artista: come prima della migration.
  EXECUTE 'RESET ROLE';
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_artista::text,
      'role', 'authenticated',
      'app_metadata', jsonb_build_object('ruolo', 'artista')
    )::text,
    true
  );
  EXECUTE 'SET LOCAL ROLE authenticated';

  SELECT count(*) INTO v_n FROM public.pages WHERE id = v_page_pub;
  IF v_n = 1 THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS artista SELECT pagina pubblicata';
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL artista SELECT pagina pubblicata count=%', v_n;
  END IF;

  SELECT count(*) INTO v_n FROM public.pages WHERE id = v_page_draft;
  IF v_n = 1 THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS artista SELECT bozza pages (lettura invariata)';
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL artista SELECT bozza pages count=%', v_n;
  END IF;

  SELECT count(*) INTO v_n FROM public.documents WHERE id = v_doc;
  IF v_n = 1 THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS artista SELECT documents';
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL artista SELECT documents count=%', v_n;
  END IF;

  SELECT count(*) INTO v_n FROM public.bandi_news WHERE id = v_news;
  IF v_n = 1 THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS artista SELECT bandi_news';
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL artista SELECT bandi_news count=%', v_n;
  END IF;

  SELECT count(*) INTO v_n FROM public.opera_aliases WHERE id = v_alias;
  IF v_n = 1 THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS artista SELECT opera_aliases';
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL artista SELECT opera_aliases count=%', v_n;
  END IF;

  -- Anon: pubblicata sì, bozza no, documenti e bandi sì, alias no.
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  EXECUTE 'SET LOCAL ROLE anon';

  SELECT count(*) INTO v_n FROM public.pages WHERE id = v_page_pub;
  IF v_n = 1 THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS anon SELECT pagina pubblicata';
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL anon SELECT pagina pubblicata count=%', v_n;
  END IF;

  SELECT count(*) INTO v_n FROM public.pages WHERE id = v_page_draft;
  IF v_n = 0 THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS anon non vede la bozza pages';
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL anon vede la bozza pages count=%', v_n;
  END IF;

  SELECT count(*) INTO v_n FROM public.documents WHERE id = v_doc;
  IF v_n = 1 THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS anon SELECT documents';
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL anon SELECT documents count=%', v_n;
  END IF;

  SELECT count(*) INTO v_n FROM public.bandi_news WHERE id = v_news;
  IF v_n = 1 THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS anon SELECT bandi_news';
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL anon SELECT bandi_news count=%', v_n;
  END IF;

  SELECT count(*) INTO v_n FROM public.opera_aliases WHERE id = v_alias;
  IF v_n = 0 THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS anon non vede opera_aliases';
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL anon vede opera_aliases count=%', v_n;
  END IF;

  -- Admin: INSERT, UPDATE, DELETE sulle quattro tabelle.
  EXECUTE 'RESET ROLE';
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_admin::text,
      'role', 'authenticated',
      'email', 'rls-admin@example.invalid',
      'app_metadata', jsonb_build_object('ruolo', 'admin')
    )::text,
    true
  );
  EXECUTE 'SET LOCAL ROLE authenticated';

  IF public.get_user_role()::text IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'get_user_role admin = %', public.get_user_role();
  END IF;

  INSERT INTO public.pages (category, slug, title, template_type, is_published)
  VALUES ('rls-test', 'admin-ins', 'Pagina admin RLS', 'institutional', false)
  RETURNING id INTO v_new_page;
  UPDATE public.pages SET title = 'Pagina admin RLS aggiornata' WHERE id = v_new_page;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  SELECT title INTO v_title FROM public.pages WHERE id = v_new_page;
  IF v_n = 1 AND v_title = 'Pagina admin RLS aggiornata' THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS admin pages INSERT+UPDATE';
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL admin pages INSERT+UPDATE n=% title=%', v_n, v_title;
  END IF;
  DELETE FROM public.pages WHERE id = v_new_page;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 1 THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS admin pages DELETE';
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL admin pages DELETE n=%', v_n;
  END IF;

  INSERT INTO public.documents (title, file_url, category)
  VALUES ('Documento admin RLS', 'https://example.invalid/admin.pdf', 'contratti')
  RETURNING id INTO v_new_doc;
  UPDATE public.documents SET title = 'Documento admin RLS aggiornato' WHERE id = v_new_doc;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  SELECT title INTO v_title FROM public.documents WHERE id = v_new_doc;
  IF v_n = 1 AND v_title = 'Documento admin RLS aggiornato' THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS admin documents INSERT+UPDATE';
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL admin documents INSERT+UPDATE n=% title=%', v_n, v_title;
  END IF;
  DELETE FROM public.documents WHERE id = v_new_doc;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 1 THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS admin documents DELETE';
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL admin documents DELETE n=%', v_n;
  END IF;

  INSERT INTO public.bandi_news (slug, title, status)
  VALUES ('rls-admin-bando', 'Bando admin RLS', 'active')
  RETURNING id INTO v_new_news;
  UPDATE public.bandi_news SET title = 'Bando admin RLS aggiornato' WHERE id = v_new_news;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  SELECT title INTO v_title FROM public.bandi_news WHERE id = v_new_news;
  IF v_n = 1 AND v_title = 'Bando admin RLS aggiornato' THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS admin bandi_news INSERT+UPDATE';
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL admin bandi_news INSERT+UPDATE n=% title=%', v_n, v_title;
  END IF;
  DELETE FROM public.bandi_news WHERE id = v_new_news;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 1 THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS admin bandi_news DELETE';
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL admin bandi_news DELETE n=%', v_n;
  END IF;

  INSERT INTO public.opera_aliases (opera_id, alias_titolo, alias_titolo_norm, source)
  VALUES (v_opera, 'Alias admin RLS', 'alias admin rls', 'manual')
  RETURNING id INTO v_new_alias;
  UPDATE public.opera_aliases SET notes = 'nota admin' WHERE id = v_new_alias;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  SELECT notes INTO v_title FROM public.opera_aliases WHERE id = v_new_alias;
  IF v_n = 1 AND v_title = 'nota admin' THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS admin opera_aliases INSERT+UPDATE';
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL admin opera_aliases INSERT+UPDATE n=% notes=%', v_n, v_title;
  END IF;
  DELETE FROM public.opera_aliases WHERE id = v_new_alias;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 1 THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS admin opera_aliases DELETE';
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL admin opera_aliases DELETE n=%', v_n;
  END IF;

  -- Le righe di prova non sono state modificate dai ruoli non admin.
  EXECUTE 'RESET ROLE';
  SELECT title INTO v_title FROM public.pages WHERE id = v_page_draft;
  IF v_title = 'Pagina bozza RLS' THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'PASS bozza pages intatta';
  ELSE
    v_fail := v_fail + 1;
    RAISE NOTICE 'FAIL bozza pages title=%', v_title;
  END IF;

  IF v_fail > 0 THEN
    RAISE EXCEPTION 'test RLS fallito: % fail, % pass', v_fail, v_pass;
  END IF;

  RAISE NOTICE 'test RLS ok: % pass, 0 fail', v_pass;
END
$rls$;

ROLLBACK;
