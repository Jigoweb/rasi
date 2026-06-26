-- Fortify episode signal derivation for broadcaster-specific episode codes.
-- Netflix/anime rows can carry values such as 16366, 13259 or 1226 in
-- programmazioni.numero_episodio. These are not canonical episode numbers:
-- keep the original value on programmazioni, but do not expose it as a
-- normalized episode signal for matching.

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
