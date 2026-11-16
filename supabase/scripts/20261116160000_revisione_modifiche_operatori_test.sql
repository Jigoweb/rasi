-- Test di 20261116160000_revisione_modifiche_operatori.sql (fase 2b).
-- Gira in una transazione che fa sempre ROLLBACK: non lascia dati.
--
--   psql -v ON_ERROR_STOP=1 -f supabase/scripts/20261116160000_revisione_modifiche_operatori_test.sql

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
  u_pro uuid := gen_random_uuid();
  u_base uuid := gen_random_uuid();
  u_tiro uuid := gen_random_uuid();
  op uuid := gen_random_uuid();
  ep uuid;
  ce_del uuid;
  ce_upd uuid;
  a_titolo bigint;
  a_ep bigint;
  a_del bigint;
  a_upd1 bigint;
  v_fail text := '';
  v text;
BEGIN
  INSERT INTO auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES
    ('00000000-0000-0000-0000-000000000000', u_pro, 'authenticated', 'authenticated', 'rev-pro@example.invalid', '{"ruolo":"operatore"}', '{}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', u_base, 'authenticated', 'authenticated', 'rev-base@example.invalid', '{"ruolo":"operatore_base"}', '{}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', u_tiro, 'authenticated', 'authenticated', 'rev-tiro@example.invalid', '{"ruolo":"tirocinante"}', '{}', now(), now());
  INSERT INTO public.opere (id, titolo, tipo, stato_validazione) VALUES (op, 'Revisione test', 'serie_tv', 'da_validare');
  INSERT INTO public.cast_esterno (opera_id, nome) VALUES (op, 'Da eliminare') RETURNING id INTO ce_del;
  INSERT INTO public.cast_esterno (opera_id, nome) VALUES (op, 'Da cambiare') RETURNING id INTO ce_upd;

  -- Modifiche dell'Operatore base
  PERFORM pg_temp.as_user(u_base);
  UPDATE public.opere SET titolo = 'Revisione test (base)' WHERE id = op;
  INSERT INTO public.episodi (opera_id, numero_stagione, numero_episodio) VALUES (op, 1, 1) RETURNING id INTO ep;
  DELETE FROM public.cast_esterno WHERE id = ce_del;
  UPDATE public.cast_esterno SET nome = 'Cambiato una volta' WHERE id = ce_upd;
  UPDATE public.cast_esterno SET nome = 'Cambiato due volte' WHERE id = ce_upd;
  -- Modifica del tirocinante
  PERFORM pg_temp.as_user(u_tiro);
  UPDATE public.episodi SET titolo_episodio = 'Pilota' WHERE id = ep;
  -- Il tirocinante non vede la coda
  v := pg_temp.val('select count(*) from public.lista_opere_da_approvare()');
  IF v <> 'ERR:42501' THEN v_fail := v_fail || ' tirocinante vede la coda (' || v || ');'; END IF;
  -- Modifica dell'Operatore pro: non va in coda
  PERFORM pg_temp.as_user(u_pro);
  UPDATE public.opere SET anno_produzione = 2001 WHERE id = op;

  EXECUTE 'RESET ROLE';
  SELECT id INTO a_titolo FROM public.audit_log WHERE opera_id = op AND tabella = 'opere' AND user_ruolo = 'operatore_base' ORDER BY id LIMIT 1;
  SELECT id INTO a_ep FROM public.audit_log WHERE opera_id = op AND tabella = 'episodi' AND azione = 'INSERT' ORDER BY id LIMIT 1;
  SELECT id INTO a_del FROM public.audit_log WHERE opera_id = op AND tabella = 'cast_esterno' AND azione = 'DELETE' ORDER BY id LIMIT 1;
  SELECT id INTO a_upd1 FROM public.audit_log WHERE opera_id = op AND tabella = 'cast_esterno' AND azione = 'UPDATE' ORDER BY id LIMIT 1;

  PERFORM pg_temp.as_user(u_pro);
  v := pg_temp.val(format('select modifiche::text from public.lista_opere_da_approvare() where opera_id = %L', op));
  IF v <> '6' THEN v_fail := v_fail || ' modifiche in coda=' || v || ';'; END IF;
  v := pg_temp.val(format('select count(*)::text from public.lista_modifiche_opera(%L) where user_ruolo = %L', op, 'operatore'));
  IF v <> '0' THEN v_fail := v_fail || ' modifica del pro in coda;'; END IF;
  v := pg_temp.val('select public.conta_opere_da_approvare()::text');
  IF v::int < 1 THEN v_fail := v_fail || ' conteggio=' || v || ';'; END IF;

  -- Ripristino di un UPDATE (titolo opera)
  v := pg_temp.val(format('select public.ripristina_modifica(%s)::text', a_titolo));
  IF v LIKE 'ERR:%' THEN v_fail := v_fail || ' ripristino update ' || v || ';'; END IF;
  IF (SELECT titolo FROM public.opere WHERE id = op) <> 'Revisione test' THEN v_fail := v_fail || ' titolo non ripristinato;'; END IF;
  IF (SELECT anno_produzione FROM public.opere WHERE id = op) IS DISTINCT FROM 2001 THEN v_fail := v_fail || ' toccato campo del pro;'; END IF;
  -- Già revisionata: non si ripristina due volte
  v := pg_temp.val(format('select public.ripristina_modifica(%s)::text', a_titolo));
  IF v <> 'ERR:22023' THEN v_fail := v_fail || ' doppio ripristino ' || v || ';'; END IF;

  -- Ripristino di un DELETE (cast esterno reinserito)
  v := pg_temp.val(format('select public.ripristina_modifica(%s)::text', a_del));
  IF v LIKE 'ERR:%' THEN v_fail := v_fail || ' ripristino delete ' || v || ';'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.cast_esterno WHERE id = ce_del AND nome = 'Da eliminare') THEN v_fail := v_fail || ' cast non reinserito;'; END IF;

  -- Conflitto: il primo UPDATE del cast è stato superato da un secondo
  v := pg_temp.val(format('select public.ripristina_modifica(%s)::text', a_upd1));
  IF v <> 'ERR:40001' THEN v_fail := v_fail || ' conflitto non rilevato ' || v || ';'; END IF;

  -- Ripristino di un INSERT (episodio eliminato, con la sua modifica successiva)
  v := pg_temp.val(format('select public.ripristina_modifica(%s)::text', a_ep));
  IF v LIKE 'ERR:%' THEN v_fail := v_fail || ' ripristino insert ' || v || ';'; END IF;
  IF EXISTS (SELECT 1 FROM public.episodi WHERE id = ep) THEN v_fail := v_fail || ' episodio non eliminato;'; END IF;

  -- Approva e valida: la coda si svuota, l'opera è validata
  v := pg_temp.val(format('select (public.approva_modifiche_opera(%L, true) ->> %L)', op, 'approvate'));
  IF v LIKE 'ERR:%' THEN v_fail := v_fail || ' approva ' || v || ';'; END IF;
  IF (SELECT stato_validazione::text FROM public.opere WHERE id = op) <> 'validato' THEN v_fail := v_fail || ' opera non validata;'; END IF;
  v := pg_temp.val(format('select count(*)::text from public.lista_opere_da_approvare() where opera_id = %L', op));
  IF v <> '0' THEN v_fail := v_fail || ' coda non vuota=' || v || ';'; END IF;

  -- L'Operatore base non approva
  PERFORM pg_temp.as_user(u_base);
  v := pg_temp.val(format('select public.approva_modifiche_opera(%L, true)::text', op));
  IF v <> 'ERR:42501' THEN v_fail := v_fail || ' base approva ' || v || ';'; END IF;
  v := pg_temp.val('select count(*)::text from public.revisioni_modifiche');
  IF v <> 'ERR:42501' THEN v_fail := v_fail || ' revisioni leggibili direttamente ' || v || ';'; END IF;

  EXECUTE 'RESET ROLE';
  IF v_fail <> '' THEN
    RAISE EXCEPTION 'FAIL:%', v_fail;
  END IF;
  RAISE NOTICE 'RIEPILOGO revisione modifiche: ok';
END
$test$;

ROLLBACK;
