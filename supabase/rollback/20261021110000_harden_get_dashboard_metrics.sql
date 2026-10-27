-- Rollback di 20261021110000_harden_get_dashboard_metrics.sql.
-- NON è una migration: non sta in supabase/migrations e non parte da solo.
--
-- Rimette EXECUTE a PUBLIC e ad anon, su ogni firma di
-- public.get_dashboard_metrics. authenticated e service_role restano:
-- c'erano già (grant esplicito ad authenticated nelle definizioni del
-- repo, service_role fra i default di Supabase) e toglierli non è il
-- ripristino.
--
-- search_path torna a public, senza pg_temp. È il valore delle tre
-- definizioni nel repo (20260623220000, 20260811183000,
-- 20260911160000) e di 20261021100000 su main, non un RESET: un
-- search_path vuoto non è lo stato precedente di queste firme.
--
-- Non riscrive il corpo. Idempotente. Se la funzione non c'è, fallisce.

DO $$
DECLARE
  fn regprocedure;
  restored integer := 0;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace nsp ON nsp.oid = p.pronamespace
    WHERE nsp.nspname = 'public'
      AND p.proname = 'get_dashboard_metrics'
    ORDER BY p.oid
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO PUBLIC', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', fn);
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', fn);
    restored := restored + 1;
    RAISE NOTICE 'get_dashboard_metrics rollback: %', fn;
  END LOOP;

  IF restored = 0 THEN
    RAISE EXCEPTION
      'public.get_dashboard_metrics assente: nessuna firma da ripristinare';
  END IF;
END $$;
