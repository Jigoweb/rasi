-- Rollback di 20261029082850_rls_initplan_wrap_helpers.sql.
-- Ripristina le chiamate nude. Non cambia i predicati.
-- campagne_programmazione_select_policy viene svolta sul testo corrente,
-- così il ramo `stato = 'completata'` (solo produzione, 2026-10-29) resta.

SET search_path = public, auth;

ALTER POLICY "artisti_select_policy" ON public.artisti
  USING (
    get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
    OR (
      get_user_role() = 'artista'::public.ruolo_utente
      AND id = get_user_artista_id()
    )
    OR (
      get_user_role() = 'readonly'::public.ruolo_utente
      AND stato = ANY (ARRAY['attivo'::public.stato_iscrizione, 'minorenne'::public.stato_iscrizione])
    )
  );

ALTER POLICY "artisti_insert_policy" ON public.artisti
  WITH CHECK (
    get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
  );

ALTER POLICY "artisti_update_policy" ON public.artisti
  USING (
    get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
    OR (
      get_user_role() = 'artista'::public.ruolo_utente
      AND id = get_user_artista_id()
    )
  );

ALTER POLICY "artisti_delete_policy" ON public.artisti
  USING (get_user_role() = 'admin'::public.ruolo_utente);

ALTER POLICY "artisti_note_select_policy" ON public.artisti_note
  USING (get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente, 'readonly'::public.ruolo_utente]));

ALTER POLICY "artisti_note_write_policy" ON public.artisti_note
  USING (get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]))
  WITH CHECK (get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]));

ALTER POLICY "artisti_referenti_select_policy" ON public.artisti_referenti
  USING (get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente, 'readonly'::public.ruolo_utente]));

ALTER POLICY "artisti_referenti_write_policy" ON public.artisti_referenti
  USING (get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]))
  WITH CHECK (get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]));

ALTER POLICY "alert_prese_visione_select_policy" ON public.alert_prese_visione
  USING (get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente, 'readonly'::public.ruolo_utente]));

ALTER POLICY "alert_prese_visione_write_policy" ON public.alert_prese_visione
  USING (get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]))
  WITH CHECK (get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]));

ALTER POLICY "audit_log_select_policy" ON public.audit_log
  USING (get_user_role() = 'admin'::public.ruolo_utente);

ALTER POLICY "cast_esterno_select_policy" ON public.cast_esterno
  USING (get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente, 'readonly'::public.ruolo_utente, 'artista'::public.ruolo_utente]));

ALTER POLICY "cast_esterno_write_policy" ON public.cast_esterno
  USING (get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]))
  WITH CHECK (get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]));

ALTER POLICY "opere_write_policy" ON public.opere
  USING (get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]));

ALTER POLICY "episodi_write_policy" ON public.episodi
  USING (get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]));

ALTER POLICY "programmazioni_write_policy" ON public.programmazioni
  USING (get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]));

ALTER POLICY "emittenti_select_policy" ON public.emittenti
  USING (attiva = true OR get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]));

ALTER POLICY "emittenti_write_policy" ON public.emittenti
  USING (get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]));

ALTER POLICY "ruoli_tipologie_select_policy" ON public.ruoli_tipologie
  USING (attivo = true OR get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]));

ALTER POLICY "ruoli_tipologie_write_policy" ON public.ruoli_tipologie
  USING (get_user_role() = 'admin'::public.ruolo_utente);

ALTER POLICY "parametri_ripartizione_write_policy" ON public.parametri_ripartizione
  USING (get_user_role() = 'admin'::public.ruolo_utente);

ALTER POLICY "campagne_individuazione_select_policy" ON public.campagne_individuazione
  USING (
    stato = 'completata'::public.stato_campagna
    OR get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
  );

ALTER POLICY "campagne_individuazione_write_policy" ON public.campagne_individuazione
  USING (get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]));

DO $unwrap_campagne_programmazione_select$
DECLARE
  v_qual text;
  v_bare text;
  v_norm text;
  v_repo text := '(get_user_role()=any(array[''admin''::ruolo_utente,''operatore''::ruolo_utente]))';
  v_prod text := '((stato=''completata''::stato_campagna)or(get_user_role()=any(array[''admin''::ruolo_utente,''operatore''::ruolo_utente])))';
BEGIN
  SELECT qual INTO v_qual
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'campagne_programmazione'
    AND policyname = 'campagne_programmazione_select_policy';

  IF v_qual IS NULL THEN
    RAISE EXCEPTION 'policy public.campagne_programmazione_select_policy assente';
  END IF;

  v_bare := regexp_replace(
    v_qual,
    '\(\s*SELECT\s+get_user_role\(\)\s+AS\s+get_user_role\s*\)',
    'get_user_role()',
    'gi'
  );
  v_bare := replace(v_bare, '(select get_user_role())', 'get_user_role()');
  v_norm := lower(regexp_replace(replace(v_bare, 'public.', ''), '\s+', '', 'g'));

  IF v_norm NOT IN (v_repo, v_prod) THEN
    RAISE EXCEPTION 'campagne_programmazione_select_policy: predicato non previsto, rollback interrotto. qual=%', v_qual;
  END IF;

  EXECUTE 'ALTER POLICY campagne_programmazione_select_policy ON public.campagne_programmazione USING (' || v_bare || ')';
END
$unwrap_campagne_programmazione_select$;

ALTER POLICY "campagne_programmazione_write_policy" ON public.campagne_programmazione
  USING (get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]));

ALTER POLICY "campagne_ripartizione_select_policy" ON public.campagne_ripartizione
  USING (
    get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
    OR (get_user_role() = 'artista'::public.ruolo_utente AND stato = 'approvata'::public.stato_ripartizione)
    OR (get_user_role() = 'readonly'::public.ruolo_utente AND stato = 'distribuita'::public.stato_ripartizione)
  );

ALTER POLICY "campagne_ripartizione_write_policy" ON public.campagne_ripartizione
  USING (get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]));

ALTER POLICY "partecipazioni_select_policy" ON public.partecipazioni
  USING (
    get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
    OR (
      get_user_role() = 'artista'::public.ruolo_utente
      AND artista_id = get_user_artista_id()
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
      get_user_role() IS DISTINCT FROM 'artista'::public.ruolo_utente
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
  USING (get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]));

ALTER POLICY "individuazioni_select_policy" ON public.individuazioni
  USING (
    get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
    OR (
      get_user_role() = 'artista'::public.ruolo_utente
      AND EXISTS (
        SELECT 1
        FROM public.partecipazioni p
        JOIN public.opere o ON o.id = p.opera_id
        WHERE p.opera_id = individuazioni.opera_id
          AND p.artista_id = get_user_artista_id()
          AND o.stato_validazione = 'validato'::public.stato_validazione
      )
    )
    OR (
      get_user_role() IS DISTINCT FROM 'artista'::public.ruolo_utente
      AND stato = ANY (ARRAY['validato'::public.stato_individuazione, 'individuato'::public.stato_individuazione])
      AND EXISTS (
        SELECT 1 FROM public.opere o
        WHERE o.id = individuazioni.opera_id
          AND o.stato_validazione = 'validato'::public.stato_validazione
      )
    )
  );

ALTER POLICY "individuazioni_write_policy" ON public.individuazioni
  USING (get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]));

ALTER POLICY "ripartizioni_dettaglio_select_policy" ON public.ripartizioni
  USING (
    get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
    OR (get_user_role() = 'artista'::public.ruolo_utente AND artista_id = get_user_artista_id())
  );

ALTER POLICY "ripartizioni_dettaglio_write_policy" ON public.ripartizioni
  USING (get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]));

ALTER POLICY "campaign_jobs_select_authenticated" ON public.campaign_jobs
  USING (created_by = auth.uid());

ALTER POLICY "upload_jobs_select_owner" ON public.upload_jobs
  USING (created_by = auth.uid());

ALTER POLICY "Permetti gestione admin pages" ON public.pages
  USING (auth.role() = 'authenticated'::text);

ALTER POLICY "Permetti gestione admin documents" ON public.documents
  USING (auth.role() = 'authenticated'::text);

ALTER POLICY "Permetti gestione admin bandi_news" ON public.bandi_news
  USING (auth.role() = 'authenticated'::text);

ALTER POLICY opera_aliases_read_all ON public.opera_aliases
  USING (auth.role() = 'authenticated'::text);

ALTER POLICY opera_aliases_write_admin ON public.opera_aliases
  USING (auth.role() = 'authenticated'::text)
  WITH CHECK (auth.role() = 'authenticated'::text);
