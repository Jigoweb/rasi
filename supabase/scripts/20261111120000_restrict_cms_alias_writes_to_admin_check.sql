-- Verifica read-only dopo 20261111120000_restrict_cms_alias_writes_to_admin.sql.
-- Solo SELECT: non modifica policy, grant, dati.
--
-- Ogni riga deve avere esito = ok. Se una riga è fail lo script termina
-- con EXCEPTION (exit code diverso da 0).
--
-- Esecuzione, su un branch Supabase già migrato, mai sul progetto di
-- produzione:
--   psql -v ON_ERROR_STOP=1 -f supabase/scripts/20261111120000_restrict_cms_alias_writes_to_admin_check.sql

WITH pol AS (
  SELECT
    tablename,
    policyname,
    cmd,
    COALESCE(qual, '') AS qual,
    COALESCE(with_check, '') AS with_check
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('pages', 'documents', 'bandi_news', 'opera_aliases')
),
checks AS (
  SELECT 'nessuna policy FOR ALL' AS controllo,
    CASE WHEN NOT EXISTS (SELECT 1 FROM pol WHERE cmd = 'ALL')
      THEN 'ok' ELSE 'fail' END AS esito,
    COALESCE((SELECT string_agg(tablename || '.' || policyname, ', ') FROM pol WHERE cmd = 'ALL'), '') AS dettaglio

  UNION ALL
  SELECT 'SELECT pubblica pages invariata',
    CASE WHEN EXISTS (
      SELECT 1 FROM pol
      WHERE tablename = 'pages'
        AND policyname = 'Permetti lettura pubblica delle pagine pubblicate'
        AND cmd = 'SELECT'
        AND qual LIKE '%is_published = true%'
    ) THEN 'ok' ELSE 'fail' END,
    COALESCE((SELECT qual FROM pol WHERE tablename = 'pages' AND policyname = 'Permetti lettura pubblica delle pagine pubblicate'), 'assente')

  UNION ALL
  SELECT 'SELECT pubblica documents invariata',
    CASE WHEN EXISTS (
      SELECT 1 FROM pol
      WHERE tablename = 'documents'
        AND policyname = 'Permetti lettura pubblica dei documenti'
        AND cmd = 'SELECT'
        AND qual = 'true'
    ) THEN 'ok' ELSE 'fail' END,
    COALESCE((SELECT qual FROM pol WHERE tablename = 'documents' AND policyname = 'Permetti lettura pubblica dei documenti'), 'assente')

  UNION ALL
  SELECT 'SELECT pubblica bandi_news invariata',
    CASE WHEN EXISTS (
      SELECT 1 FROM pol
      WHERE tablename = 'bandi_news'
        AND policyname = 'Permetti lettura pubblica dei bandi'
        AND cmd = 'SELECT'
        AND qual = 'true'
    ) THEN 'ok' ELSE 'fail' END,
    COALESCE((SELECT qual FROM pol WHERE tablename = 'bandi_news' AND policyname = 'Permetti lettura pubblica dei bandi'), 'assente')

  UNION ALL
  SELECT 'SELECT opera_aliases_read_all invariata',
    CASE WHEN EXISTS (
      SELECT 1 FROM pol
      WHERE tablename = 'opera_aliases'
        AND policyname = 'opera_aliases_read_all'
        AND cmd = 'SELECT'
        AND qual LIKE '%auth.role()%'
        AND qual LIKE '%authenticated%'
    ) THEN 'ok' ELSE 'fail' END,
    COALESCE((SELECT qual FROM pol WHERE policyname = 'opera_aliases_read_all'), 'assente')

  UNION ALL
  SELECT 'SELECT bozze pages solo authenticated, initplan',
    CASE WHEN EXISTS (
      SELECT 1 FROM pol
      WHERE tablename = 'pages'
        AND policyname = 'Permetti lettura di tutte le pagine agli autenticati'
        AND cmd = 'SELECT'
        AND qual ~* 'select\s+auth\.role\s*\('
        AND qual LIKE '%authenticated%'
        AND qual NOT LIKE '%get_user_role%'
    ) THEN 'ok' ELSE 'fail' END,
    COALESCE((SELECT qual FROM pol WHERE policyname = 'Permetti lettura di tutte le pagine agli autenticati'), 'assente')

  UNION ALL
  SELECT 'dodici policy di scrittura admin',
    CASE WHEN (
      SELECT count(*) FROM pol
      WHERE policyname IN (
        'pages_insert_admin', 'pages_update_admin', 'pages_delete_admin',
        'documents_insert_admin', 'documents_update_admin', 'documents_delete_admin',
        'bandi_news_insert_admin', 'bandi_news_update_admin', 'bandi_news_delete_admin',
        'opera_aliases_insert_admin', 'opera_aliases_update_admin', 'opera_aliases_delete_admin'
      )
    ) = 12 THEN 'ok' ELSE 'fail' END,
    (SELECT count(*)::text FROM pol WHERE policyname LIKE '%_admin' AND cmd <> 'SELECT')

  UNION ALL
  SELECT 'scritture: solo admin, initplan, niente auth.role()',
    CASE WHEN NOT EXISTS (
      SELECT 1 FROM pol
      WHERE cmd IN ('INSERT', 'UPDATE', 'DELETE')
        AND (
          (cmd = 'INSERT' AND (
            with_check !~* 'select\s+(public\.)?get_user_role\s*\('
            OR with_check !~* '''admin''::(public\.)?ruolo_utente'
            OR with_check LIKE '%auth.role()%'
            OR qual <> ''
          ))
          OR (cmd = 'DELETE' AND (
            qual !~* 'select\s+(public\.)?get_user_role\s*\('
            OR qual !~* '''admin''::(public\.)?ruolo_utente'
            OR qual LIKE '%auth.role()%'
            OR with_check <> ''
          ))
          OR (cmd = 'UPDATE' AND (
            qual !~* 'select\s+(public\.)?get_user_role\s*\('
            OR with_check !~* 'select\s+(public\.)?get_user_role\s*\('
            OR qual !~* '''admin''::(public\.)?ruolo_utente'
            OR with_check !~* '''admin''::(public\.)?ruolo_utente'
            OR qual LIKE '%auth.role()%'
            OR with_check LIKE '%auth.role()%'
          ))
        )
    ) AND (
      SELECT count(*) FROM pol WHERE cmd IN ('INSERT', 'UPDATE', 'DELETE')
    ) = 12
    THEN 'ok' ELSE 'fail' END,
    COALESCE((
      SELECT string_agg(tablename || '.' || policyname || ' ' || cmd, ', ')
      FROM pol
      WHERE cmd IN ('INSERT', 'UPDATE', 'DELETE')
    ), '')
)
SELECT controllo, esito, dettaglio
FROM checks
ORDER BY controllo;

DO $check_fail$
DECLARE
  v_fail int;
BEGIN
  WITH pol AS (
    SELECT
      tablename,
      policyname,
      cmd,
      COALESCE(qual, '') AS qual,
      COALESCE(with_check, '') AS with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('pages', 'documents', 'bandi_news', 'opera_aliases')
  )
  SELECT count(*) INTO v_fail
  FROM pol
  WHERE cmd = 'ALL'
     OR (
       cmd IN ('INSERT', 'UPDATE', 'DELETE')
       AND (
         COALESCE(NULLIF(with_check, ''), qual) !~* 'select\s+(public\.)?get_user_role\s*\('
         OR COALESCE(NULLIF(with_check, ''), qual) !~* '''admin''::(public\.)?ruolo_utente'
         OR COALESCE(NULLIF(with_check, ''), qual) LIKE '%auth.role()%'
       )
     );

  IF (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('pages', 'documents', 'bandi_news', 'opera_aliases')
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
  ) <> 12 THEN
    RAISE EXCEPTION 'attese 12 policy di scrittura, controlla il SELECT sopra';
  END IF;

  IF v_fail > 0 THEN
    RAISE EXCEPTION 'check policy fallito: % righe non conformi (vedi il SELECT sopra)', v_fail;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname = 'Permetti lettura di tutte le pagine agli autenticati'
      AND cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'manca la SELECT che tiene leggibili le bozze di pages';
  END IF;
END
$check_fail$;
