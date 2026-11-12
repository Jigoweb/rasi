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
$function$
