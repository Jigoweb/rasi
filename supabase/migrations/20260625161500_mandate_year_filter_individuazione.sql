-- Apply artist mandate validity as a backend matching rule for individuazione.
-- The domain decision is annual: a programmazione for year N may only match
-- artists whose mandate covers year N, unless the run explicitly overrides them.

CREATE OR REPLACE FUNCTION public.artist_mandate_covers_year(
  p_artista_id uuid,
  p_anno integer,
  p_mandato_override_artist_ids uuid[] DEFAULT NULL::uuid[]
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $function$
  SELECT
    CASE
      WHEN p_anno IS NULL THEN true
      WHEN p_mandato_override_artist_ids IS NOT NULL
        AND p_artista_id = ANY(p_mandato_override_artist_ids) THEN true
      ELSE EXISTS (
        SELECT 1
        FROM public.artisti a
        WHERE a.id = p_artista_id
          AND EXTRACT(YEAR FROM a.data_inizio_mandato)::integer <= p_anno
          AND (
            a.data_fine_mandato IS NULL
            OR EXTRACT(YEAR FROM a.data_fine_mandato)::integer >= p_anno
          )
      )
    END;
$function$;

COMMENT ON FUNCTION public.artist_mandate_covers_year(uuid, integer, uuid[])
IS 'Returns whether an artist mandate covers the annual competence year, with per-run override support.';

CREATE OR REPLACE FUNCTION public.match_programmazione_to_partecipazioni(
    p_programmazione_id uuid,
    p_soglia_titolo numeric DEFAULT 0.7,
    p_artista_ids uuid[] DEFAULT NULL::uuid[],
    p_tolleranza_anno_soft integer DEFAULT 3,
    p_tolleranza_anno_hard integer DEFAULT 5,
    p_mandato_override_artist_ids uuid[] DEFAULT NULL::uuid[]
)
RETURNS TABLE (
    partecipazione_id uuid,
    opera_id uuid,
    episodio_id uuid,
    artista_id uuid,
    ruolo_id uuid,
    punteggio numeric,
    dettagli_matching jsonb
)
LANGUAGE sql
STABLE
AS $function$
  WITH anno_competenza AS (
    SELECT COALESCE(p.anno, cp.anno) AS anno
    FROM public.programmazioni p
    LEFT JOIN public.campagne_programmazione cp
      ON cp.id = p.campagna_programmazione_id
    WHERE p.id = p_programmazione_id
  )
  SELECT
    m.partecipazione_id,
    m.opera_id,
    m.episodio_id,
    m.artista_id,
    m.ruolo_id,
    m.punteggio,
    CASE
      WHEN p_mandato_override_artist_ids IS NOT NULL
        AND m.artista_id = ANY(p_mandato_override_artist_ids)
      THEN jsonb_set(
        m.dettagli_matching,
        '{mandato}',
        jsonb_build_object(
          'anno_competenza', ac.anno,
          'override', true
        ),
        true
      )
      ELSE jsonb_set(
        m.dettagli_matching,
        '{mandato}',
        jsonb_build_object(
          'anno_competenza', ac.anno,
          'override', false
        ),
        true
      )
    END AS dettagli_matching
  FROM public.match_programmazione_to_partecipazioni(
    p_programmazione_id,
    p_soglia_titolo,
    p_artista_ids,
    p_tolleranza_anno_soft,
    p_tolleranza_anno_hard
  ) m
  CROSS JOIN anno_competenza ac
  WHERE public.artist_mandate_covers_year(
    m.artista_id,
    ac.anno,
    p_mandato_override_artist_ids
  );
$function$;

COMMENT ON FUNCTION public.match_programmazione_to_partecipazioni(uuid, numeric, uuid[], integer, integer, uuid[])
IS 'Mandate-aware overload of the individuazione matcher. Filters artist matches by annual mandate validity unless explicitly overridden for the run.';

DROP FUNCTION IF EXISTS public.init_campagna_individuazione(uuid, text, text);

CREATE OR REPLACE FUNCTION public.init_campagna_individuazione(
  p_campagne_programmazione_id uuid,
  p_nome_campagna_individuazione text DEFAULT NULL::text,
  p_descrizione text DEFAULT NULL::text,
  p_mandato_override_artist_ids uuid[] DEFAULT NULL::uuid[]
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
    -- checkpoint for new multi-run flows is the per-run table.
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
        jsonb_build_object(
          'soglia_titolo', v_soglia_titolo,
          'algoritmo', 'similarity_v2',
          'case_insensitive', true,
          'serie_richiede_episodio', true,
          'filtro_mandato', jsonb_build_object(
            'attivo', true,
            'criterio', 'anno_programmazione',
            'anno_competenza', v_campagna_programmazione.anno,
            'override_artist_ids', COALESCE(to_jsonb(p_mandato_override_artist_ids), '[]'::jsonb)
          )
        ),
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

DROP FUNCTION IF EXISTS public.process_programmazioni_chunk(uuid, uuid[], numeric, uuid[], integer, integer);

CREATE OR REPLACE FUNCTION public.process_programmazioni_chunk(
    p_campagne_individuazione_id uuid,
    p_programmazione_ids uuid[],
    p_soglia_titolo numeric DEFAULT 0.7,
    p_artista_ids uuid[] DEFAULT NULL::uuid[],
    p_tolleranza_anno_soft integer DEFAULT 3,
    p_tolleranza_anno_hard integer DEFAULT 5,
    p_mandato_override_artist_ids uuid[] DEFAULT NULL::uuid[]
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
                    p_tolleranza_anno_hard,
                    p_mandato_override_artist_ids
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
