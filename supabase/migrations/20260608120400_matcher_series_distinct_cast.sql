-- Estende il match a livello serie: attribuisce il cast DISTINTO della serie (B).
--
-- Diagnosi: delle serie che fanno match-titolo, solo ~28/127 hanno il cast a livello serie
-- (partecipazioni.episodio_id IS NULL); le altre ~97/127 hanno il cast SOLO a livello
-- episodio, e la numerazione episodi non si allinea a Netflix → il fallback della
-- 20260608120200 (che attribuiva solo le partecipazioni con episodio_id IS NULL) le
-- lasciava a zero.
--
-- Il catalogo opere contiene SOLO gli artisti rappresentati (≈1-2 per opera), non il cast
-- completo: misurato ~1,4 (artista,ruolo) distinti per opera, ~9.3k voci di revisione
-- proiettate sui 75k. Niente over-attribution/esplosione.
--
-- Questa migration: per i match serie-senza-episodio (v_episodio_mancante) attribuisce il
-- cast DISTINTO della serie — un (artista, ruolo) una sola volta, con episodio_id NULL,
-- punteggio ridotto ×0.8, dettagli_matching.episodio_mancante = true (→ in_revisione a valle
-- via 20260608120300). Per tutti gli altri match il comportamento è invariato.
--
-- Sostituisce solo l'overload completo a 6 argomenti. Stato deployato noto = 20260608120200
-- (già applicata): questa è incrementale (split del solo blocco partecipazioni) e sicura.

CREATE OR REPLACE FUNCTION match_programmazione_to_partecipazioni(
    p_programmazione_id UUID,
    p_soglia_titolo NUMERIC DEFAULT 0.7,
    p_artista_ids UUID[] DEFAULT NULL,
    p_tolleranza_anno_soft INT DEFAULT 3,
    p_tolleranza_anno_hard INT DEFAULT 5
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
    v_titolo_match TEXT;        -- prog.titolo ripulito dei suffissi serie (per il match)
    v_titolo_orig_match TEXT;   -- prog.titolo_originale ripulito (per il match)
    v_is_serie BOOLEAN;
    v_has_episode_data BOOLEAN;
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
    v_diff_anno INT;
    v_anno_disponibile BOOLEAN;
    v_regia_disponibile BOOLEAN;
    v_episodio_applicato BOOLEAN;
    v_episodio_mancante BOOLEAN;   -- serie con dati episodio ma episodio non in catalogo → match a livello serie, da revisionare
    v_peso_massimo NUMERIC;
    v_soglia_adattata NUMERIC;
    v_skip_opera BOOLEAN;
    -- Suffisso strutturale Netflix/VOD da rimuovere a match-time (mirror di
    -- SERIES_PART_TRAIL in title-normalize.ts e build_match_key_strict).
    c_series_suffix CONSTANT TEXT :=
        '\s*:\s*(SEASON|PARTE|PART|VOLUME|VOL|CHAPTER|LIMITED\s+SERIES|COLLECTION|STAGIONE)\y.*$';
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

    -- Titolo "pulito" per il matching: rimuove il suffisso serie ("Show: Season N" →
    -- "Show"). Fallback all'originale se la pulizia svuota la stringa.
    v_titolo_match := NULLIF(trim(regexp_replace(COALESCE(v_prog.titolo, ''), c_series_suffix, '', 'i')), '');
    IF v_titolo_match IS NULL THEN
        v_titolo_match := v_prog.titolo;
    END IF;
    v_titolo_orig_match := NULLIF(trim(regexp_replace(COALESCE(v_prog.titolo_originale, ''), c_series_suffix, '', 'i')), '');

    -- Determina se è una serie basandosi sui campi episodio
    v_is_serie := (
        v_prog.numero_episodio IS NOT NULL OR
        v_prog.numero_stagione IS NOT NULL OR
        v_prog.titolo_episodio IS NOT NULL OR
        v_prog.titolo_episodio_originale IS NOT NULL
    );

    -- Distingue: serie con dati episodio specifici vs serie marcata solo da stagione
    v_has_episode_data := (
        v_prog.numero_episodio IS NOT NULL OR
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
                similarity(LOWER(v_titolo_match), LOWER(o.titolo)),
                COALESCE(similarity(LOWER(v_titolo_match), LOWER(o.titolo_originale)), 0),
                COALESCE(similarity(LOWER(v_titolo_orig_match), LOWER(o.titolo)), 0),
                COALESCE(similarity(LOWER(v_titolo_orig_match), LOWER(o.titolo_originale)), 0)
            ) as best_score
        FROM opere o
        WHERE o.titolo IS NOT NULL
          AND v_titolo_match IS NOT NULL
          AND (
              -- Usa operatore % che sfrutta l'indice GIN trigram (titolo pulito + titolo_originale)
              LOWER(o.titolo) % LOWER(v_titolo_match)
              OR (o.titolo_originale IS NOT NULL AND LOWER(o.titolo_originale) % LOWER(v_titolo_match))
              OR (v_titolo_orig_match IS NOT NULL AND (
                    LOWER(o.titolo) % LOWER(v_titolo_orig_match)
                    OR (o.titolo_originale IS NOT NULL AND LOWER(o.titolo_originale) % LOWER(v_titolo_orig_match))
              ))
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
        v_diff_anno := NULL;
        v_anno_disponibile := FALSE;
        v_regia_disponibile := FALSE;
        v_episodio_applicato := FALSE;
        v_episodio_mancante := FALSE;
        v_skip_opera := FALSE;

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
                            similarity(LOWER(v_titolo_match), LOWER(v_alias)),
                            COALESCE(similarity(LOWER(v_titolo_orig_match), LOWER(v_alias)), 0)
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
            'programmazione_match', v_titolo_match,
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
        -- 3. DISCRIMINANTE ANNO (parametrico)
        -- Tolleranza soft (default 3): nessuna penalità
        -- Tolleranza hard (default 5): penalità ridotta
        -- Oltre hard: scarta opera
        -- =====================================================
        IF v_prog.anno IS NOT NULL AND v_opera.anno_produzione IS NOT NULL THEN
            v_anno_disponibile := TRUE;
            v_diff_anno := ABS(v_prog.anno - v_opera.anno_produzione);

            IF v_diff_anno = 0 THEN
                v_score_anno := 1.0;
            ELSIF v_diff_anno <= p_tolleranza_anno_soft THEN
                v_score_anno := 0.7;
            ELSIF v_diff_anno <= p_tolleranza_anno_hard THEN
                v_score_anno := 0.3;
            ELSE
                -- Oltre tolleranza hard: scarta opera
                v_skip_opera := TRUE;
            END IF;

            IF NOT v_skip_opera THEN
                v_dettagli := jsonb_set(v_dettagli, '{anno}', jsonb_build_object(
                    'score', ROUND(v_score_anno * 15, 2),
                    'programmazione', v_prog.anno,
                    'opera', v_opera.anno_produzione,
                    'differenza', v_diff_anno,
                    'tolleranza_soft', p_tolleranza_anno_soft,
                    'tolleranza_hard', p_tolleranza_anno_hard
                ));
            END IF;
        END IF;

        IF v_skip_opera THEN
            CONTINUE;
        END IF;

        -- =====================================================
        -- 4. DISCRIMINANTE REGIA (null-safe)
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
            v_regia_disponibile := TRUE;
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

        -- =====================================================
        -- 5. PER SERIE TV: Match episodio
        -- Fix: serie senza dati episodio specifici NON scartata
        -- =====================================================
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

            -- RILASSATO: serie con dati episodio ma episodio non in catalogo → NON scarta.
            -- Aggancia a livello serie e marca il match come "episodio mancante", così a
            -- valle finisce in coda di revisione.
            IF NOT v_episodio_trovato THEN
                IF v_has_episode_data THEN
                    -- Caso A: prog ha dati episodio specifici ma nessun match in catalogo
                    -- → match a livello serie, da revisionare (niente scarto duro)
                    v_episodio_mancante := TRUE;
                END IF;
                -- Caso B: prog "marcata serie" solo per numero_stagione → procedi
                v_score_episodio := 0;
                v_episodio_applicato := FALSE;
            ELSE
                v_score_episodio := v_best_episodio_score;
                v_episodio_applicato := TRUE;
                v_dettagli := jsonb_set(v_dettagli, '{episodio}', jsonb_build_object(
                    'score', ROUND(v_score_episodio * 100, 2),
                    'episodio_id', v_best_episodio_id,
                    'prog_stagione', v_prog.numero_stagione,
                    'prog_episodio', v_prog.numero_episodio,
                    'prog_titolo_ep', v_prog.titolo_episodio
                ));
            END IF;
        END IF;

        -- =====================================================
        -- CALCOLO PUNTEGGIO TOTALE (0-100)
        -- =====================================================
        v_score_totale := (v_score_titolo * 50);

        IF v_score_titolo_orig > 0 THEN
            v_score_totale := v_score_totale + (v_score_titolo_orig * 10);
        END IF;

        -- Anno: positivo (bonus). Negativi non più applicati (scarto duro oltre hard)
        v_score_totale := v_score_totale + (v_score_anno * 15);

        -- Regia: positivo (bonus) o negativo (penalità no-match)
        v_score_totale := v_score_totale + (v_score_regia * 10);

        IF v_episodio_applicato AND v_score_episodio > 0 THEN
            v_score_totale := v_score_totale + (v_score_episodio * 15);
        END IF;

        -- Floor a 0
        v_score_totale := GREATEST(v_score_totale, 0);

        -- =====================================================
        -- SOGLIA ADATTIVA: 35% del peso massimo possibile, floor 25
        -- Conta solo i discriminanti effettivamente disponibili
        -- =====================================================
        v_peso_massimo := 50;  -- titolo sempre presente
        IF v_score_titolo_orig > 0 THEN
            v_peso_massimo := v_peso_massimo + 10;
        END IF;
        IF v_anno_disponibile THEN
            v_peso_massimo := v_peso_massimo + 15;
        END IF;
        IF v_regia_disponibile THEN
            v_peso_massimo := v_peso_massimo + 10;
        END IF;
        IF v_episodio_applicato THEN
            v_peso_massimo := v_peso_massimo + 15;
        END IF;

        v_soglia_adattata := GREATEST(v_peso_massimo * 0.35, 25);

        v_dettagli := jsonb_set(v_dettagli, '{totale}', jsonb_build_object(
            'score', ROUND(v_score_totale, 2),
            'peso_massimo', v_peso_massimo,
            'soglia_applicata', ROUND(v_soglia_adattata, 2),
            'is_serie', v_is_serie,
            'has_episode_data', v_has_episode_data,
            'episodio_applicato', v_episodio_applicato,
            'episodio_mancante', v_episodio_mancante,
            'anno_disponibile', v_anno_disponibile,
            'regia_disponibile', v_regia_disponibile,
            'has_regia_penalita', v_score_regia < 0
        ));
        -- Flag top-level per il routing a valle (process_programmazioni_chunk):
        -- match a livello serie senza episodio puntuale → coda di revisione.
        v_dettagli := jsonb_set(v_dettagli, '{episodio_mancante}', to_jsonb(COALESCE(v_episodio_mancante, FALSE)));

        -- Applica soglia adattiva
        IF v_score_totale < v_soglia_adattata THEN
            CONTINUE;
        END IF;

        -- Trova partecipazioni
        IF v_episodio_mancante THEN
            -- Attribuzione a LIVELLO SERIE: per le serie il cui cast in catalogo è
            -- registrato solo a livello episodio (e la numerazione non si allinea a Netflix),
            -- attribuisce il cast DISTINTO della serie — un (artista, ruolo) una sola volta,
            -- con episodio_id NULL. Il catalogo contiene solo gli artisti rappresentati,
            -- quindi è tipicamente 1-2 per opera (niente over-attribution). Va in revisione
            -- a valle (episodio_mancante=true); punteggio ridotto ×0.8.
            FOR v_partecipazione IN
                SELECT DISTINCT ON (p.artista_id, p.ruolo_id)
                    p.id AS partecipazione_id, p.artista_id, p.ruolo_id
                FROM partecipazioni p
                WHERE p.opera_id = v_opera.id
                  AND (p_artista_ids IS NULL OR p.artista_id = ANY(p_artista_ids))
                ORDER BY p.artista_id, p.ruolo_id, p.id
            LOOP
                RETURN QUERY SELECT
                    v_partecipazione.partecipazione_id,
                    v_opera.id,
                    NULL::UUID,                         -- livello serie: nessun episodio puntuale
                    v_partecipazione.artista_id,
                    v_partecipazione.ruolo_id,
                    ROUND(v_score_totale * 0.8, 2)::NUMERIC,
                    v_dettagli;
            END LOOP;
        ELSE
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
        END IF;

    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql STABLE;
