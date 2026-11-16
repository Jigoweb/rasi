-- Fase 2b (piano 2026-11-11, punto C5): coda di approvazione.
-- Richiede 20261112090100 (ruoli operatore_base / tirocinante e is_staff()).
--
-- Operatore base e Tirocinante non scrivono più direttamente su opere,
-- episodi, partecipazioni e cast esterno: inviano una proposta.
-- Admin e Operatore pro approvano o respingono. Su un'opera validata
-- la proposta è rifiutata, in invio e in approvazione.
-- Le note delle partecipazioni restano una scrittura diretta (fase 2a):
-- non sono un'entità della coda.
-- L'entità artista è nel vincolo della tabella (la userà la fase 3) ma
-- proponi_modifica la rifiuta.
-- Eliminare un'opera non si propone: resta solo admin / Operatore pro.
--
-- validato_da / validato_il si compilano quando lo stato diventa
-- «validato». Non si azzerano se l'opera torna da validare.

DO $preflight$
BEGIN
  IF to_regprocedure('public.is_staff()') IS NULL
     OR to_regprocedure('public.get_user_role()') IS NULL THEN
    RAISE EXCEPTION 'funzioni di ruolo assenti: applicare prima 20261112090100_restrizioni_ruoli_operatore.sql';
  END IF;
END
$preflight$;

-- ---------------------------------------------------------------------------
-- 1) Chi ha validato l'opera
-- ---------------------------------------------------------------------------

ALTER TABLE public.opere
  ADD COLUMN IF NOT EXISTS validato_da uuid,
  ADD COLUMN IF NOT EXISTS validato_il timestamptz;

COMMENT ON COLUMN public.opere.validato_da IS
  'Utente che ha portato l''opera allo stato validato. Resta valorizzato anche se l''opera torna da validare.';
COMMENT ON COLUMN public.opere.validato_il IS
  'Istante dell''ultima transizione a validato.';

CREATE OR REPLACE FUNCTION public.opere_registra_validazione()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.stato_validazione = 'validato'::public.stato_validazione
     AND (
       TG_OP = 'INSERT'
       OR OLD.stato_validazione IS DISTINCT FROM 'validato'::public.stato_validazione
     )
     AND public.is_staff() THEN
    NEW.validato_da := auth.uid();
    NEW.validato_il := now();
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.opere_registra_validazione() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS opere_registra_validazione ON public.opere;
CREATE TRIGGER opere_registra_validazione
  BEFORE INSERT OR UPDATE ON public.opere
  FOR EACH ROW
  EXECUTE FUNCTION public.opere_registra_validazione();

-- ---------------------------------------------------------------------------
-- 2) Tabella proposte
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.modifiche_proposte (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entita           text NOT NULL CHECK (entita IN ('opera', 'episodio', 'partecipazione', 'cast_esterno', 'artista')),
  entita_id        uuid,
  opera_id         uuid,
  operazione       text NOT NULL CHECK (operazione IN ('insert', 'update', 'delete')),
  payload          jsonb NOT NULL,
  stato            text NOT NULL DEFAULT 'in_attesa' CHECK (stato IN ('in_attesa', 'approvata', 'respinta')),
  proposta_da      uuid NOT NULL,
  revisionata_da   uuid,
  nota_revisione   text,
  creata_il        timestamptz NOT NULL DEFAULT now(),
  revisionata_il   timestamptz,
  CONSTRAINT modifiche_proposte_payload_oggetto CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT modifiche_proposte_nota_lunghezza CHECK (nota_revisione IS NULL OR char_length(nota_revisione) <= 2000)
);

COMMENT ON TABLE public.modifiche_proposte IS
  'Coda delle modifiche di Operatore base e Tirocinante. Il payload tiene i campi cambiati e i valori precedenti.';

CREATE INDEX IF NOT EXISTS idx_modifiche_proposte_in_attesa
  ON public.modifiche_proposte (creata_il)
  WHERE stato = 'in_attesa';
CREATE INDEX IF NOT EXISTS idx_modifiche_proposte_proposta_da
  ON public.modifiche_proposte (proposta_da, creata_il DESC);
CREATE INDEX IF NOT EXISTS idx_modifiche_proposte_opera
  ON public.modifiche_proposte (opera_id, creata_il DESC)
  WHERE opera_id IS NOT NULL;

ALTER TABLE public.modifiche_proposte ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS modifiche_proposte_select ON public.modifiche_proposte;
CREATE POLICY modifiche_proposte_select ON public.modifiche_proposte
  FOR SELECT
  TO authenticated
  USING (
    proposta_da = (SELECT auth.uid())
    OR (SELECT public.is_staff())
  );

REVOKE ALL ON TABLE public.modifiche_proposte FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.modifiche_proposte TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Whitelist e applicazione del payload
-- ---------------------------------------------------------------------------
-- Le chiavi sono il contratto condiviso con
-- src/features/approvazioni/lib/modifica-payload.ts

CREATE OR REPLACE FUNCTION public.modifica_colonne_consentite(p_entita text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_entita
    WHEN 'opera' THEN jsonb_build_object(
      'titolo', 'text',
      'titolo_originale', 'text',
      'alias_titoli', 'text[]',
      'tipo', 'tipo_opera',
      'has_episodes', 'bool',
      'anno_produzione', 'int',
      'anno_produzione_fine', 'int',
      'regista', 'text[]',
      'codice_isan', 'text',
      'codice_opera', 'text',
      'imdb_tconst', 'text',
      'codici_esterni', 'jsonb',
      'durata_minuti', 'int',
      'dettagli_serie', 'jsonb',
      'metadati', 'jsonb'
    )
    WHEN 'episodio' THEN jsonb_build_object(
      'opera_id', 'uuid',
      'numero_stagione', 'int',
      'numero_episodio', 'int',
      'titolo_episodio', 'text',
      'titolo_episodio_originale', 'text',
      'alias_titoli', 'text[]',
      'descrizione', 'text',
      'durata_minuti', 'int',
      'data_prima_messa_in_onda', 'date',
      'imdb_tconst', 'text',
      'codice_isan', 'text',
      'metadati', 'jsonb'
    )
    WHEN 'partecipazione' THEN jsonb_build_object(
      'artista_id', 'uuid',
      'opera_id', 'uuid',
      'ruolo_id', 'uuid',
      'episodio_id', 'uuid',
      'personaggio', 'text'
    )
    WHEN 'cast_esterno' THEN jsonb_build_object(
      'opera_id', 'uuid',
      'episodio_id', 'uuid',
      'nome', 'text',
      'personaggio', 'text',
      'primarieta', 'primarieta_cast',
      'ruolo', 'text',
      'ruolo_id', 'uuid',
      'imdb_nconst', 'text',
      'codice_ipn', 'text',
      'fonte', 'text',
      'ordine', 'int'
    )
    ELSE NULL
  END
$$;

REVOKE ALL ON FUNCTION public.modifica_colonne_consentite(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.modifica_espressione(p_tipo text, p_chiave text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_cast text;
BEGIN
  IF p_tipo = 'text[]' THEN
    RETURN format(
      'CASE jsonb_typeof($1 -> %1$L) WHEN ''array'' THEN ARRAY(SELECT jsonb_array_elements_text($1 -> %1$L)) WHEN ''null'' THEN NULL::text[] ELSE NULL::text[] END',
      p_chiave
    );
  ELSIF p_tipo = 'jsonb' THEN
    RETURN format(
      'CASE jsonb_typeof($1 -> %1$L) WHEN ''null'' THEN NULL::jsonb ELSE ($1 -> %1$L) END',
      p_chiave
    );
  END IF;

  v_cast := CASE p_tipo
    WHEN 'text' THEN 'text'
    WHEN 'int' THEN 'integer'
    WHEN 'bool' THEN 'boolean'
    WHEN 'uuid' THEN 'uuid'
    WHEN 'date' THEN 'date'
    WHEN 'tipo_opera' THEN 'public.tipo_opera'
    WHEN 'primarieta_cast' THEN 'public.primarieta_cast'
    ELSE NULL
  END;
  IF v_cast IS NULL THEN
    RAISE EXCEPTION 'tipo colonna sconosciuto: %', p_tipo USING ERRCODE = '22023';
  END IF;
  RETURN format(
    'CASE jsonb_typeof($1 -> %1$L) WHEN ''null'' THEN NULL::%2$s ELSE ($1 ->> %1$L)::%2$s END',
    p_chiave,
    v_cast
  );
END;
$$;

REVOKE ALL ON FUNCTION public.modifica_espressione(text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.modifica_controlla_dopo(p_dopo jsonb, p_tipi jsonb)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_tipo text;
  v_kind text;
BEGIN
  IF p_dopo IS NULL OR jsonb_typeof(p_dopo) <> 'object' THEN
    RAISE EXCEPTION 'Il payload dopo non è un oggetto' USING ERRCODE = '22023';
  END IF;
  FOR v_key IN SELECT jsonb_object_keys(p_dopo) LOOP
    IF NOT (p_tipi ? v_key) THEN
      RAISE EXCEPTION 'Campo non consentito: %', v_key USING ERRCODE = '22023';
    END IF;
    v_tipo := p_tipi ->> v_key;
    v_kind := jsonb_typeof(p_dopo -> v_key);
    IF v_tipo = 'text[]' AND v_kind NOT IN ('array', 'null') THEN
      RAISE EXCEPTION 'Il campo % deve essere un elenco', v_key USING ERRCODE = '22023';
    ELSIF v_tipo = 'jsonb' AND v_kind NOT IN ('object', 'array', 'null') THEN
      RAISE EXCEPTION 'Il campo % non ha un valore ammesso', v_key USING ERRCODE = '22023';
    ELSIF v_tipo NOT IN ('text[]', 'jsonb') AND v_kind NOT IN ('string', 'number', 'boolean', 'null') THEN
      RAISE EXCEPTION 'Il campo % non ha un valore ammesso', v_key USING ERRCODE = '22023';
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.modifica_controlla_dopo(jsonb, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.modifica_applica_dopo(
  p_tabella text,
  p_id uuid,
  p_dopo jsonb,
  p_tipi jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_sets text := '';
  v_cols text := '';
  v_vals text := '';
  v_sql text;
  v_new uuid;
  v_n integer;
BEGIN
  IF p_tabella NOT IN ('opere', 'episodi', 'partecipazioni', 'cast_esterno') THEN
    RAISE EXCEPTION 'tabella non consentita' USING ERRCODE = '22023';
  END IF;
  PERFORM public.modifica_controlla_dopo(p_dopo, p_tipi);
  IF p_dopo = '{}'::jsonb THEN
    RAISE EXCEPTION 'Nessun campo da scrivere' USING ERRCODE = '22023';
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_dopo) LOOP
    IF p_id IS NULL THEN
      v_cols := v_cols || CASE WHEN v_cols = '' THEN '' ELSE ', ' END || quote_ident(v_key);
      v_vals := v_vals || CASE WHEN v_vals = '' THEN '' ELSE ', ' END
        || public.modifica_espressione(p_tipi ->> v_key, v_key);
    ELSE
      v_sets := v_sets || CASE WHEN v_sets = '' THEN '' ELSE ', ' END
        || quote_ident(v_key) || ' = ' || public.modifica_espressione(p_tipi ->> v_key, v_key);
    END IF;
  END LOOP;

  IF p_id IS NULL THEN
    v_sql := 'INSERT INTO public.' || quote_ident(p_tabella) || ' (' || v_cols || ') VALUES (' || v_vals || ') RETURNING id';
    EXECUTE v_sql INTO v_new USING p_dopo;
    RETURN v_new;
  END IF;

  v_sql := 'UPDATE public.' || quote_ident(p_tabella) || ' SET ' || v_sets || ' WHERE id = $2';
  EXECUTE v_sql USING p_dopo, p_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Riga non trovata' USING ERRCODE = 'P0002';
  END IF;
  RETURN p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.modifica_applica_dopo(text, uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.modifica_tabella(p_entita text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_entita
    WHEN 'opera' THEN 'opere'
    WHEN 'episodio' THEN 'episodi'
    WHEN 'partecipazione' THEN 'partecipazioni'
    WHEN 'cast_esterno' THEN 'cast_esterno'
    ELSE NULL
  END
$$;

REVOKE ALL ON FUNCTION public.modifica_tabella(text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) RPC
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.proponi_modifica(
  p_entita text,
  p_operazione text,
  p_payload jsonb,
  p_entita_id uuid DEFAULT NULL,
  p_opera_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ruolo public.ruolo_utente := public.get_user_role();
  v_uid uuid := auth.uid();
  v_tipi jsonb;
  v_tabella text;
  v_row jsonb;
  v_dopo jsonb;
  v_prima jsonb := '{}'::jsonb;
  v_key text;
  v_stored jsonb;
  v_righe jsonb := '[]'::jsonb;
  v_riga jsonb;
  v_riga_entita text;
  v_riga_op text;
  v_riga_id uuid;
  v_riga_dopo jsonb;
  v_riga_prima jsonb;
  v_parent_entita text;
  v_id uuid;
  v_stato public.stato_validazione;
  v_opera uuid;
BEGIN
  IF v_uid IS NULL OR v_ruolo IS NULL THEN
    RAISE EXCEPTION 'Autenticazione richiesta' USING ERRCODE = '42501';
  END IF;
  IF v_ruolo IS DISTINCT FROM 'operatore_base'::public.ruolo_utente
     AND v_ruolo IS DISTINCT FROM 'tirocinante'::public.ruolo_utente THEN
    RAISE EXCEPTION 'Solo Operatore base e Tirocinante inviano proposte' USING ERRCODE = '42501';
  END IF;
  IF p_entita IS NULL OR NOT (p_entita = ANY (ARRAY['opera', 'episodio', 'partecipazione', 'cast_esterno'])) THEN
    RAISE EXCEPTION 'Entità non proponibile' USING ERRCODE = '22023';
  END IF;
  IF p_operazione IS NULL OR NOT (p_operazione = ANY (ARRAY['insert', 'update', 'delete'])) THEN
    RAISE EXCEPTION 'Operazione non valida' USING ERRCODE = '22023';
  END IF;
  IF p_entita = 'opera' AND p_operazione = 'delete' THEN
    RAISE EXCEPTION 'Non si può proporre l''eliminazione di un''opera' USING ERRCODE = '42501';
  END IF;
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Payload non valido' USING ERRCODE = '22023';
  END IF;

  IF COALESCE(p_payload->>'batch', 'false') = 'true' THEN
    IF jsonb_typeof(p_payload->'righe') <> 'array' OR jsonb_array_length(p_payload->'righe') = 0 THEN
      RAISE EXCEPTION 'La proposta batch non ha righe' USING ERRCODE = '22023';
    END IF;
    IF jsonb_array_length(p_payload->'righe') > 5000 THEN
      RAISE EXCEPTION 'La proposta batch supera le 5000 righe' USING ERRCODE = '22023';
    END IF;
    IF p_opera_id IS NULL THEN
      RAISE EXCEPTION 'La proposta batch richiede l''opera' USING ERRCODE = '22023';
    END IF;
    PERFORM public.modifica_rifiuta_se_validata(p_opera_id);

    FOR v_riga IN SELECT value FROM jsonb_array_elements(p_payload->'righe') LOOP
      v_riga_entita := COALESCE(v_riga->>'entita', p_entita);
      v_riga_op := COALESCE(v_riga->>'operazione', p_operazione);
      v_riga_id := NULLIF(v_riga->>'entita_id', '')::uuid;
      v_riga_dopo := COALESCE(v_riga->'dopo', '{}'::jsonb);
      IF v_riga_entita IS NULL
         OR NOT (v_riga_entita = ANY (ARRAY['opera', 'episodio', 'partecipazione', 'cast_esterno']))
         OR v_riga_op IS NULL
         OR NOT (v_riga_op = ANY (ARRAY['insert', 'update', 'delete'])) THEN
        RAISE EXCEPTION 'Riga batch non valida' USING ERRCODE = '22023';
      END IF;
      IF v_riga_entita = 'opera' AND v_riga_op = 'delete' THEN
        RAISE EXCEPTION 'Non si può proporre l''eliminazione di un''opera' USING ERRCODE = '42501';
      END IF;
      v_tipi := public.modifica_colonne_consentite(v_riga_entita);
      v_tabella := public.modifica_tabella(v_riga_entita);
      v_riga_prima := '{}'::jsonb;

      IF v_riga_op = 'insert' THEN
        PERFORM public.modifica_controlla_dopo(v_riga_dopo, v_tipi);
        PERFORM public.modifica_richiede_campi(v_riga_entita, v_riga_dopo);
        IF v_riga_entita <> 'opera' AND (v_riga_dopo->>'opera_id')::uuid IS DISTINCT FROM p_opera_id THEN
          RAISE EXCEPTION 'La riga non appartiene all''opera indicata' USING ERRCODE = '22023';
        END IF;
      ELSE
        IF v_riga_id IS NULL THEN
          RAISE EXCEPTION 'Manca l''id della riga da modificare' USING ERRCODE = '22023';
        END IF;
        EXECUTE 'SELECT to_jsonb(t) FROM public.' || quote_ident(v_tabella) || ' t WHERE id = $1'
          INTO v_row USING v_riga_id;
        IF v_row IS NULL THEN
          RAISE EXCEPTION 'Riga non trovata' USING ERRCODE = 'P0002';
        END IF;
        IF v_riga_entita = 'opera' THEN
          IF v_riga_id IS DISTINCT FROM p_opera_id THEN
            RAISE EXCEPTION 'La riga non appartiene all''opera indicata' USING ERRCODE = '22023';
          END IF;
        ELSIF (v_row->>'opera_id')::uuid IS DISTINCT FROM p_opera_id THEN
          RAISE EXCEPTION 'La riga non appartiene all''opera indicata' USING ERRCODE = '22023';
        END IF;
        IF v_riga_op = 'update' THEN
          PERFORM public.modifica_controlla_dopo(v_riga_dopo, v_tipi);
          IF v_riga_dopo = '{}'::jsonb THEN
            RAISE EXCEPTION 'Nessun campo da aggiornare' USING ERRCODE = '22023';
          END IF;
        ELSE
          v_riga_dopo := '{}'::jsonb;
        END IF;
        FOR v_key IN SELECT jsonb_object_keys(v_tipi) LOOP
          IF v_riga_op = 'delete' OR v_riga_dopo ? v_key THEN
            v_riga_prima := v_riga_prima || jsonb_build_object(v_key, v_row->v_key);
          END IF;
        END LOOP;
      END IF;

      v_righe := v_righe || jsonb_build_array(jsonb_build_object(
        'entita', v_riga_entita,
        'operazione', v_riga_op,
        'entita_id', v_riga_id,
        'prima', v_riga_prima,
        'dopo', v_riga_dopo
      ));
    END LOOP;

    v_parent_entita := v_righe->0->>'entita';
    v_stored := jsonb_build_object('batch', true, 'righe', v_righe);
    INSERT INTO public.modifiche_proposte (
      entita, entita_id, opera_id, operazione, payload, stato, proposta_da
    ) VALUES (
      v_parent_entita, NULL, p_opera_id, p_operazione, v_stored, 'in_attesa', v_uid
    ) RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  -- Proposta singola.
  v_tipi := public.modifica_colonne_consentite(p_entita);
  v_tabella := public.modifica_tabella(p_entita);
  v_dopo := COALESCE(p_payload->'dopo', '{}'::jsonb);

  IF p_operazione = 'insert' THEN
    IF p_entita_id IS NOT NULL THEN
      RAISE EXCEPTION 'Un inserimento non ha ancora un id' USING ERRCODE = '22023';
    END IF;
    PERFORM public.modifica_controlla_dopo(v_dopo, v_tipi);
    PERFORM public.modifica_richiede_campi(p_entita, v_dopo);
    IF p_entita = 'opera' THEN
      v_opera := NULL;
    ELSE
      IF p_opera_id IS NULL OR (v_dopo->>'opera_id')::uuid IS DISTINCT FROM p_opera_id THEN
        RAISE EXCEPTION 'La riga non appartiene all''opera indicata' USING ERRCODE = '22023';
      END IF;
      PERFORM public.modifica_rifiuta_se_validata(p_opera_id);
    END IF;
  ELSE
    IF p_entita_id IS NULL THEN
      RAISE EXCEPTION 'Manca l''id della riga' USING ERRCODE = '22023';
    END IF;
    EXECUTE 'SELECT to_jsonb(t) FROM public.' || quote_ident(v_tabella) || ' t WHERE id = $1'
      INTO v_row USING p_entita_id;
    IF v_row IS NULL THEN
      RAISE EXCEPTION 'Riga non trovata' USING ERRCODE = 'P0002';
    END IF;
    IF p_entita = 'opera' THEN
      IF p_opera_id IS NOT NULL AND p_opera_id IS DISTINCT FROM p_entita_id THEN
        RAISE EXCEPTION 'La riga non appartiene all''opera indicata' USING ERRCODE = '22023';
      END IF;
      v_opera := p_entita_id;
    ELSE
      v_opera := (v_row->>'opera_id')::uuid;
      IF p_opera_id IS NOT NULL AND p_opera_id IS DISTINCT FROM v_opera THEN
        RAISE EXCEPTION 'La riga non appartiene all''opera indicata' USING ERRCODE = '22023';
      END IF;
    END IF;
    PERFORM public.modifica_rifiuta_se_validata(v_opera);
    IF p_operazione = 'update' THEN
      PERFORM public.modifica_controlla_dopo(v_dopo, v_tipi);
      IF v_dopo = '{}'::jsonb THEN
        RAISE EXCEPTION 'Nessun campo da aggiornare' USING ERRCODE = '22023';
      END IF;
      FOR v_key IN SELECT jsonb_object_keys(v_dopo) LOOP
        v_prima := v_prima || jsonb_build_object(v_key, v_row->v_key);
      END LOOP;
    ELSE
      v_dopo := '{}'::jsonb;
      FOR v_key IN SELECT jsonb_object_keys(v_tipi) LOOP
        v_prima := v_prima || jsonb_build_object(v_key, v_row->v_key);
      END LOOP;
    END IF;
    p_opera_id := v_opera;
  END IF;

  v_stored := jsonb_build_object('prima', v_prima, 'dopo', v_dopo);
  INSERT INTO public.modifiche_proposte (
    entita, entita_id, opera_id, operazione, payload, stato, proposta_da
  ) VALUES (
    p_entita, p_entita_id, p_opera_id, p_operazione, v_stored, 'in_attesa', v_uid
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.modifica_rifiuta_se_validata(p_opera_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stato public.stato_validazione;
BEGIN
  SELECT o.stato_validazione INTO v_stato FROM public.opere o WHERE o.id = p_opera_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Opera non trovata' USING ERRCODE = 'P0002';
  END IF;
  IF v_stato = 'validato'::public.stato_validazione THEN
    RAISE EXCEPTION 'Opera validata: la modifica non si può proporre né approvare' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.modifica_richiede_campi(p_entita text, p_dopo jsonb)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF p_entita = 'opera' AND (NULLIF(btrim(p_dopo->>'titolo'), '') IS NULL OR NULLIF(p_dopo->>'tipo', '') IS NULL) THEN
    RAISE EXCEPTION 'Titolo e tipo sono obbligatori' USING ERRCODE = '22023';
  ELSIF p_entita = 'episodio' AND (
    NULLIF(p_dopo->>'opera_id', '') IS NULL
    OR NULLIF(p_dopo->>'numero_stagione', '') IS NULL
    OR NULLIF(p_dopo->>'numero_episodio', '') IS NULL
  ) THEN
    RAISE EXCEPTION 'Opera, stagione e numero episodio sono obbligatori' USING ERRCODE = '22023';
  ELSIF p_entita = 'partecipazione' AND (
    NULLIF(p_dopo->>'artista_id', '') IS NULL
    OR NULLIF(p_dopo->>'opera_id', '') IS NULL
    OR NULLIF(p_dopo->>'ruolo_id', '') IS NULL
  ) THEN
    RAISE EXCEPTION 'Artista, opera e ruolo sono obbligatori' USING ERRCODE = '22023';
  ELSIF p_entita = 'cast_esterno' AND (
    NULLIF(p_dopo->>'opera_id', '') IS NULL
    OR NULLIF(btrim(p_dopo->>'nome'), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'Opera e nome sono obbligatori' USING ERRCODE = '22023';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.modifica_rifiuta_se_validata(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.modifica_richiede_campi(text, jsonb) FROM PUBLIC, anon, authenticated;

-- proponi chiama le due funzioni sopra: vanno create prima, ma in PL/pgSQL
-- il corpo si risolve all'esecuzione. L'ordine di CREATE è comunque valido
-- perché proponi è già stato creato e le due funzioni esistono ora.
-- Si ricrea proponi solo se una delle due mancasse al primo parse: no, il
-- parse di proponi non richiede che esistano. Nessun secondo CREATE.

CREATE OR REPLACE FUNCTION public.approva_modifica(p_id uuid, p_nota text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ruolo public.ruolo_utente := public.get_user_role();
  v_prop public.modifiche_proposte%ROWTYPE;
  v_riga jsonb;
  v_entita text;
  v_op text;
  v_entita_id uuid;
  v_dopo jsonb;
  v_tipi jsonb;
  v_tabella text;
  v_new uuid;
  v_campi text[];
  v_nota text := NULLIF(btrim(COALESCE(p_nota, '')), '');
BEGIN
  IF auth.uid() IS NULL
     OR v_ruolo IS DISTINCT FROM 'admin'::public.ruolo_utente
        AND v_ruolo IS DISTINCT FROM 'operatore'::public.ruolo_utente THEN
    RAISE EXCEPTION 'Solo un amministratore o un Operatore pro può approvare' USING ERRCODE = '42501';
  END IF;
  IF v_nota IS NOT NULL AND char_length(v_nota) > 2000 THEN
    RAISE EXCEPTION 'La nota supera i 2000 caratteri' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_prop FROM public.modifiche_proposte WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposta non trovata' USING ERRCODE = 'P0002';
  END IF;
  IF v_prop.stato <> 'in_attesa' THEN
    RAISE EXCEPTION 'Proposta già revisionata' USING ERRCODE = '22023';
  END IF;
  IF v_prop.opera_id IS NOT NULL THEN
    PERFORM public.modifica_rifiuta_se_validata(v_prop.opera_id);
  END IF;

  IF COALESCE(v_prop.payload->>'batch', 'false') = 'true' THEN
    FOR v_riga IN SELECT value FROM jsonb_array_elements(v_prop.payload->'righe') LOOP
      v_entita := v_riga->>'entita';
      v_op := v_riga->>'operazione';
      v_entita_id := NULLIF(v_riga->>'entita_id', '')::uuid;
      v_dopo := COALESCE(v_riga->'dopo', '{}'::jsonb);
      v_tipi := public.modifica_colonne_consentite(v_entita);
      v_tabella := public.modifica_tabella(v_entita);
      IF v_op = 'delete' THEN
        EXECUTE 'DELETE FROM public.' || quote_ident(v_tabella) || ' WHERE id = $1' USING v_entita_id;
      ELSE
        v_new := public.modifica_applica_dopo(v_tabella, CASE WHEN v_op = 'insert' THEN NULL ELSE v_entita_id END, v_dopo, v_tipi);
      END IF;
    END LOOP;
    SELECT COALESCE(array_agg(DISTINCT riga->>'entita'), ARRAY[]::text[])
      INTO v_campi
    FROM jsonb_array_elements(v_prop.payload->'righe') riga;
  ELSE
    v_dopo := COALESCE(v_prop.payload->'dopo', '{}'::jsonb);
    v_tipi := public.modifica_colonne_consentite(v_prop.entita);
    v_tabella := public.modifica_tabella(v_prop.entita);
    IF v_prop.operazione = 'delete' THEN
      EXECUTE 'DELETE FROM public.' || quote_ident(v_tabella) || ' WHERE id = $1' USING v_prop.entita_id;
    ELSE
      v_new := public.modifica_applica_dopo(
        v_tabella,
        CASE WHEN v_prop.operazione = 'insert' THEN NULL ELSE v_prop.entita_id END,
        v_dopo,
        v_tipi
      );
      IF v_prop.operazione = 'insert' THEN
        v_prop.entita_id := v_new;
      END IF;
    END IF;
    SELECT COALESCE(array_agg(k), ARRAY[]::text[])
      INTO v_campi
    FROM jsonb_object_keys(v_dopo) k;
  END IF;

  UPDATE public.modifiche_proposte
  SET stato = 'approvata',
      revisionata_da = auth.uid(),
      revisionata_il = now(),
      nota_revisione = v_nota,
      entita_id = v_prop.entita_id
  WHERE id = p_id;

  INSERT INTO public.audit_log (
    user_id, user_email, user_ruolo, azione, tabella, record_id, record_label,
    opera_id, campi_modificati, old_data, new_data
  ) VALUES (
    auth.uid(),
    (SELECT u.email FROM auth.users u WHERE u.id = auth.uid()),
    v_ruolo::text,
    CASE v_prop.operazione WHEN 'insert' THEN 'INSERT' WHEN 'delete' THEN 'DELETE' ELSE 'UPDATE' END,
    'modifiche_proposte',
    p_id::text,
    'Approvazione ' || v_prop.entita,
    v_prop.opera_id,
    v_campi,
    jsonb_build_object('stato', 'in_attesa'),
    jsonb_build_object('stato', 'approvata', 'entita_id', v_prop.entita_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.respingi_modifica(p_id uuid, p_nota text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ruolo public.ruolo_utente := public.get_user_role();
  v_prop public.modifiche_proposte%ROWTYPE;
  v_nota text := NULLIF(btrim(COALESCE(p_nota, '')), '');
BEGIN
  IF auth.uid() IS NULL
     OR v_ruolo IS DISTINCT FROM 'admin'::public.ruolo_utente
        AND v_ruolo IS DISTINCT FROM 'operatore'::public.ruolo_utente THEN
    RAISE EXCEPTION 'Solo un amministratore o un Operatore pro può respingere' USING ERRCODE = '42501';
  END IF;
  IF v_nota IS NOT NULL AND char_length(v_nota) > 2000 THEN
    RAISE EXCEPTION 'La nota supera i 2000 caratteri' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_prop FROM public.modifiche_proposte WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposta non trovata' USING ERRCODE = 'P0002';
  END IF;
  IF v_prop.stato <> 'in_attesa' THEN
    RAISE EXCEPTION 'Proposta già revisionata' USING ERRCODE = '22023';
  END IF;

  UPDATE public.modifiche_proposte
  SET stato = 'respinta',
      revisionata_da = auth.uid(),
      revisionata_il = now(),
      nota_revisione = v_nota
  WHERE id = p_id;

  INSERT INTO public.audit_log (
    user_id, user_email, user_ruolo, azione, tabella, record_id, record_label,
    opera_id, campi_modificati, old_data, new_data
  ) VALUES (
    auth.uid(),
    (SELECT u.email FROM auth.users u WHERE u.id = auth.uid()),
    v_ruolo::text,
    'UPDATE',
    'modifiche_proposte',
    p_id::text,
    'Respingimento ' || v_prop.entita,
    v_prop.opera_id,
    ARRAY['stato'],
    jsonb_build_object('stato', 'in_attesa'),
    jsonb_build_object('stato', 'respinta')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.proponi_modifica(text, text, jsonb, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approva_modifica(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.respingi_modifica(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.proponi_modifica(text, text, jsonb, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approva_modifica(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.respingi_modifica(uuid, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) Scritture dirette: solo admin e Operatore pro
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "opere_insert_policy" ON public.opere;
CREATE POLICY "opere_insert_policy" ON public.opere
  FOR INSERT WITH CHECK ((SELECT public.is_staff()));

DROP POLICY IF EXISTS "opere_update_policy" ON public.opere;
CREATE POLICY "opere_update_policy" ON public.opere
  FOR UPDATE
  USING ((SELECT public.is_staff()))
  WITH CHECK ((SELECT public.is_staff()));

DROP POLICY IF EXISTS "episodi_insert_policy" ON public.episodi;
CREATE POLICY "episodi_insert_policy" ON public.episodi
  FOR INSERT WITH CHECK ((SELECT public.is_staff()));
DROP POLICY IF EXISTS "episodi_update_policy" ON public.episodi;
CREATE POLICY "episodi_update_policy" ON public.episodi
  FOR UPDATE USING ((SELECT public.is_staff())) WITH CHECK ((SELECT public.is_staff()));
DROP POLICY IF EXISTS "episodi_delete_policy" ON public.episodi;
CREATE POLICY "episodi_delete_policy" ON public.episodi
  FOR DELETE USING ((SELECT public.is_staff()));

DROP POLICY IF EXISTS "partecipazioni_insert_policy" ON public.partecipazioni;
CREATE POLICY "partecipazioni_insert_policy" ON public.partecipazioni
  FOR INSERT WITH CHECK ((SELECT public.is_staff()));
DROP POLICY IF EXISTS "partecipazioni_update_policy" ON public.partecipazioni;
CREATE POLICY "partecipazioni_update_policy" ON public.partecipazioni
  FOR UPDATE USING ((SELECT public.is_staff())) WITH CHECK ((SELECT public.is_staff()));
DROP POLICY IF EXISTS "partecipazioni_delete_policy" ON public.partecipazioni;
CREATE POLICY "partecipazioni_delete_policy" ON public.partecipazioni
  FOR DELETE USING ((SELECT public.is_staff()));

DROP POLICY IF EXISTS "cast_esterno_insert_policy" ON public.cast_esterno;
CREATE POLICY "cast_esterno_insert_policy" ON public.cast_esterno
  FOR INSERT WITH CHECK ((SELECT public.is_staff()));
DROP POLICY IF EXISTS "cast_esterno_update_policy" ON public.cast_esterno;
CREATE POLICY "cast_esterno_update_policy" ON public.cast_esterno
  FOR UPDATE USING ((SELECT public.is_staff())) WITH CHECK ((SELECT public.is_staff()));
DROP POLICY IF EXISTS "cast_esterno_delete_policy" ON public.cast_esterno;
CREATE POLICY "cast_esterno_delete_policy" ON public.cast_esterno
  FOR DELETE USING ((SELECT public.is_staff()));
