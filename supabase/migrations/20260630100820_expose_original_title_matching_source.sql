-- Make titolo_originale an explicit primary title-matching source.
-- Alias titles remain a traced fallback instead of being indistinguishable from
-- canonical/original-title matches in dettagli_matching.

DO $migration$
DECLARE
  v_def text;
  v_updated text;
  v_before text;
BEGIN
  SELECT pg_get_functiondef(
    'public.match_programmazione_to_partecipazioni(uuid,numeric,uuid[],integer,integer)'::regprocedure
  )
  INTO v_def;

  v_updated := v_def;

  v_before := v_updated;
  v_updated := replace(
    v_updated,
$old$    v_score_titolo NUMERIC;
$old$,
$new$    v_score_titolo NUMERIC;
    v_score_titolo_base NUMERIC;
    v_score_alias NUMERIC;
$new$
  );
  IF v_updated = v_before THEN
    RAISE EXCEPTION 'Unable to add title score declarations to match_programmazione_to_partecipazioni';
  END IF;

  v_before := v_updated;
  v_updated := replace(
    v_updated,
$old$    v_skip_opera BOOLEAN;
$old$,
$new$    v_skip_opera BOOLEAN;
    v_titolo_match_source TEXT;
    v_titolo_match_programmazione TEXT;
    v_titolo_match_opera TEXT;
$new$
  );
  IF v_updated = v_before THEN
    RAISE EXCEPTION 'Unable to add title match source declarations to match_programmazione_to_partecipazioni';
  END IF;

  v_before := v_updated;
  v_updated := replace(
    v_updated,
$old$        v_score_titolo := v_opera.best_score;
        v_score_titolo_orig := 0;
$old$,
$new$        v_score_titolo_base := v_opera.best_score;
        v_score_titolo := v_score_titolo_base;
        v_score_alias := 0;
        v_score_titolo_orig := 0;
$new$
  );
  IF v_updated = v_before THEN
    RAISE EXCEPTION 'Unable to initialize title/original-title scores in match_programmazione_to_partecipazioni';
  END IF;

  v_before := v_updated;
  v_updated := replace(
    v_updated,
$old$        v_episodio_mancante := FALSE;
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
$old$,
$new$        v_episodio_mancante := FALSE;
        v_skip_opera := FALSE;
        v_titolo_match_source := 'titolo';
        v_titolo_match_programmazione := v_titolo_match;
        v_titolo_match_opera := v_opera.titolo;

        IF v_titolo_orig_match IS NOT NULL
           AND v_opera.titolo_originale IS NOT NULL
           AND similarity(LOWER(v_titolo_orig_match), LOWER(v_opera.titolo_originale)) >= v_score_titolo_base THEN
            v_titolo_match_source := 'titolo_originale';
            v_titolo_match_programmazione := v_titolo_orig_match;
            v_titolo_match_opera := v_opera.titolo_originale;
        ELSIF v_opera.titolo_originale IS NOT NULL
              AND similarity(LOWER(v_titolo_match), LOWER(v_opera.titolo_originale)) >= v_score_titolo_base THEN
            v_titolo_match_source := 'titolo_originale_opera';
            v_titolo_match_programmazione := v_titolo_match;
            v_titolo_match_opera := v_opera.titolo_originale;
        ELSIF v_titolo_orig_match IS NOT NULL
              AND similarity(LOWER(v_titolo_orig_match), LOWER(v_opera.titolo)) >= v_score_titolo_base THEN
            v_titolo_match_source := 'titolo_originale_programmazione';
            v_titolo_match_programmazione := v_titolo_orig_match;
            v_titolo_match_opera := v_opera.titolo;
        END IF;

        IF v_opera.alias_titoli IS NOT NULL AND array_length(v_opera.alias_titoli, 1) > 0 THEN
            DECLARE
                v_alias TEXT;
                v_alias_score NUMERIC;
            BEGIN
                FOREACH v_alias IN ARRAY v_opera.alias_titoli
                LOOP
                    IF v_alias IS NOT NULL THEN
                        v_alias_score := GREATEST(
                            similarity(LOWER(v_titolo_match), LOWER(v_alias)),
                            COALESCE(similarity(LOWER(v_titolo_orig_match), LOWER(v_alias)), 0)
                        );
                        IF v_alias_score > v_score_alias THEN
                            v_score_alias := v_alias_score;
                        END IF;
                        IF v_alias_score > v_score_titolo THEN
                            v_score_titolo := v_alias_score;
                            v_titolo_match_source := 'alias_titoli';
                            v_titolo_match_opera := v_alias;
                            v_titolo_match_programmazione := CASE
                                WHEN v_titolo_orig_match IS NOT NULL
                                  AND similarity(LOWER(v_titolo_orig_match), LOWER(v_alias)) >= similarity(LOWER(v_titolo_match), LOWER(v_alias))
                                  THEN v_titolo_orig_match
                                ELSE v_titolo_match
                            END;
                        END IF;
                    END IF;
                END LOOP;
            END;
        END IF;
$new$
  );
  IF v_updated = v_before THEN
    RAISE EXCEPTION 'Unable to replace alias-title scoring block in match_programmazione_to_partecipazioni';
  END IF;

  v_before := v_updated;
  v_updated := replace(
    v_updated,
$old$        v_dettagli := jsonb_set(v_dettagli, '{titolo}', jsonb_build_object(
            'score', ROUND(v_score_titolo * 100, 2),
            'programmazione', v_prog.titolo,
            'programmazione_match', v_titolo_match,
            'opera', v_opera.titolo
        ));
$old$,
$new$        v_dettagli := jsonb_set(v_dettagli, '{titolo}', jsonb_build_object(
            'score', ROUND(v_score_titolo * 100, 2),
            'programmazione', v_prog.titolo,
            'programmazione_match', v_titolo_match,
            'opera', v_opera.titolo,
            'opera_titolo_originale', v_opera.titolo_originale,
            'match_source', v_titolo_match_source,
            'match_programmazione', v_titolo_match_programmazione,
            'match_opera', v_titolo_match_opera,
            'score_titolo_o_originale', ROUND(v_score_titolo_base * 100, 2),
            'score_alias', ROUND(v_score_alias * 100, 2)
        ));
$new$
  );
  IF v_updated = v_before THEN
    RAISE EXCEPTION 'Unable to update title matching details in match_programmazione_to_partecipazioni';
  END IF;

  EXECUTE v_updated;
END;
$migration$;
