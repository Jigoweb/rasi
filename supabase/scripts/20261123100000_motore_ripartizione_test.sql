-- Test di 20261123100000_motore_ripartizione.sql.
-- Gira in una transazione che fa sempre ROLLBACK: non lascia dati.
--
--   psql -v ON_ERROR_STOP=1 -f supabase/scripts/20261123100000_motore_ripartizione_test.sql

BEGIN;

CREATE FUNCTION pg_temp.as_user(p_user uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_user::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END $$;

CREATE FUNCTION pg_temp.val(p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v text;
BEGIN
  EXECUTE p_sql INTO v;
  RETURN coalesce(v, 'NULL');
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERR:' || SQLSTATE;
END $$;

DO $test$
DECLARE
  u_admin uuid := gen_random_uuid();
  u_pro uuid := gen_random_uuid();
  u_art uuid := gen_random_uuid();
  u_altro uuid := gen_random_uuid();
  art uuid := gen_random_uuid();
  art2 uuid := gen_random_uuid();
  emit uuid := gen_random_uuid();
  cp uuid := gen_random_uuid();
  ci uuid := gen_random_uuid();
  cr uuid := gen_random_uuid();
  cr2 uuid := gen_random_uuid();
  v_fail text := '';
  v text;
BEGIN
  INSERT INTO public.artisti (id, nome, cognome) VALUES (art, 'Ripa', 'Test'), (art2, 'Altro', 'Test');
  INSERT INTO auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES
    ('00000000-0000-0000-0000-000000000000', u_admin, 'authenticated', 'authenticated', 'rip-admin@example.invalid', '{"ruolo":"admin"}', '{}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', u_pro, 'authenticated', 'authenticated', 'rip-pro@example.invalid', '{"ruolo":"operatore"}', '{}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', u_art, 'authenticated', 'authenticated', 'rip-art@example.invalid',
       json_build_object('ruolo', 'artista', 'artista_id', art)::jsonb, '{}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', u_altro, 'authenticated', 'authenticated', 'rip-art2@example.invalid',
       json_build_object('ruolo', 'artista', 'artista_id', art2)::jsonb, '{}', now(), now());

  INSERT INTO public.emittenti (id, codice, nome, tipo) VALUES (emit, 'rip-test', 'Emittente ripartizione', 'streaming');
  INSERT INTO public.campagne_programmazione (id, nome, emittente_id, anno, stato) VALUES (cp, 'Rip test', emit, 2024, 'in_review');
  INSERT INTO public.campagne_individuazione (id, nome, emittente_id, campagne_programmazione_id, anno, stato)
    VALUES (ci, 'Individuazione rip test', emit, cp, 2024, 'completata');

  -- Parametri del regolamento presenti
  IF NOT EXISTS (SELECT 1 FROM public.parametri_ripartizione WHERE categoria = 'regolamento_video'
                 AND (configurazione -> 'pesiPrima' ->> 'doppiatore_comprimario')::numeric = 1.2) THEN
    v_fail := v_fail || ' parametri;';
  END IF;
  -- Categorie dei ruoli, se i ruoli esistono
  IF EXISTS (SELECT 1 FROM public.ruoli_tipologie WHERE codice = 'RUO_5' AND categoria_ripartizione IS DISTINCT FROM 'direzione_doppiaggio') THEN
    v_fail := v_fail || ' categoria RUO_5;';
  END IF;
  -- Modalità dell'emittente valorizzata per quelle esistenti
  IF EXISTS (SELECT 1 FROM public.emittenti WHERE id <> emit AND modalita_ripartizione IS NULL) THEN
    v_fail := v_fail || ' modalita emittenti;';
  END IF;

  INSERT INTO public.campagne_ripartizione (id, nome, periodo_riferimento_inizio, periodo_riferimento_fine, importo_totale_disponibile,
                                            emittente_id, anno, modalita, stato)
    VALUES (cr, 'Rip test 2024', '2024-01-01', '2024-12-31', 100, emit, 2024, 'od_views', 'calcolata'),
           (cr2, 'Rip test bis', '2024-01-01', '2024-12-31', 50, emit, 2024, 'od_views', 'pianificata');
  INSERT INTO public.campagne_ripartizione_sorgenti (campagna_ripartizione_id, campagna_individuazione_id) VALUES (cr, ci);
  INSERT INTO public.ripartizioni (campagna_ripartizione_id, artista_id, numero_individuazioni, calcoli, importo_lordo, trattenuta_collecting, importo_netto)
    VALUES (cr, art, 1, '{}', 60, 0, 60), (cr, art2, 1, '{}', 40, 0, 40);
  INSERT INTO public.ripartizioni_righe (campagna_ripartizione_id, artista_id, categoria, importo, importo_finale)
    VALUES (cr, art, 'primario', 60, 60), (cr, art2, 'comprimario', 40, 40);

  -- Una campagna di individuazione entra in una sola ripartizione
  BEGIN
    INSERT INTO public.campagne_ripartizione_sorgenti (campagna_ripartizione_id, campagna_individuazione_id) VALUES (cr2, ci);
    v_fail := v_fail || ' sorgente doppia accettata;';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  -- Artista: a campagna calcolata non vede nulla
  PERFORM pg_temp.as_user(u_art);
  v := pg_temp.val(format('select count(*)::text from public.ripartizioni where campagna_ripartizione_id = %L', cr));
  IF v <> '0' THEN v_fail := v_fail || ' artista vede importi in bozza=' || v || ';'; END IF;
  v := pg_temp.val(format('select count(*)::text from public.ripartizioni_righe where campagna_ripartizione_id = %L', cr));
  IF v <> '0' THEN v_fail := v_fail || ' artista vede righe in bozza=' || v || ';'; END IF;
  -- e non scrive le righe
  v := pg_temp.val(format('insert into public.ripartizioni_righe (campagna_ripartizione_id, artista_id) values (%L, %L) returning 1', cr, art));
  IF v NOT LIKE 'ERR:%' THEN v_fail := v_fail || ' artista scrive righe;'; END IF;

  -- Operatore pro: legge tutto, non approva
  PERFORM pg_temp.as_user(u_pro);
  v := pg_temp.val(format('select count(*)::text from public.ripartizioni_righe where campagna_ripartizione_id = %L', cr));
  IF v <> '2' THEN v_fail := v_fail || ' pro legge righe=' || v || ';'; END IF;
  v := pg_temp.val(format('update public.campagne_ripartizione set stato = %L where id = %L returning 1', 'approvata', cr));
  IF v <> 'ERR:42501' THEN v_fail := v_fail || ' pro approva ' || v || ';'; END IF;
  v := pg_temp.val(format('insert into public.ripartizioni_righe (campagna_ripartizione_id, artista_id) values (%L, %L) returning 1', cr, art));
  IF v NOT LIKE 'ERR:%' THEN v_fail := v_fail || ' pro scrive righe dirette;'; END IF;

  -- Admin approva
  PERFORM pg_temp.as_user(u_admin);
  v := pg_temp.val(format('update public.campagne_ripartizione set stato = %L where id = %L returning data_approvazione is not null', 'approvata', cr));
  IF v <> 'true' THEN v_fail := v_fail || ' admin approva ' || v || ';'; END IF;

  -- Artista: ora vede solo i propri importi e le proprie righe
  PERFORM pg_temp.as_user(u_art);
  v := pg_temp.val(format('select count(*)::text from public.ripartizioni where campagna_ripartizione_id = %L', cr));
  IF v <> '1' THEN v_fail := v_fail || ' artista importi approvati=' || v || ';'; END IF;
  v := pg_temp.val(format('select sum(importo_finale)::text from public.ripartizioni_righe where campagna_ripartizione_id = %L', cr));
  IF v <> '60.00' THEN v_fail := v_fail || ' artista righe approvate=' || v || ';'; END IF;

  -- Distribuita: l'artista continua a vedere la campagna (prima la perdeva)
  PERFORM pg_temp.as_user(u_admin);
  PERFORM pg_temp.val(format('update public.campagne_ripartizione set stato = %L where id = %L returning 1', 'distribuita', cr));
  PERFORM pg_temp.as_user(u_art);
  v := pg_temp.val(format('select count(*)::text from public.campagne_ripartizione where id = %L', cr));
  IF v <> '1' THEN v_fail := v_fail || ' artista perde la campagna distribuita;'; END IF;

  -- Operatore pro non revoca una distribuita
  PERFORM pg_temp.as_user(u_pro);
  v := pg_temp.val(format('update public.campagne_ripartizione set stato = %L where id = %L returning 1', 'calcolata', cr));
  IF v <> 'ERR:42501' THEN v_fail := v_fail || ' pro revoca ' || v || ';'; END IF;

  -- Un solo job attivo per campagna
  EXECUTE 'RESET ROLE';
  INSERT INTO public.ripartizione_jobs (campagna_ripartizione_id, stato) VALUES (cr2, 'running');
  BEGIN
    INSERT INTO public.ripartizione_jobs (campagna_ripartizione_id, stato) VALUES (cr2, 'queued');
    v_fail := v_fail || ' due job attivi;';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  IF v_fail <> '' THEN
    RAISE EXCEPTION 'FAIL:%', v_fail;
  END IF;
  RAISE NOTICE 'RIEPILOGO motore ripartizione: ok';
END
$test$;

ROLLBACK;
