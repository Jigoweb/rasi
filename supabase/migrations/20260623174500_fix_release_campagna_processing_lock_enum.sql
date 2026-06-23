CREATE OR REPLACE FUNCTION public.release_campagna_processing_lock(
  p_campagna_id uuid,
  p_user_id uuid,
  p_new_stato text DEFAULT 'individuata'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_current_lock RECORD;
BEGIN
    SELECT processing_by, processing_started_at
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
       AND v_current_lock.processing_by != p_user_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Non puoi rilasciare un lock che non ti appartiene',
            'error_code', 'NOT_LOCK_OWNER'
        );
    END IF;

    UPDATE public.campagne_programmazione
    SET
        processing_by = NULL,
        processing_started_at = NULL,
        stato = p_new_stato::public.stato_campagna,
        updated_at = now()
    WHERE id = p_campagna_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Lock rilasciato'
    );
EXCEPTION
    WHEN invalid_text_representation THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Stato campagna non valido',
            'error_code', 'INVALID_STATUS'
        );
END;
$function$;
