-- Soft delete + append-only audit for catalog entities (opere, episodi, partecipazioni).
-- Individuazioni already stored are kept. Matching and catalog lists ignore tombstones.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.opere
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS deleted_cascade_from uuid;

ALTER TABLE public.episodi
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS deleted_cascade_from uuid;

ALTER TABLE public.partecipazioni
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS deleted_cascade_from uuid;

CREATE INDEX IF NOT EXISTS idx_opere_not_deleted ON public.opere (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_episodi_not_deleted ON public.episodi (opera_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_partecipazioni_not_deleted ON public.partecipazioni (opera_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_opere_deleted ON public.opere (deleted_at) WHERE deleted_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catalog_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('opera', 'episodio', 'partecipazione')),
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('insert', 'update', 'soft_delete', 'restore')),
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  actor_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalog_audit_entity
  ON public.catalog_audit_log (entity_type, entity_id, created_at DESC);

ALTER TABLE public.catalog_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalog_audit_log_select ON public.catalog_audit_log;
CREATE POLICY catalog_audit_log_select ON public.catalog_audit_log
  FOR SELECT
  USING (public.get_user_role() IN ('admin', 'operatore'));

GRANT SELECT ON public.catalog_audit_log TO authenticated;

CREATE OR REPLACE FUNCTION public.catalog_audit_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_action text;
  v_fields text[];
  v_entity text := TG_ARGV[0];
  v_noise text[] := ARRAY['search_vector', 'match_key_strict', 'match_key_loose', 'match_key', 'updated_at', 'updated_by'];
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.catalog_audit_log (entity_type, entity_id, action, old_data, new_data, changed_fields, actor_id)
    VALUES (v_entity, NEW.id, 'insert', NULL, to_jsonb(NEW) - v_noise, NULL, auth.uid());
    RETURN NEW;
  END IF;

  v_old := to_jsonb(OLD) - v_noise;
  v_new := to_jsonb(NEW) - v_noise;
  IF v_old = v_new THEN
    RETURN NEW;
  END IF;

  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    v_action := 'soft_delete';
  ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    v_action := 'restore';
  ELSE
    v_action := 'update';
  END IF;

  SELECT array_agg(key ORDER BY key)
  INTO v_fields
  FROM (
    SELECT COALESCE(o.key, n.key) AS key
    FROM jsonb_each(v_old) o
    FULL OUTER JOIN jsonb_each(v_new) n ON o.key = n.key
    WHERE o.value IS DISTINCT FROM n.value
  ) changed;

  INSERT INTO public.catalog_audit_log (entity_type, entity_id, action, old_data, new_data, changed_fields, actor_id)
  VALUES (v_entity, NEW.id, v_action, v_old, v_new, v_fields, auth.uid());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS opere_catalog_audit ON public.opere;
CREATE TRIGGER opere_catalog_audit
  AFTER INSERT OR UPDATE ON public.opere
  FOR EACH ROW EXECUTE FUNCTION public.catalog_audit_row('opera');

DROP TRIGGER IF EXISTS episodi_catalog_audit ON public.episodi;
CREATE TRIGGER episodi_catalog_audit
  AFTER INSERT OR UPDATE ON public.episodi
  FOR EACH ROW EXECUTE FUNCTION public.catalog_audit_row('episodio');

DROP TRIGGER IF EXISTS partecipazioni_catalog_audit ON public.partecipazioni;
CREATE TRIGGER partecipazioni_catalog_audit
  AFTER INSERT OR UPDATE ON public.partecipazioni
  FOR EACH ROW EXECUTE FUNCTION public.catalog_audit_row('partecipazione');

-- ---------------------------------------------------------------------------
-- RLS: hide tombstones from public/artista; no client DELETE
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS opere_select_policy ON public.opere;
CREATE POLICY opere_select_policy ON public.opere
  FOR SELECT
  USING (deleted_at IS NULL OR public.get_user_role() IN ('admin', 'operatore'));

DROP POLICY IF EXISTS opere_write_policy ON public.opere;
CREATE POLICY opere_insert_policy ON public.opere
  FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'operatore'));
CREATE POLICY opere_update_policy ON public.opere
  FOR UPDATE
  USING (public.get_user_role() IN ('admin', 'operatore'));

DROP POLICY IF EXISTS episodi_select_policy ON public.episodi;
CREATE POLICY episodi_select_policy ON public.episodi
  FOR SELECT
  USING (deleted_at IS NULL OR public.get_user_role() IN ('admin', 'operatore'));

DROP POLICY IF EXISTS episodi_write_policy ON public.episodi;
CREATE POLICY episodi_insert_policy ON public.episodi
  FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'operatore'));
CREATE POLICY episodi_update_policy ON public.episodi
  FOR UPDATE
  USING (public.get_user_role() IN ('admin', 'operatore'));

DROP POLICY IF EXISTS partecipazioni_select_policy ON public.partecipazioni;
DROP POLICY IF EXISTS "partecipazioni_select_policy" ON public.partecipazioni;

CREATE POLICY "partecipazioni_select_policy" ON public.partecipazioni
  FOR SELECT
  USING (
    (deleted_at IS NULL OR public.get_user_role() IN ('admin', 'operatore'))
    AND (
      public.get_user_role() = ANY (ARRAY['admin'::ruolo_utente, 'operatore'::ruolo_utente])
      OR (
        public.get_user_role() = 'artista'::ruolo_utente
        AND artista_id = public.get_user_artista_id()
        AND (
          EXISTS (
            SELECT 1 FROM public.opere o
            WHERE o.id = partecipazioni.opera_id
              AND o.stato_validazione = 'validato'::stato_validazione
          )
          OR EXISTS (
            SELECT 1 FROM public.artisti a
            WHERE a.id = partecipazioni.artista_id
              AND a.stato_validazione = 'validato'::stato_validazione
          )
        )
      )
      OR (
        EXISTS (
          SELECT 1 FROM public.opere o
          WHERE o.id = partecipazioni.opera_id
            AND o.stato_validazione = 'validato'::stato_validazione
        )
        OR EXISTS (
          SELECT 1 FROM public.artisti a
          WHERE a.id = partecipazioni.artista_id
            AND a.stato_validazione = 'validato'::stato_validazione
        )
      )
    )
  );

DROP POLICY IF EXISTS "partecipazioni_write_policy" ON public.partecipazioni;
CREATE POLICY partecipazioni_insert_policy ON public.partecipazioni
  FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'operatore'));
CREATE POLICY partecipazioni_update_policy ON public.partecipazioni
  FOR UPDATE
  USING (public.get_user_role() IN ('admin', 'operatore'));

-- ---------------------------------------------------------------------------
-- RPC helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._assert_catalog_writer()
RETURNS void
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF public.get_user_role() IS DISTINCT FROM 'admin'::ruolo_utente
     AND public.get_user_role() IS DISTINCT FROM 'operatore'::ruolo_utente THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_opera(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
BEGIN
  PERFORM public._assert_catalog_writer();
  UPDATE public.opere
     SET deleted_at = v_now,
         deleted_by = auth.uid(),
         deleted_cascade_from = NULL
   WHERE id = p_id
     AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  UPDATE public.episodi
     SET deleted_at = v_now,
         deleted_by = auth.uid(),
         deleted_cascade_from = p_id
   WHERE opera_id = p_id
     AND deleted_at IS NULL;
  UPDATE public.partecipazioni
     SET deleted_at = v_now,
         deleted_by = auth.uid(),
         deleted_cascade_from = p_id
   WHERE opera_id = p_id
     AND deleted_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_opera(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._assert_catalog_writer();
  UPDATE public.opere
     SET deleted_at = NULL,
         deleted_by = NULL,
         deleted_cascade_from = NULL
   WHERE id = p_id
     AND deleted_at IS NOT NULL;
  UPDATE public.episodi
     SET deleted_at = NULL,
         deleted_by = NULL,
         deleted_cascade_from = NULL
   WHERE opera_id = p_id
     AND deleted_cascade_from = p_id;
  UPDATE public.partecipazioni
     SET deleted_at = NULL,
         deleted_by = NULL,
         deleted_cascade_from = NULL
   WHERE opera_id = p_id
     AND deleted_cascade_from = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_episodio(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
BEGIN
  PERFORM public._assert_catalog_writer();
  UPDATE public.episodi
     SET deleted_at = v_now,
         deleted_by = auth.uid(),
         deleted_cascade_from = NULL
   WHERE id = p_id
     AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  UPDATE public.partecipazioni
     SET deleted_at = v_now,
         deleted_by = auth.uid(),
         deleted_cascade_from = p_id
   WHERE episodio_id = p_id
     AND deleted_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_episodio(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._assert_catalog_writer();
  UPDATE public.episodi
     SET deleted_at = NULL,
         deleted_by = NULL,
         deleted_cascade_from = NULL
   WHERE id = p_id
     AND deleted_at IS NOT NULL;
  UPDATE public.partecipazioni
     SET deleted_at = NULL,
         deleted_by = NULL,
         deleted_cascade_from = NULL
   WHERE episodio_id = p_id
     AND deleted_cascade_from = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_partecipazione(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._assert_catalog_writer();
  UPDATE public.partecipazioni
     SET deleted_at = clock_timestamp(),
         deleted_by = auth.uid(),
         deleted_cascade_from = NULL
   WHERE id = p_id
     AND deleted_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_partecipazione(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._assert_catalog_writer();
  UPDATE public.partecipazioni
     SET deleted_at = NULL,
         deleted_by = NULL,
         deleted_cascade_from = NULL
   WHERE id = p_id
     AND deleted_at IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_partecipazioni(p_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._assert_catalog_writer();
  IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.partecipazioni
     SET deleted_at = clock_timestamp(),
         deleted_by = auth.uid(),
         deleted_cascade_from = NULL
   WHERE id = ANY (p_ids)
     AND deleted_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_opera(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_opera(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_episodio(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_episodio(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_partecipazione(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_partecipazione(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_partecipazioni(uuid[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- Matcher / search / dashboard: ignore tombstones
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION match_programmazione_to_partecipazioni(
    p_programmazione_id UUID,
    p_soglia_titolo NUMERIC DEFAULT 0.7,
    p_artista_ids UUID[] DEFAULT NULL,
    p_tolleranza_anno_soft INT DEFAULT 3,
    p_tolleranza_anno_hard INT DEFAULT 5
)
RETURNS TABLE (
    partecipazione_id UUID,
    opera_id UUID,
    episodio_id UUID,
    artista_id UUID,
    ruolo_id UUID,
    punteggio NUMERIC,
    dettagli_matching JSONB
) AS $$
DECLARE
    v_prog RECORD;
    v_titolo_match TEXT;        -- prog.titolo ripulito dei suffissi serie (per il match)
    v_titolo_orig_match TEXT;   -- prog.titolo_originale ripulito (per il match)
    v_episode_signal RECORD;
    v_is_serie BOOLEAN;
    v_has_episode_data BOOLEAN;
    v_opera RECORD;
    v_episodio RECORD;
    v_partecipazione RECORD;
    v_score_titolo NUMERIC;
    v_score_titolo_base NUMERIC;
    v_score_alias NUMERIC;
    v_score_titolo_orig NUMERIC;
    v_score_anno NUMERIC;
    v_score_regia NUMERIC;
    v_score_episodio NUMERIC;
    v_score_totale NUMERIC;
    v_dettagli JSONB;
    v_episodio_trovato BOOLEAN;
    v_best_episodio_id UUID;
    v_best_episodio_score NUMERIC;
    v_regia_best_score NUMERIC;
    v_regia_match_name TEXT;
    v_diff_anno INT;
    v_anno_confronto INT;
    v_anno_match_source TEXT;
    v_best_episodio_anno INT;
    v_anno_disponibile BOOLEAN;
    v_prog_anno_rilascio INT;
    v_prog_anno_rilascio_fine INT;
    v_prog_anno_produzione INT;
    v_prog_anno_produzione_fine INT;
    v_anno_peso NUMERIC;
    v_ref_anno_start INT;
    v_ref_anno_end INT;
    v_regia_disponibile BOOLEAN;
    v_episodio_applicato BOOLEAN;
    v_episodio_mancante BOOLEAN;   -- serie con dati episodio ma episodio non in catalogo → match a livello serie, da revisionare
    v_peso_massimo NUMERIC;
    v_soglia_adattata NUMERIC;
    v_skip_opera BOOLEAN;
    v_titolo_match_source TEXT;
    v_titolo_match_programmazione TEXT;
    v_titolo_match_opera TEXT;
    -- Suffisso strutturale Netflix/VOD da rimuovere a match-time (mirror di
    -- SERIES_PART_TRAIL in title-normalize.ts e build_match_key_strict).
    c_series_suffix CONSTANT TEXT :=
        '\s*:\s*(SEASON|PARTE|PART|VOLUME|VOL|CHAPTER|LIMITED\s+SERIES|COLLECTION|STAGIONE)\y.*$';
BEGIN
    -- Set similarity threshold for index usage
    PERFORM set_limit(p_soglia_titolo - 0.1);

    -- Carica programmazione
    SELECT * INTO v_prog
    FROM programmazioni
    WHERE id = p_programmazione_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Programmazione non trovata: %', p_programmazione_id;
    END IF;

    -- Titolo "pulito" per il matching: rimuove il suffisso serie ("Show: Season N" →
    -- "Show"). Fallback all'originale se la pulizia svuota la stringa.
    v_titolo_match := NULLIF(trim(regexp_replace(COALESCE(v_prog.titolo, ''), c_series_suffix, '', 'i')), '');
    IF v_titolo_match IS NULL THEN
        v_titolo_match := v_prog.titolo;
    END IF;
    v_titolo_orig_match := NULLIF(trim(regexp_replace(COALESCE(v_prog.titolo_originale, ''), c_series_suffix, '', 'i')), '');

    -- Fallback per import storici: deriva stagione/episodio da titoli (Ep.N, S01E02, …)
    -- senza riscrivere le colonne persistite. Gate: high, oppure medium con numero episodio.
    SELECT * INTO v_episode_signal
    FROM public.derive_programmazione_episode_signals(
        v_prog.numero_stagione,
        v_prog.numero_episodio,
        v_prog.titolo,
        v_prog.titolo_originale,
        v_prog.titolo_episodio,
        v_prog.titolo_episodio_originale
    );

    IF v_episode_signal.confidence = 'high'
       OR (v_episode_signal.confidence = 'medium' AND v_episode_signal.numero_episodio IS NOT NULL) THEN
        v_prog.numero_stagione := COALESCE(v_prog.numero_stagione, v_episode_signal.numero_stagione);
        IF v_episode_signal.numero_episodio IS NOT NULL THEN
            v_prog.numero_episodio := v_episode_signal.numero_episodio;
        END IF;
        v_prog.titolo_episodio := COALESCE(v_prog.titolo_episodio, v_episode_signal.titolo_episodio);
    END IF;

    -- Determina se è una serie basandosi sui campi episodio
    v_is_serie := (
        v_prog.numero_episodio IS NOT NULL OR
        v_prog.numero_stagione IS NOT NULL OR
        v_prog.titolo_episodio IS NOT NULL OR
        v_prog.titolo_episodio_originale IS NOT NULL
    );

    -- Distingue: serie con dati episodio specifici vs serie marcata solo da stagione
    v_has_episode_data := (
        v_prog.numero_episodio IS NOT NULL OR
        v_prog.titolo_episodio IS NOT NULL OR
        v_prog.titolo_episodio_originale IS NOT NULL
    );

    v_prog_anno_rilascio := COALESCE(v_prog.anno_rilascio, v_prog.anno);
    v_prog_anno_rilascio_fine := COALESCE(
        v_prog.anno_rilascio_fine,
        v_prog.anno_fine,
        v_prog_anno_rilascio
    );
    v_prog_anno_produzione := v_prog.anno_produzione;
    v_prog_anno_produzione_fine := COALESCE(
        v_prog.anno_produzione_fine,
        v_prog_anno_produzione
    );

    -- OTTIMIZZATO: Cerca solo opere con titolo simile usando l'indice trigram
    FOR v_opera IN
        SELECT
            o.id,
            o.titolo,
            o.titolo_originale,
            o.anno_produzione,
            o.anno_produzione_fine,
            o.tipo,
            o.alias_titoli,
            o.regista,
            GREATEST(
                similarity(LOWER(v_titolo_match), LOWER(o.titolo)),
                COALESCE(similarity(LOWER(v_titolo_match), LOWER(o.titolo_originale)), 0),
                COALESCE(similarity(LOWER(v_titolo_orig_match), LOWER(o.titolo)), 0),
                COALESCE(similarity(LOWER(v_titolo_orig_match), LOWER(o.titolo_originale)), 0)
            ) as best_score
        FROM opere o
        WHERE o.deleted_at IS NULL
          AND o.titolo IS NOT NULL
          AND v_titolo_match IS NOT NULL
          AND (
              -- Usa operatore % che sfrutta l'indice GIN trigram (titolo pulito + titolo_originale)
              LOWER(o.titolo) % LOWER(v_titolo_match)
              OR (o.titolo_originale IS NOT NULL AND LOWER(o.titolo_originale) % LOWER(v_titolo_match))
              OR (v_titolo_orig_match IS NOT NULL AND (
                    LOWER(o.titolo) % LOWER(v_titolo_orig_match)
                    OR (o.titolo_originale IS NOT NULL AND LOWER(o.titolo_originale) % LOWER(v_titolo_orig_match))
              ))
          )
        ORDER BY best_score DESC
        LIMIT 50
    LOOP
        -- Reset scores
        v_score_titolo_base := v_opera.best_score;
        v_score_titolo := v_score_titolo_base;
        v_score_alias := 0;
        v_score_titolo_orig := 0;
        v_score_anno := 0;
        v_score_regia := 0;
        v_score_episodio := 0;
        v_dettagli := '{}'::JSONB;
        v_episodio_trovato := FALSE;
        v_best_episodio_id := NULL;
        v_best_episodio_score := 0;
        v_regia_best_score := 0;
        v_regia_match_name := NULL;
        v_diff_anno := NULL;
        v_anno_confronto := NULL;
        v_anno_match_source := NULL;
        v_best_episodio_anno := NULL;
        v_anno_disponibile := FALSE;
        v_anno_peso := 15;
        v_regia_disponibile := FALSE;
        v_episodio_applicato := FALSE;
        v_episodio_mancante := FALSE;
        v_skip_opera := FALSE;
        v_titolo_match_source := 'titolo';
        v_titolo_match_programmazione := v_titolo_match;
        v_titolo_match_opera := v_opera.titolo;

        IF v_titolo_orig_match IS NOT NULL
           AND v_opera.titolo_originale IS NOT NULL
           AND similarity(LOWER(v_titolo_orig_match), LOWER(v_opera.titolo_originale)) >= v_score_titolo_base THEN
            v_titolo_match_source := 'titolo_originale';
            v_titolo_match_programmazione := v_titolo_orig_match;
            v_titolo_match_opera := v_opera.titolo_originale;
        ELSIF v_opera.titolo_originale IS NOT NULL
              AND similarity(LOWER(v_titolo_match), LOWER(v_opera.titolo_originale)) >= v_score_titolo_base THEN
            v_titolo_match_source := 'titolo_originale_opera';
            v_titolo_match_programmazione := v_titolo_match;
            v_titolo_match_opera := v_opera.titolo_originale;
        ELSIF v_titolo_orig_match IS NOT NULL
              AND similarity(LOWER(v_titolo_orig_match), LOWER(v_opera.titolo)) >= v_score_titolo_base THEN
            v_titolo_match_source := 'titolo_originale_programmazione';
            v_titolo_match_programmazione := v_titolo_orig_match;
            v_titolo_match_opera := v_opera.titolo;
        END IF;

        -- Gli alias restano un fallback, ma titolo e titolo originale sono la fonte primaria.
        IF v_opera.alias_titoli IS NOT NULL AND array_length(v_opera.alias_titoli, 1) > 0 THEN
            DECLARE
                v_alias TEXT;
                v_alias_score NUMERIC;
            BEGIN
                FOREACH v_alias IN ARRAY v_opera.alias_titoli
                LOOP
                    IF v_alias IS NOT NULL THEN
                        v_alias_score := GREATEST(
                            similarity(LOWER(v_titolo_match), LOWER(v_alias)),
                            COALESCE(similarity(LOWER(v_titolo_orig_match), LOWER(v_alias)), 0)
                        );
                        IF v_alias_score > v_score_alias THEN
                            v_score_alias := v_alias_score;
                        END IF;
                        IF v_alias_score > v_score_titolo THEN
                            v_score_titolo := v_alias_score;
                            v_titolo_match_source := 'alias_titoli';
                            v_titolo_match_opera := v_alias;
                            v_titolo_match_programmazione := CASE
                                WHEN v_titolo_orig_match IS NOT NULL
                                  AND similarity(LOWER(v_titolo_orig_match), LOWER(v_alias)) >= similarity(LOWER(v_titolo_match), LOWER(v_alias))
                                  THEN v_titolo_orig_match
                                ELSE v_titolo_match
                            END;
                        END IF;
                    END IF;
                END LOOP;
            END;
        END IF;

        -- Se titolo non matcha abbastanza, salta
        IF v_score_titolo < p_soglia_titolo THEN
            CONTINUE;
        END IF;

        v_dettagli := jsonb_set(v_dettagli, '{titolo}', jsonb_build_object(
            'score', ROUND(v_score_titolo * 100, 2),
            'programmazione', v_prog.titolo,
            'programmazione_match', v_titolo_match,
            'opera', v_opera.titolo,
            'opera_titolo_originale', v_opera.titolo_originale,
            'match_source', v_titolo_match_source,
            'match_programmazione', v_titolo_match_programmazione,
            'match_opera', v_titolo_match_opera,
            'score_titolo_o_originale', ROUND(v_score_titolo_base * 100, 2),
            'score_alias', ROUND(v_score_alias * 100, 2)
        ));

        -- 2. BONUS: Match titolo_originale
        IF v_prog.titolo_originale IS NOT NULL AND v_opera.titolo_originale IS NOT NULL THEN
            v_score_titolo_orig := similarity(
                LOWER(v_prog.titolo_originale),
                LOWER(v_opera.titolo_originale)
            );
            v_dettagli := jsonb_set(v_dettagli, '{titolo_originale}', jsonb_build_object(
                'score', ROUND(v_score_titolo_orig * 100, 2),
                'programmazione', v_prog.titolo_originale,
                'opera', v_opera.titolo_originale
            ));
        END IF;

        -- =====================================================
        -- 3. DISCRIMINANTE ANNO (parametrico, range-aware)
        -- Serie: rilascio vs episodio/opera; produzione come fallback debole.
        -- Film: rilascio vs opera.anno_produzione con hard scarto.
        -- =====================================================
        v_anno_peso := 15;
        IF v_prog_anno_rilascio IS NOT NULL AND v_opera.anno_produzione IS NOT NULL THEN
            v_anno_disponibile := TRUE;
            v_anno_confronto := v_opera.anno_produzione;
            v_anno_match_source := 'opera';
            v_ref_anno_start := v_opera.anno_produzione;
            v_ref_anno_end := COALESCE(v_opera.anno_produzione_fine, v_opera.anno_produzione);

            v_score_anno := public.score_year_overlap(
                v_prog_anno_rilascio,
                v_prog_anno_rilascio_fine,
                v_ref_anno_start,
                v_ref_anno_end,
                p_tolleranza_anno_soft,
                p_tolleranza_anno_hard
            );

            IF v_score_anno = 0 AND v_is_serie THEN
                -- fallback debole: anno produzione programmazione vs range opera
                IF v_prog_anno_produzione IS NOT NULL THEN
                    v_score_anno := public.score_year_overlap(
                        v_prog_anno_produzione,
                        v_prog_anno_produzione_fine,
                        v_ref_anno_start,
                        v_ref_anno_end,
                        p_tolleranza_anno_soft,
                        p_tolleranza_anno_hard
                    ) * 0.5;
                    IF v_score_anno > 0 THEN
                        v_anno_match_source := 'produzione';
                    END IF;
                END IF;
            ELSIF v_score_anno = 0 AND NOT v_is_serie THEN
                v_diff_anno := ABS(v_prog_anno_rilascio - v_anno_confronto);
                IF v_diff_anno > p_tolleranza_anno_hard THEN
                    v_skip_opera := TRUE;
                END IF;
            END IF;

            IF NOT v_skip_opera THEN
                v_dettagli := jsonb_set(v_dettagli, '{anno}', jsonb_build_object(
                    'score', ROUND(v_score_anno * v_anno_peso, 2),
                    'programmazione', v_prog_anno_rilascio,
                    'programmazione_fine', v_prog_anno_rilascio_fine,
                    'programmazione_produzione', v_prog_anno_produzione,
                    'riferimento', v_anno_confronto,
                    'riferimento_fine', v_ref_anno_end,
                    'fonte', v_anno_match_source,
                    'opera', v_opera.anno_produzione,
                    'opera_fine', v_opera.anno_produzione_fine,
                    'tolleranza_soft', p_tolleranza_anno_soft,
                    'tolleranza_hard', p_tolleranza_anno_hard,
                    'fallback_soft', v_is_serie,
                    'hard_scarto', false
                ));
            END IF;
        END IF;

        IF v_skip_opera THEN
            CONTINUE;
        END IF;

        -- =====================================================
        -- 4. DISCRIMINANTE REGIA (null-safe)
        -- programmazioni.regia = TEXT singolo (es. "HILL WALTER")
        -- opere.regista = VARCHAR[] array (es. ["Walter Hill"])
        -- Confronto fuzzy: prog.regia vs ogni elemento di opera.regista
        -- Match (similarity >= 0.7): +1.0 (= +10 punti)
        -- Parziale (>= 0.4):        +0.5 (= +5 punti)
        -- No match:                  -1.5 (= -15 punti PENALITÀ)
        -- Uno mancante:              0 (neutro)
        -- =====================================================
        IF v_prog.regia IS NOT NULL AND LENGTH(TRIM(v_prog.regia)) > 0
           AND v_opera.regista IS NOT NULL AND array_length(v_opera.regista, 1) > 0 THEN
            v_regia_disponibile := TRUE;
            DECLARE
                v_reg TEXT;
                v_sim NUMERIC;
            BEGIN
                FOREACH v_reg IN ARRAY v_opera.regista
                LOOP
                    IF v_reg IS NOT NULL AND LENGTH(TRIM(v_reg)) > 0 THEN
                        v_sim := similarity(LOWER(TRIM(v_prog.regia)), LOWER(TRIM(v_reg)));
                        IF v_sim > v_regia_best_score THEN
                            v_regia_best_score := v_sim;
                            v_regia_match_name := v_reg;
                        END IF;
                    END IF;
                END LOOP;
            END;

            IF v_regia_best_score >= 0.7 THEN
                v_score_regia := 1.0;
            ELSIF v_regia_best_score >= 0.4 THEN
                v_score_regia := 0.5;
            ELSE
                -- PENALITÀ: regia presente in entrambi ma non corrisponde
                v_score_regia := -1.5;
            END IF;

            v_dettagli := jsonb_set(v_dettagli, '{regia}', jsonb_build_object(
                'score', ROUND(v_score_regia * 10, 2),
                'programmazione', v_prog.regia,
                'opera_registi', to_jsonb(v_opera.regista),
                'best_match', v_regia_match_name,
                'best_similarity', ROUND(v_regia_best_score * 100, 2),
                'penalita', v_score_regia < 0
            ));
        END IF;

        -- =====================================================
        -- 5. PER SERIE TV: Match episodio
        -- Fix: serie senza dati episodio specifici NON scartata
        -- =====================================================
        IF v_is_serie THEN
            FOR v_episodio IN
                SELECT
                    e.id,
                    e.numero_stagione,
                    e.numero_episodio,
                    e.titolo_episodio,
                    EXTRACT(YEAR FROM e.data_prima_messa_in_onda)::INT AS anno_episodio
                FROM episodi e
                WHERE e.opera_id = v_opera.id
                  AND e.deleted_at IS NULL
            LOOP
                DECLARE
                    v_ep_score NUMERIC := 0;
                    v_match_found BOOLEAN := FALSE;
                BEGIN
                    IF v_prog.numero_stagione IS NOT NULL AND v_prog.numero_episodio IS NOT NULL THEN
                        IF v_episodio.numero_stagione = v_prog.numero_stagione
                           AND v_episodio.numero_episodio = v_prog.numero_episodio THEN
                            v_ep_score := 1.0;
                            v_match_found := TRUE;
                        END IF;
                    END IF;

                    IF NOT v_match_found AND v_prog.numero_episodio IS NOT NULL
                       AND (v_prog.numero_stagione IS NULL OR v_prog.numero_stagione = 0) THEN
                        IF v_episodio.numero_episodio = v_prog.numero_episodio THEN
                            v_ep_score := GREATEST(v_ep_score, 0.8);
                            v_match_found := TRUE;
                        END IF;
                    END IF;

                    IF NOT v_match_found AND v_prog.titolo_episodio IS NOT NULL
                       AND v_episodio.titolo_episodio IS NOT NULL THEN
                        DECLARE
                            v_ep_title_score NUMERIC;
                        BEGIN
                            v_ep_title_score := similarity(
                                LOWER(v_prog.titolo_episodio),
                                LOWER(v_episodio.titolo_episodio)
                            );
                            IF v_ep_title_score >= 0.6 THEN
                                v_ep_score := GREATEST(v_ep_score, v_ep_title_score);
                                v_match_found := TRUE;
                            END IF;
                        END;
                    END IF;

                    IF NOT v_match_found AND v_prog.titolo_episodio_originale IS NOT NULL
                       AND v_episodio.titolo_episodio IS NOT NULL THEN
                        DECLARE
                            v_ep_title_orig_score NUMERIC;
                        BEGIN
                            v_ep_title_orig_score := similarity(
                                LOWER(v_prog.titolo_episodio_originale),
                                LOWER(v_episodio.titolo_episodio)
                            );
                            IF v_ep_title_orig_score >= 0.6 THEN
                                v_ep_score := GREATEST(v_ep_score, v_ep_title_orig_score);
                                v_match_found := TRUE;
                            END IF;
                        END;
                    END IF;

                    IF v_ep_score > v_best_episodio_score THEN
                        v_best_episodio_score := v_ep_score;
                        v_best_episodio_id := v_episodio.id;
                        v_best_episodio_anno := v_episodio.anno_episodio;
                        v_episodio_trovato := TRUE;
                    END IF;
                END;
            END LOOP;

            -- RILASSATO: serie con dati episodio ma episodio non in catalogo → NON scarta.
            -- Aggancia a livello serie (partecipazioni con episodio_id NULL) e marca il
            -- match come "episodio mancante", così a valle finisce in coda di revisione.
            IF NOT v_episodio_trovato THEN
                IF v_has_episode_data THEN
                    -- Caso A: prog ha dati episodio specifici ma nessun match in catalogo
                    -- → match a livello serie, da revisionare (niente scarto duro)
                    v_episodio_mancante := TRUE;
                END IF;
                -- Caso B: prog "marcata serie" solo per numero_stagione → procedi
                v_score_episodio := 0;
                v_episodio_applicato := FALSE;
            ELSE
                v_score_episodio := v_best_episodio_score;
                v_episodio_applicato := TRUE;
                v_dettagli := jsonb_set(v_dettagli, '{episodio}', jsonb_build_object(
                    'score', ROUND(v_score_episodio * 100, 2),
                    'episodio_id', v_best_episodio_id,
                    'prog_stagione', v_prog.numero_stagione,
                    'prog_episodio', v_prog.numero_episodio,
                    'prog_titolo_ep', v_prog.titolo_episodio
                ));

                IF v_prog_anno_rilascio IS NOT NULL AND v_best_episodio_anno IS NOT NULL THEN
                    v_anno_disponibile := TRUE;
                    v_anno_confronto := v_best_episodio_anno;
                    v_anno_match_source := 'episodio';
                    v_anno_peso := CASE
                        WHEN v_episodio_applicato AND v_best_episodio_score >= 0.8 THEN 5
                        WHEN v_is_serie THEN 10
                        ELSE 15
                    END;

                    v_score_anno := public.score_year_overlap(
                        v_prog_anno_rilascio,
                        v_prog_anno_rilascio_fine,
                        v_best_episodio_anno,
                        v_best_episodio_anno,
                        p_tolleranza_anno_soft,
                        p_tolleranza_anno_hard
                    );

                    v_dettagli := jsonb_set(v_dettagli, '{anno}', jsonb_build_object(
                        'score', ROUND(v_score_anno * v_anno_peso, 2),
                        'programmazione', v_prog_anno_rilascio,
                        'programmazione_fine', v_prog_anno_rilascio_fine,
                        'riferimento', v_anno_confronto,
                        'fonte', v_anno_match_source,
                        'opera', v_opera.anno_produzione,
                        'opera_fine', v_opera.anno_produzione_fine,
                        'peso', v_anno_peso,
                        'tolleranza_soft', p_tolleranza_anno_soft,
                        'tolleranza_hard', p_tolleranza_anno_hard,
                        'fallback_soft', false,
                        'hard_scarto', false
                    ));
                END IF;
            END IF;
        END IF;

        -- =====================================================
        -- CALCOLO PUNTEGGIO TOTALE (0-100)
        -- =====================================================
        v_score_totale := (v_score_titolo * 50);

        IF v_score_titolo_orig > 0 THEN
            v_score_totale := v_score_totale + (v_score_titolo_orig * 10);
        END IF;

        -- Anno: peso variabile (5 se serie+episodio certo, altrimenti 10/15)
        v_score_totale := v_score_totale + (v_score_anno * COALESCE(v_anno_peso, 15));

        -- Regia: positivo (bonus) o negativo (penalità no-match)
        v_score_totale := v_score_totale + (v_score_regia * 10);

        IF v_episodio_applicato AND v_score_episodio > 0 THEN
            v_score_totale := v_score_totale + (v_score_episodio * 15);
        END IF;

        -- Floor a 0
        v_score_totale := GREATEST(v_score_totale, 0);

        -- =====================================================
        -- SOGLIA ADATTIVA: 35% del peso massimo possibile, floor 25
        -- Conta solo i discriminanti effettivamente disponibili
        -- =====================================================
        v_peso_massimo := 50;  -- titolo sempre presente
        IF v_score_titolo_orig > 0 THEN
            v_peso_massimo := v_peso_massimo + 10;
        END IF;
        IF v_anno_disponibile THEN
            v_peso_massimo := v_peso_massimo + 15;
        END IF;
        IF v_regia_disponibile THEN
            v_peso_massimo := v_peso_massimo + 10;
        END IF;
        IF v_episodio_applicato THEN
            v_peso_massimo := v_peso_massimo + 15;
        END IF;

        v_soglia_adattata := GREATEST(v_peso_massimo * 0.35, 25);

        v_dettagli := jsonb_set(v_dettagli, '{totale}', jsonb_build_object(
            'score', ROUND(v_score_totale, 2),
            'peso_massimo', v_peso_massimo,
            'soglia_applicata', ROUND(v_soglia_adattata, 2),
            'is_serie', v_is_serie,
            'has_episode_data', v_has_episode_data,
            'episodio_applicato', v_episodio_applicato,
            'episodio_mancante', v_episodio_mancante,
            'anno_disponibile', v_anno_disponibile,
            'regia_disponibile', v_regia_disponibile,
            'has_regia_penalita', v_score_regia < 0
        ));
        -- Flag top-level per il routing a valle (process_programmazioni_chunk):
        -- match a livello serie senza episodio puntuale → coda di revisione.
        v_dettagli := jsonb_set(v_dettagli, '{episodio_mancante}', to_jsonb(COALESCE(v_episodio_mancante, FALSE)));

        -- Applica soglia adattiva
        IF v_score_totale < v_soglia_adattata THEN
            CONTINUE;
        END IF;

        -- Trova partecipazioni
        IF v_episodio_mancante THEN
            -- Attribuzione a LIVELLO SERIE: per le serie il cui cast in catalogo è
            -- registrato solo a livello episodio (e la numerazione non si allinea a Netflix),
            -- attribuisce il cast DISTINTO della serie — un (artista, ruolo) una sola volta,
            -- con episodio_id NULL. Il catalogo contiene solo gli artisti rappresentati,
            -- quindi è tipicamente 1-2 per opera (niente over-attribution). Va in revisione
            -- a valle (episodio_mancante=true); punteggio ridotto ×0.8.
            FOR v_partecipazione IN
                SELECT DISTINCT ON (p.artista_id, p.ruolo_id)
                    p.id AS partecipazione_id, p.artista_id, p.ruolo_id
                FROM partecipazioni p
                WHERE p.opera_id = v_opera.id
                  AND p.deleted_at IS NULL
                  AND (p_artista_ids IS NULL OR p.artista_id = ANY(p_artista_ids))
                ORDER BY p.artista_id, p.ruolo_id, p.id
            LOOP
                RETURN QUERY SELECT
                    v_partecipazione.partecipazione_id,
                    v_opera.id,
                    NULL::UUID,                         -- livello serie: nessun episodio puntuale
                    v_partecipazione.artista_id,
                    v_partecipazione.ruolo_id,
                    ROUND(v_score_totale * 0.8, 2)::NUMERIC,
                    v_dettagli;
            END LOOP;
        ELSE
            FOR v_partecipazione IN
                SELECT
                    p.id as partecipazione_id,
                    p.artista_id,
                    p.ruolo_id,
                    p.opera_id,
                    p.episodio_id
                FROM partecipazioni p
                WHERE p.opera_id = v_opera.id
                  AND p.deleted_at IS NULL
                  AND (
                      (NOT v_is_serie AND (p.episodio_id IS NULL OR p.episodio_id = v_best_episodio_id))
                      OR (v_is_serie AND p.episodio_id = v_best_episodio_id)
                      OR (v_is_serie AND p.episodio_id IS NULL)
                  )
                  AND (p_artista_ids IS NULL OR p.artista_id = ANY(p_artista_ids))
            LOOP
                RETURN QUERY SELECT
                    v_partecipazione.partecipazione_id,
                    v_opera.id,
                    COALESCE(v_best_episodio_id, v_partecipazione.episodio_id),
                    v_partecipazione.artista_id,
                    v_partecipazione.ruolo_id,
                    ROUND(v_score_totale, 2)::NUMERIC,
                    v_dettagli;
            END LOOP;
        END IF;

    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.find_opera_candidates(
  p_prog_id uuid,
  p_title_threshold real DEFAULT 0.4,
  p_max_results integer DEFAULT 10
)
RETURNS TABLE(
  opera_id uuid,
  strategy text,
  confidence numeric,
  signals jsonb
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_prog public.programmazioni%ROWTYPE;
BEGIN
  SELECT * INTO v_prog FROM public.programmazioni WHERE id = p_prog_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- 1. Alias hit, emittente-scoped (strict OR loose match)
  RETURN QUERY
  SELECT
    a.opera_id, 'alias_emittente'::text,
    LEAST(1.00, a.confidence)::numeric,
    jsonb_build_object(
      'alias_id', a.id, 'hit_count', a.hit_count, 'source', a.source,
      'matched_on', CASE WHEN a.alias_titolo_norm_strict = v_prog.match_key_strict
                         THEN 'strict' ELSE 'loose' END
    )
  FROM public.opera_aliases a
  JOIN public.opere o_active ON o_active.id = a.opera_id AND o_active.deleted_at IS NULL
  WHERE a.emittente_id = v_prog.emittente_id
    AND (a.alias_titolo_norm_strict = v_prog.match_key_strict
      OR a.alias_titolo_norm        = v_prog.match_key_loose)
  ORDER BY a.hit_count DESC, a.confidence DESC
  LIMIT 5;

  -- 2. Canonical alias (titolo_originale, alias_titoli[]) — emittente=NULL
  RETURN QUERY
  SELECT
    a.opera_id, 'alias_canonical'::text, 0.92::numeric,
    jsonb_build_object(
      'alias_id', a.id, 'source', a.source,
      'matched_on', CASE WHEN a.alias_titolo_norm_strict = v_prog.match_key_strict
                         THEN 'strict' ELSE 'loose' END
    )
  FROM public.opera_aliases a
  JOIN public.opere o_active ON o_active.id = a.opera_id AND o_active.deleted_at IS NULL
  WHERE a.emittente_id IS NULL
    AND (a.alias_titolo_norm_strict = v_prog.match_key_strict
      OR a.alias_titolo_norm        = v_prog.match_key_loose)
  LIMIT 5;

  -- 3. Canonical ID — ISAN
  IF v_prog.metadati_trasmissione ? 'codice_isan' THEN
    RETURN QUERY
    SELECT o.id, 'codice_isan'::text, 1.00::numeric,
           jsonb_build_object('codice_isan', o.codice_isan)
    FROM public.opere o
    WHERE o.deleted_at IS NULL
      AND o.codice_isan = (v_prog.metadati_trasmissione->>'codice_isan')
    LIMIT 3;
  END IF;

  -- 4. Canonical ID — IMDB tconst
  IF v_prog.metadati_trasmissione ? 'imdb_tconst' THEN
    RETURN QUERY
    SELECT o.id, 'imdb_tconst'::text, 1.00::numeric,
           jsonb_build_object('imdb_tconst', o.imdb_tconst)
    FROM public.opere o
    WHERE o.deleted_at IS NULL
      AND o.imdb_tconst = (v_prog.metadati_trasmissione->>'imdb_tconst')
    LIMIT 3;
  END IF;

  -- 5. match_key_strict (preserves sequel/series-with-numeral identity)
  RETURN QUERY
  SELECT o.id, 'match_key_strict'::text, 0.90::numeric,
         jsonb_build_object('match_key', o.match_key_strict, 'titolo', o.titolo)
  FROM public.opere o
  WHERE o.deleted_at IS NULL
    AND o.match_key_strict = v_prog.match_key_strict
    AND v_prog.match_key_strict IS NOT NULL
    AND v_prog.match_key_strict <> ''
  LIMIT 5;

  -- 6. match_key_loose (collapses season-N onto canonical series)
  -- Skip if loose == strict (avoid emitting the same opera with lower confidence)
  RETURN QUERY
  SELECT o.id, 'match_key_loose'::text, 0.85::numeric,
         jsonb_build_object('match_key', o.match_key_loose, 'titolo', o.titolo)
  FROM public.opere o
  WHERE o.deleted_at IS NULL
    AND o.match_key_loose = v_prog.match_key_loose
    AND v_prog.match_key_loose IS NOT NULL
    AND v_prog.match_key_loose <> ''
    AND v_prog.match_key_loose <> v_prog.match_key_strict
  LIMIT 5;

  -- 7. Fuzzy trigram (with anno tolerance ±3)
  RETURN QUERY
  SELECT o.id, 'fuzzy_trgm'::text,
         (0.50 + 0.30 * similarity(LOWER(o.titolo), LOWER(v_prog.titolo)))::numeric,
         jsonb_build_object(
           'similarity', ROUND(similarity(LOWER(o.titolo), LOWER(v_prog.titolo))::numeric, 3),
           'anno_diff',  COALESCE(ABS(o.anno_produzione - v_prog.anno), -1)
         )
  FROM public.opere o
  WHERE o.deleted_at IS NULL
    AND v_prog.titolo IS NOT NULL
    AND LOWER(o.titolo) % LOWER(v_prog.titolo)
    AND similarity(LOWER(o.titolo), LOWER(v_prog.titolo)) >= p_title_threshold
    AND (v_prog.anno IS NULL OR o.anno_produzione IS NULL
         OR ABS(o.anno_produzione - v_prog.anno) <= 3)
  ORDER BY similarity(LOWER(o.titolo), LOWER(v_prog.titolo)) DESC
  LIMIT p_max_results;

  RETURN;
END
$$;

COMMENT ON FUNCTION public.find_opera_candidates IS
  '7-step hierarchical opera matcher (alias_emittente -> alias_canonical -> ISAN -> IMDB -> match_key_strict -> match_key_loose -> fuzzy_trgm). Returns ranked candidates across strategies. Caller picks the top.';

GRANT EXECUTE ON FUNCTION public.find_opera_candidates TO authenticated;


CREATE OR REPLACE FUNCTION public.search_opere_fuzzy(
    query_text TEXT,
    similarity_threshold REAL DEFAULT 0.3
)
RETURNS TABLE (
    id UUID,
    titolo VARCHAR,
    titolo_originale VARCHAR,
    anno_produzione INTEGER,
    similarity_score REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id,
        o.titolo,
        o.titolo_originale,
        o.anno_produzione,
        GREATEST(
            similarity(o.titolo, query_text),
            COALESCE(similarity(o.titolo_originale, query_text), 0)
        ) AS similarity_score
    FROM opere o
    WHERE o.deleted_at IS NULL
      AND (o.search_vector @@ plainto_tsquery('italian', query_text)
         OR o.titolo % query_text
         OR (o.titolo_originale IS NOT NULL AND o.titolo_originale % query_text))
      AND GREATEST(
            similarity(o.titolo, query_text),
            COALESCE(similarity(o.titolo_originale, query_text), 0)
        ) >= similarity_threshold
    ORDER BY similarity_score DESC, o.anno_produzione DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

create or replace function public.get_dashboard_metrics(
  p_first_day date,
  p_last_day date
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with counts as (
  select
    (select count(*) from artisti where stato = 'attivo')::int as artisti_attivi,
    (select count(*) from opere where deleted_at is null)::int as opere_totali,
    (select count(*) from episodi where deleted_at is null)::int as episodi_totali,
    (select count(*) from opere where deleted_at is null and tipo = 'film')::int as opere_film,
    (select count(*) from opere where deleted_at is null and tipo = 'serie_tv')::int as opere_serie_tv,
    (select count(*) from programmazioni where data_trasmissione >= p_first_day and data_trasmissione <= p_last_day)::int as programmazioni_mese,
    (select count(*) from campagne_individuazione where stato = 'in_corso')::int as campagne_attive,
    coalesce((select sum(importo_totale_disponibile::numeric) from campagne_ripartizione where stato = 'distribuita'), 0)::numeric as importo_distribuito,
    (select count(*) from individuazioni)::int as individuazioni_totali,
    (select count(*) from individuazioni where stato <> 'respinto')::int as individuazioni_valide,
    (select count(*) from partecipazioni where deleted_at is null)::int as partecipazioni,
    (select count(*) from campagne_ripartizione)::int as campagne_ripartizione,
    (select created_at from programmazioni order by created_at desc limit 1) as ultimo_dato
),
health as (
  select
    (
      select count(*) from artisti
      where
        coalesce(codice_ipn, '') = ''
        or coalesce(nome, '') = ''
        or coalesce(cognome, '') = ''
        or stato is null
        or coalesce(imdb_nconst, '') = ''
        or data_nascita is null
        or coalesce(codice_fiscale, '') = ''
    )::int as artisti_incompleti,
    (
      select count(*) from opere
      where deleted_at is null
        and (
        coalesce(titolo, '') = ''
        or tipo is null
        or anno_produzione is null
        or coalesce(imdb_tconst, '') = ''
        or coalesce(titolo_originale, '') = ''
        )
    )::int as opere_incomplete,
    (select count(*) from artisti where coalesce(codice_ipn, '') = '')::int as artisti_missing_codice_ipn,
    (select count(*) from artisti where coalesce(nome, '') = '')::int as artisti_missing_nome,
    (select count(*) from artisti where coalesce(cognome, '') = '')::int as artisti_missing_cognome,
    (select count(*) from artisti where stato is null)::int as artisti_missing_stato,
    (select count(*) from artisti where coalesce(imdb_nconst, '') = '')::int as artisti_missing_imdb_nconst,
    (select count(*) from artisti where data_nascita is null)::int as artisti_missing_data_nascita,
    (select count(*) from artisti where coalesce(codice_fiscale, '') = '')::int as artisti_missing_codice_fiscale,
    (select count(*) from opere where deleted_at is null and coalesce(titolo, '') = '')::int as opere_missing_titolo,
    (select count(*) from opere where deleted_at is null and tipo is null)::int as opere_missing_tipo,
    (select count(*) from opere where deleted_at is null and anno_produzione is null)::int as opere_missing_anno_produzione,
    (select count(*) from opere where deleted_at is null and coalesce(imdb_tconst, '') = '')::int as opere_missing_imdb_tconst,
    (select count(*) from opere where deleted_at is null and coalesce(titolo_originale, '') = '')::int as opere_missing_titolo_originale
),
recent as (
  select coalesce(jsonb_agg(item order by (item->>'timestamp')::timestamptz desc), '[]'::jsonb) as items
  from (
    select jsonb_build_object(
      'tipo', 'artista',
      'label', 'Nuovo artista registrato',
      'dettaglio', concat_ws(' ', nome, cognome),
      'timestamp', created_at
    ) as item
    from (select nome, cognome, created_at from artisti order by created_at desc limit 3) a
    union all
    select jsonb_build_object(
      'tipo', 'opera',
      'label', 'Nuova opera catalogata',
      'dettaglio', titolo,
      'timestamp', created_at
    )
    from (select titolo, created_at from opere where deleted_at is null order by created_at desc limit 3) o
    union all
    select jsonb_build_object(
      'tipo', 'campagna_individuazione',
      'label', 'Campagna completata',
      'dettaglio', nome,
      'timestamp', updated_at
    )
    from (select nome, updated_at from campagne_individuazione where stato = 'completata' order by updated_at desc limit 3) ci
    union all
    select jsonb_build_object(
      'tipo', 'campagna_programmazione',
      'label', 'Nuova campagna programmazione',
      'dettaglio', nome,
      'timestamp', created_at
    )
    from (select nome, created_at from campagne_programmazione order by created_at desc limit 3) cp
  ) recent_items
)
select jsonb_build_object(
  'stats', jsonb_build_object(
    'artisti_attivi', counts.artisti_attivi,
    'opere_totali', counts.opere_totali,
    'episodi_totali', counts.episodi_totali,
    'opere_film', counts.opere_film,
    'opere_serie_tv', counts.opere_serie_tv,
    'programmazioni_mese', counts.programmazioni_mese,
    'campagne_attive', counts.campagne_attive,
    'importo_distribuito', counts.importo_distribuito,
    'tasso_matching', case
      when counts.individuazioni_totali > 0
        then round((counts.individuazioni_valide::numeric / counts.individuazioni_totali::numeric) * 100, 1)
      else 0
    end
  ),
  'totalArtisti', counts.artisti_attivi,
  'totalOpere', counts.opere_totali,
  'individuazioniTotal', counts.individuazioni_totali,
  'secondary', jsonb_build_object(
    'attivitaRecenti', coalesce((select items from recent), '[]'::jsonb),
    'statsAggiuntive', jsonb_build_object(
      'individuazioni', counts.individuazioni_totali,
      'partecipazioni', counts.partecipazioni,
      'campagneRipartizione', counts.campagne_ripartizione,
      'ultimoDato', counts.ultimo_dato
    )
  ),
  'health', jsonb_build_object(
    'artistiIncompleti', health.artisti_incompleti,
    'opereIncomplete', health.opere_incomplete,
    'artistiMetrics', jsonb_build_array(
      jsonb_build_object('label', 'Codice IPN', 'missing', health.artisti_missing_codice_ipn, 'total', counts.artisti_attivi),
      jsonb_build_object('label', 'Nome', 'missing', health.artisti_missing_nome, 'total', counts.artisti_attivi),
      jsonb_build_object('label', 'Cognome', 'missing', health.artisti_missing_cognome, 'total', counts.artisti_attivi),
      jsonb_build_object('label', 'Stato', 'missing', health.artisti_missing_stato, 'total', counts.artisti_attivi),
      jsonb_build_object('label', 'IMDB nconst', 'missing', health.artisti_missing_imdb_nconst, 'total', counts.artisti_attivi),
      jsonb_build_object('label', 'Data nascita', 'missing', health.artisti_missing_data_nascita, 'total', counts.artisti_attivi),
      jsonb_build_object('label', 'Codice fiscale', 'missing', health.artisti_missing_codice_fiscale, 'total', counts.artisti_attivi)
    ),
    'opereMetrics', jsonb_build_array(
      jsonb_build_object('label', 'Titolo', 'missing', health.opere_missing_titolo, 'total', counts.opere_totali),
      jsonb_build_object('label', 'Tipo', 'missing', health.opere_missing_tipo, 'total', counts.opere_totali),
      jsonb_build_object('label', 'Anno produzione', 'missing', health.opere_missing_anno_produzione, 'total', counts.opere_totali),
      jsonb_build_object('label', 'IMDB tconst', 'missing', health.opere_missing_imdb_tconst, 'total', counts.opere_totali),
      jsonb_build_object('label', 'Titolo originale', 'missing', health.opere_missing_titolo_originale, 'total', counts.opere_totali)
    )
  )
)
from counts, health;
$$;

grant execute on function public.get_dashboard_metrics(date, date) to authenticated;
