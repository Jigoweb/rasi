-- init_campagna_individuazione: legge il totale da
-- campagne_programmazione.programmazioni_count (mantenuto dai trigger di
-- statement su programmazioni) invece di COUNT(*) sulla tabella.
--
-- Il COUNT(*) su IRIS 2024 (89k righe) impiegava 11,8s a freddo per la bloat
-- di programmazioni e superava lo statement_timeout di 8s: il nuovo avvio
-- falliva con "canceling statement due to statement timeout". Il totale serve
-- solo a mostrare l'avanzamento; la fine del run la decide l'esaurimento dei
-- lotti. COUNT(*) resta come fallback se il contatore non è valorizzato.
--
-- Il resto del corpo è identico alla definizione in produzione.

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

    v_programmazioni_totali := v_campagna_programmazione.programmazioni_count;

    IF v_programmazioni_totali IS NULL OR v_programmazioni_totali <= 0 THEN
        SELECT COUNT(*) INTO v_programmazioni_totali
        FROM public.programmazioni
        WHERE campagna_programmazione_id = p_campagne_programmazione_id;
    END IF;

    INSERT INTO public.campagne_individuazione (
        nome, descrizione, emittente_id, campagne_programmazione_id, anno,
        configurazione_matching, stato, statistiche, created_by
    ) VALUES (
        COALESCE(p_nome_campagna_individuazione, 'Individuazione - ' || v_campagna_programmazione.nome),
        NULLIF(BTRIM(p_descrizione), ''),
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
