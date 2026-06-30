-- Delete a single individuazione run without resetting all programmazioni.
-- The per-run checkpoint table is the source of truth for multi-run progress;
-- rewriting programmazioni.processato for large campaigns times out and is no
-- longer needed by the worker-primary flow.

CREATE OR REPLACE FUNCTION public.delete_campagna_individuazione_safe(
  p_campagna_individuazione_id uuid,
  p_user_id uuid,
  p_stale_after_minutes integer DEFAULT 120
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_campagna record;
  v_deleted_individuazioni integer := 0;
  v_deleted_processed integer := 0;
  v_deleted_episode_alerts integer := 0;
  v_cancelled_jobs integer := 0;
  v_remaining integer := 0;
  v_lock_is_stale boolean := false;
BEGIN
  SELECT
    ci.id,
    ci.campagne_programmazione_id,
    ci.stato AS stato_individuazione,
    cp.processing_by,
    cp.processing_started_at
  INTO v_campagna
  FROM public.campagne_individuazione ci
  JOIN public.campagne_programmazione cp ON cp.id = ci.campagne_programmazione_id
  WHERE ci.id = p_campagna_individuazione_id
  FOR UPDATE OF ci, cp;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Campagna individuazione non trovata',
      'error_code', 'NOT_FOUND'
    );
  END IF;

  v_lock_is_stale := v_campagna.processing_started_at IS NOT NULL
    AND v_campagna.processing_started_at < now() - make_interval(mins => GREATEST(p_stale_after_minutes, 0));

  IF v_campagna.processing_by IS NOT NULL
     AND v_campagna.processing_by <> p_user_id
     AND NOT v_lock_is_stale THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Non puoi eliminare una campagna bloccata da un altro utente',
      'error_code', 'LOCKED_BY_OTHER'
    );
  END IF;

  DELETE FROM public.individuazioni
  WHERE campagna_individuazioni_id = p_campagna_individuazione_id;
  GET DIAGNOSTICS v_deleted_individuazioni = ROW_COUNT;

  DELETE FROM public.campagne_individuazione_processed_programmazioni
  WHERE campagne_individuazione_id = p_campagna_individuazione_id;
  GET DIAGNOSTICS v_deleted_processed = ROW_COUNT;

  DELETE FROM public.campagne_individuazione_episode_alerts
  WHERE campagne_individuazione_id = p_campagna_individuazione_id;
  GET DIAGNOSTICS v_deleted_episode_alerts = ROW_COUNT;

  UPDATE public.campaign_jobs
  SET stato = 'cancelled',
      fase = 'cancelled',
      error = 'Campagna individuazione eliminata',
      updated_at = now()
  WHERE stato IN ('queued', 'running', 'error')
    AND (
      campagne_individuazione_id = p_campagna_individuazione_id
      OR (
        campagne_individuazione_id IS NULL
        AND campagne_programmazione_id = v_campagna.campagne_programmazione_id
      )
    );
  GET DIAGNOSTICS v_cancelled_jobs = ROW_COUNT;

  DELETE FROM public.campagne_individuazione
  WHERE id = p_campagna_individuazione_id;

  SELECT COUNT(*) INTO v_remaining
  FROM public.campagne_individuazione
  WHERE campagne_programmazione_id = v_campagna.campagne_programmazione_id;

  IF v_remaining = 0 THEN
    UPDATE public.campagne_programmazione
    SET stato = 'in_review'::public.stato_campagna,
        is_individuated = false,
        processing_by = NULL,
        processing_started_at = NULL,
        updated_at = now()
    WHERE id = v_campagna.campagne_programmazione_id;
  ELSE
    UPDATE public.campagne_programmazione
    SET updated_at = now()
    WHERE id = v_campagna.campagne_programmazione_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_individuazioni', v_deleted_individuazioni,
    'deleted_processed_programmazioni', v_deleted_processed,
    'deleted_episode_alerts', v_deleted_episode_alerts,
    'cancelled_jobs', v_cancelled_jobs,
    'campagne_programmazione_id', v_campagna.campagne_programmazione_id,
    'remaining_campagne_individuazione', v_remaining
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_campagna_individuazione_safe(
  p_campagna_individuazione_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_campagna record;
  v_deleted_individuazioni integer := 0;
  v_deleted_processed integer := 0;
  v_deleted_episode_alerts integer := 0;
  v_cancelled_jobs integer := 0;
  v_remaining integer := 0;
  v_lock_is_stale boolean := false;
BEGIN
  SELECT
    ci.id,
    ci.campagne_programmazione_id,
    ci.stato AS stato_individuazione,
    cp.processing_by,
    cp.processing_started_at
  INTO v_campagna
  FROM public.campagne_individuazione ci
  JOIN public.campagne_programmazione cp ON cp.id = ci.campagne_programmazione_id
  WHERE ci.id = p_campagna_individuazione_id
  FOR UPDATE OF ci, cp;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Campagna individuazione non trovata',
      'error_code', 'NOT_FOUND'
    );
  END IF;

  v_lock_is_stale := v_campagna.processing_started_at IS NOT NULL
    AND v_campagna.processing_started_at < now() - interval '2 hours';

  IF v_campagna.processing_by IS NOT NULL
     AND NOT v_lock_is_stale
     AND v_campagna.stato_individuazione = 'in_corso' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Impossibile eliminare una campagna in elaborazione',
      'error_code', 'LOCKED'
    );
  END IF;

  DELETE FROM public.individuazioni
  WHERE campagna_individuazioni_id = p_campagna_individuazione_id;
  GET DIAGNOSTICS v_deleted_individuazioni = ROW_COUNT;

  DELETE FROM public.campagne_individuazione_processed_programmazioni
  WHERE campagne_individuazione_id = p_campagna_individuazione_id;
  GET DIAGNOSTICS v_deleted_processed = ROW_COUNT;

  DELETE FROM public.campagne_individuazione_episode_alerts
  WHERE campagne_individuazione_id = p_campagna_individuazione_id;
  GET DIAGNOSTICS v_deleted_episode_alerts = ROW_COUNT;

  UPDATE public.campaign_jobs
  SET stato = 'cancelled',
      fase = 'cancelled',
      error = 'Campagna individuazione eliminata',
      updated_at = now()
  WHERE stato IN ('queued', 'running', 'error')
    AND (
      campagne_individuazione_id = p_campagna_individuazione_id
      OR (
        campagne_individuazione_id IS NULL
        AND campagne_programmazione_id = v_campagna.campagne_programmazione_id
      )
    );
  GET DIAGNOSTICS v_cancelled_jobs = ROW_COUNT;

  DELETE FROM public.campagne_individuazione
  WHERE id = p_campagna_individuazione_id;

  SELECT COUNT(*) INTO v_remaining
  FROM public.campagne_individuazione
  WHERE campagne_programmazione_id = v_campagna.campagne_programmazione_id;

  IF v_remaining = 0 THEN
    UPDATE public.campagne_programmazione
    SET stato = 'in_review'::public.stato_campagna,
        is_individuated = false,
        processing_by = NULL,
        processing_started_at = NULL,
        updated_at = now()
    WHERE id = v_campagna.campagne_programmazione_id;
  ELSE
    UPDATE public.campagne_programmazione
    SET updated_at = now()
    WHERE id = v_campagna.campagne_programmazione_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_individuazioni', v_deleted_individuazioni,
    'deleted_processed_programmazioni', v_deleted_processed,
    'deleted_episode_alerts', v_deleted_episode_alerts,
    'cancelled_jobs', v_cancelled_jobs,
    'campagne_programmazione_id', v_campagna.campagne_programmazione_id,
    'remaining_campagne_individuazione', v_remaining
  );
END;
$function$;
