-- A2. Initplan sulle policy RLS.
-- Avvolge get_user_role(), get_user_artista_id(), auth.uid() e auth.role()
-- in (select ...) così il planner le valuta una volta per query.
-- Non cambia comandi, ruoli (TO), né il predicato.
-- Fuori scope: A3 (spezzare le policy FOR ALL) e A4 (REVOKE su anon).
--
-- Predicati verificati sulle definizioni correnti del repo (non sulla bozza
-- prod se diverge). Fonti:
--   db/init/02_rls.sql
--   db/init/10_public_pages_cms.sql
--   20260526123926_create_opera_aliases.sql
--   20260623140000_campaign_jobs_owner_select_policy.sql
--   20260623170000_upload_programmazioni_jobs.sql
--   20261005154123_artisti_ambito_backfill_and_cast_esterno.sql
--   20261012100100_artisti_documento_note_referenti.sql
--   20261012100300_alert_scadenze.sql
--   20261012100400_audit_log.sql
--   20261020212235_artista_id_app_metadata.sql
--   20261021100000_apply_missing_prod_effects.sql
--
-- Eccezione: campagne_programmazione_select_policy. Nel repo (db/init) il
-- predicato è solo il ruolo admin/operatore. Nel dump pg_policies di
-- produzione del 2026-10-29 c'è anche `stato = 'completata' OR ...`
-- (stessa forma di campagne_individuazione_select_policy). Un ALTER con
-- il testo del repo toglierebbe quel ramo in produzione; un ALTER con il
-- testo prod lo aggiungerebbe su un DB costruito dal repo. La policy viene
-- quindi riscritta sul qual corrente, e solo se è uno di quei due predicati.
--
-- Idempotente: rieseguire riassegna le stesse espressioni. Le policy assenti
-- fanno fallire la migration (non si salta in silenzio).
-- 40 policy. Le SELECT con USING (true) e le policy senza queste chiamate
-- non sono toccate. Le policy storage.* restano fuori (non sono nel lint
-- auth_rls_initplan, che esclude lo schema storage).

SET search_path = public, auth;

-- artisti (20261020212235 select/update; insert/delete da db/init/02_rls.sql)
ALTER POLICY "artisti_select_policy" ON public.artisti
  USING (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
    OR (
      (select get_user_role()) = 'artista'::public.ruolo_utente
      AND id = (select get_user_artista_id())
    )
    OR (
      (select get_user_role()) = 'readonly'::public.ruolo_utente
      AND stato = ANY (ARRAY['attivo'::public.stato_iscrizione, 'minorenne'::public.stato_iscrizione])
    )
  );

ALTER POLICY "artisti_insert_policy" ON public.artisti
  WITH CHECK (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
  );

ALTER POLICY "artisti_update_policy" ON public.artisti
  USING (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
    OR (
      (select get_user_role()) = 'artista'::public.ruolo_utente
      AND id = (select get_user_artista_id())
    )
  );

ALTER POLICY "artisti_delete_policy" ON public.artisti
  USING ((select get_user_role()) = 'admin'::public.ruolo_utente);

-- artisti_note / artisti_referenti (20261012100100): USING e WITH CHECK espliciti
ALTER POLICY "artisti_note_select_policy" ON public.artisti_note
  USING (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente, 'readonly'::public.ruolo_utente])
  );

ALTER POLICY "artisti_note_write_policy" ON public.artisti_note
  USING (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
  )
  WITH CHECK (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
  );

ALTER POLICY "artisti_referenti_select_policy" ON public.artisti_referenti
  USING (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente, 'readonly'::public.ruolo_utente])
  );

ALTER POLICY "artisti_referenti_write_policy" ON public.artisti_referenti
  USING (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
  )
  WITH CHECK (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
  );

-- alert_prese_visione (20261012100300)
ALTER POLICY "alert_prese_visione_select_policy" ON public.alert_prese_visione
  USING (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente, 'readonly'::public.ruolo_utente])
  );

ALTER POLICY "alert_prese_visione_write_policy" ON public.alert_prese_visione
  USING (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
  )
  WITH CHECK (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
  );

-- audit_log (20261012100400)
ALTER POLICY "audit_log_select_policy" ON public.audit_log
  USING ((select get_user_role()) = 'admin'::public.ruolo_utente);

-- cast_esterno (20261005154123)
ALTER POLICY "cast_esterno_select_policy" ON public.cast_esterno
  USING (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente, 'readonly'::public.ruolo_utente, 'artista'::public.ruolo_utente])
  );

ALTER POLICY "cast_esterno_write_policy" ON public.cast_esterno
  USING (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
  )
  WITH CHECK (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
  );

-- opere, episodi, programmazioni, emittenti, ruoli, parametri (db/init/02_rls.sql)
ALTER POLICY "opere_write_policy" ON public.opere
  USING (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
  );

ALTER POLICY "episodi_write_policy" ON public.episodi
  USING (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
  );

ALTER POLICY "programmazioni_write_policy" ON public.programmazioni
  USING (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
  );

ALTER POLICY "emittenti_select_policy" ON public.emittenti
  USING (
    (attiva = true)
    OR ((select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]))
  );

ALTER POLICY "emittenti_write_policy" ON public.emittenti
  USING (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
  );

ALTER POLICY "ruoli_tipologie_select_policy" ON public.ruoli_tipologie
  USING (
    (attivo = true)
    OR ((select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]))
  );

ALTER POLICY "ruoli_tipologie_write_policy" ON public.ruoli_tipologie
  USING ((select get_user_role()) = 'admin'::public.ruolo_utente);

ALTER POLICY "parametri_ripartizione_write_policy" ON public.parametri_ripartizione
  USING ((select get_user_role()) = 'admin'::public.ruolo_utente);

-- campagne
ALTER POLICY "campagne_individuazione_select_policy" ON public.campagne_individuazione
  USING (
    (stato = 'completata'::public.stato_campagna)
    OR ((select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]))
  );

ALTER POLICY "campagne_individuazione_write_policy" ON public.campagne_individuazione
  USING (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
  );

-- Vedi commento in testa: non si sostituisce il predicato, si avvolge solo la chiamata.
DO $campagne_programmazione_select$
DECLARE
  v_qual text;
  v_bare text;
  v_norm text;
  v_wrapped text;
  v_repo text := '(get_user_role()=any(array[''admin''::ruolo_utente,''operatore''::ruolo_utente]))';
  v_prod text := '((stato=''completata''::stato_campagna)or(get_user_role()=any(array[''admin''::ruolo_utente,''operatore''::ruolo_utente])))';
BEGIN
  SELECT qual
    INTO v_qual
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'campagne_programmazione'
    AND policyname = 'campagne_programmazione_select_policy';

  IF v_qual IS NULL THEN
    RAISE EXCEPTION 'policy public.campagne_programmazione_select_policy assente';
  END IF;

  -- pg_get_expr riscrive (select get_user_role()) come
  -- ( SELECT get_user_role() AS get_user_role). Si normalizza prima del confronto.
  v_bare := regexp_replace(
    v_qual,
    '\(\s*SELECT\s+get_user_role\(\)\s+AS\s+get_user_role\s*\)',
    'get_user_role()',
    'gi'
  );
  v_bare := replace(v_bare, '(select get_user_role())', 'get_user_role()');
  v_norm := lower(regexp_replace(replace(v_bare, 'public.', ''), '\s+', '', 'g'));

  IF v_norm NOT IN (v_repo, v_prod) THEN
    RAISE EXCEPTION 'campagne_programmazione_select_policy: predicato non previsto, nessuna riscrittura. qual=%', v_qual;
  END IF;

  v_wrapped := replace(v_bare, 'get_user_role()', '(select get_user_role())');

  EXECUTE 'ALTER POLICY campagne_programmazione_select_policy ON public.campagne_programmazione USING (' || v_wrapped || ')';
END
$campagne_programmazione_select$;

ALTER POLICY "campagne_programmazione_write_policy" ON public.campagne_programmazione
  USING (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
  );

ALTER POLICY "campagne_ripartizione_select_policy" ON public.campagne_ripartizione
  USING (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
    OR (
      (select get_user_role()) = 'artista'::public.ruolo_utente
      AND stato = 'approvata'::public.stato_ripartizione
    )
    OR (
      (select get_user_role()) = 'readonly'::public.ruolo_utente
      AND stato = 'distribuita'::public.stato_ripartizione
    )
  );

ALTER POLICY "campagne_ripartizione_write_policy" ON public.campagne_ripartizione
  USING (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
  );

-- partecipazioni (select: 20261020212235; write: db/init/02_rls.sql)
ALTER POLICY "partecipazioni_select_policy" ON public.partecipazioni
  USING (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
    OR (
      (select get_user_role()) = 'artista'::public.ruolo_utente
      AND artista_id = (select get_user_artista_id())
      AND (
        EXISTS (
          SELECT 1 FROM public.opere o
          WHERE o.id = partecipazioni.opera_id
            AND o.stato_validazione = 'validato'::public.stato_validazione
        )
        OR EXISTS (
          SELECT 1 FROM public.artisti a
          WHERE a.id = partecipazioni.artista_id
            AND a.stato_validazione = 'validato'::public.stato_validazione
        )
      )
    )
    OR (
      (select get_user_role()) IS DISTINCT FROM 'artista'::public.ruolo_utente
      AND (
        EXISTS (
          SELECT 1 FROM public.opere o
          WHERE o.id = partecipazioni.opera_id
            AND o.stato_validazione = 'validato'::public.stato_validazione
        )
        OR EXISTS (
          SELECT 1 FROM public.artisti a
          WHERE a.id = partecipazioni.artista_id
            AND a.stato_validazione = 'validato'::public.stato_validazione
        )
      )
    )
  );

ALTER POLICY "partecipazioni_write_policy" ON public.partecipazioni
  USING (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
  );

-- individuazioni (select: 20261020212235; write: db/init/02_rls.sql)
ALTER POLICY "individuazioni_select_policy" ON public.individuazioni
  USING (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
    OR (
      (select get_user_role()) = 'artista'::public.ruolo_utente
      AND EXISTS (
        SELECT 1
        FROM public.partecipazioni p
        JOIN public.opere o ON o.id = p.opera_id
        WHERE p.opera_id = individuazioni.opera_id
          AND p.artista_id = (select get_user_artista_id())
          AND o.stato_validazione = 'validato'::public.stato_validazione
      )
    )
    OR (
      (select get_user_role()) IS DISTINCT FROM 'artista'::public.ruolo_utente
      AND stato = ANY (ARRAY['validato'::public.stato_individuazione, 'individuato'::public.stato_individuazione])
      AND EXISTS (
        SELECT 1 FROM public.opere o
        WHERE o.id = individuazioni.opera_id
          AND o.stato_validazione = 'validato'::public.stato_validazione
      )
    )
  );

ALTER POLICY "individuazioni_write_policy" ON public.individuazioni
  USING (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
  );

-- ripartizioni (tabella public.ripartizioni; nome policy storico)
-- select: 20261020212235. write: db/init/02_rls.sql
ALTER POLICY "ripartizioni_dettaglio_select_policy" ON public.ripartizioni
  USING (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
    OR (
      (select get_user_role()) = 'artista'::public.ruolo_utente
      AND artista_id = (select get_user_artista_id())
    )
  );

ALTER POLICY "ripartizioni_dettaglio_write_policy" ON public.ripartizioni
  USING (
    (select get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
  );

-- auth.uid() (20260623140000 / 20261021100000 e 20260623170000). TO authenticated invariato.
ALTER POLICY "campaign_jobs_select_authenticated" ON public.campaign_jobs
  USING (created_by = (select auth.uid()));

ALTER POLICY "upload_jobs_select_owner" ON public.upload_jobs
  USING (created_by = (select auth.uid()));

-- auth.role() (db/init/10_public_pages_cms.sql e 20260526123926_create_opera_aliases.sql)
ALTER POLICY "Permetti gestione admin pages" ON public.pages
  USING ((select auth.role()) = 'authenticated'::text);

ALTER POLICY "Permetti gestione admin documents" ON public.documents
  USING ((select auth.role()) = 'authenticated'::text);

ALTER POLICY "Permetti gestione admin bandi_news" ON public.bandi_news
  USING ((select auth.role()) = 'authenticated'::text);

ALTER POLICY opera_aliases_read_all ON public.opera_aliases
  USING ((select auth.role()) = 'authenticated'::text);

ALTER POLICY opera_aliases_write_admin ON public.opera_aliases
  USING ((select auth.role()) = 'authenticated'::text)
  WITH CHECK ((select auth.role()) = 'authenticated'::text);

-- Fail-closed: le 40 policy devono esistere e non contenere più chiamate nude.
DO $assert_rls_initplan$
DECLARE
  v_found integer;
  v_bad text;
  v_names text[] := ARRAY[
    'artisti_select_policy',
    'artisti_insert_policy',
    'artisti_update_policy',
    'artisti_delete_policy',
    'artisti_note_select_policy',
    'artisti_note_write_policy',
    'artisti_referenti_select_policy',
    'artisti_referenti_write_policy',
    'alert_prese_visione_select_policy',
    'alert_prese_visione_write_policy',
    'audit_log_select_policy',
    'cast_esterno_select_policy',
    'cast_esterno_write_policy',
    'opere_write_policy',
    'episodi_write_policy',
    'programmazioni_write_policy',
    'emittenti_select_policy',
    'emittenti_write_policy',
    'ruoli_tipologie_select_policy',
    'ruoli_tipologie_write_policy',
    'parametri_ripartizione_write_policy',
    'campagne_individuazione_select_policy',
    'campagne_individuazione_write_policy',
    'campagne_programmazione_select_policy',
    'campagne_programmazione_write_policy',
    'campagne_ripartizione_select_policy',
    'campagne_ripartizione_write_policy',
    'partecipazioni_select_policy',
    'partecipazioni_write_policy',
    'individuazioni_select_policy',
    'individuazioni_write_policy',
    'ripartizioni_dettaglio_select_policy',
    'ripartizioni_dettaglio_write_policy',
    'campaign_jobs_select_authenticated',
    'upload_jobs_select_owner',
    'Permetti gestione admin pages',
    'Permetti gestione admin documents',
    'Permetti gestione admin bandi_news',
    'opera_aliases_read_all',
    'opera_aliases_write_admin'
  ];
BEGIN
  IF cardinality(v_names) <> 40 THEN
    RAISE EXCEPTION 'elenco interno policy: attese 40, trovate %', cardinality(v_names);
  END IF;

  SELECT count(*)
    INTO v_found
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname = ANY (v_names);

  IF v_found <> 40 THEN
    RAISE EXCEPTION 'policy initplan attese 40, trovate %', v_found;
  END IF;

  SELECT string_agg(format('%s.%s', tablename, policyname), ', ' ORDER BY tablename, policyname)
    INTO v_bad
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname = ANY (v_names)
    AND (
      regexp_replace(
        COALESCE(qual, '') || ' ' || COALESCE(with_check, ''),
        '\(\s*SELECT\s+(get_user_role|get_user_artista_id|auth\.uid|auth\.role)\(\)\s+AS\s+[A-Za-z_]+\s*\)',
        '',
        'gi'
      ) ~ 'get_user_role\(\)|get_user_artista_id\(\)|auth\.uid\(\)|auth\.role\(\)'
    );

  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'policy ancora con chiamata nuda: %', v_bad;
  END IF;
END
$assert_rls_initplan$;
