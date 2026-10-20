-- Rollback del passaggio di artista_id a raw_app_meta_data.
-- NON è una migration: non sta in supabase/migrations e non parte da solo.
--
-- Ripristina la lettura da raw_user_meta_data SENZA perdere i collegamenti
-- fatti dopo il cutover, che vivono solo in raw_app_meta_data.
--
-- Ordine operativo:
-- 1. Eseguire QUESTO file sul database (copia app→user, poi funzione e policy).
-- 2. Subito dopo, deployare l'applicazione precedente, quella che legge e
--    scrive user_metadata.artista_id.
-- 3. Non cancellare raw_app_meta_data.artista_id: una riapplicazione della
--    migration forward tratta il valore già uguale come no-op e poi toglie
--    di nuovo la chiave da user_metadata.
--
-- Finestra: tra questo SQL e il deploy del codice vecchio non collegare o
-- scollegare artisti. Il codice nuovo scriverebbe solo app_metadata, mentre
-- get_user_artista_id() tornerebbe a leggere user_metadata.
--
-- L'utente 2caf7dfe-9801-4416-867e-f5f284987a58 non viene ricreato.
-- Non stampa email.

DO $rollback_before$
DECLARE
  v_artista integer;
  v_app integer;
  v_user integer;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE raw_app_meta_data ->> 'ruolo' = 'artista'),
    COUNT(*) FILTER (
      WHERE raw_app_meta_data ->> 'ruolo' = 'artista'
        AND NULLIF(raw_app_meta_data ->> 'artista_id', '') IS NOT NULL
    ),
    COUNT(*) FILTER (
      WHERE NULLIF(raw_user_meta_data ->> 'artista_id', '') IS NOT NULL
    )
  INTO v_artista, v_app, v_user
  FROM auth.users;

  RAISE NOTICE
    'artista_id rollback BEFORE artisti=% con_app_artista_id=% con_user_artista_id=%',
    v_artista, v_app, v_user;
END
$rollback_before$;

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{artista_id}',
      to_jsonb(raw_app_meta_data ->> 'artista_id'),
      true
    )
WHERE raw_app_meta_data ->> 'ruolo' = 'artista'
  AND NULLIF(raw_app_meta_data ->> 'artista_id', '') IS NOT NULL
  AND (raw_user_meta_data ->> 'artista_id') IS DISTINCT FROM (raw_app_meta_data ->> 'artista_id');

DO $rollback_after_copy$
DECLARE
  v_drift integer;
BEGIN
  SELECT COUNT(*) INTO v_drift
  FROM auth.users
  WHERE raw_app_meta_data ->> 'ruolo' = 'artista'
    AND NULLIF(raw_app_meta_data ->> 'artista_id', '') IS NOT NULL
    AND (raw_user_meta_data ->> 'artista_id') IS DISTINCT FROM (raw_app_meta_data ->> 'artista_id');

  IF v_drift > 0 THEN
    RAISE EXCEPTION 'rollback copy incomplete: % artisti con artista_id app/user divergente', v_drift;
  END IF;

  RAISE NOTICE 'artista_id rollback copy ok, drift=%', v_drift;
END
$rollback_after_copy$;

CREATE OR REPLACE FUNCTION public.get_user_artista_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT raw_user_meta_data ->> 'artista_id'
    FROM auth.users
    WHERE id = auth.uid()
  )::uuid;
END;
$$;

ALTER FUNCTION public.get_user_artista_id() RESET search_path;

COMMENT ON FUNCTION public.get_user_artista_id() IS
  'ROLLBACK: legge di nuovo raw_user_meta_data.artista_id. Comportamento precedente al cutover app_metadata.';

DROP POLICY IF EXISTS "artisti_select_policy" ON public.artisti;
CREATE POLICY "artisti_select_policy" ON public.artisti
  FOR SELECT
  USING (
    get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
    OR (
      get_user_role() = 'artista'::public.ruolo_utente
      AND id = get_user_artista_id()
    )
    OR (
      get_user_role() = 'readonly'::public.ruolo_utente
      AND stato = ANY (ARRAY['attivo'::public.stato_iscrizione, 'minorenne'::public.stato_iscrizione])
    )
  );

DROP POLICY IF EXISTS "artisti_update_policy" ON public.artisti;
CREATE POLICY "artisti_update_policy" ON public.artisti
  FOR UPDATE
  USING (
    get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
    OR (
      get_user_role() = 'artista'::public.ruolo_utente
      AND id = get_user_artista_id()
    )
  );

DROP POLICY IF EXISTS "partecipazioni_select_policy" ON public.partecipazioni;
CREATE POLICY "partecipazioni_select_policy" ON public.partecipazioni
  FOR SELECT
  USING (
    get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
    OR (
      get_user_role() = 'artista'::public.ruolo_utente
      AND artista_id = get_user_artista_id()
      AND (
        EXISTS (
          SELECT 1 FROM public.opere o
          WHERE o.id = partecipazioni.opera_id
            AND o.stato_validazione = 'validato'::public.stato_validazione
        )
        OR EXISTS (
          SELECT 1 FROM public.artisti a
          WHERE a.id = partecipazioni.artista_id
            AND a.stato_validazione = 'validato'::public.stato_validazione
        )
      )
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.opere o
        WHERE o.id = partecipazioni.opera_id
          AND o.stato_validazione = 'validato'::public.stato_validazione
      )
      OR EXISTS (
        SELECT 1 FROM public.artisti a
        WHERE a.id = partecipazioni.artista_id
          AND a.stato_validazione = 'validato'::public.stato_validazione
      )
    )
  );

DROP POLICY IF EXISTS "individuazioni_select_policy" ON public.individuazioni;
CREATE POLICY "individuazioni_select_policy" ON public.individuazioni
  FOR SELECT
  USING (
    get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
    OR (
      get_user_role() = 'artista'::public.ruolo_utente
      AND EXISTS (
        SELECT 1
        FROM public.partecipazioni p
        JOIN public.opere o ON o.id = p.opera_id
        WHERE p.opera_id = individuazioni.opera_id
          AND p.artista_id = get_user_artista_id()
          AND o.stato_validazione = 'validato'::public.stato_validazione
      )
    )
    OR (
      stato = ANY (ARRAY['validato'::public.stato_individuazione, 'individuato'::public.stato_individuazione])
      AND EXISTS (
        SELECT 1 FROM public.opere o
        WHERE o.id = individuazioni.opera_id
          AND o.stato_validazione = 'validato'::public.stato_validazione
      )
    )
  );

DO $rollback_ripartizioni$
BEGIN
  IF to_regclass('public.ripartizioni') IS NULL THEN
    RAISE NOTICE 'rollback: public.ripartizioni assente, policy non ripristinata';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "ripartizioni_dettaglio_select_policy" ON public.ripartizioni';
  EXECUTE 'DROP POLICY IF EXISTS "ripartizioni_select_policy" ON public.ripartizioni';
  EXECUTE $policy$
    CREATE POLICY "ripartizioni_dettaglio_select_policy" ON public.ripartizioni
      FOR SELECT
      USING (
        get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
        OR (
          get_user_role() = 'artista'::public.ruolo_utente
          AND artista_id = get_user_artista_id()
        )
      )
  $policy$;
END
$rollback_ripartizioni$;
