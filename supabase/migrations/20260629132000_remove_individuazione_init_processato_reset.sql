-- Avoid resetting every programmazione row when starting a fresh individuazione run.
-- Multi-run processing is scoped by campagne_individuazione_id through
-- campagne_individuazione_processed_programmazioni; rewriting processato for the
-- whole campaign is legacy behavior and times out on large already-processed runs.

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
