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
  v_campagna RECORD;
  v_deleted_individuazioni integer := 0;
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
    AND v_campagna.processing_started_at < now() - make_interval(mins => p_stale_after_minutes);

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

  UPDATE public.programmazioni
  SET processato = false
  WHERE campagna_programmazione_id = v_campagna.campagne_programmazione_id
    AND processato = true;

  DELETE FROM public.campagne_individuazione
  WHERE id = p_campagna_individuazione_id;

  UPDATE public.campagne_programmazione
  SET stato = 'in_review'::public.stato_campagna,
      is_individuated = false,
      processing_by = NULL,
      processing_started_at = NULL,
      updated_at = now()
  WHERE id = v_campagna.campagne_programmazione_id;

  UPDATE public.campaign_jobs
  SET stato = 'cancelled',
      fase = 'cancelled',
      error = 'Campagna individuazione eliminata',
      updated_at = now()
  WHERE campagne_programmazione_id = v_campagna.campagne_programmazione_id
    AND stato IN ('queued', 'running', 'error');

  RETURN jsonb_build_object(
    'success', true,
    'deleted_individuazioni', v_deleted_individuazioni,
    'campagne_programmazione_id', v_campagna.campagne_programmazione_id
  );
END;
$function$;
