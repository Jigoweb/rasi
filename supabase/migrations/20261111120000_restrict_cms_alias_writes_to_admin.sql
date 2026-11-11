-- Chiude un buco RLS su quattro tabelle.
--
-- Le policy di scrittura si chiamavano "admin" ma la condizione era
-- auth.role() = 'authenticated': qualunque utente loggato (artista,
-- operatore, readonly, admin) poteva fare INSERT, UPDATE e DELETE.
--
-- pages, documents e bandi_news: scrittura solo per get_user_role() = 'admin',
-- la stessa condizione già usata da ruoli_tipologie_write_policy,
-- parametri_ripartizione_write_policy e audit_log_select_policy.
-- opera_aliases: admin oppure operatore, come opere_write_policy e le
-- altre tabelle dello staff. Decisione di Matteo: l'operatore deve
-- poter scrivere gli alias.
-- La chiamata sta in (select ...) così Postgres la valuta una volta
-- (initplan), come le altre policy da sistemare.
--
-- La lettura non cambia:
--   documents e bandi_news hanno già una SELECT USING (true);
--   opera_aliases_read_all resta com'è (authenticated);
--   su pages la FOR ALL era anche una SELECT di tutte le righe, bozze
--   comprese, per ogni authenticated. La SELECT pubblica copre solo
--   is_published = true, quindi se ne aggiunge una equivalente.
--
-- Il service role continua a ignorare le RLS (script e client server).
-- Non tocca le altre tabelle: la bozza A3, che spezza le FOR ALL rimaste,
-- deve saltare queste quattro se questa migration è già applicata.

DO $preflight$
BEGIN
  IF to_regclass('public.pages') IS NULL
     OR to_regclass('public.documents') IS NULL
     OR to_regclass('public.bandi_news') IS NULL
     OR to_regclass('public.opera_aliases') IS NULL
     OR to_regprocedure('public.get_user_role()') IS NULL THEN
    RAISE EXCEPTION
      'schema base assente (pages, documents, bandi_news, opera_aliases o get_user_role). Le migration sono incrementali e presuppongono db/init.';
  END IF;
END
$preflight$;

-- Toglie ogni policy di scrittura su queste quattro tabelle, qualunque
-- sia il nome (FOR ALL attuale, oppure INSERT/UPDATE/DELETE se la bozza
-- A3 le ha già spezzate lasciando auth.role() = 'authenticated').
-- Le SELECT già presenti restano.
DO $drop_writes$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('pages', 'documents', 'bandi_news', 'opera_aliases')
      AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END
$drop_writes$;

DROP POLICY IF EXISTS "Permetti lettura di tutte le pagine agli autenticati" ON public.pages;

CREATE POLICY "Permetti lettura di tutte le pagine agli autenticati"
  ON public.pages
  FOR SELECT
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY pages_insert_admin
  ON public.pages
  FOR INSERT
  WITH CHECK ((select public.get_user_role()) = 'admin'::public.ruolo_utente);

CREATE POLICY pages_update_admin
  ON public.pages
  FOR UPDATE
  USING ((select public.get_user_role()) = 'admin'::public.ruolo_utente)
  WITH CHECK ((select public.get_user_role()) = 'admin'::public.ruolo_utente);

CREATE POLICY pages_delete_admin
  ON public.pages
  FOR DELETE
  USING ((select public.get_user_role()) = 'admin'::public.ruolo_utente);

CREATE POLICY documents_insert_admin
  ON public.documents
  FOR INSERT
  WITH CHECK ((select public.get_user_role()) = 'admin'::public.ruolo_utente);

CREATE POLICY documents_update_admin
  ON public.documents
  FOR UPDATE
  USING ((select public.get_user_role()) = 'admin'::public.ruolo_utente)
  WITH CHECK ((select public.get_user_role()) = 'admin'::public.ruolo_utente);

CREATE POLICY documents_delete_admin
  ON public.documents
  FOR DELETE
  USING ((select public.get_user_role()) = 'admin'::public.ruolo_utente);

CREATE POLICY bandi_news_insert_admin
  ON public.bandi_news
  FOR INSERT
  WITH CHECK ((select public.get_user_role()) = 'admin'::public.ruolo_utente);

CREATE POLICY bandi_news_update_admin
  ON public.bandi_news
  FOR UPDATE
  USING ((select public.get_user_role()) = 'admin'::public.ruolo_utente)
  WITH CHECK ((select public.get_user_role()) = 'admin'::public.ruolo_utente);

CREATE POLICY bandi_news_delete_admin
  ON public.bandi_news
  FOR DELETE
  USING ((select public.get_user_role()) = 'admin'::public.ruolo_utente);

CREATE POLICY opera_aliases_insert_staff
  ON public.opera_aliases
  FOR INSERT
  WITH CHECK (
    (select public.get_user_role()) IN ('admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente)
  );

CREATE POLICY opera_aliases_update_staff
  ON public.opera_aliases
  FOR UPDATE
  USING (
    (select public.get_user_role()) IN ('admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente)
  )
  WITH CHECK (
    (select public.get_user_role()) IN ('admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente)
  );

CREATE POLICY opera_aliases_delete_staff
  ON public.opera_aliases
  FOR DELETE
  USING (
    (select public.get_user_role()) IN ('admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente)
  );
