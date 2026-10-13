-- Selezione a cursore dei lotti di individuazione per il worker.
--
-- get_campagna_unprocessed_programmazione_ids ripartiva ogni volta dall'inizio
-- della campagna e scartava le righe già elaborate: il costo di ogni lotto
-- cresceva con l'avanzamento e, a freddo, superava lo statement_timeout di 8s
-- (es. "Riprendi" su IRIS 2024 con 84k righe già fatte).
--
-- Qui ogni chiamata legge al massimo p_scan_limit righe dopo p_after_id
-- (ordine per id) e restituisce:
--   ids            le prime p_limit righe non ancora elaborate in questo run;
--   next_after_id  il cursore da passare alla chiamata successiva (ultima riga
--                  consumata), NULL quando la campagna è esaurita.
-- Una finestra di sole righe già elaborate (ripresa) restituisce ids vuoti ma
-- fa avanzare il cursore, quindi il costo per chiamata resta limitato.
--
-- La funzione legacy resta invariata per la route serverless di fallback.

CREATE OR REPLACE FUNCTION public.get_campagna_programmazioni_batch(
  p_campagne_programmazione_id uuid,
  p_campagne_individuazione_id uuid,
  p_after_id uuid DEFAULT NULL::uuid,
  p_limit integer DEFAULT 50,
  p_scan_limit integer DEFAULT 1000
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  WITH scanned AS (
    SELECT
      p.id,
      CASE
        WHEN p_campagne_individuazione_id IS NULL THEN COALESCE(p.processato, false)
        ELSE EXISTS (
          SELECT 1
          FROM public.campagne_individuazione_processed_programmazioni processed
          WHERE processed.campagne_individuazione_id = p_campagne_individuazione_id
            AND processed.programmazione_id = p.id
        )
      END AS gia_elaborata
    FROM public.programmazioni p
    WHERE p.campagna_programmazione_id = p_campagne_programmazione_id
      AND p.id > COALESCE(p_after_id, '00000000-0000-0000-0000-000000000000'::uuid)
    ORDER BY p.id
    LIMIT GREATEST(p_scan_limit, 1)
  ),
  ranked AS (
    SELECT
      id,
      gia_elaborata,
      COUNT(*) FILTER (WHERE NOT gia_elaborata) OVER (ORDER BY id) AS da_elaborare_rank
    FROM scanned
  ),
  consumed AS (
    -- Le righe già elaborate dopo l'ultima restituita hanno lo stesso rank e
    -- vengono consumate: saltarle è corretto, non vanno rielaborate.
    SELECT id, gia_elaborata
    FROM ranked
    WHERE da_elaborare_rank <= GREATEST(p_limit, 1)
  )
  SELECT jsonb_build_object(
    'ids', COALESCE(jsonb_agg(id ORDER BY id) FILTER (WHERE NOT gia_elaborata), '[]'::jsonb),
    'next_after_id', (array_agg(id ORDER BY id DESC))[1],
    'scanned', COUNT(*)
  )
  FROM consumed;
$function$;

COMMENT ON FUNCTION public.get_campagna_programmazioni_batch(uuid, uuid, uuid, integer, integer) IS
  'Lotto successivo di programmazioni da individuare, a cursore per id. Usata dal worker (service_role).';

REVOKE ALL ON FUNCTION public.get_campagna_programmazioni_batch(uuid, uuid, uuid, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_campagna_programmazioni_batch(uuid, uuid, uuid, integer, integer)
  TO service_role;
