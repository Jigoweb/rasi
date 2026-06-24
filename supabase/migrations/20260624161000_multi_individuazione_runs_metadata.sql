-- Support multiple sequential individuazione runs for the same programmazione.
-- Each fresh run creates a distinct campagne_individuazione row; resume remains
-- scoped to the specific run through campagne_individuazione_id.

CREATE TABLE IF NOT EXISTS public.campagne_individuazione_processed_programmazioni (
  campagne_individuazione_id uuid NOT NULL REFERENCES public.campagne_individuazione(id) ON DELETE CASCADE,
  programmazione_id uuid NOT NULL REFERENCES public.programmazioni(id) ON DELETE CASCADE,
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campagne_individuazione_id, programmazione_id)
);

ALTER TABLE public.campagne_individuazione_processed_programmazioni ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campagne_individuazione_processed_service_only"
  ON public.campagne_individuazione_processed_programmazioni;
CREATE POLICY "campagne_individuazione_processed_service_only"
  ON public.campagne_individuazione_processed_programmazioni
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_campagne_individuazione_processed_programmazione
  ON public.campagne_individuazione_processed_programmazioni (programmazione_id);

CREATE OR REPLACE FUNCTION public.get_campagna_unprocessed_programmazione_ids(
  p_campagne_programmazione_id uuid,
  p_campagne_individuazione_id uuid DEFAULT NULL::uuid,
  p_limit integer DEFAULT 500
)
RETURNS TABLE(id uuid)
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT p.id
  FROM public.programmazioni p
  WHERE p.campagna_programmazione_id = p_campagne_programmazione_id
    AND (
      (
        p_campagne_individuazione_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM public.campagne_individuazione_processed_programmazioni processed
          WHERE processed.campagne_individuazione_id = p_campagne_individuazione_id
            AND processed.programmazione_id = p.id
        )
      )
      OR (
        p_campagne_individuazione_id IS NULL
        AND (p.processato IS NULL OR p.processato = false)
      )
    )
  LIMIT GREATEST(p_limit, 1);
$function$;

CREATE OR REPLACE FUNCTION public.init_campagna_individuazione(
  p_campagne_programmazione_id uuid,
  p_nome_campagna_individuazione text DEFAULT NULL::text,
  p_descrizione text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_campagna_programmazione RECORD;
    v_campagne_individuazione_id UUID;
    v_programmazioni_totali INTEGER;
    v_soglia_titolo NUMERIC := 0.7;
BEGIN
    SELECT * INTO v_campagna_programmazione
    FROM public.campagne_programmazione
    WHERE id = p_campagne_programmazione_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Campagna programmazione non trovata');
    END IF;

    SELECT COUNT(*) INTO v_programmazioni_totali
    FROM public.programmazioni
    WHERE campagna_programmazione_id = p_campagne_programmazione_id;

    -- Legacy compatibility for existing progress widgets. The canonical resume
    -- checkpoint for new multi-run flows is the per-run table above.
    UPDATE public.programmazioni
    SET processato = false
    WHERE campagna_programmazione_id = p_campagne_programmazione_id
      AND processato = true;

    INSERT INTO public.campagne_individuazione (
        nome, descrizione, emittente_id, campagne_programmazione_id, anno,
        configurazione_matching, stato, statistiche, created_by
    ) VALUES (
        COALESCE(p_nome_campagna_individuazione, 'Individuazione - ' || v_campagna_programmazione.nome),
        COALESCE(p_descrizione, v_campagna_programmazione.descrizione, 'Individuazioni generate da campagna: ' || v_campagna_programmazione.nome),
        v_campagna_programmazione.emittente_id,
        p_campagne_programmazione_id,
        v_campagna_programmazione.anno,
        jsonb_build_object('soglia_titolo', v_soglia_titolo, 'algoritmo', 'similarity_v2', 'case_insensitive', true, 'serie_richiede_episodio', true),
        'in_corso',
        jsonb_build_object('programmazioni_totali', v_programmazioni_totali, 'programmazioni_processate', 0, 'individuazioni_create', 0, 'errore', false),
        v_campagna_programmazione.created_by
    )
    RETURNING id INTO v_campagne_individuazione_id;

    UPDATE public.campagne_programmazione
    SET updated_at = NOW()
    WHERE id = p_campagne_programmazione_id;

    RETURN jsonb_build_object(
        'success', true,
        'campagne_individuazione_id', v_campagne_individuazione_id,
        'programmazioni_totali', v_programmazioni_totali
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_programmazioni_chunk(
    p_campagne_individuazione_id uuid,
    p_programmazione_ids uuid[],
    p_soglia_titolo numeric DEFAULT 0.7,
    p_artista_ids uuid[] DEFAULT NULL::uuid[],
    p_tolleranza_anno_soft integer DEFAULT 3,
    p_tolleranza_anno_hard integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_programmazione RECORD;
    v_match RECORD;
    v_individuazioni_create INTEGER := 0;
    v_programmazioni_processate INTEGER := 0;
    v_programmazioni_con_match INTEGER := 0;
    v_match_trovati INTEGER := 0;
    v_count INTEGER;
    v_prog_id UUID;
    v_new_ind_id UUID;
BEGIN
    FOREACH v_prog_id IN ARRAY p_programmazione_ids
    LOOP
        SELECT * INTO v_programmazione
        FROM public.programmazioni
        WHERE id = v_prog_id;

        IF NOT FOUND THEN
            CONTINUE;
        END IF;

        v_programmazioni_processate := v_programmazioni_processate + 1;

        DECLARE
            v_prog_ha_match BOOLEAN := FALSE;
        BEGIN
            FOR v_match IN
                SELECT * FROM public.match_programmazione_to_partecipazioni(
                    v_programmazione.id,
                    p_soglia_titolo,
                    p_artista_ids,
                    p_tolleranza_anno_soft,
                    p_tolleranza_anno_hard
                )
            LOOP
                v_match_trovati := v_match_trovati + 1;
                v_prog_ha_match := TRUE;

                SELECT COUNT(*) INTO v_count
                FROM public.individuazioni
                WHERE campagna_individuazioni_id = p_campagne_individuazione_id
                  AND programmazione_id = v_programmazione.id
                  AND artista_id = v_match.artista_id
                  AND ruolo_id = v_match.ruolo_id
                  AND COALESCE(episodio_id, '00000000-0000-0000-0000-000000000000'::UUID) =
                      COALESCE(v_match.episodio_id, '00000000-0000-0000-0000-000000000000'::UUID);

                IF v_count = 0 THEN
                    INSERT INTO public.individuazioni (
                        campagna_individuazioni_id, programmazione_id, partecipazione_id,
                        artista_id, ruolo_id, opera_id, episodio_id, emittente_id,
                        data_trasmissione, ora_inizio, ora_fine, durata_minuti,
                        metadati_trasmissione, canale, emittente, tipo, titolo,
                        titolo_originale, numero_episodio, titolo_episodio,
                        titolo_episodio_originale, numero_stagione, anno, production,
                        regia, data_inizio, data_fine, retail_price, sales_month,
                        track_price_local_currency, views, total_net_ad_revenue,
                        total_revenue, punteggio_matching, dettagli_matching, metodo, stato
                    ) VALUES (
                        p_campagne_individuazione_id, v_programmazione.id, v_match.partecipazione_id,
                        v_match.artista_id, v_match.ruolo_id, v_match.opera_id, v_match.episodio_id,
                        v_programmazione.emittente_id, v_programmazione.data_trasmissione,
                        v_programmazione.ora_inizio, v_programmazione.ora_fine, v_programmazione.durata_minuti,
                        v_programmazione.metadati_trasmissione, v_programmazione.canale, v_programmazione.emittente,
                        v_programmazione.tipo, v_programmazione.titolo, v_programmazione.titolo_originale,
                        v_programmazione.numero_episodio, v_programmazione.titolo_episodio,
                        v_programmazione.titolo_episodio_originale, v_programmazione.numero_stagione,
                        v_programmazione.anno, v_programmazione.production, v_programmazione.regia,
                        v_programmazione.data_inizio, v_programmazione.data_fine, v_programmazione.retail_price,
                        v_programmazione.sales_month, v_programmazione.track_price_local_currency,
                        v_programmazione.views, v_programmazione.total_net_ad_revenue, v_programmazione.total_revenue,
                        v_match.punteggio, v_match.dettagli_matching, 'automatico', 'individuato'
                    )
                    RETURNING id INTO v_new_ind_id;

                    IF COALESCE((v_match.dettagli_matching->>'episodio_mancante')::boolean, FALSE) THEN
                        UPDATE public.individuazioni SET stato = 'dubbioso' WHERE id = v_new_ind_id;
                    END IF;

                    v_individuazioni_create := v_individuazioni_create + 1;
                END IF;
            END LOOP;

            IF v_prog_ha_match THEN
                v_programmazioni_con_match := v_programmazioni_con_match + 1;
            END IF;
        END;

        INSERT INTO public.campagne_individuazione_processed_programmazioni (
            campagne_individuazione_id, programmazione_id
        )
        VALUES (p_campagne_individuazione_id, v_prog_id)
        ON CONFLICT (campagne_individuazione_id, programmazione_id)
        DO UPDATE SET processed_at = EXCLUDED.processed_at;

        UPDATE public.programmazioni SET processato = true WHERE id = v_prog_id;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'programmazioni_processate', v_programmazioni_processate,
        'programmazioni_con_match', v_programmazioni_con_match,
        'individuazioni_create', v_individuazioni_create,
        'match_trovati', v_match_trovati
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'programmazioni_processate', v_programmazioni_processate,
            'individuazioni_create', v_individuazioni_create
        );
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_campagna_individuazione_safe(
  p_campagna_individuazione_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_campagna record;
  v_deleted_individuazioni integer := 0;
  v_remaining integer := 0;
  v_lock_is_stale boolean := false;
BEGIN
  SELECT
    ci.id,
    ci.campagne_programmazione_id,
    ci.stato AS stato_individuazione,
    cp.processing_by,
    cp.processing_started_at
  INTO v_campagna
  FROM public.campagne_individuazione ci
  JOIN public.campagne_programmazione cp ON cp.id = ci.campagne_programmazione_id
  WHERE ci.id = p_campagna_individuazione_id
  FOR UPDATE OF ci, cp;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campagna individuazione non trovata');
  END IF;

  v_lock_is_stale := v_campagna.processing_started_at IS NOT NULL
    AND v_campagna.processing_started_at < now() - interval '2 hours';

  IF v_campagna.processing_by IS NOT NULL
     AND NOT v_lock_is_stale
     AND v_campagna.stato_individuazione = 'in_corso' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Impossibile eliminare una campagna in elaborazione'
    );
  END IF;

  DELETE FROM public.individuazioni
  WHERE campagna_individuazioni_id = p_campagna_individuazione_id;
  GET DIAGNOSTICS v_deleted_individuazioni = ROW_COUNT;

  DELETE FROM public.campagne_individuazione_processed_programmazioni
  WHERE campagne_individuazione_id = p_campagna_individuazione_id;

  DELETE FROM public.campagne_individuazione
  WHERE id = p_campagna_individuazione_id;

  SELECT COUNT(*) INTO v_remaining
  FROM public.campagne_individuazione
  WHERE campagne_programmazione_id = v_campagna.campagne_programmazione_id;

  IF v_remaining = 0 THEN
    UPDATE public.programmazioni
    SET processato = false
    WHERE campagna_programmazione_id = v_campagna.campagne_programmazione_id
      AND processato = true;

    UPDATE public.campagne_programmazione
    SET stato = 'in_review'::public.stato_campagna,
        is_individuated = false,
        processing_by = NULL,
        processing_started_at = NULL,
        updated_at = now()
    WHERE id = v_campagna.campagne_programmazione_id;
  ELSE
    UPDATE public.campagne_programmazione
    SET updated_at = now()
    WHERE id = v_campagna.campagne_programmazione_id;
  END IF;

  UPDATE public.campaign_jobs
  SET stato = 'cancelled',
      fase = 'cancelled',
      error = 'Campagna individuazione eliminata',
      updated_at = now()
  WHERE campagne_individuazione_id = p_campagna_individuazione_id
    AND stato IN ('queued', 'running', 'error');

  RETURN jsonb_build_object(
    'success', true,
    'deleted_individuazioni', v_deleted_individuazioni,
    'campagne_programmazione_id', v_campagna.campagne_programmazione_id,
    'remaining_campagne_individuazione', v_remaining
  );
END;
$function$;
