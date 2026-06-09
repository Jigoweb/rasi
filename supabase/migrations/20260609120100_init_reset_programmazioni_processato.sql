-- Resume support: a fresh init now resets processato=false for the campaign's
-- programmazioni, so a normal (re)run reprocesses everything (get-batch-ids
-- filters processato=false). The dedicated resume path (/api/campagne-individuazione/resume)
-- bypasses init and does NOT reset, so it continues from where a crashed run stopped.
-- Based on the current init definition; only addition is the reset UPDATE.
CREATE OR REPLACE FUNCTION public.init_campagna_individuazione(p_campagne_programmazione_id uuid, p_nome_campagna_individuazione text DEFAULT NULL::text, p_descrizione text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_campagna_programmazione RECORD;
    v_campagne_individuazione_id UUID;
    v_programmazioni_totali INTEGER;
    v_existing_individuazioni INTEGER;
    v_soglia_titolo NUMERIC := 0.7;
BEGIN
    SELECT * INTO v_campagna_programmazione
    FROM campagne_programmazione
    WHERE id = p_campagne_programmazione_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Campagna programmazione non trovata');
    END IF;

    SELECT COUNT(*) INTO v_programmazioni_totali
    FROM programmazioni
    WHERE campagna_programmazione_id = p_campagne_programmazione_id;

    -- Fresh run: azzera il checkpoint di resume così TUTTE le programmazioni
    -- vengono riprocessate (get-batch-ids filtra processato=false).
    UPDATE programmazioni
    SET processato = false
    WHERE campagna_programmazione_id = p_campagne_programmazione_id
      AND processato = true;

    SELECT id INTO v_campagne_individuazione_id
    FROM campagne_individuazione
    WHERE campagne_programmazione_id = p_campagne_programmazione_id
    LIMIT 1;

    IF v_campagne_individuazione_id IS NULL THEN
        INSERT INTO campagne_individuazione (
            nome, descrizione, emittente_id, campagne_programmazione_id, anno,
            configurazione_matching, stato, statistiche
        ) VALUES (
            COALESCE(p_nome_campagna_individuazione, 'Individuazione - ' || v_campagna_programmazione.nome),
            COALESCE(p_descrizione, v_campagna_programmazione.descrizione, 'Individuazioni generate da campagna: ' || v_campagna_programmazione.nome),
            v_campagna_programmazione.emittente_id,
            p_campagne_programmazione_id,
            v_campagna_programmazione.anno,
            jsonb_build_object('soglia_titolo', v_soglia_titolo, 'algoritmo', 'similarity_v2', 'case_insensitive', true, 'serie_richiede_episodio', true),
            'in_corso',
            jsonb_build_object('programmazioni_totali', v_programmazioni_totali, 'programmazioni_processate', 0, 'individuazioni_create', 0, 'errore', false)
        )
        RETURNING id INTO v_campagne_individuazione_id;
    ELSE
        SELECT COUNT(*) INTO v_existing_individuazioni
        FROM individuazioni
        WHERE campagna_individuazioni_id = v_campagne_individuazione_id;

        IF v_existing_individuazioni > 10000 THEN
            UPDATE campagne_individuazione
            SET stato = 'in_corso',
                statistiche = jsonb_build_object('programmazioni_totali', v_programmazioni_totali, 'programmazioni_processate', 0, 'individuazioni_create', v_existing_individuazioni, 'riprocessamento', true, 'errore', false),
                updated_at = NOW()
            WHERE id = v_campagne_individuazione_id;
        ELSE
            UPDATE campagne_individuazione
            SET stato = 'in_corso',
                statistiche = jsonb_build_object('programmazioni_totali', v_programmazioni_totali, 'programmazioni_processate', 0, 'individuazioni_create', 0, 'errore', false),
                updated_at = NOW()
            WHERE id = v_campagne_individuazione_id;

            DELETE FROM individuazioni WHERE campagna_individuazioni_id = v_campagne_individuazione_id;
        END IF;
    END IF;

    UPDATE campagne_programmazione
    SET stato = 'in_corso', updated_at = NOW()
    WHERE id = p_campagne_programmazione_id;

    RETURN jsonb_build_object(
        'success', true,
        'campagne_individuazione_id', v_campagne_individuazione_id,
        'programmazioni_totali', v_programmazioni_totali
    );
END;
$function$;
