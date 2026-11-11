-- Verifica read-only dopo 20261111081750_split_for_all_write_policies.sql.
-- Solo SELECT: non modifica policy, grant, dati.
--
-- Ogni riga deve avere esito = ok. La riga RIEPILOGO è ok solo se non ci
-- sono fail. Le espressioni sono confrontate dopo aver tolto spazi, cast,
-- qualificatore public. e il rewrite di pg_get_expr
-- "( SELECT funzione() AS funzione )".
--
-- pages, documents, bandi_news e opera_aliases_write_admin devono restare
-- FOR ALL: questa migration non le tocca (le copre la PR #62). Il controllo
-- vale se #62 non è già applicata.

WITH norm AS (
  SELECT
    tablename,
    policyname,
    permissive,
    roles::text AS roles,
    cmd,
    qual,
    with_check,
    replace(replace(replace(
      regexp_replace(
        regexp_replace(
          lower(regexp_replace(coalesce(qual, ''), '\s+', '', 'g')),
          '\(select(get_user_role|auth\.role|auth\.uid)\(\)as(get_user_role|role|uid)\)',
          '\1()',
          'g'
        ),
        '::[a-z0-9_.]+',
        '',
        'g'
      ),
      '(', ''), ')', ''), 'public.', '') AS qual_n,
    replace(replace(replace(
      regexp_replace(
        regexp_replace(
          lower(regexp_replace(coalesce(with_check, ''), '\s+', '', 'g')),
          '\(select(get_user_role|auth\.role|auth\.uid)\(\)as(get_user_role|role|uid)\)',
          '\1()',
          'g'
        ),
        '::[a-z0-9_.]+',
        '',
        'g'
      ),
      '(', ''), ')', ''), 'public.', '') AS check_n
  FROM pg_policies
  WHERE schemaname = 'public'
),
expected AS (
  SELECT *
  FROM (VALUES
    ('alert_prese_visione'::text, 'alert_prese_visione_insert_policy'::text, 'INSERT'::text, '{public}'::text, $k$get_user_role=anyarray['admin','operatore']$k$, false, true),
    ('alert_prese_visione', 'alert_prese_visione_update_policy', 'UPDATE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, true),
    ('alert_prese_visione', 'alert_prese_visione_delete_policy', 'DELETE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, false),
    ('artisti_note', 'artisti_note_insert_policy', 'INSERT', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, false, true),
    ('artisti_note', 'artisti_note_update_policy', 'UPDATE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, true),
    ('artisti_note', 'artisti_note_delete_policy', 'DELETE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, false),
    ('artisti_referenti', 'artisti_referenti_insert_policy', 'INSERT', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, false, true),
    ('artisti_referenti', 'artisti_referenti_update_policy', 'UPDATE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, true),
    ('artisti_referenti', 'artisti_referenti_delete_policy', 'DELETE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, false),
    ('cast_esterno', 'cast_esterno_insert_policy', 'INSERT', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, false, true),
    ('cast_esterno', 'cast_esterno_update_policy', 'UPDATE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, true),
    ('cast_esterno', 'cast_esterno_delete_policy', 'DELETE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, false),
    ('campagne_individuazione', 'campagne_individuazione_insert_policy', 'INSERT', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, false, true),
    ('campagne_individuazione', 'campagne_individuazione_update_policy', 'UPDATE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, true),
    ('campagne_individuazione', 'campagne_individuazione_delete_policy', 'DELETE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, false),
    ('campagne_programmazione', 'campagne_programmazione_insert_policy', 'INSERT', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, false, true),
    ('campagne_programmazione', 'campagne_programmazione_update_policy', 'UPDATE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, true),
    ('campagne_programmazione', 'campagne_programmazione_delete_policy', 'DELETE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, false),
    ('campagne_ripartizione', 'campagne_ripartizione_insert_policy', 'INSERT', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, false, true),
    ('campagne_ripartizione', 'campagne_ripartizione_update_policy', 'UPDATE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, true),
    ('campagne_ripartizione', 'campagne_ripartizione_delete_policy', 'DELETE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, false),
    ('emittenti', 'emittenti_insert_policy', 'INSERT', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, false, true),
    ('emittenti', 'emittenti_update_policy', 'UPDATE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, true),
    ('emittenti', 'emittenti_delete_policy', 'DELETE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, false),
    ('episodi', 'episodi_insert_policy', 'INSERT', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, false, true),
    ('episodi', 'episodi_update_policy', 'UPDATE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, true),
    ('episodi', 'episodi_delete_policy', 'DELETE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, false),
    ('individuazioni', 'individuazioni_insert_policy', 'INSERT', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, false, true),
    ('individuazioni', 'individuazioni_update_policy', 'UPDATE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, true),
    ('individuazioni', 'individuazioni_delete_policy', 'DELETE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, false),
    ('opere', 'opere_insert_policy', 'INSERT', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, false, true),
    ('opere', 'opere_update_policy', 'UPDATE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, true),
    ('opere', 'opere_delete_policy', 'DELETE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, false),
    ('partecipazioni', 'partecipazioni_insert_policy', 'INSERT', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, false, true),
    ('partecipazioni', 'partecipazioni_update_policy', 'UPDATE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, true),
    ('partecipazioni', 'partecipazioni_delete_policy', 'DELETE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, false),
    ('programmazioni', 'programmazioni_insert_policy', 'INSERT', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, false, true),
    ('programmazioni', 'programmazioni_update_policy', 'UPDATE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, true),
    ('programmazioni', 'programmazioni_delete_policy', 'DELETE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, false),
    ('ripartizioni', 'ripartizioni_dettaglio_insert_policy', 'INSERT', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, false, true),
    ('ripartizioni', 'ripartizioni_dettaglio_update_policy', 'UPDATE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, true),
    ('ripartizioni', 'ripartizioni_dettaglio_delete_policy', 'DELETE', '{public}', $k$get_user_role=anyarray['admin','operatore']$k$, true, false),
    ('parametri_ripartizione', 'parametri_ripartizione_insert_policy', 'INSERT', '{public}', $k$get_user_role='admin'$k$, false, true),
    ('parametri_ripartizione', 'parametri_ripartizione_update_policy', 'UPDATE', '{public}', $k$get_user_role='admin'$k$, true, true),
    ('parametri_ripartizione', 'parametri_ripartizione_delete_policy', 'DELETE', '{public}', $k$get_user_role='admin'$k$, true, false),
    ('ruoli_tipologie', 'ruoli_tipologie_insert_policy', 'INSERT', '{public}', $k$get_user_role='admin'$k$, false, true),
    ('ruoli_tipologie', 'ruoli_tipologie_update_policy', 'UPDATE', '{public}', $k$get_user_role='admin'$k$, true, true),
    ('ruoli_tipologie', 'ruoli_tipologie_delete_policy', 'DELETE', '{public}', $k$get_user_role='admin'$k$, true, false),
    ('parametri_ripartizione', 'parametri_ripartizione_admin_select_policy', 'SELECT', '{public}', $k$get_user_role='admin'$k$, true, false),
    ('public_form_submissions', 'Utenti autenticati leggono submissions', 'SELECT', '{authenticated}', 'true', true, false),
    ('public_form_submissions', 'Utenti autenticati aggiornano submissions', 'UPDATE', '{authenticated}', 'true', true, true),
    ('public_form_submissions', 'Utenti autenticati cancellano submissions', 'DELETE', '{authenticated}', 'true', true, false)
  ) AS t(tablename, policyname, cmd, roles, expr_n, needs_qual, needs_check)
),
dropped AS (
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
    ('public_form_submissions', 'Utenti autenticati leggono e aggiornano submissions'),
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
    ('opera_aliases', 'opera_aliases_delete_admin')
  ) AS t(tablename, policyname)
),
kept AS (
  SELECT *
  FROM (VALUES
    ('ruoli_tipologie'::text, 'ruoli_tipologie_select_policy'::text, 'SELECT'::text),
    ('ruoli_tipologie', 'config_tables_public_read', 'SELECT'),
    ('public_form_submissions', 'Anonimi possono inserire submissions pubbliche', 'INSERT'),
    ('opere', 'opere_select_policy', 'SELECT'),
    ('partecipazioni', 'partecipazioni_select_policy', 'SELECT'),
    ('programmazioni', 'programmazioni_select_policy', 'SELECT'),
    ('parametri_ripartizione', 'parametri_ripartizione_select_policy', 'SELECT'),
    ('opera_aliases', 'opera_aliases_read_all', 'SELECT'),
    ('opera_aliases', 'opera_aliases_write_admin', 'ALL'),
    ('pages', 'Permetti gestione admin pages', 'ALL'),
    ('documents', 'Permetti gestione admin documents', 'ALL'),
    ('bandi_news', 'Permetti gestione admin bandi_news', 'ALL')
  ) AS t(tablename, policyname, cmd)
),
report AS (
  SELECT
    e.tablename || '.' || e.policyname AS oggetto,
    e.cmd AS atteso,
    COALESCE(n.cmd, 'assente') AS trovato,
    CASE
      WHEN n.policyname IS NULL THEN 'fail'
      WHEN n.permissive IS DISTINCT FROM 'PERMISSIVE' THEN 'fail'
      WHEN n.roles IS DISTINCT FROM e.roles THEN 'fail'
      WHEN n.cmd IS DISTINCT FROM e.cmd THEN 'fail'
      WHEN e.needs_qual AND n.qual_n IS DISTINCT FROM e.expr_n THEN 'fail'
      WHEN NOT e.needs_qual AND n.qual IS NOT NULL THEN 'fail'
      WHEN e.needs_check AND n.check_n IS DISTINCT FROM e.expr_n THEN 'fail'
      WHEN NOT e.needs_check AND n.with_check IS NOT NULL THEN 'fail'
      ELSE 'ok'
    END AS esito
  FROM expected e
  LEFT JOIN norm n
    ON n.tablename = e.tablename
   AND n.policyname = e.policyname

  UNION ALL

  SELECT
    d.tablename || '.' || d.policyname,
    'assente',
    COALESCE(n.cmd, 'assente'),
    CASE WHEN n.policyname IS NULL THEN 'ok' ELSE 'fail' END
  FROM dropped d
  LEFT JOIN norm n
    ON n.tablename = d.tablename
   AND n.policyname = d.policyname

  UNION ALL

  SELECT
    k.tablename || '.' || k.policyname,
    k.cmd,
    COALESCE(n.cmd, 'assente'),
    CASE WHEN n.cmd = k.cmd THEN 'ok' ELSE 'fail' END
  FROM kept k
  LEFT JOIN norm n
    ON n.tablename = k.tablename
   AND n.policyname = k.policyname

  UNION ALL

  SELECT
    'public_form_submissions.nessun_insert_true',
    'solo kind-checked',
    COALESCE(string_agg(n.policyname, ', '), 'nessuna'),
    CASE
      WHEN count(*) FILTER (
        WHERE n.cmd = 'INSERT'
          AND n.policyname IS DISTINCT FROM 'Anonimi possono inserire submissions pubbliche'
      ) = 0
       AND count(*) FILTER (
        WHERE n.policyname = 'Anonimi possono inserire submissions pubbliche'
          AND n.cmd = 'INSERT'
          AND n.with_check LIKE '%contatti%'
          AND n.with_check LIKE '%mandato%'
          AND n.with_check LIKE '%promozione%'
      ) = 1
      THEN 'ok'
      ELSE 'fail'
    END
  FROM norm n
  WHERE n.tablename = 'public_form_submissions'
)
SELECT oggetto, atteso, trovato, esito
FROM report
UNION ALL
SELECT
  'RIEPILOGO',
  count(*)::text,
  count(*) FILTER (WHERE esito = 'ok')::text,
  CASE WHEN count(*) FILTER (WHERE esito <> 'ok') = 0 THEN 'ok' ELSE 'fail' END
FROM report
ORDER BY oggetto;
