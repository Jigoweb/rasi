-- Test di 20261112090100_restrizioni_ruoli_operatore.sql (fase 2a).
-- Gira in una transazione che fa sempre ROLLBACK: non lascia dati.
--
--   psql -v ON_ERROR_STOP=1 -f supabase/scripts/20261112090100_restrizioni_ruoli_operatore_test.sql
--
-- Dopo 20261113115053 la scrittura diretta di base e tirocinante è bloccata
-- (va in coda). Qui il risultato atteso è 0 righe o 42501, non più 1.
-- Per ciascun ruolo (operatore = pro, operatore_base, tirocinante) controlla:
-- validazione, modifica di opere validate e da validare, eliminazione, episodi,
-- partecipazioni e note, cast esterno, anagrafica artisti e dati riservati,
-- campagne, programmazioni, funzioni RPC. Se un controllo fallisce: EXCEPTION.

BEGIN;

CREATE FUNCTION pg_temp.as_user(p_user uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_user::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END $$;

-- Esegue un comando e restituisce le righe toccate, oppure ERR:<sqlstate>.
CREATE FUNCTION pg_temp.run(p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
  EXECUTE p_sql;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n::text;
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERR:' || SQLSTATE;
END $$;

-- Restituisce il valore di una query scalare, oppure ERR:<sqlstate>.
CREATE FUNCTION pg_temp.val(p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v text;
BEGIN
  EXECUTE p_sql INTO v;
  RETURN coalesce(v, 'NULL');
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERR:' || SQLSTATE;
END $$;

CREATE TEMP TABLE esiti (ruolo text, controllo text, atteso text, ottenuto text) ON COMMIT DROP;
GRANT ALL ON esiti TO authenticated, anon;

CREATE FUNCTION pg_temp.check(p_ruolo text, p_controllo text, p_atteso text, p_ottenuto text) RETURNS void LANGUAGE sql AS $$
  INSERT INTO esiti VALUES (p_ruolo, p_controllo, p_atteso, p_ottenuto)
$$;

DO $test$
DECLARE
  u_pro uuid := '10000000-0000-4000-8000-000000000001';
  u_base uuid := '10000000-0000-4000-8000-000000000002';
  u_tiro uuid := '10000000-0000-4000-8000-000000000003';
  u_none uuid := '10000000-0000-4000-8000-000000000004';
  o_val uuid := '20000000-0000-4000-8000-000000000001';
  o_dav uuid := '20000000-0000-4000-8000-000000000002';
  o_val2 uuid := '20000000-0000-4000-8000-000000000003';
  art uuid := '30000000-0000-4000-8000-000000000001';
  ruolo_t uuid := '40000000-0000-4000-8000-000000000001';
  emit uuid := '50000000-0000-4000-8000-000000000001';
  camp uuid := '60000000-0000-4000-8000-000000000001';
  p_val uuid; p_dav uuid;
  r record;
  pro boolean;
BEGIN
  INSERT INTO public.artisti (id, nome, cognome, stato, stato_validazione)
  VALUES (art, 'Ruolo', 'Testatore', 'attivo', 'validato');
  INSERT INTO public.artisti_dati_riservati (artista_id, regime) VALUES (art, 'forfettario');
  INSERT INTO public.opere (id, titolo, tipo, stato_validazione) VALUES
    (o_val, 'Opera validata', 'serie_tv', 'validato'),
    (o_dav, 'Opera da validare', 'serie_tv', 'da_validare'),
    (o_val2, 'Opera validata 2', 'film', 'validato');
  INSERT INTO public.ruoli_tipologie (id, codice, nome, categoria) VALUES (ruolo_t, 'ruoli-test', 'Ruolo test', 'recitazione');
  INSERT INTO public.episodi (opera_id, numero_stagione, numero_episodio) VALUES (o_val, 1, 1), (o_dav, 1, 1);
  INSERT INTO public.partecipazioni (artista_id, opera_id, ruolo_id) VALUES (art, o_val, ruolo_t) RETURNING id INTO p_val;
  INSERT INTO public.partecipazioni (artista_id, opera_id, ruolo_id) VALUES (art, o_dav, ruolo_t) RETURNING id INTO p_dav;
  INSERT INTO public.partecipazioni_note (partecipazione_id, note) VALUES (p_val, 'nota V'), (p_dav, 'nota D');
  INSERT INTO public.cast_esterno (opera_id, nome) VALUES (o_val, 'Esterno V'), (o_dav, 'Esterno D'),
    (o_val2, 'Conv operatore'), (o_val2, 'Conv operatore_base'), (o_val2, 'Conv tirocinante');
  INSERT INTO public.emittenti (id, codice, nome, tipo) VALUES (emit, 'ruoli-test-emit', 'Emittente test', 'tv_generalista');
  INSERT INTO public.campagne_programmazione (id, nome, emittente_id, anno, stato) VALUES (camp, 'Campagna test ruoli', emit, 2026, 'in_review');

  INSERT INTO auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES
    ('00000000-0000-0000-0000-000000000000', u_pro, 'authenticated', 'authenticated', 'ruoli-pro@example.invalid', '{"ruolo":"operatore"}', '{}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', u_base, 'authenticated', 'authenticated', 'ruoli-base@example.invalid', '{"ruolo":"operatore_base"}', '{}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', u_tiro, 'authenticated', 'authenticated', 'ruoli-tiro@example.invalid', '{"ruolo":"tirocinante"}', '{}', now(), now());

  FOR r IN SELECT * FROM (VALUES ('operatore', u_pro), ('operatore_base', u_base), ('tirocinante', u_tiro)) AS x(ruolo, uid) LOOP
    pro := r.ruolo = 'operatore';
    PERFORM pg_temp.as_user(r.uid);

    PERFORM pg_temp.check(r.ruolo, 'get_user_role', r.ruolo, pg_temp.val('select public.get_user_role()::text'));

    -- opere
    PERFORM pg_temp.check(r.ruolo, 'modifica opera da validare', CASE WHEN pro THEN '1' ELSE '0' END,
      pg_temp.run(format('update public.opere set titolo = titolo || %L where id = %L', '.', o_dav)));
    PERFORM pg_temp.check(r.ruolo, 'modifica opera validata', CASE WHEN pro THEN '1' ELSE '0' END,
      pg_temp.run(format('update public.opere set titolo = titolo || %L where id = %L', '.', o_val)));
    -- Dopo la fase 2b la RLS non lascia arrivare al trigger: l'UPDATE non tocca righe.
    PERFORM pg_temp.check(r.ruolo, 'valida un''opera', CASE WHEN pro THEN '1' ELSE '0' END,
      pg_temp.run(format('update public.opere set stato_validazione = %L where id = %L', 'validato', o_dav)));
    IF pro THEN
      -- riporta l'opera a da validare per i ruoli successivi
      PERFORM pg_temp.run(format('update public.opere set stato_validazione = %L where id = %L', 'da_validare', o_dav));
    END IF;
    PERFORM pg_temp.check(r.ruolo, 'nuova opera con stato validato', CASE WHEN pro THEN 'validato' ELSE 'ERR:42501' END,
      pg_temp.val(format('insert into public.opere (titolo, tipo, stato_validazione) values (%L, %L, %L) returning stato_validazione::text',
        'Nuova ' || r.ruolo, 'film', 'validato')));
    PERFORM pg_temp.check(r.ruolo, 'elimina opera', CASE WHEN pro THEN '1' ELSE '0' END,
      pg_temp.run(format('delete from public.opere where titolo = %L', 'Nuova ' || r.ruolo)));

    -- episodi
    PERFORM pg_temp.check(r.ruolo, 'modifica episodio opera da validare', CASE WHEN pro THEN '1' ELSE '0' END,
      pg_temp.run(format('update public.episodi set titolo_episodio = %L where opera_id = %L', 'x', o_dav)));
    PERFORM pg_temp.check(r.ruolo, 'modifica episodio opera validata', CASE WHEN pro THEN '1' ELSE '0' END,
      pg_temp.run(format('update public.episodi set titolo_episodio = %L where opera_id = %L', 'x', o_val)));
    PERFORM pg_temp.check(r.ruolo, 'nuovo episodio opera validata', CASE WHEN pro THEN '1' ELSE 'ERR:42501' END,
      pg_temp.run(format('insert into public.episodi (opera_id, numero_stagione, numero_episodio) values (%L, 9, %s)', o_val,
        CASE r.ruolo WHEN 'operatore' THEN 1 WHEN 'operatore_base' THEN 2 ELSE 3 END)));

    -- partecipazioni e note
    PERFORM pg_temp.check(r.ruolo, 'modifica partecipazione opera validata', CASE WHEN pro THEN '1' ELSE '0' END,
      pg_temp.run(format('update public.partecipazioni set personaggio = %L where id = %L', 'x', p_val)));
    PERFORM pg_temp.check(r.ruolo, 'modifica partecipazione opera da validare', CASE WHEN pro THEN '1' ELSE '0' END,
      pg_temp.run(format('update public.partecipazioni set personaggio = %L where id = %L', 'x', p_dav)));
    PERFORM pg_temp.check(r.ruolo, 'modifica nota opera validata', CASE WHEN pro THEN '1' ELSE '0' END,
      pg_temp.run(format('update public.partecipazioni_note set note = %L where partecipazione_id = %L', 'n', p_val)));
    PERFORM pg_temp.check(r.ruolo, 'modifica nota opera da validare', '1',
      pg_temp.run(format('update public.partecipazioni_note set note = %L where partecipazione_id = %L', 'n', p_dav)));
    PERFORM pg_temp.check(r.ruolo, 'legge le partecipazioni di opere da validare', '1',
      pg_temp.val(format('select count(*) from public.partecipazioni where id = %L', p_dav)));

    -- cast esterno
    PERFORM pg_temp.check(r.ruolo, 'modifica cast esterno opera validata', CASE WHEN pro THEN '1' ELSE '0' END,
      pg_temp.run(format('update public.cast_esterno set personaggio = %L where opera_id = %L', 'x', o_val)));
    PERFORM pg_temp.check(r.ruolo, 'nuovo cast esterno opera validata', CASE WHEN pro THEN '1' ELSE 'ERR:42501' END,
      pg_temp.run(format('insert into public.cast_esterno (opera_id, nome) values (%L, %L)', o_val, 'Nuovo ' || r.ruolo)));
    PERFORM pg_temp.check(r.ruolo, 'nuovo cast esterno opera da validare', CASE WHEN pro THEN '1' ELSE 'ERR:42501' END,
      pg_temp.run(format('insert into public.cast_esterno (opera_id, nome) values (%L, %L)', o_dav, 'Nuovo ' || r.ruolo)));
    -- La conversione consuma la riga di cast esterno (la partecipazione esiste
    -- già, quindi non ne crea una nuova): si controlla che la riga sparisca.
    PERFORM pg_temp.val(format(
      'select public.converti_cast_esterno_in_partecipazioni(%L::uuid, jsonb_build_array(jsonb_build_object(%L, (select id from public.cast_esterno where opera_id = %L and nome = %L), %L, %L::uuid)))::text',
      art, 'cast_id', o_dav, 'Nuovo ' || r.ruolo, 'ruolo_id', ruolo_t));
    PERFORM pg_temp.check(r.ruolo, 'converti cast esterno (opera da validare)', '0',
      pg_temp.val(format('select count(*) from public.cast_esterno where opera_id = %L and nome = %L', o_dav, 'Nuovo ' || r.ruolo)));
    PERFORM pg_temp.val(format(
      'select public.converti_cast_esterno_in_partecipazioni(%L::uuid, jsonb_build_array(jsonb_build_object(%L, (select id from public.cast_esterno where opera_id = %L and nome = %L), %L, %L::uuid)))::text',
      art, 'cast_id', o_val2, 'Conv ' || r.ruolo, 'ruolo_id', ruolo_t));
    PERFORM pg_temp.check(r.ruolo, 'converti cast esterno di opera validata', CASE WHEN pro THEN '0' ELSE '1' END,
      pg_temp.val(format('select count(*) from public.cast_esterno where opera_id = %L and nome = %L', o_val2, 'Conv ' || r.ruolo)));
    PERFORM pg_temp.check(r.ruolo, 'replace_cast_esterno su opera validata', CASE WHEN pro THEN 'ok' ELSE 'ERR:42501' END,
      CASE WHEN pg_temp.val(format('select public.replace_cast_esterno(%L::uuid, %L::jsonb, null::uuid)::text', o_val, '[]')) LIKE 'ERR:%'
        THEN pg_temp.val(format('select public.replace_cast_esterno(%L::uuid, %L::jsonb, null::uuid)::text', o_val, '[]')) ELSE 'ok' END);

    -- anagrafica
    PERFORM pg_temp.check(r.ruolo, 'legge la tabella artisti', CASE WHEN r.ruolo = 'tirocinante' THEN '0' ELSE '1' END,
      pg_temp.val(format('select count(*) from public.artisti where id = %L', art)));
    PERFORM pg_temp.check(r.ruolo, 'modifica un artista', CASE WHEN pro THEN '1' ELSE '0' END,
      pg_temp.run(format('update public.artisti set nome_arte = %L where id = %L', 'x', art)));
    PERFORM pg_temp.check(r.ruolo, 'artisti_cast_lookup', '1',
      pg_temp.val(format('select count(*) from public.artisti_cast_lookup() where id = %L', art)));
    PERFORM pg_temp.check(r.ruolo, 'cerca_artisti_per_cast', '1',
      pg_temp.val(format('select count(*) from public.cerca_artisti_per_cast(%L) where id = %L', 'testator', art)));
    PERFORM pg_temp.check(r.ruolo, 'nome artista nel cast (list_partecipazioni_opera)', 'Ruolo',
      pg_temp.val(format('select public.list_partecipazioni_opera(%L) -> %L -> 0 -> %L ->> %L', o_dav, 'rows', 'artisti', 'nome')));
    PERFORM pg_temp.check(r.ruolo, 'legge dati riservati', CASE WHEN r.ruolo = 'tirocinante' THEN '0' ELSE '1' END,
      pg_temp.val(format('select count(*) from public.artisti_dati_riservati where artista_id = %L', art)));
    PERFORM pg_temp.check(r.ruolo, 'modifica dati riservati', CASE WHEN pro THEN '1' ELSE '0' END,
      pg_temp.run(format('update public.artisti_dati_riservati set regime = %L where artista_id = %L', 'ordinario', art)));

    -- resto della banca dati
    PERFORM pg_temp.check(r.ruolo, 'legge campagna non completata', CASE WHEN r.ruolo = 'tirocinante' THEN '0' ELSE '1' END,
      pg_temp.val(format('select count(*) from public.campagne_programmazione where id = %L', camp)));
    PERFORM pg_temp.check(r.ruolo, 'inserisce programmazioni', CASE WHEN pro THEN '1' ELSE 'ERR:42501' END,
      pg_temp.run(format('insert into public.programmazioni (emittente_id, campagna_programmazione_id, titolo) values (%L, %L, %L)', emit, camp, 'x')));
    PERFORM pg_temp.check(r.ruolo, 'RPC di lettura protetta (get_processing_progress)', CASE WHEN r.ruolo = 'tirocinante' THEN 'ERR:42501' ELSE 'ok' END,
      CASE WHEN pg_temp.val(format('select public.get_processing_progress(%L)::text', camp)) = 'ERR:42501' THEN 'ERR:42501' ELSE 'ok' END);
    PERFORM pg_temp.check(r.ruolo, 'RPC delete campagna', CASE WHEN pro THEN 'non 42501' ELSE 'ERR:42501' END,
      CASE WHEN pg_temp.val(format('select public.delete_campagna_programmazione_safe(%L::uuid, %L::uuid, 120)::text', gen_random_uuid(), r.uid)) = 'ERR:42501'
        THEN 'ERR:42501' ELSE 'non 42501' END);
  END LOOP;

  -- Utente senza ruolo e anonimo: nessun accesso, ma niente errori di permesso
  -- sulle funzioni usate nelle policy SELECT.
  EXECUTE 'RESET ROLE';
  INSERT INTO auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES
    ('00000000-0000-0000-0000-000000000000', u_none, 'authenticated', 'authenticated', 'ruoli-none@example.invalid', '{}', '{}', now(), now());
  PERFORM pg_temp.as_user(u_none);
  PERFORM pg_temp.check('senza ruolo', 'is_opere_editor', 'false', pg_temp.val('select public.is_opere_editor()::text'));
  PERFORM pg_temp.check('senza ruolo', 'legge la tabella artisti', '0',
    pg_temp.val(format('select count(*) from public.artisti where id = %L', art)));
  PERFORM pg_temp.check('senza ruolo', 'converti cast esterno', 'ERR:42501',
    pg_temp.val(format('select public.converti_cast_esterno_in_partecipazioni(%L::uuid, %L::jsonb)::text', art, '[]')));
  PERFORM pg_temp.check('senza ruolo', 'modifica opera da validare', '0',
    pg_temp.run(format('update public.opere set titolo = titolo || %L where id = %L', '.', o_dav)));

  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  EXECUTE 'SET LOCAL ROLE anon';
  PERFORM pg_temp.check('anon', 'legge la tabella artisti', '0',
    pg_temp.val(format('select count(*) from public.artisti where id = %L', art)));
  PERFORM pg_temp.check('anon', 'legge campagne', '0',
    pg_temp.val(format('select count(*) from public.campagne_programmazione where id = %L', camp)));
  PERFORM pg_temp.check('anon', 'legge cast esterno', '0',
    pg_temp.val(format('select count(*) from public.cast_esterno where opera_id = %L', o_dav)));

  EXECUTE 'RESET ROLE';
END
$test$;

DO $report$
DECLARE
  r record;
  v_fail integer := 0;
  v_pass integer := 0;
BEGIN
  FOR r IN SELECT * FROM esiti LOOP
    IF r.atteso = r.ottenuto THEN
      v_pass := v_pass + 1;
    ELSE
      v_fail := v_fail + 1;
      RAISE NOTICE 'FAIL [%] %: atteso %, ottenuto %', r.ruolo, r.controllo, r.atteso, r.ottenuto;
    END IF;
  END LOOP;
  RAISE NOTICE 'RIEPILOGO pass=% fail=%', v_pass, v_fail;
  IF v_fail > 0 THEN
    RAISE EXCEPTION '% controlli falliti', v_fail;
  END IF;
END
$report$;

ROLLBACK;
