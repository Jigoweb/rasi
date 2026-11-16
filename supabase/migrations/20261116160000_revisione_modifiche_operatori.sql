-- Fase 2b: revisione delle modifiche di Operatore base e Tirocinante
-- (resoconto RASI del 26/10, C5; scelta di Matteo del 16/11: «revisione e validazione»).
--
-- Base e tirocinante scrivono direttamente, ma solo su opere non validate
-- (20261112090100). Un Operatore pro rivede le loro modifiche dalla pagina
-- «Da approvare»: per ogni modifica vede prima/dopo, può ripristinarla, e alla
-- fine approva e valida l'opera.
--
-- Le modifiche sono quelle già registrate in audit_log (trigger su opere,
-- episodi, partecipazioni, cast_esterno, partecipazioni_note). audit_log resta
-- leggibile solo dall'admin: il pro accede tramite le funzioni qui sotto
-- (SECURITY DEFINER, controllo is_staff()).

CREATE TABLE IF NOT EXISTS public.revisioni_modifiche (
  audit_log_id    bigint PRIMARY KEY REFERENCES public.audit_log(id) ON DELETE CASCADE,
  opera_id        uuid,
  esito           text NOT NULL CHECK (esito IN ('approvata', 'ripristinata')),
  revisionata_da  uuid,
  revisionata_il  timestamptz NOT NULL DEFAULT now(),
  nota            text
);

CREATE INDEX IF NOT EXISTS idx_revisioni_modifiche_opera ON public.revisioni_modifiche(opera_id);

ALTER TABLE public.revisioni_modifiche ENABLE ROW LEVEL SECURITY;
-- Nessuna policy: si legge e si scrive solo con le funzioni qui sotto.
REVOKE ALL ON public.revisioni_modifiche FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.revisioni_modifiche TO service_role;

-- Tabelle della sezione Opere e chiave della riga registrata in audit_log.record_id.
CREATE OR REPLACE FUNCTION public.revisione_tabelle_opere()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ARRAY['opere', 'episodi', 'partecipazioni', 'cast_esterno', 'partecipazioni_note']
$$;

-- Colonne mai ripristinate: identità e campi di sistema.
CREATE OR REPLACE FUNCTION public.revisione_colonne_escluse()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ARRAY[
    'id', 'partecipazione_id', 'created_at', 'created_by', 'updated_at', 'updated_by',
    'search_vector', 'match_key', 'match_key_loose', 'match_key_strict', 'alias_titolo_norm_strict',
    'stato_validazione'
  ]
$$;

-- Opere con modifiche di base/tirocinante non ancora revisionate.
CREATE OR REPLACE FUNCTION public.lista_opere_da_approvare()
RETURNS TABLE (
  opera_id uuid,
  titolo text,
  stato_validazione text,
  modifiche bigint,
  autori text[],
  ultima_modifica timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Solo amministratori e Operatori pro rivedono le modifiche' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    l.opera_id,
    o.titolo::text,
    o.stato_validazione::text,
    count(*)::bigint,
    array_agg(DISTINCT COALESCE(l.user_email, l.user_id::text)),
    max(l.occurred_at)
  FROM public.audit_log l
  JOIN public.opere o ON o.id = l.opera_id
  LEFT JOIN public.revisioni_modifiche r ON r.audit_log_id = l.id
  WHERE r.audit_log_id IS NULL
    AND l.user_ruolo IN ('operatore_base', 'tirocinante')
    AND l.tabella = ANY (public.revisione_tabelle_opere())
    AND l.opera_id IS NOT NULL
  GROUP BY l.opera_id, o.titolo, o.stato_validazione
  ORDER BY max(l.occurred_at) DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.conta_opere_da_approvare()
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.is_staff() THEN
    RETURN 0;
  END IF;
  SELECT count(DISTINCT l.opera_id)::integer INTO v_count
  FROM public.audit_log l
  LEFT JOIN public.revisioni_modifiche r ON r.audit_log_id = l.id
  WHERE r.audit_log_id IS NULL
    AND l.user_ruolo IN ('operatore_base', 'tirocinante')
    AND l.tabella = ANY (public.revisione_tabelle_opere())
    AND l.opera_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.opere o WHERE o.id = l.opera_id);
  RETURN v_count;
END;
$$;

-- Modifiche di base/tirocinante su un'opera (anche quelle già revisionate, con l'esito).
CREATE OR REPLACE FUNCTION public.lista_modifiche_opera(p_opera_id uuid)
RETURNS TABLE (
  id bigint,
  occurred_at timestamptz,
  user_email text,
  user_ruolo text,
  azione text,
  tabella text,
  record_id text,
  record_label text,
  campi_modificati text[],
  old_data jsonb,
  new_data jsonb,
  esito text,
  revisionata_il timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Solo amministratori e Operatori pro rivedono le modifiche' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    l.id, l.occurred_at, l.user_email, l.user_ruolo, l.azione, l.tabella, l.record_id, l.record_label,
    l.campi_modificati, l.old_data, l.new_data, r.esito, r.revisionata_il
  FROM public.audit_log l
  LEFT JOIN public.revisioni_modifiche r ON r.audit_log_id = l.id
  WHERE l.opera_id = p_opera_id
    AND l.user_ruolo IN ('operatore_base', 'tirocinante')
    AND l.tabella = ANY (public.revisione_tabelle_opere())
  ORDER BY (r.audit_log_id IS NOT NULL), l.occurred_at DESC, l.id DESC
  LIMIT 1000;
END;
$$;

-- Ripristina una singola modifica. Rifiuta se nel frattempo la riga è cambiata.
CREATE OR REPLACE FUNCTION public.ripristina_modifica(p_audit_log_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l public.audit_log%ROWTYPE;
  v_key text;
  v_current jsonb;
  v_cols text[];
  v_col text;
  v_table_cols text[];
  v_sql text;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Solo amministratori e Operatori pro ripristinano le modifiche' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO l FROM public.audit_log WHERE audit_log.id = p_audit_log_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Modifica non trovata' USING ERRCODE = 'P0002';
  END IF;
  IF l.user_ruolo NOT IN ('operatore_base', 'tirocinante') OR NOT (l.tabella = ANY (public.revisione_tabelle_opere())) THEN
    RAISE EXCEPTION 'Questa modifica non è tra quelle da rivedere' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.revisioni_modifiche r WHERE r.audit_log_id = p_audit_log_id) THEN
    RAISE EXCEPTION 'Modifica già revisionata' USING ERRCODE = '22023';
  END IF;

  v_key := CASE WHEN l.tabella = 'partecipazioni_note' THEN 'partecipazione_id' ELSE 'id' END;

  SELECT array_agg(a.attname::text)
  INTO v_table_cols
  FROM pg_attribute a
  WHERE a.attrelid = format('public.%I', l.tabella)::regclass
    AND a.attnum > 0 AND NOT a.attisdropped AND a.attgenerated = '';

  EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE t.%I = $1::uuid', l.tabella, v_key)
    INTO v_current USING l.record_id;

  IF l.azione = 'UPDATE' THEN
    IF v_current IS NULL THEN
      RAISE EXCEPTION 'La riga non esiste più: impossibile ripristinare' USING ERRCODE = '40001';
    END IF;
    SELECT array_agg(c) INTO v_cols
    FROM unnest(l.campi_modificati) AS c
    WHERE c = ANY (v_table_cols) AND NOT (c = ANY (public.revisione_colonne_escluse()));
    IF v_cols IS NULL THEN
      RAISE EXCEPTION 'Nessun campo da ripristinare' USING ERRCODE = '22023';
    END IF;
    FOREACH v_col IN ARRAY v_cols LOOP
      IF (v_current -> v_col) IS DISTINCT FROM (l.new_data -> v_col) THEN
        RAISE EXCEPTION 'Il campo «%» è stato cambiato di nuovo dopo questa modifica: ripristino annullato', v_col
          USING ERRCODE = '40001';
      END IF;
    END LOOP;
    SELECT string_agg(format('%I = r.%I', c, c), ', ') INTO v_sql FROM unnest(v_cols) AS c;
    EXECUTE format(
      'UPDATE public.%I t SET %s FROM jsonb_populate_record(NULL::public.%I, $1) r WHERE t.%I = $2::uuid',
      l.tabella, v_sql, l.tabella, v_key
    ) USING l.old_data, l.record_id;

  ELSIF l.azione = 'INSERT' THEN
    IF v_current IS NULL THEN
      RAISE EXCEPTION 'La riga è già stata eliminata' USING ERRCODE = '40001';
    END IF;
    EXECUTE format('DELETE FROM public.%I WHERE %I = $1::uuid', l.tabella, v_key) USING l.record_id;

  ELSIF l.azione = 'DELETE' THEN
    IF v_current IS NOT NULL THEN
      RAISE EXCEPTION 'La riga esiste già: impossibile reinserirla' USING ERRCODE = '40001';
    END IF;
    IF l.old_data IS NULL THEN
      RAISE EXCEPTION 'Dati della riga eliminata non disponibili' USING ERRCODE = '22023';
    END IF;
    SELECT array_agg(k) INTO v_cols
    FROM jsonb_object_keys(l.old_data) AS k
    WHERE k = ANY (v_table_cols) AND k NOT IN ('search_vector');
    SELECT string_agg(format('%I', c), ', '), string_agg(format('r.%I', c), ', ')
    INTO v_sql, v_col
    FROM unnest(v_cols) AS c;
    EXECUTE format(
      'INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I, $1) r',
      l.tabella, v_sql, v_col, l.tabella
    ) USING l.old_data;
  ELSE
    RAISE EXCEPTION 'Azione non ripristinabile' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.revisioni_modifiche (audit_log_id, opera_id, esito, revisionata_da)
  VALUES (l.id, l.opera_id, 'ripristinata', auth.uid());

  RETURN jsonb_build_object('ripristinata', true, 'tabella', l.tabella, 'azione', l.azione);
END;
$$;

-- Approva tutte le modifiche non revisionate di un'opera; con p_valida porta
-- l'opera a «validato» (consentito: chi chiama è staff).
CREATE OR REPLACE FUNCTION public.approva_modifiche_opera(p_opera_id uuid, p_valida boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approvate integer;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Solo amministratori e Operatori pro approvano le modifiche' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.opere WHERE id = p_opera_id) THEN
    RAISE EXCEPTION 'Opera non trovata' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.revisioni_modifiche (audit_log_id, opera_id, esito, revisionata_da)
  SELECT l.id, l.opera_id, 'approvata', auth.uid()
  FROM public.audit_log l
  LEFT JOIN public.revisioni_modifiche r ON r.audit_log_id = l.id
  WHERE r.audit_log_id IS NULL
    AND l.opera_id = p_opera_id
    AND l.user_ruolo IN ('operatore_base', 'tirocinante')
    AND l.tabella = ANY (public.revisione_tabelle_opere());
  GET DIAGNOSTICS v_approvate = ROW_COUNT;

  IF p_valida THEN
    UPDATE public.opere
    SET stato_validazione = 'validato'::public.stato_validazione
    WHERE id = p_opera_id AND stato_validazione IS DISTINCT FROM 'validato'::public.stato_validazione;
  END IF;

  RETURN jsonb_build_object('approvate', v_approvate, 'validata', p_valida);
END;
$$;

REVOKE ALL ON FUNCTION public.revisione_tabelle_opere() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revisione_colonne_escluse() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lista_opere_da_approvare() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.conta_opere_da_approvare() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lista_modifiche_opera(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ripristina_modifica(bigint) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approva_modifiche_opera(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revisione_tabelle_opere() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revisione_colonne_escluse() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.lista_opere_da_approvare() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.conta_opere_da_approvare() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.lista_modifiche_opera(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ripristina_modifica(bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approva_modifiche_opera(uuid, boolean) TO authenticated, service_role;
