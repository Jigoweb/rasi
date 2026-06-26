-- Adds a lightweight, per-row fallback for historical programmazioni imported
-- before episode normalization existed. The helper is immutable and does not
-- scan tables: match_programmazione_to_partecipazioni invokes it only for the
-- current programmazione row.

CREATE OR REPLACE FUNCTION public.derive_programmazione_episode_signals(
    p_numero_stagione integer,
    p_numero_episodio integer,
    p_titolo text,
    p_titolo_originale text,
    p_titolo_episodio text,
    p_titolo_episodio_originale text
)
RETURNS TABLE (
    numero_stagione integer,
    numero_episodio integer,
    titolo_episodio text,
    confidence text,
    warnings text[]
) AS $$
DECLARE
    v_text text;
    v_match text[];
    v_inferred_season integer;
    v_packed_season integer;
    v_packed_episode integer;
    v_title_season integer;
BEGIN
    numero_stagione := NULLIF(p_numero_stagione, 0);
    numero_episodio := CASE
        WHEN p_numero_episodio IS NOT NULL AND p_numero_episodio BETWEEN 1 AND 200 THEN p_numero_episodio
        ELSE NULL
    END;
    titolo_episodio := NULLIF(trim(COALESCE(p_titolo_episodio, '')), '');
    confidence := 'none';
    warnings := ARRAY[]::text[];

    v_text := trim(concat_ws(' ', p_titolo, p_titolo_originale, p_titolo_episodio, p_titolo_episodio_originale));

    IF v_text ~* '\y(episodes?|episodi?|eps?)\.?\s*[0-9]{1,3}\s*[-/]\s*[0-9]{1,3}\y'
       OR v_text ~* '\ys[0-9]{1,2}\s*e[0-9]{1,3}\s*[-/]\s*e?[0-9]{1,3}\y' THEN
        confidence := 'review_required';
        warnings := array_append(warnings, 'episode_range_requires_review');
        numero_stagione := NULL;
        numero_episodio := NULL;
        RETURN NEXT;
        RETURN;
    END IF;

    IF p_numero_episodio BETWEEN 1001 AND 9999 THEN
        v_packed_season := floor(p_numero_episodio / 1000)::integer;
        v_packed_episode := p_numero_episodio % 1000;
        IF v_packed_season BETWEEN 1 AND 50 AND v_packed_episode BETWEEN 1 AND 200 THEN
            v_match := regexp_match(COALESCE(p_titolo, ''), '\y(?:season|stagione)\s*([0-9]{1,2})\y', 'i');
            IF v_match IS NOT NULL THEN
                v_title_season := v_match[1]::integer;
            ELSIF p_titolo IS NOT NULL AND p_titolo_originale IS NOT NULL THEN
                v_match := regexp_match(p_titolo, '^' || regexp_replace(trim(p_titolo_originale), '([\\.\+\*\?\[\^\]\$\(\)\{\}=!<>\|:\-])', '\\\1', 'g') || '\s+([0-9]{1,2})$', 'i');
                IF v_match IS NOT NULL THEN
                    v_title_season := v_match[1]::integer;
                END IF;
            END IF;

            IF v_title_season IS NOT NULL AND v_title_season <> v_packed_season THEN
                warnings := array_append(warnings, 'episode_season_mismatch');
                confidence := 'review_required';
            ELSE
                numero_stagione := COALESCE(numero_stagione, v_packed_season);
                numero_episodio := v_packed_episode;
                warnings := array_append(warnings, 'episode_packed_number_detected');
                confidence := 'high';
            END IF;
        END IF;
    END IF;

    IF p_numero_episodio IS NOT NULL
       AND p_numero_episodio > 200
       AND confidence = 'none' THEN
        warnings := array_append(warnings, 'episode_compound_number_requires_review');
        confidence := 'review_required';
        numero_episodio := NULL;
    END IF;

    IF confidence <> 'review_required' THEN
        v_match := regexp_match(v_text, '\ys(?:t)?\.?\s*([0-9]{1,2})\s*e(?:p(?:isode)?)?\.?\s*([0-9]{1,3})\y', 'i');
        IF v_match IS NULL THEN
            v_match := regexp_match(v_text, '\y([0-9]{1,2})\s*x\s*([0-9]{1,3})\y', 'i');
        END IF;
        IF v_match IS NULL THEN
            v_match := regexp_match(v_text, '\y(?:season|stagione|t)\s*([0-9]{1,2})\D{0,20}(?:episode|episodio|ep|e)\.?\s*([0-9]{1,3})\y', 'i');
        END IF;

        IF v_match IS NOT NULL THEN
            v_inferred_season := v_match[1]::integer;
            IF v_inferred_season BETWEEN 1 AND 50 AND v_match[2]::integer BETWEEN 1 AND 200 THEN
                numero_stagione := COALESCE(numero_stagione, v_inferred_season);
                IF numero_episodio IS NULL OR numero_episodio >= 1001 THEN
                    numero_episodio := v_match[2]::integer;
                END IF;
                confidence := 'high';
            END IF;
        ELSIF numero_episodio IS NULL THEN
            v_match := regexp_match(v_text, '\y(?:episode|episodio|ep)\.?\s*([0-9]{1,3})\y', 'i');
            IF v_match IS NOT NULL AND v_match[1]::integer BETWEEN 1 AND 200 THEN
                numero_episodio := v_match[1]::integer;
                confidence := 'medium';
            END IF;
        END IF;
    END IF;

    IF titolo_episodio IS NULL AND p_titolo_episodio_originale IS NOT NULL THEN
        v_match := regexp_match(p_titolo_episodio_originale, '["“”]([^"“”]+)["“”]', 'i');
        IF v_match IS NOT NULL THEN
            titolo_episodio := initcap(trim(v_match[1]));
            warnings := array_append(warnings, 'episode_title_embedded_detected');
            IF confidence = 'none' THEN
                confidence := 'medium';
            END IF;
        END IF;
    END IF;

    IF confidence = 'none' THEN
        IF numero_stagione IS NOT NULL AND numero_episodio IS NOT NULL THEN
            confidence := 'high';
        ELSIF numero_episodio IS NOT NULL OR titolo_episodio IS NOT NULL THEN
            confidence := 'medium';
        END IF;
    END IF;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.derive_programmazione_episode_signals(integer, integer, text, text, text, text)
IS 'Derives season, episode and episode title signals from one programmazione row for import/matching fallback.';

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
    v_titolo_match TEXT;
    v_titolo_orig_match TEXT;
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
    v_episodio_mancante BOOLEAN;
    v_peso_massimo NUMERIC;
    v_soglia_adattata NUMERIC;
    v_skip_opera BOOLEAN;
    v_episode_signal RECORD;
    c_series_suffix CONSTANT TEXT :=
        '\s*:\s*(SEASON|PARTE|PART|VOLUME|VOL|CHAPTER|LIMITED\s+SERIES|COLLECTION|STAGIONE)\y.*$';
BEGIN
    PERFORM set_limit(p_soglia_titolo - 0.1);

    SELECT * INTO v_prog
    FROM programmazioni
    WHERE id = p_programmazione_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Programmazione non trovata: %', p_programmazione_id;
    END IF;

    v_titolo_match := NULLIF(trim(regexp_replace(COALESCE(v_prog.titolo, ''), c_series_suffix, '', 'i')), '');
    IF v_titolo_match IS NULL THEN
        v_titolo_match := v_prog.titolo;
    END IF;
    v_titolo_orig_match := NULLIF(trim(regexp_replace(COALESCE(v_prog.titolo_originale, ''), c_series_suffix, '', 'i')), '');

    SELECT * INTO v_episode_signal
    FROM public.derive_programmazione_episode_signals(
        v_prog.numero_stagione,
        v_prog.numero_episodio,
        v_prog.titolo,
        v_prog.titolo_originale,
        v_prog.titolo_episodio,
        v_prog.titolo_episodio_originale
    );

    IF v_episode_signal.confidence = 'high' THEN
        v_prog.numero_stagione := COALESCE(v_prog.numero_stagione, v_episode_signal.numero_stagione);
        IF v_episode_signal.numero_episodio IS NOT NULL THEN
            v_prog.numero_episodio := v_episode_signal.numero_episodio;
        END IF;
        v_prog.titolo_episodio := COALESCE(v_prog.titolo_episodio, v_episode_signal.titolo_episodio);
    END IF;

    v_is_serie := (
        v_prog.numero_episodio IS NOT NULL OR
        v_prog.numero_stagione IS NOT NULL OR
        v_prog.titolo_episodio IS NOT NULL OR
        v_prog.titolo_episodio_originale IS NOT NULL
    );

    v_has_episode_data := (
        v_prog.numero_episodio IS NOT NULL OR
        v_prog.titolo_episodio IS NOT NULL OR
        v_prog.titolo_episodio_originale IS NOT NULL
    );

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

        IF v_score_titolo < p_soglia_titolo THEN
            CONTINUE;
        END IF;

        v_dettagli := jsonb_set(v_dettagli, '{titolo}', jsonb_build_object(
            'score', ROUND(v_score_titolo * 100, 2),
            'programmazione', v_prog.titolo,
            'programmazione_match', v_titolo_match,
            'opera', v_opera.titolo
        ));

        IF v_episode_signal.confidence <> 'none' THEN
            v_dettagli := jsonb_set(v_dettagli, '{episode_normalization_fallback}', jsonb_build_object(
                'confidence', v_episode_signal.confidence,
                'numero_stagione', v_episode_signal.numero_stagione,
                'numero_episodio', v_episode_signal.numero_episodio,
                'titolo_episodio', v_episode_signal.titolo_episodio,
                'warnings', to_jsonb(v_episode_signal.warnings)
            ));
        END IF;

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
                IF v_has_episode_data THEN
                    v_episodio_mancante := TRUE;
                END IF;
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

        v_score_totale := (v_score_titolo * 50);

        IF v_score_titolo_orig > 0 THEN
            v_score_totale := v_score_totale + (v_score_titolo_orig * 10);
        END IF;

        v_score_totale := v_score_totale + (v_score_anno * 15);
        v_score_totale := v_score_totale + (v_score_regia * 10);

        IF v_episodio_applicato AND v_score_episodio > 0 THEN
            v_score_totale := v_score_totale + (v_score_episodio * 15);
        END IF;

        v_score_totale := GREATEST(v_score_totale, 0);

        v_peso_massimo := 50;
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
        v_dettagli := jsonb_set(v_dettagli, '{episodio_mancante}', to_jsonb(COALESCE(v_episodio_mancante, FALSE)));

        IF v_score_totale < v_soglia_adattata THEN
            CONTINUE;
        END IF;

        IF v_episodio_mancante THEN
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
                    NULL::UUID,
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
