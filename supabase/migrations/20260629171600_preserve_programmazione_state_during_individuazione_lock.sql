-- Keep campagne_programmazione.stato as dataset state while individuazione jobs run.
-- The operational state is tracked by processing_by/processing_started_at,
-- campagne_individuazione and campaign_jobs.

CREATE OR REPLACE FUNCTION public.acquire_campagna_processing_lock(
  p_campagna_id uuid,
  p_user_id uuid,
  p_timeout_hours numeric DEFAULT 2
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_current_lock RECORD;
    v_timeout_threshold timestamptz;
BEGIN
    v_timeout_threshold := NOW() - (p_timeout_hours || ' hours')::interval;

    SELECT processing_by, processing_started_at, stato
    INTO v_current_lock
    FROM public.campagne_programmazione
    WHERE id = p_campagna_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Campagna non trovata',
            'error_code', 'NOT_FOUND'
        );
    END IF;

    IF v_current_lock.processing_by IS NOT NULL
       AND v_current_lock.processing_by != p_user_id
       AND v_current_lock.processing_started_at > v_timeout_threshold THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Campagna già in elaborazione da un altro utente',
            'error_code', 'LOCKED_BY_OTHER',
            'locked_by', v_current_lock.processing_by,
            'locked_since', v_current_lock.processing_started_at
        );
    END IF;

    IF v_current_lock.processing_by = p_user_id THEN
        UPDATE public.campagne_programmazione
        SET processing_started_at = NOW()
        WHERE id = p_campagna_id;

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Lock rinnovato',
            'renewed', true
        );
    END IF;

    UPDATE public.campagne_programmazione
    SET
        processing_by = p_user_id,
        processing_started_at = NOW()
    WHERE id = p_campagna_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Lock acquisito',
        'renewed', false
    );
END;
$function$;
