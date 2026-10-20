-- Delete a campagne_programmazione through a bounded server-side path.
-- Direct client deletes rely on ON DELETE CASCADE from programmazioni and fire
-- trg_programmazioni_count once per row, repeatedly updating the same parent
-- campaign. Large campaigns can exceed the PostgREST statement timeout.

CREATE OR REPLACE FUNCTION public.trg_sync_programmazioni_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF current_setting('rasi.skip_programmazioni_count_trigger', true) = 'on' THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    UPDATE public.campagne_programmazione
    SET    programmazioni_count = programmazioni_count + 1
    WHERE  id = NEW.campagna_programmazione_id;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.campagne_programmazione
    SET    programmazioni_count = GREATEST(programmazioni_count - 1, 0)
    WHERE  id = OLD.campagna_programmazione_id;

  ELSIF TG_OP = 'UPDATE'
    AND OLD.campagna_programmazione_id IS DISTINCT FROM NEW.campagna_programmazione_id THEN
    UPDATE public.campagne_programmazione
    SET    programmazioni_count = GREATEST(programmazioni_count - 1, 0)
    WHERE  id = OLD.campagna_programmazione_id;
    UPDATE public.campagne_programmazione
    SET    programmazioni_count = programmazioni_count + 1
    WHERE  id = NEW.campagna_programmazione_id;
  END IF;

  RETURN NULL;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.trg_sync_programmazioni_count() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_sync_programmazioni_count() FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_campagna_programmazione_safe(
  p_campagna_programmazione_id uuid,
  p_user_id uuid,
  p_stale_after_minutes integer DEFAULT 120
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_campagna record;
  v_lock_is_stale boolean := false;
  v_individuazione_runs integer := 0;
  v_individuazioni integer := 0;
  v_first_individuazione_nome text;
  v_deleted_programmazioni integer := 0;
  v_deleted_campaign_jobs integer := 0;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Utente non autenticato',
      'error_code', 'AUTH_REQUIRED'
    );
  END IF;

  SELECT
    id,
    nome,
    processing_by,
    processing_started_at
  INTO v_campagna
  FROM public.campagne_programmazione
  WHERE id = p_campagna_programmazione_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Campagna programmazione non trovata',
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

  SELECT
    COUNT(*)::integer,
    MIN(nome)
  INTO v_individuazione_runs, v_first_individuazione_nome
  FROM public.campagne_individuazione
  WHERE campagne_programmazione_id = p_campagna_programmazione_id;

  IF v_individuazione_runs > 0 THEN
    SELECT COUNT(*)::integer
    INTO v_individuazioni
    FROM public.individuazioni i
    JOIN public.campagne_individuazione ci
      ON ci.id = i.campagna_individuazioni_id
    WHERE ci.campagne_programmazione_id = p_campagna_programmazione_id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Esiste una campagna di individuazione collegata. Devi prima eliminarla dalla pagina Individuazioni.',
      'error_code', 'HAS_INDIVIDUAZIONE',
      'campagna_individuazione_nome', v_first_individuazione_nome,
      'individuazione_runs', v_individuazione_runs,
      'individuazioni_count', v_individuazioni
    );
  END IF;

  DELETE FROM public.campaign_jobs
  WHERE campagne_programmazione_id = p_campagna_programmazione_id;
  GET DIAGNOSTICS v_deleted_campaign_jobs = ROW_COUNT;

  PERFORM set_config('rasi.skip_programmazioni_count_trigger', 'on', true);

  DELETE FROM public.programmazioni
  WHERE campagna_programmazione_id = p_campagna_programmazione_id;
  GET DIAGNOSTICS v_deleted_programmazioni = ROW_COUNT;

  PERFORM set_config('rasi.skip_programmazioni_count_trigger', 'off', true);

  DELETE FROM public.campagne_programmazione
  WHERE id = p_campagna_programmazione_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_programmazioni', v_deleted_programmazioni,
    'deleted_campaign_jobs', v_deleted_campaign_jobs
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.delete_campagna_programmazione_safe(uuid, uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_campagna_programmazione_safe(uuid, uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_campagna_programmazione_safe(uuid, uuid, integer) TO authenticated, service_role;
