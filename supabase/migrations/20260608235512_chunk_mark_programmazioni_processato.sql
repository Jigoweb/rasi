-- Resume support: process_programmazioni_chunk now marks each handled
-- programmazione as processato=true. This makes get_processing_progress's
-- "programmazioni_processate" accurate (was always 0) AND lets get-batch-ids
-- skip already-processed rows on resume. Based on the current 6-arg definition
-- (preserves the series-level 'dubbioso' review routing). Only addition:
-- the `UPDATE programmazioni SET processato = true` line near the loop end.
CREATE OR REPLACE FUNCTION public.process_programmazioni_chunk(p_campagne_individuazione_id uuid, p_programmazione_ids uuid[], p_soglia_titolo numeric DEFAULT 0.7, p_artista_ids uuid[] DEFAULT NULL::uuid[], p_tolleranza_anno_soft integer DEFAULT 3, p_tolleranza_anno_hard integer DEFAULT 5)
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
        FROM programmazioni
        WHERE id = v_prog_id;

        IF NOT FOUND THEN
            CONTINUE;
        END IF;

        v_programmazioni_processate := v_programmazioni_processate + 1;

        DECLARE
            v_prog_ha_match BOOLEAN := FALSE;
        BEGIN
            FOR v_match IN
                SELECT * FROM match_programmazione_to_partecipazioni(
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
                FROM individuazioni
                WHERE programmazione_id = v_programmazione.id
                  AND artista_id = v_match.artista_id
                  AND ruolo_id = v_match.ruolo_id
                  AND COALESCE(episodio_id, '00000000-0000-0000-0000-000000000000'::UUID) =
                      COALESCE(v_match.episodio_id, '00000000-0000-0000-0000-000000000000'::UUID);

                IF v_count = 0 THEN
                    INSERT INTO individuazioni (
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

                    -- Match a livello serie senza episodio puntuale → coda di revisione.
                    IF COALESCE((v_match.dettagli_matching->>'episodio_mancante')::boolean, FALSE) THEN
                        UPDATE individuazioni SET stato = 'dubbioso' WHERE id = v_new_ind_id;
                    END IF;

                    v_individuazioni_create := v_individuazioni_create + 1;
                END IF;
            END LOOP;

            IF v_prog_ha_match THEN
                v_programmazioni_con_match := v_programmazioni_con_match + 1;
            END IF;
        END;

        -- Resume checkpoint: segna la programmazione come processata (match o no).
        UPDATE programmazioni SET processato = true WHERE id = v_prog_id;
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
