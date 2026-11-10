-- Rollback di 20261109104140_fix_campagne_programmazione_list_return_types.sql.
-- NON è una migration: non sta in supabase/migrations e non parte da solo.
--
-- Eseguirlo a mano, in un'unica transazione (il BEGIN/COMMIT qui sotto).
-- Ripristina il corpo #60 di get_campagne_programmazione_with_counts(),
-- quello con cp.nome senza cast (character varying contro OUT text).
-- Le altre sette funzioni staff non sono state modificate: qui non si toccano.
-- I GRANT non cambiano: CREATE OR REPLACE li conserva.

BEGIN;

DO $rollback_preflight$
BEGIN
  IF to_regprocedure('public.get_campagne_programmazione_with_counts()') IS NULL THEN
    RAISE EXCEPTION 'firma assente, rollback annullato: get_campagne_programmazione_with_counts()';
  END IF;
END
$rollback_preflight$;

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
    cp.nome,
    cp.descrizione,
    cp.stato::text,
    cp.emittente_id,
    e.nome AS emittente_nome,
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

COMMIT;
