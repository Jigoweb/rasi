-- Rollback di 20261111120000_restrict_cms_alias_writes_to_admin.sql.
-- NON è una migration: non sta in supabase/migrations e non parte da solo.
--
-- Eseguirlo a mano, in un'unica transazione (il BEGIN/COMMIT qui sotto).
-- Ripristina le quattro policy FOR ALL precedenti, cioè
-- auth.role() = 'authenticated'. Questo riapre il buco di scrittura:
-- va fatto solo per annullare la migration, non come stato desiderato.
--
-- Non ripristina un eventuale split della bozza A3: torna allo stato
-- precedente a questa migration.
--
-- Non tocca le SELECT pubbliche né opera_aliases_read_all.
-- Toglie solo la SELECT aggiunta per le bozze delle pages.

BEGIN;

DO $rollback_preflight$
BEGIN
  IF to_regclass('public.pages') IS NULL
     OR to_regclass('public.documents') IS NULL
     OR to_regclass('public.bandi_news') IS NULL
     OR to_regclass('public.opera_aliases') IS NULL THEN
    RAISE EXCEPTION 'tabelle assenti, rollback annullato';
  END IF;
END
$rollback_preflight$;

DROP POLICY IF EXISTS "Permetti lettura di tutte le pagine agli autenticati" ON public.pages;

DROP POLICY IF EXISTS pages_insert_admin ON public.pages;
DROP POLICY IF EXISTS pages_update_admin ON public.pages;
DROP POLICY IF EXISTS pages_delete_admin ON public.pages;

DROP POLICY IF EXISTS documents_insert_admin ON public.documents;
DROP POLICY IF EXISTS documents_update_admin ON public.documents;
DROP POLICY IF EXISTS documents_delete_admin ON public.documents;

DROP POLICY IF EXISTS bandi_news_insert_admin ON public.bandi_news;
DROP POLICY IF EXISTS bandi_news_update_admin ON public.bandi_news;
DROP POLICY IF EXISTS bandi_news_delete_admin ON public.bandi_news;

DROP POLICY IF EXISTS opera_aliases_insert_admin ON public.opera_aliases;
DROP POLICY IF EXISTS opera_aliases_update_admin ON public.opera_aliases;
DROP POLICY IF EXISTS opera_aliases_delete_admin ON public.opera_aliases;

DROP POLICY IF EXISTS "Permetti gestione admin pages" ON public.pages;
DROP POLICY IF EXISTS "Permetti gestione admin documents" ON public.documents;
DROP POLICY IF EXISTS "Permetti gestione admin bandi_news" ON public.bandi_news;
DROP POLICY IF EXISTS opera_aliases_write_admin ON public.opera_aliases;

CREATE POLICY "Permetti gestione admin pages"
  ON public.pages
  FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Permetti gestione admin documents"
  ON public.documents
  FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Permetti gestione admin bandi_news"
  ON public.bandi_news
  FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY opera_aliases_write_admin
  ON public.opera_aliases
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

COMMIT;
