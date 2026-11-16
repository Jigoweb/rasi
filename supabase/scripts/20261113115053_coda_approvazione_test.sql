-- Test di 20261113115053_coda_approvazione_modifiche.sql (fase 2b).
-- Transazione annullata: non lascia dati.
--
--   psql -v ON_ERROR_STOP=1 -f supabase/scripts/20261113115053_coda_approvazione_test.sql

BEGIN;

-- Il bootstrap locale riassegna i GRANT a anon/authenticated dopo le migration.
-- Qui si riallineano i privilegi a quelli della migration; il ROLLBACK finale
-- li restituisce al bootstrap.
REVOKE ALL ON TABLE public.modifiche_proposte FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.modifiche_proposte FROM authenticated;
GRANT SELECT ON TABLE public.modifiche_proposte TO authenticated;
REVOKE ALL ON FUNCTION public.proponi_modifica(text, text, jsonb, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approva_modifica(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.respingi_modifica(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.proponi_modifica(text, text, jsonb, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approva_modifica(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respingi_modifica(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.modifica_applica_dopo(text, uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION pg_temp.as_user(p_user uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_user::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END $$;

CREATE FUNCTION pg_temp.run(p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
  EXECUTE p_sql;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n::text;
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERR:' || SQLSTATE;
END $$;

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
  u_pro uuid := '11000000-0000-4000-8000-000000000001';
  u_base uuid := '11000000-0000-4000-8000-000000000002';
  u_tiro uuid := '11000000-0000-4000-8000-000000000003';
  u_art uuid := '11000000-0000-4000-8000-000000000004';
  o_val uuid := '21000000-0000-4000-8000-000000000001';
  o_dav uuid := '21000000-0000-4000-8000-000000000002';
  art uuid := '31000000-0000-4000-8000-000000000001';
  ruolo_t uuid := '41000000-0000-4000-8000-000000000001';
  ep uuid;
  proposta uuid;
  bloccata uuid;
  titolo text;
  v_stato text;
BEGIN
  INSERT INTO public.artisti (id, nome, cognome, stato, stato_validazione)
  VALUES (art, 'Coda', 'Test', 'attivo', 'validato');
  INSERT INTO public.opere (id, titolo, tipo, stato_validazione) VALUES
    (o_val, 'Coda validata', 'film', 'validato'),
    (o_dav, 'Coda aperta', 'film', 'da_validare');
  INSERT INTO public.ruoli_tipologie (id, codice, nome, categoria)
  VALUES (ruolo_t, 'coda-test', 'Ruolo coda', 'recitazione');
  INSERT INTO public.episodi (opera_id, numero_stagione, numero_episodio, titolo_episodio)
  VALUES (o_dav, 1, 1, 'Pilota') RETURNING id INTO ep;

  INSERT INTO auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES
    ('00000000-0000-0000-0000-000000000000', u_pro, 'authenticated', 'authenticated', 'coda-pro@example.invalid', '{"ruolo":"operatore"}', '{}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', u_base, 'authenticated', 'authenticated', 'coda-base@example.invalid', '{"ruolo":"operatore_base"}', '{}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', u_tiro, 'authenticated', 'authenticated', 'coda-tiro@example.invalid', '{"ruolo":"tirocinante"}', '{}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', u_art, 'authenticated', 'authenticated', 'coda-art@example.invalid', '{"ruolo":"artista"}', '{}', now(), now());

  -- Scrittura diretta chiusa per chi propone.
  PERFORM pg_temp.as_user(u_base);
  PERFORM pg_temp.check('operatore_base', 'update diretto opera da validare', '0',
    pg_temp.run(format('update public.opere set titolo = %L where id = %L', 'Diretto', o_dav)));
  PERFORM pg_temp.check('operatore_base', 'insert diretto episodio', 'ERR:42501',
    pg_temp.run(format('insert into public.episodi (opera_id, numero_stagione, numero_episodio) values (%L, 2, 1)', o_dav)));

  -- Proposta rifiutata sull'opera validata e sull'entità artista.
  PERFORM pg_temp.check('operatore_base', 'proposta su opera validata', 'ERR:42501',
    pg_temp.val(format(
      'select public.proponi_modifica(%L, %L, %L::jsonb, %L::uuid, %L::uuid)::text',
      'opera', 'update', '{"dopo":{"titolo":"No"}}', o_val, o_val)));
  PERFORM pg_temp.check('operatore_base', 'proposta artista', 'ERR:22023',
    pg_temp.val(format(
      'select public.proponi_modifica(%L, %L, %L::jsonb, NULL, NULL)::text',
      'artista', 'update', '{"dopo":{"nome":"No"}}')));
  PERFORM pg_temp.check('operatore_base', 'proposta elimina opera', 'ERR:42501',
    pg_temp.val(format(
      'select public.proponi_modifica(%L, %L, %L::jsonb, %L::uuid, %L::uuid)::text',
      'opera', 'delete', '{}', o_dav, o_dav)));
  PERFORM pg_temp.check('operatore_base', 'campo non consentito', 'ERR:22023',
    pg_temp.val(format(
      'select public.proponi_modifica(%L, %L, %L::jsonb, %L::uuid, %L::uuid)::text',
      'opera', 'update', '{"dopo":{"stato_validazione":"validato"}}', o_dav, o_dav)));

  -- Il pro non propone: scrive direttamente.
  PERFORM pg_temp.as_user(u_pro);
  PERFORM pg_temp.check('operatore', 'non propone', 'ERR:42501',
    pg_temp.val(format(
      'select public.proponi_modifica(%L, %L, %L::jsonb, %L::uuid, %L::uuid)::text',
      'opera', 'update', '{"dopo":{"titolo":"Pro"}}', o_dav, o_dav)));

  -- Tirocinante propone, vede solo la sua, il base non la vede.
  PERFORM pg_temp.as_user(u_tiro);
  proposta := pg_temp.val(format(
    'select public.proponi_modifica(%L, %L, %L::jsonb, %L::uuid, %L::uuid)::text',
    'episodio', 'update', '{"dopo":{"titolo_episodio":"Attesa"}}', ep, o_dav))::uuid;
  PERFORM pg_temp.check('tirocinante', 'vede la propria proposta', '1',
    pg_temp.val(format('select count(*) from public.modifiche_proposte where id = %L', proposta)));
  PERFORM pg_temp.as_user(u_base);
  PERFORM pg_temp.check('operatore_base', 'non vede la proposta altrui', '0',
    pg_temp.val(format('select count(*) from public.modifiche_proposte where id = %L', proposta)));
  PERFORM pg_temp.check('operatore_base', 'non approva', 'ERR:42501',
    pg_temp.val(format('select public.approva_modifica(%L)', proposta)));

  -- Il pro vede, approva, il titolo cambia e l'audit c'è. Una seconda volta fallisce.
  PERFORM pg_temp.as_user(u_pro);
  PERFORM pg_temp.check('operatore', 'vede la proposta', '1',
    pg_temp.val(format('select count(*) from public.modifiche_proposte where id = %L', proposta)));
  PERFORM pg_temp.check('operatore', 'approva', 'ok',
    CASE WHEN pg_temp.val(format('select public.approva_modifica(%L, %L)', proposta, 'va bene')) LIKE 'ERR:%'
      THEN pg_temp.val(format('select public.approva_modifica(%L, %L)', proposta, 'va bene')) ELSE 'ok' END);
  PERFORM pg_temp.check('operatore', 'titolo episodio applicato', 'Attesa',
    pg_temp.val(format('select titolo_episodio from public.episodi where id = %L', ep)));
  PERFORM pg_temp.check('operatore', 'seconda approvazione', 'ERR:22023',
    pg_temp.val(format('select public.approva_modifica(%L)', proposta)));

  EXECUTE 'RESET ROLE';
  PERFORM pg_temp.check('postgres', 'audit di approvazione', '1',
    pg_temp.val(format(
      'select count(*) from public.audit_log where tabella = %L and record_id = %L and azione = %L',
      'modifiche_proposte', proposta::text, 'UPDATE')));

  -- Inserimento in coda, poi approvazione crea la riga.
  PERFORM pg_temp.as_user(u_base);
  proposta := pg_temp.val(format(
    'select public.proponi_modifica(%L, %L, %L::jsonb, NULL, %L::uuid)::text',
    'cast_esterno', 'insert',
    format('{"dopo":{"opera_id":"%s","nome":"Comparsa"}}', o_dav),
    o_dav))::uuid;
  PERFORM pg_temp.as_user(u_pro);
  PERFORM pg_temp.val(format('select public.approva_modifica(%L)', proposta));
  PERFORM pg_temp.check('operatore', 'cast inserito dalla coda', '1',
    pg_temp.val(format('select count(*) from public.cast_esterno where opera_id = %L and nome = %L', o_dav, 'Comparsa')));

  -- Batch di un episodio, poi respingimento che non scrive.
  PERFORM pg_temp.as_user(u_tiro);
  proposta := pg_temp.val(format(
    'select public.proponi_modifica(%L, %L, %L::jsonb, NULL, %L::uuid)::text',
    'episodio', 'insert',
    format('{"batch":true,"righe":[{"entita":"episodio","operazione":"insert","dopo":{"opera_id":"%s","numero_stagione":3,"numero_episodio":1,"titolo_episodio":"Mai"}}]}', o_dav),
    o_dav))::uuid;
  PERFORM pg_temp.as_user(u_pro);
  PERFORM pg_temp.val(format('select public.respingi_modifica(%L, %L)', proposta, 'no'));
  PERFORM pg_temp.check('operatore', 'batch respinto non scrive', '0',
    pg_temp.val(format('select count(*) from public.episodi where opera_id = %L and numero_stagione = 3', o_dav)));
  EXECUTE 'RESET ROLE';
  PERFORM pg_temp.check('postgres', 'audit di respingimento', '1',
    pg_temp.val(format(
      'select count(*) from public.audit_log where tabella = %L and record_id = %L and new_data->>%L = %L',
      'modifiche_proposte', proposta::text, 'stato', 'respinta')));

  -- Validazione: solo lo staff timbra validato_da.
  PERFORM pg_temp.as_user(u_pro);
  PERFORM pg_temp.run(format('update public.opere set stato_validazione = %L where id = %L', 'validato', o_dav));
  PERFORM pg_temp.check('operatore', 'validato_da', u_pro::text,
    pg_temp.val(format('select validato_da::text from public.opere where id = %L', o_dav)));
  PERFORM pg_temp.check('operatore', 'validato_il valorizzato', 'sì',
    CASE WHEN pg_temp.val(format('select validato_il::text from public.opere where id = %L', o_dav)) = 'NULL' THEN 'no' ELSE 'sì' END);
  titolo := pg_temp.val(format('select titolo from public.opere where id = %L', o_dav));
  PERFORM pg_temp.run(format('update public.opere set stato_validazione = %L where id = %L', 'da_validare', o_dav));
  PERFORM pg_temp.check('operatore', 'validato_da resta dopo lo svalidare', u_pro::text,
    pg_temp.val(format('select validato_da::text from public.opere where id = %L', o_dav)));
  -- L'opera è di nuovo da validare: una proposta precedente non si approva se nel frattempo è validata.
  PERFORM pg_temp.as_user(u_base);
  bloccata := pg_temp.val(format(
    'select public.proponi_modifica(%L, %L, %L::jsonb, %L::uuid, %L::uuid)::text',
    'opera', 'update', '{"dopo":{"titolo":"Prima"}}', o_dav, o_dav))::uuid;
  PERFORM pg_temp.as_user(u_pro);
  PERFORM pg_temp.run(format('update public.opere set stato_validazione = %L where id = %L', 'validato', o_dav));
  PERFORM pg_temp.check('operatore', 'approva su opera diventata validata', 'ERR:42501',
    pg_temp.val(format('select public.approva_modifica(%L)', bloccata)));
  PERFORM pg_temp.check('operatore', 'titolo non cambiato', titolo,
    pg_temp.val(format('select titolo from public.opere where id = %L', o_dav)));

  -- Eliminazione di un episodio: la proposta toglie la riga solo dopo l'approvazione.
  PERFORM pg_temp.as_user(u_pro);
  PERFORM pg_temp.run(format('update public.opere set stato_validazione = %L where id = %L', 'da_validare', o_dav));
  PERFORM pg_temp.as_user(u_base);
  proposta := pg_temp.val(format(
    'select public.proponi_modifica(%L, %L, %L::jsonb, %L::uuid, %L::uuid)::text',
    'episodio', 'delete', '{}', ep, o_dav))::uuid;
  PERFORM pg_temp.check('operatore_base', 'episodio ancora presente', '1',
    pg_temp.val(format('select count(*) from public.episodi where id = %L', ep)));
  PERFORM pg_temp.as_user(u_pro);
  PERFORM pg_temp.val(format('select public.approva_modifica(%L)', proposta));
  PERFORM pg_temp.check('operatore', 'episodio eliminato dalla coda', '0',
    pg_temp.val(format('select count(*) from public.episodi where id = %L', ep)));

  -- Artista e anon non entrano.
  PERFORM pg_temp.as_user(u_art);
  PERFORM pg_temp.check('artista', 'non propone', 'ERR:42501',
    pg_temp.val(format(
      'select public.proponi_modifica(%L, %L, %L::jsonb, %L::uuid, %L::uuid)::text',
      'opera', 'update', '{"dopo":{"titolo":"No"}}', o_dav, o_dav)));
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  EXECUTE 'SET LOCAL ROLE anon';
  PERFORM pg_temp.check('anon', 'non legge la coda', 'ERR:42501',
    pg_temp.val('select count(*)::text from public.modifiche_proposte'));

  EXECUTE 'RESET ROLE';
  SELECT stato INTO v_stato FROM public.modifiche_proposte WHERE id = bloccata;
  PERFORM pg_temp.check('postgres', 'proposta rimasta in attesa', 'in_attesa', coalesce(v_stato, 'NULL'));
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
