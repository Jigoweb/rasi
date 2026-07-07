-- Prevent episodic program rows from generating individuazioni against film
-- candidates. They should become diagnostics instead of multiplying film-level
-- partecipazioni across every episode-like programmazione.

DO $migration$
DECLARE
  v_def text;
  v_updated text;
BEGIN
  SELECT pg_get_functiondef(
    'public.match_programmazione_to_partecipazioni(uuid,numeric,uuid[],integer,integer,uuid[])'::regprocedure
  )
  INTO v_def;

  v_updated := replace(
    v_def,
$old$        WHEN r.opera_tipo = 'film'::public.tipo_opera
          AND r.has_series_title_signal
          THEN 'programmazione_episode_data_invalid'
$old$,
$new$        WHEN r.opera_tipo = 'film'::public.tipo_opera
          AND (r.has_episode_columns OR r.has_series_title_signal)
          THEN 'programmazione_episode_data_invalid'
$new$
  );

  IF v_updated = v_def THEN
    RAISE EXCEPTION 'Unable to patch film/episode guard in match_programmazione_to_partecipazioni';
  END IF;

  EXECUTE v_updated;
END;
$migration$;
