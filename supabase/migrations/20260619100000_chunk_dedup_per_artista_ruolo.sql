-- Dedup individuazioni PER-ARTISTA-RUOLO: una individuazione per (programmazione, artista, ruolo).
--
-- Regola di business confermata dal cliente: un artista con DUE ruoli diversi sullo stesso
-- passaggio va conteggiato UNA VOLTA PER RUOLO (non è un doppione, è voluto). La migration
-- precedente 20260608120600 aveva ristretto la chiave a (programmazione, artista), collassando
-- i ruoli distinti e cancellando il secondo credito legittimo. Diagnostica (Q2): le 587 coppie
-- "doppie" sono tutte `ruoli_nomi_diversi` e ZERO `stesso_nome_ruolo_x2` → sono crediti legittimi
-- da tenere, non doppioni da rimuovere.
--
-- Fix: la chiave di dedup torna a (programmazione_id, artista_id, ruolo_id). Stesso ruolo sullo
-- stesso passaggio → mai due righe (idempotente sui re-run del matching). Ruoli diversi → righe
-- distinte (corretto). NB: `episodio_id` NON entra nella chiave: un passaggio è una sola messa in
-- onda, quindi un solo episodio; tenerlo fuori evita doppioni se lo stesso artista+ruolo venisse
-- agganciato a due episodi sullo stesso `programmazione_id`.
--
-- NOTA — il raddoppio "tipo 2 Fast 2 Furious" (stesso artista, UN solo ruolo, contato due volte)
-- NON si risolve qui: quei casi hanno `programmazione_id` DIVERSI, cioè sono passaggi duplicati a
-- monte (import del palinsesto senza vincolo di unicità). Quella è una correzione separata
-- (idempotenza all'import + pulizia delle programmazioni duplicate).
--
-- Sostituisce l'overload completo a 6 argomenti (supersede 20260608120600).

CREATE OR REPLACE FUNCTION public.process_programmazioni_chunk(
    p_campagne_individuazione_id UUID,
    p_programmazione_ids UUID[],
    p_soglia_titolo NUMERIC DEFAULT 0.7,
    p_artista_ids UUID[] DEFAULT NULL,
    p_tolleranza_anno_soft INT DEFAULT 3,
    p_tolleranza_anno_hard INT DEFAULT 5
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
    -- Processa ogni programmazione nel chunk
    FOREACH v_prog_id IN ARRAY p_programmazione_ids
    LOOP
        -- Carica la programmazione
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
            -- Trova matching (artisti + ruoli) con tolleranza parametrica
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

                -- Verifica se individuazione già esiste per questo (programmazione, artista, ruolo).
                -- Grana PER-ARTISTA-RUOLO: un solo "utilizzo" per artista PER RUOLO per riga di
                -- palinsesto. Due ruoli distinti dello stesso artista → due righe (voluto, conferma
                -- cliente). Stesso ruolo → una sola riga, quindi i re-run del matching (processo
                -- client-side bloccato e ripreso) restano idempotenti e non creano doppioni.
                SELECT COUNT(*) INTO v_count
                FROM individuazioni
                WHERE programmazione_id = v_programmazione.id
                  AND artista_id = v_match.artista_id
                  AND ruolo_id = v_match.ruolo_id;

                IF v_count = 0 THEN
                    -- Crea individuazione con snapshot completo
                    INSERT INTO individuazioni (
                        campagna_individuazioni_id,
                        programmazione_id,
                        partecipazione_id,
                        artista_id,
                        ruolo_id,
                        opera_id,
                        episodio_id,
                        emittente_id,
                        data_trasmissione,
                        ora_inizio,
                        ora_fine,
                        durata_minuti,
                        metadati_trasmissione,
                        canale,
                        emittente,
                        tipo,
                        titolo,
                        titolo_originale,
                        numero_episodio,
                        titolo_episodio,
                        titolo_episodio_originale,
                        numero_stagione,
                        anno,
                        production,
                        regia,
                        data_inizio,
                        data_fine,
                        retail_price,
                        sales_month,
                        track_price_local_currency,
                        views,
                        total_net_ad_revenue,
                        total_revenue,
                        punteggio_matching,
                        dettagli_matching,
                        metodo,
                        stato
                    ) VALUES (
                        p_campagne_individuazione_id,
                        v_programmazione.id,
                        v_match.partecipazione_id,
                        v_match.artista_id,
                        v_match.ruolo_id,
                        v_match.opera_id,
                        v_match.episodio_id,
                        v_programmazione.emittente_id,
                        v_programmazione.data_trasmissione,
                        v_programmazione.ora_inizio,
                        v_programmazione.ora_fine,
                        v_programmazione.durata_minuti,
                        v_programmazione.metadati_trasmissione,
                        v_programmazione.canale,
                        v_programmazione.emittente,
                        v_programmazione.tipo,
                        v_programmazione.titolo,
                        v_programmazione.titolo_originale,
                        v_programmazione.numero_episodio,
                        v_programmazione.titolo_episodio,
                        v_programmazione.titolo_episodio_originale,
                        v_programmazione.numero_stagione,
                        v_programmazione.anno,
                        v_programmazione.production,
                        v_programmazione.regia,
                        v_programmazione.data_inizio,
                        v_programmazione.data_fine,
                        v_programmazione.retail_price,
                        v_programmazione.sales_month,
                        v_programmazione.track_price_local_currency,
                        v_programmazione.views,
                        v_programmazione.total_net_ad_revenue,
                        v_programmazione.total_revenue,
                        v_match.punteggio,
                        v_match.dettagli_matching,
                        'automatico',
                        'individuato'
                    )
                    RETURNING id INTO v_new_ind_id;

                    -- Match a livello serie senza episodio puntuale → coda di revisione.
                    -- L'enum stato_individuazione usa 'dubbioso' come bucket "da revisionare";
                    -- metodo resta 'automatico' (metodo_matching non ha 'suggerito').
                    IF COALESCE((v_match.dettagli_matching->>'episodio_mancante')::boolean, FALSE) THEN
                        UPDATE individuazioni
                        SET stato = 'dubbioso'
                        WHERE id = v_new_ind_id;
                    END IF;

                    v_individuazioni_create := v_individuazioni_create + 1;
                END IF;
            END LOOP;

            IF v_prog_ha_match THEN
                v_programmazioni_con_match := v_programmazioni_con_match + 1;
            END IF;
        END;
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
