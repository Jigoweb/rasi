-- The list RPC omitted `anno`, so the Programmazioni UI always showed an empty
-- year column and the year filter only offered "Tutti gli anni".
-- Postgres cannot change RETURNS TABLE via CREATE OR REPLACE: drop then recreate.

DROP FUNCTION IF EXISTS public.get_campagne_programmazione_with_counts();

CREATE FUNCTION public.get_campagne_programmazione_with_counts()
RETURNS TABLE(
  id uuid,
  nome text,
  descrizione text,
  stato text,
  emittente_id uuid,
  emittente_nome text,
  anno integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_by uuid,
  processing_by uuid,
  processing_started_at timestamp with time zone,
  programmazioni_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION public.get_campagne_programmazione_with_counts() TO anon;
GRANT EXECUTE ON FUNCTION public.get_campagne_programmazione_with_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_campagne_programmazione_with_counts() TO service_role;
