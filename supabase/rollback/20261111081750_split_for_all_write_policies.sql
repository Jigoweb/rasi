-- Rollback di 20261111081750_split_for_all_write_policies.sql.
-- NON è una migration: non sta in supabase/migrations e non parte da solo.
--
-- Eseguirlo a mano, in un'unica transazione (il BEGIN/COMMIT qui sotto).
-- Ricrea le policy FOR ALL come sono nel repo prima dello split:
-- espressioni non wrappate, stessi ruoli, stesso USING / WITH CHECK.
-- Le 12 policy che in origine avevano solo USING tornano senza WITH CHECK
-- (per FOR ALL Postgres usa USING anche come check).
--
-- Non tocca le policy di SELECT, né "Anonimi possono inserire submissions
-- pubbliche". Su public_form_submissions torna la FOR ALL TO authenticated.
--
-- Se la PR #53 era già stata applicata prima di questo split, il rollback
-- ripristina le write policy SENZA il wrap (select ...). Il wrap sulle
-- SELECT di #53 non viene toccato.

BEGIN;

DO $rollback_preflight$
DECLARE
  r record;
  v_missing text[] := ARRAY[]::text[];
BEGIN
  FOR r IN
    SELECT *
    FROM (VALUES
      ('alert_prese_visione'::text, 'alert_prese_visione_insert_policy'::text),
      ('alert_prese_visione', 'alert_prese_visione_update_policy'),
      ('alert_prese_visione', 'alert_prese_visione_delete_policy'),
      ('artisti_note', 'artisti_note_insert_policy'),
      ('artisti_note', 'artisti_note_update_policy'),
      ('artisti_note', 'artisti_note_delete_policy'),
      ('artisti_referenti', 'artisti_referenti_insert_policy'),
      ('artisti_referenti', 'artisti_referenti_update_policy'),
      ('artisti_referenti', 'artisti_referenti_delete_policy'),
      ('cast_esterno', 'cast_esterno_insert_policy'),
      ('cast_esterno', 'cast_esterno_update_policy'),
      ('cast_esterno', 'cast_esterno_delete_policy'),
      ('campagne_individuazione', 'campagne_individuazione_insert_policy'),
      ('campagne_individuazione', 'campagne_individuazione_update_policy'),
      ('campagne_individuazione', 'campagne_individuazione_delete_policy'),
      ('campagne_programmazione', 'campagne_programmazione_insert_policy'),
      ('campagne_programmazione', 'campagne_programmazione_update_policy'),
      ('campagne_programmazione', 'campagne_programmazione_delete_policy'),
      ('campagne_ripartizione', 'campagne_ripartizione_insert_policy'),
      ('campagne_ripartizione', 'campagne_ripartizione_update_policy'),
      ('campagne_ripartizione', 'campagne_ripartizione_delete_policy'),
      ('emittenti', 'emittenti_insert_policy'),
      ('emittenti', 'emittenti_update_policy'),
      ('emittenti', 'emittenti_delete_policy'),
      ('episodi', 'episodi_insert_policy'),
      ('episodi', 'episodi_update_policy'),
      ('episodi', 'episodi_delete_policy'),
      ('individuazioni', 'individuazioni_insert_policy'),
      ('individuazioni', 'individuazioni_update_policy'),
      ('individuazioni', 'individuazioni_delete_policy'),
      ('opere', 'opere_insert_policy'),
      ('opere', 'opere_update_policy'),
      ('opere', 'opere_delete_policy'),
      ('partecipazioni', 'partecipazioni_insert_policy'),
      ('partecipazioni', 'partecipazioni_update_policy'),
      ('partecipazioni', 'partecipazioni_delete_policy'),
      ('programmazioni', 'programmazioni_insert_policy'),
      ('programmazioni', 'programmazioni_update_policy'),
      ('programmazioni', 'programmazioni_delete_policy'),
      ('ripartizioni', 'ripartizioni_dettaglio_insert_policy'),
      ('ripartizioni', 'ripartizioni_dettaglio_update_policy'),
      ('ripartizioni', 'ripartizioni_dettaglio_delete_policy'),
      ('parametri_ripartizione', 'parametri_ripartizione_insert_policy'),
      ('parametri_ripartizione', 'parametri_ripartizione_update_policy'),
      ('parametri_ripartizione', 'parametri_ripartizione_delete_policy'),
      ('ruoli_tipologie', 'ruoli_tipologie_insert_policy'),
      ('ruoli_tipologie', 'ruoli_tipologie_update_policy'),
      ('ruoli_tipologie', 'ruoli_tipologie_delete_policy'),
      ('bandi_news', 'Permetti gestione admin bandi_news_insert'),
      ('bandi_news', 'Permetti gestione admin bandi_news_update'),
      ('bandi_news', 'Permetti gestione admin bandi_news_delete'),
      ('documents', 'Permetti gestione admin documents_insert'),
      ('documents', 'Permetti gestione admin documents_update'),
      ('documents', 'Permetti gestione admin documents_delete'),
      ('pages', 'Permetti gestione admin pages_insert'),
      ('pages', 'Permetti gestione admin pages_update'),
      ('pages', 'Permetti gestione admin pages_delete'),
      ('opera_aliases', 'opera_aliases_insert_admin'),
      ('opera_aliases', 'opera_aliases_update_admin'),
      ('opera_aliases', 'opera_aliases_delete_admin'),
      ('public_form_submissions', 'Utenti autenticati leggono submissions'),
      ('public_form_submissions', 'Utenti autenticati aggiornano submissions')
    ) AS t(tablename, policyname)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = r.tablename
        AND policyname = r.policyname
    ) THEN
      v_missing := array_append(v_missing, r.tablename || '.' || r.policyname);
    END IF;
  END LOOP;

  IF cardinality(v_missing) > 0 THEN
    RAISE EXCEPTION 'policy dello split assenti, rollback annullato: %', v_missing;
  END IF;
END
$rollback_preflight$;

DO $rollback_split$
DECLARE
  r record;
  v_expr text;
  v_staff_any text := $e$get_user_role() IN ('admin', 'operatore')$e$;
  v_staff_admin text := $e$get_user_role() = 'admin'$e$;
  v_cms text := $e$auth.role() = 'authenticated'$e$;
BEGIN
  FOR r IN
    SELECT *
    FROM (VALUES
      ('alert_prese_visione'::text, 'alert_prese_visione_write_policy'::text, 'alert_prese_visione_insert_policy'::text, 'alert_prese_visione_update_policy'::text, 'alert_prese_visione_delete_policy'::text, 'staff_any'::text, 'both'::text),
      ('artisti_note', 'artisti_note_write_policy', 'artisti_note_insert_policy', 'artisti_note_update_policy', 'artisti_note_delete_policy', 'staff_any', 'both'),
      ('artisti_referenti', 'artisti_referenti_write_policy', 'artisti_referenti_insert_policy', 'artisti_referenti_update_policy', 'artisti_referenti_delete_policy', 'staff_any', 'both'),
      ('cast_esterno', 'cast_esterno_write_policy', 'cast_esterno_insert_policy', 'cast_esterno_update_policy', 'cast_esterno_delete_policy', 'staff_any', 'both'),
      ('campagne_individuazione', 'campagne_individuazione_write_policy', 'campagne_individuazione_insert_policy', 'campagne_individuazione_update_policy', 'campagne_individuazione_delete_policy', 'staff_any', 'using'),
      ('campagne_programmazione', 'campagne_programmazione_write_policy', 'campagne_programmazione_insert_policy', 'campagne_programmazione_update_policy', 'campagne_programmazione_delete_policy', 'staff_any', 'using'),
      ('campagne_ripartizione', 'campagne_ripartizione_write_policy', 'campagne_ripartizione_insert_policy', 'campagne_ripartizione_update_policy', 'campagne_ripartizione_delete_policy', 'staff_any', 'using'),
      ('emittenti', 'emittenti_write_policy', 'emittenti_insert_policy', 'emittenti_update_policy', 'emittenti_delete_policy', 'staff_any', 'using'),
      ('episodi', 'episodi_write_policy', 'episodi_insert_policy', 'episodi_update_policy', 'episodi_delete_policy', 'staff_any', 'using'),
      ('individuazioni', 'individuazioni_write_policy', 'individuazioni_insert_policy', 'individuazioni_update_policy', 'individuazioni_delete_policy', 'staff_any', 'using'),
      ('opere', 'opere_write_policy', 'opere_insert_policy', 'opere_update_policy', 'opere_delete_policy', 'staff_any', 'using'),
      ('partecipazioni', 'partecipazioni_write_policy', 'partecipazioni_insert_policy', 'partecipazioni_update_policy', 'partecipazioni_delete_policy', 'staff_any', 'using'),
      ('programmazioni', 'programmazioni_write_policy', 'programmazioni_insert_policy', 'programmazioni_update_policy', 'programmazioni_delete_policy', 'staff_any', 'using'),
      ('ripartizioni', 'ripartizioni_dettaglio_write_policy', 'ripartizioni_dettaglio_insert_policy', 'ripartizioni_dettaglio_update_policy', 'ripartizioni_dettaglio_delete_policy', 'staff_any', 'using'),
      ('parametri_ripartizione', 'parametri_ripartizione_write_policy', 'parametri_ripartizione_insert_policy', 'parametri_ripartizione_update_policy', 'parametri_ripartizione_delete_policy', 'staff_admin', 'using'),
      ('ruoli_tipologie', 'ruoli_tipologie_write_policy', 'ruoli_tipologie_insert_policy', 'ruoli_tipologie_update_policy', 'ruoli_tipologie_delete_policy', 'staff_admin', 'using'),
      ('bandi_news', 'Permetti gestione admin bandi_news', 'Permetti gestione admin bandi_news_insert', 'Permetti gestione admin bandi_news_update', 'Permetti gestione admin bandi_news_delete', 'cms', 'using'),
      ('documents', 'Permetti gestione admin documents', 'Permetti gestione admin documents_insert', 'Permetti gestione admin documents_update', 'Permetti gestione admin documents_delete', 'cms', 'using'),
      ('pages', 'Permetti gestione admin pages', 'Permetti gestione admin pages_insert', 'Permetti gestione admin pages_update', 'Permetti gestione admin pages_delete', 'cms', 'using'),
      ('opera_aliases', 'opera_aliases_write_admin', 'opera_aliases_insert_admin', 'opera_aliases_update_admin', 'opera_aliases_delete_admin', 'cms', 'both')
    ) AS t(tablename, old_policy, insert_policy, update_policy, delete_policy, expr_kind, check_kind)
  LOOP
    v_expr := CASE r.expr_kind
      WHEN 'staff_any' THEN v_staff_any
      WHEN 'staff_admin' THEN v_staff_admin
      WHEN 'cms' THEN v_cms
    END;

    EXECUTE format('DROP POLICY %I ON public.%I', r.insert_policy, r.tablename);
    EXECUTE format('DROP POLICY %I ON public.%I', r.update_policy, r.tablename);
    EXECUTE format('DROP POLICY %I ON public.%I', r.delete_policy, r.tablename);

    IF r.check_kind = 'both' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO public USING (%s) WITH CHECK (%s)',
        r.old_policy, r.tablename, v_expr, v_expr
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO public USING (%s)',
        r.old_policy, r.tablename, v_expr
      );
    END IF;
  END LOOP;
END
$rollback_split$;

DROP POLICY "Utenti autenticati leggono submissions"
  ON public.public_form_submissions;
DROP POLICY "Utenti autenticati aggiornano submissions"
  ON public.public_form_submissions;

CREATE POLICY "Utenti autenticati leggono e aggiornano submissions"
  ON public.public_form_submissions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DO $rollback_post$
DECLARE
  v_missing text[] := ARRAY[]::text[];
  r record;
BEGIN
  FOR r IN
    SELECT *
    FROM (VALUES
      ('alert_prese_visione'::text, 'alert_prese_visione_write_policy'::text),
      ('artisti_note', 'artisti_note_write_policy'),
      ('artisti_referenti', 'artisti_referenti_write_policy'),
      ('cast_esterno', 'cast_esterno_write_policy'),
      ('campagne_individuazione', 'campagne_individuazione_write_policy'),
      ('campagne_programmazione', 'campagne_programmazione_write_policy'),
      ('campagne_ripartizione', 'campagne_ripartizione_write_policy'),
      ('emittenti', 'emittenti_write_policy'),
      ('episodi', 'episodi_write_policy'),
      ('individuazioni', 'individuazioni_write_policy'),
      ('opere', 'opere_write_policy'),
      ('partecipazioni', 'partecipazioni_write_policy'),
      ('programmazioni', 'programmazioni_write_policy'),
      ('ripartizioni', 'ripartizioni_dettaglio_write_policy'),
      ('parametri_ripartizione', 'parametri_ripartizione_write_policy'),
      ('ruoli_tipologie', 'ruoli_tipologie_write_policy'),
      ('bandi_news', 'Permetti gestione admin bandi_news'),
      ('documents', 'Permetti gestione admin documents'),
      ('pages', 'Permetti gestione admin pages'),
      ('opera_aliases', 'opera_aliases_write_admin'),
      ('public_form_submissions', 'Utenti autenticati leggono e aggiornano submissions')
    ) AS t(tablename, policyname)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = r.tablename
        AND policyname = r.policyname
        AND cmd = 'ALL'
        AND permissive = 'PERMISSIVE'
    ) THEN
      v_missing := array_append(v_missing, r.tablename || '.' || r.policyname);
    END IF;
  END LOOP;

  IF cardinality(v_missing) > 0 THEN
    RAISE EXCEPTION 'rollback incompleto, FOR ALL assenti: %', v_missing;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ruoli_tipologie'
      AND policyname = 'ruoli_tipologie_select_policy'
      AND cmd = 'SELECT'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ruoli_tipologie'
      AND policyname = 'config_tables_public_read'
      AND cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'policy SELECT di ruoli_tipologie toccate dal rollback';
  END IF;
END
$rollback_post$;

COMMIT;
