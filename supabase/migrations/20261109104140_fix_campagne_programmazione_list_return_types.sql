-- Già applicata in produzione: supabase_migrations.schema_migrations
-- version 20261109104140, name fix_campagne_programmazione_list_return_types.
-- Questo file allinea il repository a quella versione. Il merge non deve
-- rieseguirla: la riga è già applied e un db push la salta.
-- Il CREATE OR REPLACE è il pg_get_functiondef letto in produzione il
-- 2026-11-10. Rieseguirlo lascia la funzione identica.
--
-- Fix regressione introdotta da 20261106220000_role_guard_staff_functions (#60).
--
-- #60 ha convertito get_campagne_programmazione_with_counts() da
-- LANGUAGE sql a plpgsql per poter fare RAISE nel guard di ruolo.
-- Una funzione SQL converte in automatico i tipi della SELECT finale verso
-- quelli dichiarati in RETURNS TABLE; RETURN QUERY in plpgsql no: richiede
-- tipi identici colonna per colonna.
--
-- In produzione campagne_programmazione.nome è varchar, mentre la funzione
-- dichiara nome text. Ogni chiamata, anche da admin, fallisce con:
--   42804 structure of query does not match function result type
--   Returned type character varying does not match expected type text in column 2.
-- Effetto: la pagina Programmazioni (e il contesto globale individuazioni)
-- non riceve più nessuna campagna.
--
-- Fix: cast espliciti a text sulle colonne testuali (nome, descrizione,
-- emittente_nome), così la funzione non dipende dal tipo varchar/text delle
-- colonne. Guard di ruolo, firma, STABLE, SECURITY DEFINER e search_path
-- restano quelli di #60. CREATE OR REPLACE conserva l'ACL esistente
-- (authenticated + service_role; né PUBLIC né anon).
--
-- Le altre cinque funzioni convertite da #60 restituiscono jsonb o json con
-- RETURN (sottoquery): il cast di assegnazione le copre e non sono state
-- ricreate. Le due delete non usano RETURN QUERY e restano quelle di #60.
--
-- Verifica dopo l'applicazione:
--   supabase/scripts/20261109104140_fix_campagne_programmazione_list_return_types_check.sql
--
-- La CLI Supabase avvolge il file in una transazione: niente BEGIN interno.

CREATE OR REPLACE FUNCTION public.get_campagne_programmazione_with_counts()
 RETURNS TABLE(id uuid, nome text, descrizione text, stato text, emittente_id uuid, emittente_nome text, anno integer, created_at timestamp with time zone, updated_at timestamp with time zone, created_by uuid, processing_by uuid, processing_started_at timestamp with time zone, programmazioni_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN

  IF public.get_user_role() IS DISTINCT FROM 'admin'::public.ruolo_utente
     AND public.get_user_role() IS DISTINCT FROM 'operatore'::public.ruolo_utente THEN
    RAISE EXCEPTION 'insufficient_privilege'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    cp.id,
    cp.nome::text,
    cp.descrizione::text,
    cp.stato::text,
    cp.emittente_id,
    e.nome::text AS emittente_nome,
    cp.anno,
    cp.created_at,
    cp.updated_at,
    cp.created_by,
    cp.processing_by,
    cp.processing_started_at,
    cp.programmazioni_count
  FROM campagne_programmazione cp
  LEFT JOIN emittenti e ON e.id = cp.emittente_id
  ORDER BY cp.created_at DESC;
END;
$function$;
