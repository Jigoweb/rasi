-- =====================================================
-- FUNZIONI DI MATCHING INDIVIDUAZIONI
-- Allineate al DB reale (2026-03-26)
--
-- Aggiornamento: discriminanti REGIA e ANNO
-- per ridurre falsi positivi da omonimia titoli
-- =====================================================

-- Drop entrambe le overload (se esistono)
DROP FUNCTION IF EXISTS match_programmazione_to_partecipazioni(uuid, numeric);
DROP FUNCTION IF EXISTS match_programmazione_to_partecipazioni(uuid, numeric, uuid[]);

-- =====================================================
-- OVERLOAD 1: Senza filtro artisti (legacy compatibility)
-- Delega alla overload 2 con p_artista_ids = NULL
-- =====================================================
CREATE OR REPLACE FUNCTION match_programmazione_to_partecipazioni(
    p_programmazione_id UUID,
    p_soglia_titolo NUMERIC DEFAULT 0.7
)
RETURNS TABLE (
    partecipazione_id UUID,
    opera_id UUID,
    episodio_id UUID,
    artista_id UUID,
    ruolo_id UUID,
    punteggio NUMERIC,
    dettagli_matching JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM match_programmazione_to_partecipazioni(
        p_programmazione_id, p_soglia_titolo, NULL::UUID[]
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- OVERLOAD 2: Con filtro artisti + discriminanti regia/anno
--
-- SCORING (max 100 punti):
--   Titolo:           50 punti base (similarity * 50)
--   Titolo originale: 10 punti bonus
--   Anno:             15 punti (discriminante con penalità)
--   Regia:            10 punti (discriminante con penalità)
--   Episodio:         15 punti (per serie TV)
--
-- DISCRIMINANTE ANNO (quando entrambi presenti):
--   esatto:    +15 punti
--   ±1 anno:   +10.5 punti
--   ±2 anni:   +4.5 punti
--   >2 anni:   -19.5 punti (PENALITÀ)
--
-- DISCRIMINANTE REGIA (quando entrambi presenti):
--   Match (similarity >= 0.7): +10 punti
--   Parziale (>= 0.4):        +5 punti
--   No match:                  -15 punti (PENALITÀ)
--
-- SOGLIA MINIMA FINALE: 35 punti
-- =====================================================
CREATE OR REPLACE FUNCTION match_programmazione_to_partecipazioni(
    p_programmazione_id UUID,
    p_soglia_titolo NUMERIC DEFAULT 0.7,
    p_artista_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
    partecipazione_id UUID,
    opera_id UUID,
    episodio_id UUID,
    artista_id UUID,
    ruolo_id UUID,
    punteggio NUMERIC,
    dettagli_matching JSONB
) AS $$
DECLARE
    v_prog RECORD;
    v_is_serie BOOLEAN;
    v_opera RECORD;
    v_episodio RECORD;
    v_partecipazione RECORD;
    v_score_titolo NUMERIC;
    v_score_titolo_orig NUMERIC;
    v_score_anno NUMERIC;
    v_score_regia NUMERIC;
    v_score_episodio NUMERIC;
    v_score_totale NUMERIC;
    v_dettagli JSONB;
    v_episodio_trovato BOOLEAN;
    v_best_episodio_id UUID;
    v_best_episodio_score NUMERIC;
    v_regia_best_score NUMERIC;
    v_regia_match_name TEXT;
BEGIN
    -- Set similarity threshold for index usage
    PERFORM set_limit(p_soglia_titolo - 0.1);

    -- Carica programmazione
    SELECT * INTO v_prog
    FROM programmazioni
    WHERE id = p_programmazione_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Programmazione non trovata: %', p_programmazione_id;
    END IF;

    -- Determina se è una serie basandosi sui campi episodio
    v_is_serie := (
        v_prog.numero_episodio IS NOT NULL OR
        v_prog.numero_stagione IS NOT NULL OR
        v_prog.titolo_episodio IS NOT NULL OR
        v_prog.titolo_episodio_originale IS NOT NULL
    );

    -- OTTIMIZZATO: Cerca solo opere con titolo simile usando l'indice trigram
    FOR v_opera IN
        SELECT
            o.id,
            o.titolo,
            o.titolo_originale,
            o.anno_produzione,
            o.tipo,
            o.alias_titoli,
            o.regista,
            GREATEST(
                similarity(LOWER(v_prog.titolo), LOWER(o.titolo)),
                COALESCE(similarity(LOWER(v_prog.titolo), LOWER(o.titolo_originale)), 0)
            ) as best_score
        FROM opere o
        WHERE o.titolo IS NOT NULL
          AND v_prog.titolo IS NOT NULL
          AND (
              -- Usa operatore % che sfrutta l'indice GIN trigram
              LOWER(o.titolo) % LOWER(v_prog.titolo)
              OR (o.titolo_originale IS NOT NULL AND LOWER(o.titolo_originale) % LOWER(v_prog.titolo))
          )
        ORDER BY best_score DESC
        LIMIT 50
    LOOP
        -- Reset scores
        v_score_titolo := v_opera.best_score;
        v_score_titolo_orig := 0;
        v_score_anno := 0;
        v_score_regia := 0;
        v_score_episodio := 0;
        v_dettagli := '{}'::JSONB;
        v_episodio_trovato := FALSE;
        v_best_episodio_id := NULL;
        v_best_episodio_score := 0;
        v_regia_best_score := 0;
        v_regia_match_name := NULL;

        -- Prova con alias_titoli se presenti
        IF v_opera.alias_titoli IS NOT NULL AND array_length(v_opera.alias_titoli, 1) > 0 THEN
            DECLARE
                v_alias TEXT;
            BEGIN
                FOREACH v_alias IN ARRAY v_opera.alias_titoli
                LOOP
                    IF v_alias IS NOT NULL THEN
                        v_score_titolo := GREATEST(
                            v_score_titolo,
                            similarity(LOWER(v_prog.titolo), LOWER(v_alias))
                        );
                    END IF;
                END LOOP;
            END;
        END IF;

        -- Se titolo non matcha abbastanza, salta
        IF v_score_titolo < p_soglia_titolo THEN
            CONTINUE;
        END IF;

        v_dettagli := jsonb_set(v_dettagli, '{titolo}', jsonb_build_object(
            'score', ROUND(v_score_titolo * 100, 2),
            'programmazione', v_prog.titolo,
            'opera', v_opera.titolo
        ));

        -- 2. BONUS: Match titolo_originale
        IF v_prog.titolo_originale IS NOT NULL AND v_opera.titolo_originale IS NOT NULL THEN
            v_score_titolo_orig := similarity(
                LOWER(v_prog.titolo_originale),
                LOWER(v_opera.titolo_originale)
            );
            v_dettagli := jsonb_set(v_dettagli, '{titolo_originale}', jsonb_build_object(
                'score', ROUND(v_score_titolo_orig * 100, 2),
                'programmazione', v_prog.titolo_originale,
                'opera', v_opera.titolo_originale
            ));
        END IF;

        -- =====================================================
        -- 3. DISCRIMINANTE ANNO
        -- Quando entrambi presenti:
        --   esatto:    +1.0 (= +15 punti)
        --   ±1 anno:   +0.7 (= +10.5 punti)
        --   ±2 anni:   +0.3 (= +4.5 punti)
        --   >2 anni:   -1.3 (= -19.5 punti PENALITÀ)
        -- Quando uno mancante: 0 (neutro)
        -- =====================================================
        IF v_prog.anno IS NOT NULL AND v_opera.anno_produzione IS NOT NULL THEN
            IF v_prog.anno = v_opera.anno_produzione THEN
                v_score_anno := 1.0;
            ELSIF ABS(v_prog.anno - v_opera.anno_produzione) <= 1 THEN
                v_score_anno := 0.7;
            ELSIF ABS(v_prog.anno - v_opera.anno_produzione) <= 2 THEN
                v_score_anno := 0.3;
            ELSE
                -- PENALITÀ: anno diverge significativamente
                v_score_anno := -1.3;
            END IF;
            v_dettagli := jsonb_set(v_dettagli, '{anno}', jsonb_build_object(
                'score', ROUND(v_score_anno * 15, 2),
                'programmazione', v_prog.anno,
                'opera', v_opera.anno_produzione,
                'differenza', ABS(v_prog.anno - v_opera.anno_produzione),
                'penalita', v_score_anno < 0
            ));
        END IF;

        -- =====================================================
        -- 4. DISCRIMINANTE REGIA
        -- programmazioni.regia = TEXT singolo (es. "HILL WALTER")
        -- opere.regista = VARCHAR[] array (es. ["Walter Hill"])
        -- Confronto fuzzy: prog.regia vs ogni elemento di opera.regista
        -- Match (similarity >= 0.7): +1.0 (= +10 punti)
        -- Parziale (>= 0.4):        +0.5 (= +5 punti)
        -- No match:                  -1.5 (= -15 punti PENALITÀ)
        -- Uno mancante:              0 (neutro)
        -- =====================================================
        IF v_prog.regia IS NOT NULL AND LENGTH(TRIM(v_prog.regia)) > 0
           AND v_opera.regista IS NOT NULL AND array_length(v_opera.regista, 1) > 0 THEN
            DECLARE
                v_reg TEXT;
                v_sim NUMERIC;
            BEGIN
                FOREACH v_reg IN ARRAY v_opera.regista
                LOOP
                    IF v_reg IS NOT NULL AND LENGTH(TRIM(v_reg)) > 0 THEN
                        v_sim := similarity(LOWER(TRIM(v_prog.regia)), LOWER(TRIM(v_reg)));
                        IF v_sim > v_regia_best_score THEN
                            v_regia_best_score := v_sim;
                            v_regia_match_name := v_reg;
                        END IF;
                    END IF;
                END LOOP;
            END;

            IF v_regia_best_score >= 0.7 THEN
                v_score_regia := 1.0;
            ELSIF v_regia_best_score >= 0.4 THEN
                v_score_regia := 0.5;
            ELSE
                -- PENALITÀ: regia presente in entrambi ma non corrisponde
                v_score_regia := -1.5;
            END IF;

            v_dettagli := jsonb_set(v_dettagli, '{regia}', jsonb_build_object(
                'score', ROUND(v_score_regia * 10, 2),
                'programmazione', v_prog.regia,
                'opera_registi', to_jsonb(v_opera.regista),
                'best_match', v_regia_match_name,
                'best_similarity', ROUND(v_regia_best_score * 100, 2),
                'penalita', v_score_regia < 0
            ));
        END IF;

        -- 5. PER SERIE TV: Match episodio
        IF v_is_serie THEN
            FOR v_episodio IN
                SELECT
                    e.id,
                    e.numero_stagione,
                    e.numero_episodio,
                    e.titolo_episodio
                FROM episodi e
                WHERE e.opera_id = v_opera.id
            LOOP
                DECLARE
                    v_ep_score NUMERIC := 0;
                    v_match_found BOOLEAN := FALSE;
                BEGIN
                    IF v_prog.numero_stagione IS NOT NULL AND v_prog.numero_episodio IS NOT NULL THEN
                        IF v_episodio.numero_stagione = v_prog.numero_stagione
                           AND v_episodio.numero_episodio = v_prog.numero_episodio THEN
                            v_ep_score := 1.0;
                            v_match_found := TRUE;
                        END IF;
                    END IF;

                    IF NOT v_match_found AND v_prog.numero_episodio IS NOT NULL
                       AND (v_prog.numero_stagione IS NULL OR v_prog.numero_stagione = 0) THEN
                        IF v_episodio.numero_episodio = v_prog.numero_episodio THEN
                            v_ep_score := GREATEST(v_ep_score, 0.8);
                            v_match_found := TRUE;
                        END IF;
                    END IF;

                    IF NOT v_match_found AND v_prog.titolo_episodio IS NOT NULL
                       AND v_episodio.titolo_episodio IS NOT NULL THEN
                        DECLARE
                            v_ep_title_score NUMERIC;
                        BEGIN
                            v_ep_title_score := similarity(
                                LOWER(v_prog.titolo_episodio),
                                LOWER(v_episodio.titolo_episodio)
                            );
                            IF v_ep_title_score >= 0.6 THEN
                                v_ep_score := GREATEST(v_ep_score, v_ep_title_score);
                                v_match_found := TRUE;
                            END IF;
                        END;
                    END IF;

                    IF NOT v_match_found AND v_prog.titolo_episodio_originale IS NOT NULL
                       AND v_episodio.titolo_episodio IS NOT NULL THEN
                        DECLARE
                            v_ep_title_orig_score NUMERIC;
                        BEGIN
                            v_ep_title_orig_score := similarity(
                                LOWER(v_prog.titolo_episodio_originale),
                                LOWER(v_episodio.titolo_episodio)
                            );
                            IF v_ep_title_orig_score >= 0.6 THEN
                                v_ep_score := GREATEST(v_ep_score, v_ep_title_orig_score);
                                v_match_found := TRUE;
                            END IF;
                        END;
                    END IF;

                    IF v_ep_score > v_best_episodio_score THEN
                        v_best_episodio_score := v_ep_score;
                        v_best_episodio_id := v_episodio.id;
                        v_episodio_trovato := TRUE;
                    END IF;
                END;
            END LOOP;

            IF NOT v_episodio_trovato THEN
                CONTINUE;
            END IF;

            v_score_episodio := v_best_episodio_score;
            v_dettagli := jsonb_set(v_dettagli, '{episodio}', jsonb_build_object(
                'score', ROUND(v_score_episodio * 100, 2),
                'episodio_id', v_best_episodio_id,
                'prog_stagione', v_prog.numero_stagione,
                'prog_episodio', v_prog.numero_episodio,
                'prog_titolo_ep', v_prog.titolo_episodio
            ));
        END IF;

        -- =====================================================
        -- CALCOLO PUNTEGGIO TOTALE (0-100)
        -- =====================================================
        v_score_totale := (v_score_titolo * 50);

        IF v_score_titolo_orig > 0 THEN
            v_score_totale := v_score_totale + (v_score_titolo_orig * 10);
        END IF;

        -- Anno: può essere positivo (bonus) o negativo (penalità)
        v_score_totale := v_score_totale + (v_score_anno * 15);

        -- Regia: può essere positivo (bonus) o negativo (penalità)
        v_score_totale := v_score_totale + (v_score_regia * 10);

        IF v_is_serie AND v_score_episodio > 0 THEN
            v_score_totale := v_score_totale + (v_score_episodio * 15);
        END IF;

        -- Floor a 0 (non può essere negativo)
        v_score_totale := GREATEST(v_score_totale, 0);

        v_dettagli := jsonb_set(v_dettagli, '{totale}', jsonb_build_object(
            'score', ROUND(v_score_totale, 2),
            'is_serie', v_is_serie,
            'episodio_trovato', v_episodio_trovato,
            'has_anno_penalita', v_score_anno < 0,
            'has_regia_penalita', v_score_regia < 0
        ));

        -- Soglia minima: score deve essere almeno 35 (= ~70% del solo titolo)
        -- Esclude match dove titolo matcha ma anno+regia penalizzano pesantemente
        IF v_score_totale < 35 THEN
            CONTINUE;
        END IF;

        -- Trova partecipazioni
        FOR v_partecipazione IN
            SELECT
                p.id as partecipazione_id,
                p.artista_id,
                p.ruolo_id,
                p.opera_id,
                p.episodio_id
            FROM partecipazioni p
            WHERE p.opera_id = v_opera.id
              AND (
                  (NOT v_is_serie AND (p.episodio_id IS NULL OR p.episodio_id = v_best_episodio_id))
                  OR (v_is_serie AND p.episodio_id = v_best_episodio_id)
                  OR (v_is_serie AND p.episodio_id IS NULL)
              )
              AND (p_artista_ids IS NULL OR p.artista_id = ANY(p_artista_ids))
        LOOP
            RETURN QUERY SELECT
                v_partecipazione.partecipazione_id,
                v_opera.id,
                COALESCE(v_best_episodio_id, v_partecipazione.episodio_id),
                v_partecipazione.artista_id,
                v_partecipazione.ruolo_id,
                ROUND(v_score_totale, 2)::NUMERIC,
                v_dettagli;
        END LOOP;

    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql STABLE;
