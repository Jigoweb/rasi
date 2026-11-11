-- A3: spezza le policy di scrittura FOR ALL in INSERT / UPDATE / DELETE.
--
-- Una policy PERMISSIVE FOR ALL vale anche per SELECT. Postgres le mette in OR
-- con la policy di lettura, e l'advisor multiple_permissive_policies conta
-- quell'OR su ogni ruolo. Le espressioni non cambiano: cambia solo il comando.
-- get_user_role() e auth.role() sono avvolti in (select ...), così il planner
-- li valuta una volta. Le policy *_select_policy non si toccano. Su
-- ruoli_tipologie restano sia config_tables_public_read sia
-- ruoli_tipologie_select_policy.
--
-- public_form_submissions: la policy FOR ALL TO authenticated (USING true /
-- WITH CHECK true) diventa SELECT + UPDATE. Non si aggiunge un INSERT true:
-- l'INSERT resta quello con il controllo su kind. Il GRANT della tabella non
-- include DELETE, e questa migration non aggiunge una policy DELETE.
--
-- Le policy CMS / opera_aliases restano auth.role() = 'authenticated'.
-- Restringerle allo staff è una scelta di prodotto, non di questo split.
-- Ruoli invariati: TO public, tranne il form che resta TO authenticated.
--
-- Effetto voluto: il USING della write non entra più nell'OR del SELECT.
-- Dove la policy SELECT è già larga almeno quanto la write (opere,
-- programmazioni, documenti, bandi, alias, tabelle staff) chi legge non
-- cambia. Due casi no, perché il SELECT è più stretto della vecchia FOR ALL:
--   pages: una bozza (is_published = false) non è più visibile né
--   aggiornabile dal ruolo authenticated. La lista dashboard usa la service
--   role; il salvataggio in PageForm usa il client utente.
--   parametri_ripartizione: l'admin non vede e non aggiorna più le righe
--   fuori da valido_dal/valido_al.
-- Non si toccano le policy *_select_policy: allargarle è un'altra modifica,
-- e la PR #53 le altera per nome.
--
-- Non contiene CREATE INDEX CONCURRENTLY: resta un'unica transazione.
-- Non applicare al progetto produzione jdflzupcfwdcajxfobfj senza OK esplicito.
--
-- Ordine con la PR #53 (ALTER POLICY sulle stesse *_write_policy):
--   se questa migration è già applicata, quegli ALTER falliscono perché la
--   policy FOR ALL non c'è più. #53 va ridotta agli ALTER sulle SELECT e ai
--   7 auth_rls_initplan rimasti.
--   se #53 è già applicata, il DROP qui sotto funziona lo stesso: le nuove
--   policy nascono già con (select ...).

CREATE OR REPLACE FUNCTION pg_temp.norm_rls_expr(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT replace(replace(replace(
    regexp_replace(
      regexp_replace(
        lower(regexp_replace(coalesce(t, ''), '\s+', '', 'g')),
        '\(select(get_user_role|auth\.role|auth\.uid)\(\)as(get_user_role|role|uid)\)',
        '\1()',
        'g'
      ),
      '::[a-z0-9_.]+',
      '',
      'g'
    ),
    '(', ''), ')', ''), 'public.', '')
$$;

DO $a3_norm_selftest$
BEGIN
  IF pg_temp.norm_rls_expr(
       $e$(get_user_role() = ANY (ARRAY['admin'::ruolo_utente, 'operatore'::ruolo_utente]))$e$
     ) IS DISTINCT FROM $k$get_user_role=anyarray['admin','operatore']$k$
     OR pg_temp.norm_rls_expr(
       $e$(( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::ruolo_utente, 'operatore'::ruolo_utente]))$e$
     ) IS DISTINCT FROM $k$get_user_role=anyarray['admin','operatore']$k$
     OR pg_temp.norm_rls_expr(
       $e$(get_user_role() = 'admin'::ruolo_utente)$e$
     ) IS DISTINCT FROM $k$get_user_role='admin'$k$
     OR pg_temp.norm_rls_expr(
       $e$(( SELECT get_user_role() AS get_user_role) = 'admin'::ruolo_utente)$e$
     ) IS DISTINCT FROM $k$get_user_role='admin'$k$
     OR pg_temp.norm_rls_expr(
       $e$(auth.role() = 'authenticated'::text)$e$
     ) IS DISTINCT FROM $k$auth.role='authenticated'$k$
     OR pg_temp.norm_rls_expr(
       $e$(( SELECT auth.role() AS role) = 'authenticated'::text)$e$
     ) IS DISTINCT FROM $k$auth.role='authenticated'$k$
     OR pg_temp.norm_rls_expr('true') IS DISTINCT FROM 'true'
     OR pg_temp.norm_rls_expr('(true)') IS DISTINCT FROM 'true'
  THEN
    RAISE EXCEPTION 'normalizzatore espressioni RLS non allineato alle forme attese';
  END IF;
END
$a3_norm_selftest$;

-- Snapshot delle policy che questa migration non deve modificare.
DROP TABLE IF EXISTS pg_temp.rls_a3_untouched;
CREATE TEMP TABLE rls_a3_untouched AS
SELECT
  tablename,
  policyname,
  permissive,
  roles::text AS roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (tablename, policyname) NOT IN (
    VALUES
      ('alert_prese_visione', 'alert_prese_visione_write_policy'),
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
  );

DO $a3_preflight$
DECLARE
  r record;
  v_cmd text;
  v_permissive text;
  v_roles text;
  v_qual text;
  v_check text;
  v_norm_qual text;
  v_norm_check text;
  v_expected text;
BEGIN
  FOR r IN
    SELECT *
    FROM (VALUES
      ('alert_prese_visione'::text, 'alert_prese_visione_write_policy'::text, '{public}'::text, 'staff_any'::text, 'both'::text),
      ('artisti_note', 'artisti_note_write_policy', '{public}', 'staff_any', 'both'),
      ('artisti_referenti', 'artisti_referenti_write_policy', '{public}', 'staff_any', 'both'),
      ('cast_esterno', 'cast_esterno_write_policy', '{public}', 'staff_any', 'both'),
      ('campagne_individuazione', 'campagne_individuazione_write_policy', '{public}', 'staff_any', 'using'),
      ('campagne_programmazione', 'campagne_programmazione_write_policy', '{public}', 'staff_any', 'using'),
      ('campagne_ripartizione', 'campagne_ripartizione_write_policy', '{public}', 'staff_any', 'using'),
      ('emittenti', 'emittenti_write_policy', '{public}', 'staff_any', 'using'),
      ('episodi', 'episodi_write_policy', '{public}', 'staff_any', 'using'),
      ('individuazioni', 'individuazioni_write_policy', '{public}', 'staff_any', 'using'),
      ('opere', 'opere_write_policy', '{public}', 'staff_any', 'using'),
      ('partecipazioni', 'partecipazioni_write_policy', '{public}', 'staff_any', 'using'),
      ('programmazioni', 'programmazioni_write_policy', '{public}', 'staff_any', 'using'),
      ('ripartizioni', 'ripartizioni_dettaglio_write_policy', '{public}', 'staff_any', 'using'),
      ('parametri_ripartizione', 'parametri_ripartizione_write_policy', '{public}', 'staff_admin', 'using'),
      ('ruoli_tipologie', 'ruoli_tipologie_write_policy', '{public}', 'staff_admin', 'using'),
      ('bandi_news', 'Permetti gestione admin bandi_news', '{public}', 'cms', 'using'),
      ('documents', 'Permetti gestione admin documents', '{public}', 'cms', 'using'),
      ('pages', 'Permetti gestione admin pages', '{public}', 'cms', 'using'),
      ('opera_aliases', 'opera_aliases_write_admin', '{public}', 'cms', 'both'),
      ('public_form_submissions', 'Utenti autenticati leggono e aggiornano submissions', '{authenticated}', 'form_true', 'both')
    ) AS t(tablename, policyname, roles_expected, expr_kind, check_kind)
  LOOP
    v_cmd := NULL;
    SELECT
      p.cmd,
      p.permissive,
      p.roles::text,
      p.qual,
      p.with_check
    INTO v_cmd, v_permissive, v_roles, v_qual, v_check
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename = r.tablename
      AND p.policyname = r.policyname;

    IF v_cmd IS NULL THEN
      RAISE EXCEPTION 'policy assente, migration annullata: %.%', r.tablename, r.policyname;
    END IF;

    v_norm_qual := pg_temp.norm_rls_expr(v_qual);
    v_norm_check := pg_temp.norm_rls_expr(v_check);
    v_expected := CASE r.expr_kind
      WHEN 'staff_any' THEN $k$get_user_role=anyarray['admin','operatore']$k$
      WHEN 'staff_admin' THEN $k$get_user_role='admin'$k$
      WHEN 'cms' THEN $k$auth.role='authenticated'$k$
      WHEN 'form_true' THEN 'true'
    END;

    IF v_cmd IS DISTINCT FROM 'ALL'
       OR v_permissive IS DISTINCT FROM 'PERMISSIVE'
       OR v_roles IS DISTINCT FROM r.roles_expected
       OR v_norm_qual IS DISTINCT FROM v_expected
       OR (
         r.check_kind = 'both'
         AND v_norm_check IS DISTINCT FROM v_expected
       )
       OR (
         r.check_kind = 'using'
         AND v_check IS NOT NULL
         AND v_norm_check IS DISTINCT FROM v_expected
       )
    THEN
      RAISE EXCEPTION
        'policy %.% non è la FOR ALL attesa (cmd=%, roles=%, qual=%, with_check=%)',
        r.tablename, r.policyname, v_cmd, v_roles, v_qual, v_check;
    END IF;
  END LOOP;

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
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'public_form_submissions'
      AND policyname = 'Anonimi possono inserire submissions pubbliche'
      AND cmd = 'INSERT'
  ) THEN
    RAISE EXCEPTION 'policy di lettura o INSERT kind-checked assente: migration annullata';
  END IF;
END
$a3_preflight$;

DO $a3_split$
DECLARE
  r record;
  v_expr text;
  v_staff_any text := $e$(select public.get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])$e$;
  v_staff_admin text := $e$(select public.get_user_role()) = 'admin'::public.ruolo_utente$e$;
  v_cms text := $e$(select auth.role()) = 'authenticated'$e$;
BEGIN
  FOR r IN
    SELECT *
    FROM (VALUES
      ('alert_prese_visione'::text, 'alert_prese_visione_write_policy'::text, 'alert_prese_visione_insert_policy'::text, 'alert_prese_visione_update_policy'::text, 'alert_prese_visione_delete_policy'::text, 'staff_any'::text),
      ('artisti_note', 'artisti_note_write_policy', 'artisti_note_insert_policy', 'artisti_note_update_policy', 'artisti_note_delete_policy', 'staff_any'),
      ('artisti_referenti', 'artisti_referenti_write_policy', 'artisti_referenti_insert_policy', 'artisti_referenti_update_policy', 'artisti_referenti_delete_policy', 'staff_any'),
      ('cast_esterno', 'cast_esterno_write_policy', 'cast_esterno_insert_policy', 'cast_esterno_update_policy', 'cast_esterno_delete_policy', 'staff_any'),
      ('campagne_individuazione', 'campagne_individuazione_write_policy', 'campagne_individuazione_insert_policy', 'campagne_individuazione_update_policy', 'campagne_individuazione_delete_policy', 'staff_any'),
      ('campagne_programmazione', 'campagne_programmazione_write_policy', 'campagne_programmazione_insert_policy', 'campagne_programmazione_update_policy', 'campagne_programmazione_delete_policy', 'staff_any'),
      ('campagne_ripartizione', 'campagne_ripartizione_write_policy', 'campagne_ripartizione_insert_policy', 'campagne_ripartizione_update_policy', 'campagne_ripartizione_delete_policy', 'staff_any'),
      ('emittenti', 'emittenti_write_policy', 'emittenti_insert_policy', 'emittenti_update_policy', 'emittenti_delete_policy', 'staff_any'),
      ('episodi', 'episodi_write_policy', 'episodi_insert_policy', 'episodi_update_policy', 'episodi_delete_policy', 'staff_any'),
      ('individuazioni', 'individuazioni_write_policy', 'individuazioni_insert_policy', 'individuazioni_update_policy', 'individuazioni_delete_policy', 'staff_any'),
      ('opere', 'opere_write_policy', 'opere_insert_policy', 'opere_update_policy', 'opere_delete_policy', 'staff_any'),
      ('partecipazioni', 'partecipazioni_write_policy', 'partecipazioni_insert_policy', 'partecipazioni_update_policy', 'partecipazioni_delete_policy', 'staff_any'),
      ('programmazioni', 'programmazioni_write_policy', 'programmazioni_insert_policy', 'programmazioni_update_policy', 'programmazioni_delete_policy', 'staff_any'),
      ('ripartizioni', 'ripartizioni_dettaglio_write_policy', 'ripartizioni_dettaglio_insert_policy', 'ripartizioni_dettaglio_update_policy', 'ripartizioni_dettaglio_delete_policy', 'staff_any'),
      ('parametri_ripartizione', 'parametri_ripartizione_write_policy', 'parametri_ripartizione_insert_policy', 'parametri_ripartizione_update_policy', 'parametri_ripartizione_delete_policy', 'staff_admin'),
      ('ruoli_tipologie', 'ruoli_tipologie_write_policy', 'ruoli_tipologie_insert_policy', 'ruoli_tipologie_update_policy', 'ruoli_tipologie_delete_policy', 'staff_admin'),
      ('bandi_news', 'Permetti gestione admin bandi_news', 'Permetti gestione admin bandi_news_insert', 'Permetti gestione admin bandi_news_update', 'Permetti gestione admin bandi_news_delete', 'cms'),
      ('documents', 'Permetti gestione admin documents', 'Permetti gestione admin documents_insert', 'Permetti gestione admin documents_update', 'Permetti gestione admin documents_delete', 'cms'),
      ('pages', 'Permetti gestione admin pages', 'Permetti gestione admin pages_insert', 'Permetti gestione admin pages_update', 'Permetti gestione admin pages_delete', 'cms'),
      ('opera_aliases', 'opera_aliases_write_admin', 'opera_aliases_insert_admin', 'opera_aliases_update_admin', 'opera_aliases_delete_admin', 'cms')
    ) AS t(tablename, old_policy, insert_policy, update_policy, delete_policy, expr_kind)
  LOOP
    v_expr := CASE r.expr_kind
      WHEN 'staff_any' THEN v_staff_any
      WHEN 'staff_admin' THEN v_staff_admin
      WHEN 'cms' THEN v_cms
    END;

    EXECUTE format('DROP POLICY %I ON public.%I', r.old_policy, r.tablename);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO public WITH CHECK (%s)',
      r.insert_policy, r.tablename, v_expr
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO public USING (%s) WITH CHECK (%s)',
      r.update_policy, r.tablename, v_expr, v_expr
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO public USING (%s)',
      r.delete_policy, r.tablename, v_expr
    );
  END LOOP;
END
$a3_split$;

DROP POLICY "Utenti autenticati leggono e aggiornano submissions"
  ON public.public_form_submissions;

CREATE POLICY "Utenti autenticati leggono submissions"
  ON public.public_form_submissions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Utenti autenticati aggiornano submissions"
  ON public.public_form_submissions
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

DO $a3_post$
DECLARE
  r record;
  v_expected text;
  v_bad int;
BEGIN
  FOR r IN
    SELECT *
    FROM (VALUES
      ('alert_prese_visione'::text, 'alert_prese_visione_insert_policy'::text, 'INSERT'::text, '{public}'::text, 'staff_any'::text, false, true),
      ('alert_prese_visione', 'alert_prese_visione_update_policy', 'UPDATE', '{public}', 'staff_any', true, true),
      ('alert_prese_visione', 'alert_prese_visione_delete_policy', 'DELETE', '{public}', 'staff_any', true, false),
      ('artisti_note', 'artisti_note_insert_policy', 'INSERT', '{public}', 'staff_any', false, true),
      ('artisti_note', 'artisti_note_update_policy', 'UPDATE', '{public}', 'staff_any', true, true),
      ('artisti_note', 'artisti_note_delete_policy', 'DELETE', '{public}', 'staff_any', true, false),
      ('artisti_referenti', 'artisti_referenti_insert_policy', 'INSERT', '{public}', 'staff_any', false, true),
      ('artisti_referenti', 'artisti_referenti_update_policy', 'UPDATE', '{public}', 'staff_any', true, true),
      ('artisti_referenti', 'artisti_referenti_delete_policy', 'DELETE', '{public}', 'staff_any', true, false),
      ('cast_esterno', 'cast_esterno_insert_policy', 'INSERT', '{public}', 'staff_any', false, true),
      ('cast_esterno', 'cast_esterno_update_policy', 'UPDATE', '{public}', 'staff_any', true, true),
      ('cast_esterno', 'cast_esterno_delete_policy', 'DELETE', '{public}', 'staff_any', true, false),
      ('campagne_individuazione', 'campagne_individuazione_insert_policy', 'INSERT', '{public}', 'staff_any', false, true),
      ('campagne_individuazione', 'campagne_individuazione_update_policy', 'UPDATE', '{public}', 'staff_any', true, true),
      ('campagne_individuazione', 'campagne_individuazione_delete_policy', 'DELETE', '{public}', 'staff_any', true, false),
      ('campagne_programmazione', 'campagne_programmazione_insert_policy', 'INSERT', '{public}', 'staff_any', false, true),
      ('campagne_programmazione', 'campagne_programmazione_update_policy', 'UPDATE', '{public}', 'staff_any', true, true),
      ('campagne_programmazione', 'campagne_programmazione_delete_policy', 'DELETE', '{public}', 'staff_any', true, false),
      ('campagne_ripartizione', 'campagne_ripartizione_insert_policy', 'INSERT', '{public}', 'staff_any', false, true),
      ('campagne_ripartizione', 'campagne_ripartizione_update_policy', 'UPDATE', '{public}', 'staff_any', true, true),
      ('campagne_ripartizione', 'campagne_ripartizione_delete_policy', 'DELETE', '{public}', 'staff_any', true, false),
      ('emittenti', 'emittenti_insert_policy', 'INSERT', '{public}', 'staff_any', false, true),
      ('emittenti', 'emittenti_update_policy', 'UPDATE', '{public}', 'staff_any', true, true),
      ('emittenti', 'emittenti_delete_policy', 'DELETE', '{public}', 'staff_any', true, false),
      ('episodi', 'episodi_insert_policy', 'INSERT', '{public}', 'staff_any', false, true),
      ('episodi', 'episodi_update_policy', 'UPDATE', '{public}', 'staff_any', true, true),
      ('episodi', 'episodi_delete_policy', 'DELETE', '{public}', 'staff_any', true, false),
      ('individuazioni', 'individuazioni_insert_policy', 'INSERT', '{public}', 'staff_any', false, true),
      ('individuazioni', 'individuazioni_update_policy', 'UPDATE', '{public}', 'staff_any', true, true),
      ('individuazioni', 'individuazioni_delete_policy', 'DELETE', '{public}', 'staff_any', true, false),
      ('opere', 'opere_insert_policy', 'INSERT', '{public}', 'staff_any', false, true),
      ('opere', 'opere_update_policy', 'UPDATE', '{public}', 'staff_any', true, true),
      ('opere', 'opere_delete_policy', 'DELETE', '{public}', 'staff_any', true, false),
      ('partecipazioni', 'partecipazioni_insert_policy', 'INSERT', '{public}', 'staff_any', false, true),
      ('partecipazioni', 'partecipazioni_update_policy', 'UPDATE', '{public}', 'staff_any', true, true),
      ('partecipazioni', 'partecipazioni_delete_policy', 'DELETE', '{public}', 'staff_any', true, false),
      ('programmazioni', 'programmazioni_insert_policy', 'INSERT', '{public}', 'staff_any', false, true),
      ('programmazioni', 'programmazioni_update_policy', 'UPDATE', '{public}', 'staff_any', true, true),
      ('programmazioni', 'programmazioni_delete_policy', 'DELETE', '{public}', 'staff_any', true, false),
      ('ripartizioni', 'ripartizioni_dettaglio_insert_policy', 'INSERT', '{public}', 'staff_any', false, true),
      ('ripartizioni', 'ripartizioni_dettaglio_update_policy', 'UPDATE', '{public}', 'staff_any', true, true),
      ('ripartizioni', 'ripartizioni_dettaglio_delete_policy', 'DELETE', '{public}', 'staff_any', true, false),
      ('parametri_ripartizione', 'parametri_ripartizione_insert_policy', 'INSERT', '{public}', 'staff_admin', false, true),
      ('parametri_ripartizione', 'parametri_ripartizione_update_policy', 'UPDATE', '{public}', 'staff_admin', true, true),
      ('parametri_ripartizione', 'parametri_ripartizione_delete_policy', 'DELETE', '{public}', 'staff_admin', true, false),
      ('ruoli_tipologie', 'ruoli_tipologie_insert_policy', 'INSERT', '{public}', 'staff_admin', false, true),
      ('ruoli_tipologie', 'ruoli_tipologie_update_policy', 'UPDATE', '{public}', 'staff_admin', true, true),
      ('ruoli_tipologie', 'ruoli_tipologie_delete_policy', 'DELETE', '{public}', 'staff_admin', true, false),
      ('bandi_news', 'Permetti gestione admin bandi_news_insert', 'INSERT', '{public}', 'cms', false, true),
      ('bandi_news', 'Permetti gestione admin bandi_news_update', 'UPDATE', '{public}', 'cms', true, true),
      ('bandi_news', 'Permetti gestione admin bandi_news_delete', 'DELETE', '{public}', 'cms', true, false),
      ('documents', 'Permetti gestione admin documents_insert', 'INSERT', '{public}', 'cms', false, true),
      ('documents', 'Permetti gestione admin documents_update', 'UPDATE', '{public}', 'cms', true, true),
      ('documents', 'Permetti gestione admin documents_delete', 'DELETE', '{public}', 'cms', true, false),
      ('pages', 'Permetti gestione admin pages_insert', 'INSERT', '{public}', 'cms', false, true),
      ('pages', 'Permetti gestione admin pages_update', 'UPDATE', '{public}', 'cms', true, true),
      ('pages', 'Permetti gestione admin pages_delete', 'DELETE', '{public}', 'cms', true, false),
      ('opera_aliases', 'opera_aliases_insert_admin', 'INSERT', '{public}', 'cms', false, true),
      ('opera_aliases', 'opera_aliases_update_admin', 'UPDATE', '{public}', 'cms', true, true),
      ('opera_aliases', 'opera_aliases_delete_admin', 'DELETE', '{public}', 'cms', true, false),
      ('public_form_submissions', 'Utenti autenticati leggono submissions', 'SELECT', '{authenticated}', 'form_true', true, false),
      ('public_form_submissions', 'Utenti autenticati aggiornano submissions', 'UPDATE', '{authenticated}', 'form_true', true, true)
    ) AS t(tablename, policyname, cmd, roles_expected, expr_kind, needs_qual, needs_check)
  LOOP
    v_expected := CASE r.expr_kind
      WHEN 'staff_any' THEN $k$get_user_role=anyarray['admin','operatore']$k$
      WHEN 'staff_admin' THEN $k$get_user_role='admin'$k$
      WHEN 'cms' THEN $k$auth.role='authenticated'$k$
      WHEN 'form_true' THEN 'true'
    END;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = r.tablename
        AND p.policyname = r.policyname
        AND p.cmd = r.cmd
        AND p.permissive = 'PERMISSIVE'
        AND p.roles::text = r.roles_expected
        AND (
          (NOT r.needs_qual AND p.qual IS NULL)
          OR (r.needs_qual AND pg_temp.norm_rls_expr(p.qual) = v_expected)
        )
        AND (
          (NOT r.needs_check AND p.with_check IS NULL)
          OR (r.needs_check AND pg_temp.norm_rls_expr(p.with_check) = v_expected)
        )
    ) THEN
      RAISE EXCEPTION 'policy nuova non conforme: %.%', r.tablename, r.policyname;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (tablename, policyname) IN (
        VALUES
          ('alert_prese_visione', 'alert_prese_visione_write_policy'),
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
      )
  ) THEN
    RAISE EXCEPTION 'una policy FOR ALL di scrittura è ancora presente';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'public_form_submissions'
      AND cmd = 'INSERT'
      AND policyname IS DISTINCT FROM 'Anonimi possono inserire submissions pubbliche'
  ) THEN
    RAISE EXCEPTION 'INSERT extra su public_form_submissions';
  END IF;

  SELECT count(*) INTO v_bad
  FROM (
    SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_temp.rls_a3_untouched
    EXCEPT
    SELECT tablename, policyname, permissive, roles::text, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
  ) drifted;

  IF v_bad > 0 THEN
    RAISE EXCEPTION 'policy non in elenco modificate: %', v_bad;
  END IF;
END
$a3_post$;

DROP FUNCTION IF EXISTS pg_temp.norm_rls_expr(text);
