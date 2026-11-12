-- Fase 2a: restrizioni per Operatore base e Tirocinante (resoconto RASI del 26/10, C5).
-- Richiede 20261112090000_ruoli_operatore_base_tirocinante.sql (valori enum già committati).
--
-- Regole
--   Validare / svalidare un'opera (opere.stato_validazione): solo admin e operatore (pro).
--   Opere, episodi, partecipazioni (+ note) e cast esterno: admin e pro sempre;
--     operatore_base e tirocinante solo se l'opera NON è validata. Eliminare
--     un'opera: solo admin e pro. Un'opera creata da base/tirocinante nasce
--     sempre «da_validare».
--   Lettura: operatore_base legge tutto come il pro (artisti, dati riservati,
--     campagne, individuazioni, ripartizioni, dashboard) ma non scrive fuori
--     dalla sezione Opere. Il tirocinante legge solo la sezione Opere; degli
--     artisti vede solo id, nome, cognome, nome d'arte, IPN e nconst, tramite
--     artisti_cast_lookup() / cerca_artisti_per_cast().
--   Coda di approvazione delle modifiche: fase 2b, non qui.
--
-- Le policy riscritte partono dalle definizioni in produzione (lette l'11/11/2026)
-- e cambiano solo la parte sui ruoli. Le funzioni lunghe non vengono riscritte:
-- si sostituisce il solo testo del controllo di ruolo con _rasi_patch_function,
-- che fallisce se il testo atteso non c'è esattamente il numero di volte previsto.
-- Idempotente. Nessun dato modificato.

DO $preflight$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'ruolo_utente' AND e.enumlabel IN ('operatore_base', 'tirocinante')
    HAVING count(*) = 2
  ) THEN
    RAISE EXCEPTION 'valori operatore_base / tirocinante assenti: applicare prima 20261112090000_ruoli_operatore_base_tirocinante.sql';
  END IF;
  IF to_regclass('public.partecipazioni_note') IS NULL
     OR to_regprocedure('public.list_partecipazioni_opera(uuid,integer,integer,text,uuid,uuid,boolean)') IS NULL
     OR to_regprocedure('public.cast_esterno_artisti_corrispondenti(uuid,uuid[])') IS NULL THEN
    RAISE EXCEPTION 'migration del 11/11 (partecipazioni_note, list_partecipazioni_opera) assenti';
  END IF;
END
$preflight$;

-- ---------------------------------------------------------------------------
-- 1) get_user_role(): i due ruoli nuovi diventano validi
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.ruolo_utente
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ruolo text;
BEGIN
  SELECT u.raw_app_meta_data ->> 'ruolo'
    INTO v_ruolo
  FROM auth.users u
  WHERE u.id = auth.uid();

  IF v_ruolo IS NULL
     OR v_ruolo NOT IN ('admin', 'operatore', 'operatore_base', 'tirocinante', 'artista', 'readonly') THEN
    RETURN NULL;
  END IF;

  RETURN v_ruolo::public.ruolo_utente;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) Funzioni di supporto
-- ---------------------------------------------------------------------------

-- Staff con pieni poteri: admin e Operatore pro.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(public.get_user_role() = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]), false)
$$;

-- Chi legge tutta la banca dati: staff + Operatore base.
CREATE OR REPLACE FUNCTION public.is_staff_reader()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(public.get_user_role() = ANY (ARRAY[
    'admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente, 'operatore_base'::public.ruolo_utente
  ]), false)
$$;

-- Chi lavora nella sezione Opere: staff + Operatore base + Tirocinante.
CREATE OR REPLACE FUNCTION public.is_opere_editor()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(public.get_user_role() = ANY (ARRAY[
    'admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente,
    'operatore_base'::public.ruolo_utente, 'tirocinante'::public.ruolo_utente
  ]), false)
$$;

-- L'utente corrente può modificare l'opera (e i suoi episodi, cast, note)?
-- Staff sempre; base e tirocinante solo se l'opera non è validata.
CREATE OR REPLACE FUNCTION public.opera_modificabile(p_opera_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_staff() THEN true
    WHEN public.is_opere_editor() THEN EXISTS (
      SELECT 1 FROM public.opere o
      WHERE o.id = p_opera_id
        AND o.stato_validazione IS DISTINCT FROM 'validato'::public.stato_validazione
    )
    ELSE false
  END
$$;

-- Come sopra, risalendo all'opera dalla partecipazione (per partecipazioni_note).
CREATE OR REPLACE FUNCTION public.partecipazione_modificabile(p_partecipazione_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_staff() THEN true
    WHEN public.is_opere_editor() THEN EXISTS (
      SELECT 1
      FROM public.partecipazioni p
      JOIN public.opere o ON o.id = p.opera_id
      WHERE p.id = p_partecipazione_id
        AND o.stato_validazione IS DISTINCT FROM 'validato'::public.stato_validazione
    )
    ELSE false
  END
$$;

-- I tre controlli di ruolo sono SECURITY INVOKER e restituiscono sempre true/false
-- (mai NULL: un «NOT is_staff()» con ruolo nullo deve negare, non passare).
-- Restano eseguibili da anon come get_user_role(): compaiono nelle policy SELECT
-- TO public, e senza EXECUTE una query anonima su quelle tabelle darebbe errore
-- invece di zero righe. Per anon restituiscono false.
-- Le due funzioni SECURITY DEFINER sono usate solo nelle policy di scrittura.
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_staff_reader() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_opere_editor() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.opera_modificabile(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.partecipazione_modificabile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff_reader() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_opere_editor() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.opera_modificabile(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.partecipazione_modificabile(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Validazione dell'opera: solo admin e Operatore pro
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.opere_stato_validazione_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.get_user_role() IN ('operatore_base'::public.ruolo_utente, 'tirocinante'::public.ruolo_utente) THEN
    IF TG_OP = 'INSERT' THEN
      NEW.stato_validazione := 'da_validare'::public.stato_validazione;
    ELSIF NEW.stato_validazione IS DISTINCT FROM OLD.stato_validazione THEN
      RAISE EXCEPTION 'Solo un Operatore pro può validare o svalidare un''opera'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.opere_stato_validazione_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS opere_stato_validazione_guard ON public.opere;
CREATE TRIGGER opere_stato_validazione_guard
  BEFORE INSERT OR UPDATE ON public.opere
  FOR EACH ROW
  EXECUTE FUNCTION public.opere_stato_validazione_guard();

-- ---------------------------------------------------------------------------
-- 4) Scritture della sezione Opere
-- ---------------------------------------------------------------------------

-- opere
DROP POLICY IF EXISTS "opere_insert_policy" ON public.opere;
CREATE POLICY "opere_insert_policy" ON public.opere
  FOR INSERT WITH CHECK ((SELECT public.is_opere_editor()));

DROP POLICY IF EXISTS "opere_update_policy" ON public.opere;
CREATE POLICY "opere_update_policy" ON public.opere
  FOR UPDATE
  USING (public.opera_modificabile(id))
  WITH CHECK ((SELECT public.is_opere_editor()));

DROP POLICY IF EXISTS "opere_delete_policy" ON public.opere;
CREATE POLICY "opere_delete_policy" ON public.opere
  FOR DELETE USING ((SELECT public.is_staff()));

-- episodi, partecipazioni, cast_esterno: tutte hanno opera_id
DO $opere_section$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['episodi', 'partecipazioni', 'cast_esterno'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert_policy', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (public.opera_modificabile(opera_id))',
      t || '_insert_policy', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update_policy', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE USING (public.opera_modificabile(opera_id)) WITH CHECK (public.opera_modificabile(opera_id))',
      t || '_update_policy', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete_policy', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE USING (public.opera_modificabile(opera_id))',
      t || '_delete_policy', t);
  END LOOP;
END
$opere_section$;

-- partecipazioni_note
DROP POLICY IF EXISTS "partecipazioni_note_insert_policy" ON public.partecipazioni_note;
CREATE POLICY "partecipazioni_note_insert_policy" ON public.partecipazioni_note
  FOR INSERT WITH CHECK (public.partecipazione_modificabile(partecipazione_id));

DROP POLICY IF EXISTS "partecipazioni_note_update_policy" ON public.partecipazioni_note;
CREATE POLICY "partecipazioni_note_update_policy" ON public.partecipazioni_note
  FOR UPDATE
  USING (public.partecipazione_modificabile(partecipazione_id))
  WITH CHECK (public.partecipazione_modificabile(partecipazione_id));

DROP POLICY IF EXISTS "partecipazioni_note_delete_policy" ON public.partecipazioni_note;
CREATE POLICY "partecipazioni_note_delete_policy" ON public.partecipazioni_note
  FOR DELETE USING (public.partecipazione_modificabile(partecipazione_id));

-- ---------------------------------------------------------------------------
-- 5) Letture
-- ---------------------------------------------------------------------------

-- Sezione Opere: anche base e tirocinante vedono tutte le partecipazioni,
-- il cast esterno e le note delle partecipazioni.
DROP POLICY IF EXISTS "partecipazioni_select_policy" ON public.partecipazioni;
CREATE POLICY "partecipazioni_select_policy" ON public.partecipazioni
  FOR SELECT
  USING (
    (SELECT public.is_opere_editor())
    OR (
      (SELECT public.get_user_role()) = 'artista'::public.ruolo_utente
      AND artista_id = (SELECT public.get_user_artista_id())
    )
    OR (
      (SELECT public.get_user_role()) IS DISTINCT FROM 'artista'::public.ruolo_utente
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

DROP POLICY IF EXISTS "cast_esterno_select_policy" ON public.cast_esterno;
CREATE POLICY "cast_esterno_select_policy" ON public.cast_esterno
  FOR SELECT
  USING (
    (SELECT public.get_user_role()) = ANY (ARRAY[
      'admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente,
      'operatore_base'::public.ruolo_utente, 'tirocinante'::public.ruolo_utente,
      'readonly'::public.ruolo_utente, 'artista'::public.ruolo_utente
    ])
  );

DROP POLICY IF EXISTS "partecipazioni_note_select_policy" ON public.partecipazioni_note;
CREATE POLICY "partecipazioni_note_select_policy" ON public.partecipazioni_note
  FOR SELECT
  USING (
    (SELECT public.get_user_role()) = ANY (ARRAY[
      'admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente,
      'operatore_base'::public.ruolo_utente, 'tirocinante'::public.ruolo_utente,
      'readonly'::public.ruolo_utente
    ])
  );

-- Resto della banca dati: l'Operatore base legge come il pro.
DROP POLICY IF EXISTS "artisti_select_policy" ON public.artisti;
CREATE POLICY "artisti_select_policy" ON public.artisti
  FOR SELECT
  USING (
    (SELECT public.is_staff_reader())
    OR (
      (SELECT public.get_user_role()) = 'artista'::public.ruolo_utente
      AND id = (SELECT public.get_user_artista_id())
    )
    OR (
      (SELECT public.get_user_role()) = 'readonly'::public.ruolo_utente
      AND stato = ANY (ARRAY['attivo'::public.stato_iscrizione, 'minorenne'::public.stato_iscrizione])
    )
  );

DROP POLICY IF EXISTS "artisti_note_select_policy" ON public.artisti_note;
CREATE POLICY "artisti_note_select_policy" ON public.artisti_note
  FOR SELECT
  USING (
    (SELECT public.is_staff_reader())
    OR (SELECT public.get_user_role()) = 'readonly'::public.ruolo_utente
  );

DROP POLICY IF EXISTS "artisti_referenti_select_policy" ON public.artisti_referenti;
CREATE POLICY "artisti_referenti_select_policy" ON public.artisti_referenti
  FOR SELECT
  USING (
    (SELECT public.is_staff_reader())
    OR (SELECT public.get_user_role()) = 'readonly'::public.ruolo_utente
  );

DROP POLICY IF EXISTS "alert_prese_visione_select_policy" ON public.alert_prese_visione;
CREATE POLICY "alert_prese_visione_select_policy" ON public.alert_prese_visione
  FOR SELECT
  USING (
    (SELECT public.is_staff_reader())
    OR (SELECT public.get_user_role()) = 'readonly'::public.ruolo_utente
  );

-- artisti_dati_riservati: la policy FOR ALL diventa lettura (staff + base)
-- e scrittura (solo staff).
DROP POLICY IF EXISTS "artisti_dati_riservati_staff_policy" ON public.artisti_dati_riservati;
DROP POLICY IF EXISTS "artisti_dati_riservati_select_policy" ON public.artisti_dati_riservati;
CREATE POLICY "artisti_dati_riservati_select_policy" ON public.artisti_dati_riservati
  FOR SELECT USING ((SELECT public.is_staff_reader()));
DROP POLICY IF EXISTS "artisti_dati_riservati_insert_policy" ON public.artisti_dati_riservati;
CREATE POLICY "artisti_dati_riservati_insert_policy" ON public.artisti_dati_riservati
  FOR INSERT WITH CHECK ((SELECT public.is_staff()));
DROP POLICY IF EXISTS "artisti_dati_riservati_update_policy" ON public.artisti_dati_riservati;
CREATE POLICY "artisti_dati_riservati_update_policy" ON public.artisti_dati_riservati
  FOR UPDATE USING ((SELECT public.is_staff())) WITH CHECK ((SELECT public.is_staff()));
DROP POLICY IF EXISTS "artisti_dati_riservati_delete_policy" ON public.artisti_dati_riservati;
CREATE POLICY "artisti_dati_riservati_delete_policy" ON public.artisti_dati_riservati
  FOR DELETE USING ((SELECT public.is_staff()));

DROP POLICY IF EXISTS "individuazioni_select_policy" ON public.individuazioni;
CREATE POLICY "individuazioni_select_policy" ON public.individuazioni
  FOR SELECT
  USING (
    (SELECT public.is_staff_reader())
    OR (
      (SELECT public.get_user_role()) = 'artista'::public.ruolo_utente
      AND EXISTS (
        SELECT 1
        FROM public.partecipazioni p
        JOIN public.opere o ON o.id = p.opera_id
        WHERE p.opera_id = individuazioni.opera_id
          AND p.artista_id = (SELECT public.get_user_artista_id())
          AND o.stato_validazione = 'validato'::public.stato_validazione
      )
    )
    OR (
      (SELECT public.get_user_role()) IS DISTINCT FROM 'artista'::public.ruolo_utente
      AND stato = ANY (ARRAY['validato'::public.stato_individuazione, 'individuato'::public.stato_individuazione])
      AND EXISTS (
        SELECT 1 FROM public.opere o
        WHERE o.id = individuazioni.opera_id
          AND o.stato_validazione = 'validato'::public.stato_validazione
      )
    )
  );

DROP POLICY IF EXISTS "ripartizioni_dettaglio_select_policy" ON public.ripartizioni;
CREATE POLICY "ripartizioni_dettaglio_select_policy" ON public.ripartizioni
  FOR SELECT
  USING (
    (SELECT public.is_staff_reader())
    OR (
      (SELECT public.get_user_role()) = 'artista'::public.ruolo_utente
      AND artista_id = (SELECT public.get_user_artista_id())
    )
  );

DROP POLICY IF EXISTS "campagne_programmazione_select_policy" ON public.campagne_programmazione;
CREATE POLICY "campagne_programmazione_select_policy" ON public.campagne_programmazione
  FOR SELECT USING (stato = 'completata'::public.stato_campagna OR (SELECT public.is_staff_reader()));

DROP POLICY IF EXISTS "campagne_individuazione_select_policy" ON public.campagne_individuazione;
CREATE POLICY "campagne_individuazione_select_policy" ON public.campagne_individuazione
  FOR SELECT USING (stato = 'completata'::public.stato_campagna OR (SELECT public.is_staff_reader()));

DROP POLICY IF EXISTS "campagne_ripartizione_select_policy" ON public.campagne_ripartizione;
CREATE POLICY "campagne_ripartizione_select_policy" ON public.campagne_ripartizione
  FOR SELECT
  USING (
    (SELECT public.is_staff_reader())
    OR (
      (SELECT public.get_user_role()) = 'artista'::public.ruolo_utente
      AND stato = 'approvata'::public.stato_ripartizione
    )
    OR (
      (SELECT public.get_user_role()) = 'readonly'::public.ruolo_utente
      AND stato = 'distribuita'::public.stato_ripartizione
    )
  );

DROP POLICY IF EXISTS "emittenti_select_policy" ON public.emittenti;
CREATE POLICY "emittenti_select_policy" ON public.emittenti
  FOR SELECT USING (attiva = true OR (SELECT public.is_staff_reader()));

DROP POLICY IF EXISTS "ruoli_tipologie_select_policy" ON public.ruoli_tipologie;
CREATE POLICY "ruoli_tipologie_select_policy" ON public.ruoli_tipologie
  FOR SELECT USING (attivo = true OR (SELECT public.is_staff_reader()));

-- ---------------------------------------------------------------------------
-- 6) Artisti per il cast: i soli dati che servono alla sezione Opere
-- ---------------------------------------------------------------------------
-- Il tirocinante non legge la tabella artisti. Queste due funzioni restituiscono
-- id, nome, cognome, nome d'arte, IPN e nconst. Per gli altri ruoli seguono le
-- stesse regole di artisti_select_policy, quindi non allargano nulla.

CREATE OR REPLACE FUNCTION public.artisti_cast_lookup()
RETURNS TABLE (
  id uuid,
  nome varchar,
  cognome varchar,
  nome_arte varchar,
  codice_ipn text,
  imdb_nconst varchar
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.nome, a.cognome, a.nome_arte, a.codice_ipn, a.imdb_nconst
  FROM public.artisti a
  WHERE public.is_opere_editor()
     OR (
       public.get_user_role() = 'artista'::public.ruolo_utente
       AND a.id = public.get_user_artista_id()
     )
     OR (
       public.get_user_role() = 'readonly'::public.ruolo_utente
       AND a.stato = ANY (ARRAY['attivo'::public.stato_iscrizione, 'minorenne'::public.stato_iscrizione])
     )
$$;

CREATE OR REPLACE FUNCTION public.cerca_artisti_per_cast(p_search text, p_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  nome varchar,
  cognome varchar,
  nome_arte varchar,
  codice_ipn text,
  imdb_nconst varchar
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH q AS (
    SELECT NULLIF(btrim(COALESCE(p_search, '')), '') AS s
  ),
  pattern AS (
    SELECT '%' || replace(replace(replace(q.s, '\', '\\'), '%', '\%'), '_', '\_') || '%' AS like_q
    FROM q
    WHERE q.s IS NOT NULL
  )
  SELECT l.id, l.nome, l.cognome, l.nome_arte, l.codice_ipn, l.imdb_nconst
  FROM public.artisti_cast_lookup() l
  CROSS JOIN pattern
  WHERE public.is_opere_editor()
    AND (
      COALESCE(l.nome::text, '') ILIKE pattern.like_q ESCAPE '\'
      OR COALESCE(l.cognome::text, '') ILIKE pattern.like_q ESCAPE '\'
      OR COALESCE(l.nome_arte::text, '') ILIKE pattern.like_q ESCAPE '\'
      OR (COALESCE(l.nome::text, '') || ' ' || COALESCE(l.cognome::text, '')) ILIKE pattern.like_q ESCAPE '\'
      OR (COALESCE(l.cognome::text, '') || ' ' || COALESCE(l.nome::text, '')) ILIKE pattern.like_q ESCAPE '\'
      OR COALESCE(l.codice_ipn, '') ILIKE pattern.like_q ESCAPE '\'
    )
  ORDER BY l.cognome, l.nome, l.id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100)
$$;

REVOKE ALL ON FUNCTION public.artisti_cast_lookup() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cerca_artisti_per_cast(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.artisti_cast_lookup() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cerca_artisti_per_cast(text, integer) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7) Funzioni esistenti: sostituzione mirata del controllo di ruolo
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION pg_temp.rasi_patch_function(
  p_signature text,
  p_old text,
  p_new text,
  p_expected integer
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_def text;
  v_count integer;
BEGIN
  IF to_regprocedure(p_signature) IS NULL THEN
    RAISE EXCEPTION 'funzione assente: %', p_signature;
  END IF;
  v_def := pg_get_functiondef(to_regprocedure(p_signature));
  v_count := (length(v_def) - length(replace(v_def, p_old, ''))) / length(p_old);
  IF v_count = 0 AND strpos(v_def, p_new) > 0 THEN
    RAISE NOTICE 'già aggiornata: %', p_signature;
    RETURN;
  END IF;
  IF v_count <> p_expected THEN
    RAISE EXCEPTION 'testo atteso trovato % volte invece di % in %', v_count, p_expected, p_signature;
  END IF;
  EXECUTE replace(v_def, p_old, p_new);
END;
$$;

-- 7a) RPC di lettura protette: anche l'Operatore base (le delete_* restano staff).
DO $read_guards$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.get_campagne_programmazione_with_counts()',
    'public.get_dashboard_metrics(date,date)',
    'public.get_individuazione_detail_stats(uuid)',
    'public.get_individuazione_episode_alert_summary(uuid)',
    'public.get_individuazione_episode_alerts(uuid)',
    'public.get_processing_progress(uuid)'
  ] LOOP
    PERFORM pg_temp.rasi_patch_function(
      fn,
      $old$AND public.get_user_role() IS DISTINCT FROM 'operatore'::public.ruolo_utente THEN$old$,
      $new$AND public.get_user_role() IS DISTINCT FROM 'operatore'::public.ruolo_utente
     AND public.get_user_role() IS DISTINCT FROM 'operatore_base'::public.ruolo_utente THEN$new$,
      1
    );
  END LOOP;
END
$read_guards$;

-- 7b) Cast esterno: ruoli della sezione Opere; replace_cast_esterno anche sull'opera.
SELECT pg_temp.rasi_patch_function(
  'public.replace_cast_esterno(uuid,jsonb,uuid)',
  $old$get_user_role() IS NULL OR get_user_role() NOT IN ('admin', 'operatore')$old$,
  $new$NOT public.is_opere_editor() OR NOT public.opera_modificabile(p_opera_id)$new$,
  1
);
SELECT pg_temp.rasi_patch_function(
  'public.converti_cast_esterno_in_partecipazioni(uuid,jsonb)',
  $old$get_user_role() IS NULL OR get_user_role() NOT IN ('admin', 'operatore')$old$,
  $new$NOT public.is_opere_editor()$new$,
  1
);
-- La funzione è SECURITY INVOKER: il tirocinante non legge artisti, quindi
-- l'esistenza dell'artista si controlla sulla vista per il cast. Le scritture
-- su partecipazioni e cast_esterno restano soggette alla RLS (opera_modificabile).
SELECT pg_temp.rasi_patch_function(
  'public.converti_cast_esterno_in_partecipazioni(uuid,jsonb)',
  $old$SELECT 1 FROM public.artisti WHERE id = p_artista_id$old$,
  $new$SELECT 1 FROM public.artisti_cast_lookup() a WHERE a.id = p_artista_id$new$,
  1
);

-- 7c) Nomi degli artisti nel cast tramite artisti_cast_lookup() (il tirocinante
--     non legge la tabella artisti). Per gli altri ruoli il risultato non cambia.
SELECT pg_temp.rasi_patch_function(
  'public.list_partecipazioni_opera(uuid,integer,integer,text,uuid,uuid,boolean)',
  $old$LEFT JOIN public.artisti a ON a.id = p.artista_id$old$,
  $new$LEFT JOIN public.artisti_cast_lookup() a ON a.id = p.artista_id$new$,
  1
);
SELECT pg_temp.rasi_patch_function(
  'public.cast_esterno_artisti_corrispondenti(uuid,uuid[])',
  $old$JOIN public.artisti a$old$,
  $new$JOIN public.artisti_cast_lookup() a$new$,
  3
);

-- 7d) Email degli utenti (es. «creato da»): anche l'Operatore base.
SELECT pg_temp.rasi_patch_function(
  'public.get_user_email_by_id(uuid)',
  $old$'operatore'::public.ruolo_utente]$old$,
  $new$'operatore'::public.ruolo_utente, 'operatore_base'::public.ruolo_utente]$new$,
  1
);

-- ---------------------------------------------------------------------------
-- 8) Verifica finale
-- ---------------------------------------------------------------------------

DO $verify$
DECLARE
  v_missing text;
BEGIN
  SELECT string_agg(x, ', ') INTO v_missing
  FROM unnest(ARRAY[
    'opere.opere_stato_validazione_guard'
  ]) x
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.opere'::regclass AND tgname = 'opere_stato_validazione_guard'
  );
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'trigger assente: %', v_missing;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('episodi', 'partecipazioni', 'cast_esterno')
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
      AND COALESCE(qual, with_check) NOT LIKE '%opera_modificabile%'
  ) THEN
    RAISE EXCEPTION 'policy di scrittura della sezione Opere senza opera_modificabile';
  END IF;

  IF strpos(pg_get_functiondef('public.list_partecipazioni_opera(uuid,integer,integer,text,uuid,uuid,boolean)'::regprocedure), 'public.artisti a ') > 0 THEN
    RAISE EXCEPTION 'list_partecipazioni_opera legge ancora public.artisti';
  END IF;
END
$verify$;
