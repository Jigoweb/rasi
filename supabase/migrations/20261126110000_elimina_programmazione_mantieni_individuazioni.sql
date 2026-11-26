-- Eliminare una campagna di programmazione mantenendo le individuazioni.
--
-- Prima:
--   * campagne_individuazione.campagne_programmazione_id ON DELETE RESTRICT e
--     delete_campagna_programmazione_safe rispondeva HAS_INDIVIDUAZIONE: per
--     eliminare la programmazione bisognava eliminare anche le individuazioni.
--   * individuazioni.programmazione_id ON DELETE CASCADE: eliminando le righe
--     di programmazione sparivano anche le individuazioni.
--   * Su campagne grandi la DELETE unica superava lo statement_timeout di 8 s
--     (500 ripetuti su delete_campagna_programmazione_safe il 25/11/2026).
--
-- Dopo:
--   * le individuazioni restano: hanno già la loro copia di titolo, date,
--     orari, emittente, opera, artista e ruolo; perdono solo il collegamento
--     alla riga di programmazione (programmazione_id = NULL) e la campagna di
--     individuazione perde il collegamento alla campagna di programmazione.
--   * l'app elimina le programmazioni a blocchi (delete_programmazioni_batch)
--     e poi chiama delete_campagna_programmazione_safe, che non blocca più.
--   * gli alert episodi della campagna (righe di lavoro legate alle singole
--     programmazioni) continuano a essere eliminati in cascata.

-- 1) individuazioni.programmazione_id: NULL ammesso, SET NULL alla cancellazione
ALTER TABLE public.individuazioni
  ALTER COLUMN programmazione_id DROP NOT NULL;

ALTER TABLE public.individuazioni
  DROP CONSTRAINT IF EXISTS individuazioni_programmazione_id_fkey;
ALTER TABLE public.individuazioni
  ADD CONSTRAINT individuazioni_programmazione_id_fkey
  FOREIGN KEY (programmazione_id) REFERENCES public.programmazioni(id)
  ON DELETE SET NULL;

-- Il vincolo di unicità era NULLS NOT DISTINCT: con programmazione_id = NULL
-- due individuazioni dello stesso artista/ruolo/episodio nella stessa run
-- (programmazioni diverse) andrebbero in conflitto. Diventa un indice unico
-- parziale sulle sole righe ancora collegate a una programmazione. Nessuna
-- funzione usa il vincolo in ON CONFLICT (verificato su produzione).
ALTER TABLE public.individuazioni
  DROP CONSTRAINT IF EXISTS individuazioni_unique_programma_artista_ruolo;
CREATE UNIQUE INDEX IF NOT EXISTS individuazioni_unique_programma_artista_ruolo
  ON public.individuazioni (
    campagna_individuazioni_id,
    programmazione_id,
    artista_id,
    ruolo_id,
    episodio_id
  ) NULLS NOT DISTINCT
  WHERE programmazione_id IS NOT NULL;

-- 2) campagne_individuazione.campagne_programmazione_id: SET NULL
ALTER TABLE public.campagne_individuazione
  ALTER COLUMN campagne_programmazione_id DROP NOT NULL;

ALTER TABLE public.campagne_individuazione
  DROP CONSTRAINT IF EXISTS campagne_individuazione_campagne_programmazione_id_fkey;
ALTER TABLE public.campagne_individuazione
  ADD CONSTRAINT campagne_individuazione_campagne_programmazione_id_fkey
  FOREIGN KEY (campagne_programmazione_id) REFERENCES public.campagne_programmazione(id)
  ON DELETE SET NULL;

-- 3) Cancellazione a blocchi delle programmazioni di una campagna
CREATE OR REPLACE FUNCTION public.delete_programmazioni_batch(
  p_campagna_programmazione_id uuid,
  p_user_id uuid,
  p_limit integer DEFAULT 2000,
  p_stale_after_minutes integer DEFAULT 120
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_campagna record;
  v_lock_is_stale boolean := false;
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 2000), 1), 10000);
  v_deleted integer := 0;
BEGIN
  IF public.get_user_role() IS DISTINCT FROM 'admin'::public.ruolo_utente
     AND public.get_user_role() IS DISTINCT FROM 'operatore'::public.ruolo_utente THEN
    RAISE EXCEPTION 'insufficient_privilege'
      USING ERRCODE = '42501';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Utente non autenticato', 'error_code', 'AUTH_REQUIRED');
  END IF;

  SELECT id, processing_by, processing_started_at
  INTO v_campagna
  FROM public.campagne_programmazione
  WHERE id = p_campagna_programmazione_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campagna programmazione non trovata', 'error_code', 'NOT_FOUND');
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

  PERFORM set_config('rasi.skip_programmazioni_count_trigger', 'on', true);

  DELETE FROM public.programmazioni
  WHERE id IN (
    SELECT id
    FROM public.programmazioni
    WHERE campagna_programmazione_id = p_campagna_programmazione_id
    LIMIT v_limit
  );
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  PERFORM set_config('rasi.skip_programmazioni_count_trigger', 'off', true);

  UPDATE public.campagne_programmazione
  SET programmazioni_count = GREATEST(COALESCE(programmazioni_count, 0) - v_deleted, 0)
  WHERE id = p_campagna_programmazione_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted', v_deleted,
    'done', v_deleted < v_limit
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.delete_programmazioni_batch(uuid, uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_programmazioni_batch(uuid, uuid, integer, integer) TO authenticated, service_role;

-- 4) delete_campagna_programmazione_safe: niente più blocco HAS_INDIVIDUAZIONE.
--    Restituisce quante campagne/individuazioni sono state mantenute.
CREATE OR REPLACE FUNCTION public.delete_campagna_programmazione_safe(
  p_campagna_programmazione_id uuid,
  p_user_id uuid,
  p_stale_after_minutes integer DEFAULT 120
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_campagna record;
  v_lock_is_stale boolean := false;
  v_individuazione_runs integer := 0;
  v_deleted_programmazioni integer := 0;
  v_deleted_campaign_jobs integer := 0;
BEGIN
  IF public.get_user_role() IS DISTINCT FROM 'admin'::public.ruolo_utente
     AND public.get_user_role() IS DISTINCT FROM 'operatore'::public.ruolo_utente THEN
    RAISE EXCEPTION 'insufficient_privilege'
      USING ERRCODE = '42501';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Utente non autenticato', 'error_code', 'AUTH_REQUIRED');
  END IF;

  SELECT id, nome, processing_by, processing_started_at
  INTO v_campagna
  FROM public.campagne_programmazione
  WHERE id = p_campagna_programmazione_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campagna programmazione non trovata', 'error_code', 'NOT_FOUND');
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

  SELECT COUNT(*)::integer
  INTO v_individuazione_runs
  FROM public.campagne_individuazione
  WHERE campagne_programmazione_id = p_campagna_programmazione_id;

  DELETE FROM public.campaign_jobs
  WHERE campagne_programmazione_id = p_campagna_programmazione_id;
  GET DIAGNOSTICS v_deleted_campaign_jobs = ROW_COUNT;

  PERFORM set_config('rasi.skip_programmazioni_count_trigger', 'on', true);

  -- Di norma già vuota: l'app elimina prima a blocchi con delete_programmazioni_batch.
  DELETE FROM public.programmazioni
  WHERE campagna_programmazione_id = p_campagna_programmazione_id;
  GET DIAGNOSTICS v_deleted_programmazioni = ROW_COUNT;

  PERFORM set_config('rasi.skip_programmazioni_count_trigger', 'off', true);

  -- campagne_individuazione.campagne_programmazione_id -> NULL (ON DELETE SET NULL)
  DELETE FROM public.campagne_programmazione
  WHERE id = p_campagna_programmazione_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_programmazioni', v_deleted_programmazioni,
    'deleted_campaign_jobs', v_deleted_campaign_jobs,
    'individuazione_runs_mantenute', v_individuazione_runs
  );
END;
$function$;
