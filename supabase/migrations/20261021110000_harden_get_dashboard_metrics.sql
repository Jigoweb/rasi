-- Chiude l'esecuzione anonima di public.get_dashboard_metrics, su ogni firma.
--
-- In produzione la funzione è SECURITY DEFINER e resta eseguibile da
-- PUBLIC e da anon. Le tre definizioni già nel repo
-- (20260623220000, 20260811183000, 20260911160000) fanno GRANT EXECUTE
-- solo ad authenticated e fissano search_path = public. CREATE OR REPLACE
-- non revoca i grant già presenti, quindi PUBLIC e anon sopravvivono.
--
-- Su main, #45 ha aggiunto 20261021100000_apply_missing_prod_effects.sql,
-- che fa CREATE OR REPLACE della firma (date, date), con
-- search_path = public e GRANT EXECUTE solo ad authenticated. Non revoca
-- PUBLIC né anon. CREATE OR REPLACE non tocca i grant, ma riscrive
-- search_path: questa migration parte dopo quel file (20261021110000,
-- prima di 20261023073751 che non tocca questa funzione). Un CREATE OR
-- REPLACE eseguito dopo rimetterebbe search_path = public e toglierebbe
-- pg_temp. Non riscrive il corpo, così vale sia per la firma lasciata
-- da #45 sia per un overload già presente in pg_proc.
--
-- Il corpo in #45 (e le tre definizioni già nel repo) legge solo tabelle
-- di public — artisti, opere, episodi, programmazioni,
-- campagne_individuazione, campagne_programmazione, campagne_ripartizione,
-- individuazioni, partecipazioni — e funzioni di pg_catalog. #45 aggiunge
-- solo data_inizio_mandato e data_fine_mandato, sempre su artisti.
-- Nessun altro schema va nel search_path. public, pg_temp elenca pg_temp
-- in coda: resta cercato, ma non precede public.
--
-- L'unico chiamante dell'app è la dashboard, con il client browser e la
-- sessione (ruolo authenticated). Non c'è un chiamante anon. service_role
-- non la usa oggi; il grant resta per lo stesso motivo di
-- 20261020122804 su get_user_email_by_id.
--
-- Idempotente: rieseguirla riallinea le stesse ACL. Se non esiste nessuna
-- firma, fallisce: non c'è nulla da chiudere e il silenzio nasconderebbe
-- un database inatteso.

DO $$
DECLARE
  fn regprocedure;
  hardened integer := 0;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace nsp ON nsp.oid = p.pronamespace
    WHERE nsp.nspname = 'public'
      AND p.proname = 'get_dashboard_metrics'
    ORDER BY p.oid
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %s SET search_path = public, pg_temp',
      fn
    );
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    hardened := hardened + 1;
    RAISE NOTICE 'get_dashboard_metrics hardened: %', fn;
  END LOOP;

  IF hardened = 0 THEN
    RAISE EXCEPTION
      'public.get_dashboard_metrics assente: nessuna firma da restringere';
  END IF;
END $$;
