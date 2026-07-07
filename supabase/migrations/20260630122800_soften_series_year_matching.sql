-- For series, do not hard-drop matches because the program year differs from
-- the parent work year. Prefer the matched episode year when available; keep
-- the parent work year as a soft fallback signal only.

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
$old$    v_diff_anno INT;
$old$,
$new$    v_diff_anno INT;
    v_anno_confronto INT;
    v_anno_match_source TEXT;
    v_best_episodio_anno INT;
$new$
  );
  IF v_updated = v_before THEN
    RAISE EXCEPTION 'Unable to add year matching declarations to match_programmazione_to_partecipazioni';
  END IF;

  v_before := v_updated;
  v_updated := replace(
    v_updated,
$old$        v_diff_anno := NULL;
$old$,
$new$        v_diff_anno := NULL;
        v_anno_confronto := NULL;
        v_anno_match_source := NULL;
        v_best_episodio_anno := NULL;
$new$
  );
  IF v_updated = v_before THEN
    RAISE EXCEPTION 'Unable to initialize year matching variables in match_programmazione_to_partecipazioni';
  END IF;

  v_before := v_updated;
  v_updated := replace(
    v_updated,
$old$        IF v_prog.anno IS NOT NULL AND v_opera.anno_produzione IS NOT NULL THEN
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
$old$,
$new$        IF v_prog.anno IS NOT NULL AND v_opera.anno_produzione IS NOT NULL THEN
            v_anno_disponibile := TRUE;
            v_anno_confronto := v_opera.anno_produzione;
            v_anno_match_source := 'opera';
            v_diff_anno := ABS(v_prog.anno - v_anno_confronto);

            IF v_diff_anno = 0 THEN
                v_score_anno := 1.0;
            ELSIF v_diff_anno <= p_tolleranza_anno_soft THEN
                v_score_anno := 0.7;
            ELSIF v_diff_anno <= p_tolleranza_anno_hard THEN
                v_score_anno := 0.3;
            ELSIF v_is_serie THEN
                v_score_anno := 0;
            ELSE
                v_skip_opera := TRUE;
            END IF;

            IF NOT v_skip_opera THEN
                v_dettagli := jsonb_set(v_dettagli, '{anno}', jsonb_build_object(
                    'score', ROUND(v_score_anno * 15, 2),
                    'programmazione', v_prog.anno,
                    'riferimento', v_anno_confronto,
                    'fonte', v_anno_match_source,
                    'opera', v_opera.anno_produzione,
                    'differenza', v_diff_anno,
                    'tolleranza_soft', p_tolleranza_anno_soft,
                    'tolleranza_hard', p_tolleranza_anno_hard,
                    'fallback_soft', v_is_serie,
                    'hard_scarto', false
                ));
            END IF;
        END IF;
$new$
  );
  IF v_updated = v_before THEN
    RAISE EXCEPTION 'Unable to replace parent-work year scoring block in match_programmazione_to_partecipazioni';
  END IF;

  v_before := v_updated;
  v_updated := replace(
    v_updated,
$old$                SELECT
                    e.id,
                    e.numero_stagione,
                    e.numero_episodio,
                    e.titolo_episodio
                FROM episodi e
$old$,
$new$                SELECT
                    e.id,
                    e.numero_stagione,
                    e.numero_episodio,
                    e.titolo_episodio,
                    EXTRACT(YEAR FROM e.data_prima_messa_in_onda)::INT AS anno_episodio
                FROM episodi e
$new$
  );
  IF v_updated = v_before THEN
    RAISE EXCEPTION 'Unable to add episode year to episode candidate select in match_programmazione_to_partecipazioni';
  END IF;

  v_before := v_updated;
  v_updated := replace(
    v_updated,
$old$                    IF v_ep_score > v_best_episodio_score THEN
                        v_best_episodio_score := v_ep_score;
                        v_best_episodio_id := v_episodio.id;
                        v_episodio_trovato := TRUE;
                    END IF;
$old$,
$new$                    IF v_ep_score > v_best_episodio_score THEN
                        v_best_episodio_score := v_ep_score;
                        v_best_episodio_id := v_episodio.id;
                        v_best_episodio_anno := v_episodio.anno_episodio;
                        v_episodio_trovato := TRUE;
                    END IF;
$new$
  );
  IF v_updated = v_before THEN
    RAISE EXCEPTION 'Unable to store best episode year in match_programmazione_to_partecipazioni';
  END IF;

  v_before := v_updated;
  v_updated := replace(
    v_updated,
$old$                v_dettagli := jsonb_set(v_dettagli, '{episodio}', jsonb_build_object(
                    'score', ROUND(v_score_episodio * 100, 2),
                    'episodio_id', v_best_episodio_id,
                    'prog_stagione', v_prog.numero_stagione,
                    'prog_episodio', v_prog.numero_episodio,
                    'prog_titolo_ep', v_prog.titolo_episodio
                ));
            END IF;
        END IF;

        v_score_totale := (v_score_titolo * 50);
$old$,
$new$                v_dettagli := jsonb_set(v_dettagli, '{episodio}', jsonb_build_object(
                    'score', ROUND(v_score_episodio * 100, 2),
                    'episodio_id', v_best_episodio_id,
                    'prog_stagione', v_prog.numero_stagione,
                    'prog_episodio', v_prog.numero_episodio,
                    'prog_titolo_ep', v_prog.titolo_episodio
                ));

                IF v_prog.anno IS NOT NULL AND v_best_episodio_anno IS NOT NULL THEN
                    v_anno_disponibile := TRUE;
                    v_anno_confronto := v_best_episodio_anno;
                    v_anno_match_source := 'episodio';
                    v_diff_anno := ABS(v_prog.anno - v_anno_confronto);

                    IF v_diff_anno = 0 THEN
                        v_score_anno := 1.0;
                    ELSIF v_diff_anno <= p_tolleranza_anno_soft THEN
                        v_score_anno := 0.7;
                    ELSIF v_diff_anno <= p_tolleranza_anno_hard THEN
                        v_score_anno := 0.3;
                    ELSE
                        v_score_anno := 0;
                    END IF;

                    v_dettagli := jsonb_set(v_dettagli, '{anno}', jsonb_build_object(
                        'score', ROUND(v_score_anno * 15, 2),
                        'programmazione', v_prog.anno,
                        'riferimento', v_anno_confronto,
                        'fonte', v_anno_match_source,
                        'opera', v_opera.anno_produzione,
                        'differenza', v_diff_anno,
                        'tolleranza_soft', p_tolleranza_anno_soft,
                        'tolleranza_hard', p_tolleranza_anno_hard,
                        'fallback_soft', false,
                        'hard_scarto', false
                    ));
                END IF;
            END IF;
        END IF;

        v_score_totale := (v_score_titolo * 50);
$new$
  );
  IF v_updated = v_before THEN
    RAISE EXCEPTION 'Unable to add episode-year scoring block in match_programmazione_to_partecipazioni';
  END IF;

  EXECUTE v_updated;
END;
$migration$;
