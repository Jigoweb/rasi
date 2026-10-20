-- artista_id autoritativo in raw_app_meta_data.artista_id (server-only).
--
-- user_metadata.artista_id (raw_user_meta_data) è scrivibile dal client con
-- auth.updateUser({ data }) e non è più letto per autorizzare.
-- Nessun fallback: se app_metadata.artista_id manca o non è un UUID,
-- get_user_artista_id() restituisce NULL e le policy artista non mostrano righe.
--
-- Prima di questa migration il proprietario elimina da Auth l'artista non
-- collegato 2caf7dfe-9801-4416-867e-f5f284987a58. Stato atteso, dopo quella
-- cancellazione e prima della scrittura:
--   * esattamente 2 utenti con app_metadata.ruolo = 'artista'
--   * entrambi con user_metadata.artista_id che punta a una riga artisti
--     (oppure, riesecuzione, app_metadata.artista_id già uguale e valido)
--   * 0 artisti senza artista_id
--   * nessun utente non-artista con artista_id in user_metadata o app_metadata
-- Altrimenti RAISE EXCEPTION e nessuna scrittura.
--
-- Idempotente: se app_metadata.artista_id è già uguale alla fonte, non si
-- riscrive. Poi si toglie artista_id da raw_user_meta_data (la copia resta
-- solo nel rollback). Una seconda esecuzione trova i due artisti già
-- collegati in app_metadata e non fallisce.
--
-- jsonb_set aggiunge solo la chiave artista_id: ruolo e provider restano.
--
-- Dry-run: supabase/scripts/artista_id_app_metadata_report.sql
-- Isolamento: supabase/scripts/artista_id_isolation_test.sql
-- Rollback: supabase/rollback/20261020212235_artista_id_app_metadata.sql
--
-- Unica transazione (il runner Supabase avvolge il file; da psql usare -1).
-- Ordine: asserzione, backfill, strip, funzione, policy.

DO $artista_id_before$
DECLARE
  v_artista integer;
  v_link_ok integer;
  v_without integer;
  v_bad integer;
  v_non_artista integer;
  v_app_set integer;
BEGIN
  WITH base AS (
    SELECT
      COALESCE(u.raw_app_meta_data ->> 'ruolo', '') AS ruolo,
      NULLIF(u.raw_user_meta_data ->> 'artista_id', '') AS user_aid,
      NULLIF(u.raw_app_meta_data ->> 'artista_id', '') AS app_aid
    FROM auth.users u
  ),
  flags AS (
    SELECT
      ruolo,
      user_aid,
      app_aid,
      CASE
        WHEN user_aid ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN EXISTS (
            SELECT 1 FROM public.artisti a WHERE a.id = user_aid::uuid
          )
        ELSE false
      END AS user_ok,
      CASE
        WHEN app_aid ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN EXISTS (
            SELECT 1 FROM public.artisti a WHERE a.id = app_aid::uuid
          )
        ELSE false
      END AS app_ok
    FROM base
  )
  SELECT
    COUNT(*) FILTER (WHERE ruolo = 'artista'),
    COUNT(*) FILTER (
      WHERE ruolo = 'artista'
        AND (
          (user_ok AND (app_aid IS NULL OR (app_ok AND lower(app_aid) = lower(user_aid))))
          OR (app_ok AND (user_aid IS NULL OR (user_ok AND lower(app_aid) = lower(user_aid))))
        )
    ),
    COUNT(*) FILTER (WHERE ruolo = 'artista' AND NOT user_ok AND NOT app_ok),
    COUNT(*) FILTER (
      WHERE ruolo = 'artista'
        AND (
          (user_aid IS NOT NULL AND NOT user_ok)
          OR (app_aid IS NOT NULL AND NOT app_ok)
          OR (
            user_aid IS NOT NULL
            AND app_aid IS NOT NULL
            AND lower(user_aid) IS DISTINCT FROM lower(app_aid)
          )
        )
    ),
    COUNT(*) FILTER (
      WHERE ruolo <> 'artista'
        AND (user_aid IS NOT NULL OR app_aid IS NOT NULL)
    ),
    COUNT(*) FILTER (WHERE ruolo = 'artista' AND app_ok)
  INTO v_artista, v_link_ok, v_without, v_bad, v_non_artista, v_app_set
  FROM flags;

  RAISE NOTICE
    'artista_id_app_metadata BEFORE artista=% link_ok=% senza_id=% bad=% non_artista_con_id=% app_gia_valido=%',
    v_artista, v_link_ok, v_without, v_bad, v_non_artista, v_app_set;

  IF v_artista <> 2
     OR v_link_ok <> 2
     OR v_without <> 0
     OR v_bad <> 0
     OR v_non_artista <> 0 THEN
    RAISE EXCEPTION
      'artista_id backfill aborted: attesi esattamente 2 utenti con app_metadata.ruolo=artista, entrambi con user_metadata.artista_id valido (riga artisti) oppure app_metadata.artista_id gia uguale e valido, 0 artisti senza artista_id, nessun non-artista con artista_id. Trovati artista=% link_ok=% senza_id=% bad=% non_artista_con_id=%. Se l''utente 2caf7dfe-9801-4416-867e-f5f284987a58 e ancora presente, eliminarlo da Auth prima di riprovare. Report: supabase/scripts/artista_id_app_metadata_report.sql',
      v_artista, v_link_ok, v_without, v_bad, v_non_artista;
  END IF;
END
$artista_id_before$;

-- No-op quando app_metadata.artista_id e gia valorizzato (uguale alla fonte:
-- lo stato e stato asserito sopra). Non tocca la chiave ruolo.
UPDATE auth.users u
SET raw_app_meta_data = jsonb_set(
      COALESCE(u.raw_app_meta_data, '{}'::jsonb),
      '{artista_id}',
      to_jsonb(u.raw_user_meta_data ->> 'artista_id'),
      true
    )
WHERE u.raw_app_meta_data ->> 'ruolo' = 'artista'
  AND NULLIF(u.raw_app_meta_data ->> 'artista_id', '') IS NULL
  AND NULLIF(u.raw_user_meta_data ->> 'artista_id', '') IS NOT NULL
  AND CASE
        WHEN (u.raw_user_meta_data ->> 'artista_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN EXISTS (
            SELECT 1
            FROM public.artisti a
            WHERE a.id = (u.raw_user_meta_data ->> 'artista_id')::uuid
          )
        ELSE false
      END;

-- La copia storica non resta leggibile. Il valore vive solo in app_metadata
-- (e nel file di rollback, che lo ricopia in user_metadata).
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'artista_id'
WHERE raw_app_meta_data ->> 'ruolo' = 'artista'
  AND raw_user_meta_data ? 'artista_id';

DO $artista_id_after$
DECLARE
  v_artista integer;
  v_app_ok integer;
  v_user_left integer;
  v_without integer;
  v_non_artista integer;
BEGIN
  WITH base AS (
    SELECT
      COALESCE(u.raw_app_meta_data ->> 'ruolo', '') AS ruolo,
      NULLIF(u.raw_user_meta_data ->> 'artista_id', '') AS user_aid,
      NULLIF(u.raw_app_meta_data ->> 'artista_id', '') AS app_aid
    FROM auth.users u
  ),
  flags AS (
    SELECT
      ruolo,
      user_aid,
      app_aid,
      CASE
        WHEN app_aid ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN EXISTS (SELECT 1 FROM public.artisti a WHERE a.id = app_aid::uuid)
        ELSE false
      END AS app_ok
    FROM base
  )
  SELECT
    COUNT(*) FILTER (WHERE ruolo = 'artista'),
    COUNT(*) FILTER (WHERE ruolo = 'artista' AND app_ok),
    COUNT(*) FILTER (WHERE ruolo = 'artista' AND user_aid IS NOT NULL),
    COUNT(*) FILTER (WHERE ruolo = 'artista' AND NOT app_ok),
    COUNT(*) FILTER (
      WHERE ruolo <> 'artista'
        AND (user_aid IS NOT NULL OR app_aid IS NOT NULL)
    )
  INTO v_artista, v_app_ok, v_user_left, v_without, v_non_artista
  FROM flags;

  RAISE NOTICE
    'artista_id_app_metadata AFTER artista=% app_valido=% user_metadata_residuo=% senza_id=% non_artista_con_id=%',
    v_artista, v_app_ok, v_user_left, v_without, v_non_artista;

  IF v_artista <> 2
     OR v_app_ok <> 2
     OR v_user_left <> 0
     OR v_without <> 0
     OR v_non_artista <> 0 THEN
    RAISE EXCEPTION
      'artista_id backfill incomplete: artista=% app_valido=% user_metadata_residuo=% senza_id=% non_artista_con_id=%',
      v_artista, v_app_ok, v_user_left, v_without, v_non_artista;
  END IF;
END
$artista_id_after$;

CREATE OR REPLACE FUNCTION public.get_user_artista_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id text;
BEGIN
  SELECT NULLIF(u.raw_app_meta_data ->> 'artista_id', '')
    INTO v_id
  FROM auth.users u
  WHERE u.id = auth.uid();

  IF v_id IS NULL
     OR v_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;

  RETURN v_id::uuid;
END;
$$;

ALTER FUNCTION public.get_user_artista_id() SET search_path = public;

COMMENT ON FUNCTION public.get_user_artista_id() IS
  'Artista autoritativo da auth.users.raw_app_meta_data.artista_id. Nessun fallback su raw_user_meta_data. Valore assente o non UUID: NULL (fail-closed).';

-- Le policy continuano a chiamare get_user_artista_id().
-- artisti e ripartizioni: stesso predicato di produzione (la fonte e la funzione).
-- partecipazioni e individuazioni: il ramo "validato pubblico" non si applica
-- piu a ruolo=artista, altrimenti un artista vedrebbe le righe validate
-- dell'altro anche con artista_id corretto in app_metadata.
-- Il nome policy sulle ripartizioni in produzione e ripartizioni_dettaglio_select_policy.

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
      get_user_role() IS DISTINCT FROM 'artista'::public.ruolo_utente
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
      get_user_role() IS DISTINCT FROM 'artista'::public.ruolo_utente
      AND stato = ANY (ARRAY['validato'::public.stato_individuazione, 'individuato'::public.stato_individuazione])
      AND EXISTS (
        SELECT 1 FROM public.opere o
        WHERE o.id = individuazioni.opera_id
          AND o.stato_validazione = 'validato'::public.stato_validazione
      )
    )
  );

DO $ripartizioni_policy$
BEGIN
  IF to_regclass('public.ripartizioni') IS NULL THEN
    RAISE EXCEPTION 'public.ripartizioni assente: policy artista non aggiornata';
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
$ripartizioni_policy$;

DO $artista_id_guard$
DECLARE
  v_hit text;
BEGIN
  SELECT string_agg(format('%s.%s', n.nspname, p.proname), ', ' ORDER BY n.nspname, p.proname)
    INTO v_hit
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND p.prosrc ~* 'raw_user_meta_data\s*->>\s*''artista_id''';

  IF v_hit IS NOT NULL THEN
    RAISE EXCEPTION 'funzioni che leggono ancora raw_user_meta_data.artista_id: %', v_hit;
  END IF;

  SELECT string_agg(format('%s.%s', schemaname, policyname), ', ' ORDER BY schemaname, policyname)
    INTO v_hit
  FROM pg_policies
  WHERE schemaname IN ('public', 'storage')
    AND (COALESCE(qual, '') || COALESCE(with_check, '')) ~* 'raw_user_meta_data|user_metadata'
    AND (COALESCE(qual, '') || COALESCE(with_check, '')) ~* 'artista_id';

  IF v_hit IS NOT NULL THEN
    RAISE EXCEPTION 'policy che leggono ancora user_metadata.artista_id: %', v_hit;
  END IF;

  SELECT string_agg(format('%s.%s', schemaname, viewname), ', ' ORDER BY schemaname, viewname)
    INTO v_hit
  FROM pg_views
  WHERE schemaname = 'public'
    AND definition ~* 'raw_user_meta_data'
    AND definition ~* 'artista_id';

  IF v_hit IS NOT NULL THEN
    RAISE EXCEPTION 'view che leggono ancora user_metadata.artista_id: %', v_hit;
  END IF;
END
$artista_id_guard$;
