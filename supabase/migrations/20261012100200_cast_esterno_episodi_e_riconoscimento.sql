-- Cast esterno per singolo episodio + riconoscimento dei nuovi artisti RASI
-- nel cast esterno già inserito.
--   * cast_esterno.episodio_id: NULL = cast dell'intera opera/serie.
--   * replace_cast_esterno: sostituisce solo il cast dello scope indicato
--     (opera intera oppure un episodio), non più tutto il cast dell'opera.
--   * nome_persona_key: chiave nome normalizzata (minuscole, senza accenti,
--     token ordinati) per riconoscere "Rossi Mario" = "Mario Rossi".
--   * cerca_cast_esterno_per_artista / converti_cast_esterno_in_partecipazioni:
--     proposta in scheda artista, confermata dall'operatore.

ALTER TABLE public.cast_esterno
  ADD COLUMN IF NOT EXISTS episodio_id UUID REFERENCES public.episodi(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_cast_esterno_episodio
  ON public.cast_esterno(episodio_id)
  WHERE episodio_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.nome_persona_key(p_nome text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT NULLIF(string_agg(tok, ' ' ORDER BY tok), '')
  FROM unnest(
    regexp_split_to_array(
      lower(translate(
        COALESCE(p_nome, ''),
        'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÇçÑñ',
        'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'
      )),
      '[^a-z0-9]+'
    )
  ) AS tok
  WHERE tok <> ''
$$;

GRANT EXECUTE ON FUNCTION public.nome_persona_key(text) TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_cast_esterno_nome_key
  ON public.cast_esterno (public.nome_persona_key(nome));

CREATE INDEX IF NOT EXISTS idx_artisti_nome_key
  ON public.artisti (public.nome_persona_key(nome::text || ' ' || cognome::text));

CREATE INDEX IF NOT EXISTS idx_artisti_nome_arte_key
  ON public.artisti (public.nome_persona_key(nome_arte::text))
  WHERE nome_arte IS NOT NULL;

CREATE OR REPLACE FUNCTION public.replace_cast_esterno(
  p_opera_id uuid,
  p_rows jsonb,
  p_episodio_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF get_user_role() IS NULL OR get_user_role() NOT IN ('admin', 'operatore') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_episodio_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.episodi WHERE id = p_episodio_id AND opera_id = p_opera_id
  ) THEN
    RAISE EXCEPTION 'episodio_non_appartiene_opera' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.cast_esterno
  WHERE opera_id = p_opera_id
    AND episodio_id IS NOT DISTINCT FROM p_episodio_id;

  INSERT INTO public.cast_esterno (opera_id, episodio_id, nome, personaggio, primarieta, imdb_nconst, fonte, ordine)
  SELECT
    p_opera_id,
    p_episodio_id,
    trim(x.nome),
    NULLIF(trim(COALESCE(x.personaggio, '')), ''),
    COALESCE(NULLIF(x.primarieta, ''), 'comprimario')::public.primarieta_cast,
    NULLIF(trim(COALESCE(x.imdb_nconst, '')), ''),
    CASE WHEN x.fonte = 'imdb' THEN 'imdb' ELSE 'manuale' END,
    COALESCE(x.ordine, 0)
  FROM jsonb_to_recordset(COALESCE(p_rows, '[]'::jsonb)) AS x(
    nome text,
    personaggio text,
    primarieta text,
    imdb_nconst text,
    fonte text,
    ordine int
  )
  WHERE trim(COALESCE(x.nome, '')) <> '';
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_cast_esterno(uuid, jsonb, uuid) TO authenticated, service_role;

-- Firma storica a 2 argomenti: ora sostituisce solo il cast dell'intera opera,
-- non più anche quello dei singoli episodi. (Nessun DEFAULT sulla firma a 3
-- argomenti per evitare chiamate ambigue tra le due.)
CREATE OR REPLACE FUNCTION public.replace_cast_esterno(p_opera_id uuid, p_rows jsonb)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.replace_cast_esterno(p_opera_id, p_rows, NULL::uuid)
$$;

-- Righe di cast esterno che corrispondono a un artista (nome, nome d'arte o nconst IMDb).
CREATE OR REPLACE FUNCTION public.cerca_cast_esterno_per_artista(p_artista_id uuid)
RETURNS TABLE (
  cast_id          uuid,
  opera_id         uuid,
  opera_titolo     text,
  opera_tipo       text,
  opera_anno       integer,
  episodio_id      uuid,
  numero_stagione  integer,
  numero_episodio  integer,
  titolo_episodio  text,
  nome             text,
  personaggio      text,
  primarieta       text,
  corrispondenza   text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH art AS (
    SELECT
      a.id,
      NULLIF(trim(COALESCE(a.imdb_nconst, '')), '') AS nconst,
      array_remove(ARRAY[
        public.nome_persona_key(a.nome::text || ' ' || a.cognome::text),
        public.nome_persona_key(a.nome_arte::text)
      ], NULL) AS chiavi
    FROM public.artisti a
    WHERE a.id = p_artista_id
  )
  SELECT
    ce.id,
    o.id,
    o.titolo::text,
    o.tipo::text,
    o.anno_produzione,
    e.id,
    e.numero_stagione,
    e.numero_episodio,
    e.titolo_episodio::text,
    ce.nome,
    ce.personaggio,
    ce.primarieta::text,
    CASE WHEN art.nconst IS NOT NULL AND ce.imdb_nconst = art.nconst THEN 'imdb' ELSE 'nome' END
  FROM art
  JOIN public.cast_esterno ce
    ON public.nome_persona_key(ce.nome) = ANY(art.chiavi)
    OR (art.nconst IS NOT NULL AND ce.imdb_nconst = art.nconst)
  JOIN public.opere o ON o.id = ce.opera_id
  LEFT JOIN public.episodi e ON e.id = ce.episodio_id
  ORDER BY o.titolo, e.numero_stagione NULLS FIRST, e.numero_episodio NULLS FIRST, ce.nome
$$;

GRANT EXECUTE ON FUNCTION public.cerca_cast_esterno_per_artista(uuid) TO authenticated, service_role;

-- Per la scheda opera: quali righe di cast esterno hanno già una scheda artista RASI.
CREATE OR REPLACE FUNCTION public.cast_esterno_artisti_corrispondenti(p_opera_id uuid)
RETURNS TABLE (
  cast_id        uuid,
  artista_id     uuid,
  artista_nome   text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT DISTINCT ON (ce.id, a.id)
    ce.id,
    a.id,
    trim(a.nome::text || ' ' || a.cognome::text)
  FROM public.cast_esterno ce
  JOIN public.artisti a
    ON public.nome_persona_key(a.nome::text || ' ' || a.cognome::text) = public.nome_persona_key(ce.nome)
    OR (a.nome_arte IS NOT NULL AND public.nome_persona_key(a.nome_arte::text) = public.nome_persona_key(ce.nome))
    OR (NULLIF(trim(COALESCE(a.imdb_nconst, '')), '') IS NOT NULL AND a.imdb_nconst = ce.imdb_nconst)
  WHERE ce.opera_id = p_opera_id
  ORDER BY ce.id, a.id
$$;

GRANT EXECUTE ON FUNCTION public.cast_esterno_artisti_corrispondenti(uuid) TO authenticated, service_role;

-- Converte le righe confermate in partecipazioni dell'artista e le toglie dal cast esterno.
-- p_items: [{ "cast_id": uuid, "ruolo_id": uuid }]. Ritorna le partecipazioni create.
CREATE OR REPLACE FUNCTION public.converti_cast_esterno_in_partecipazioni(
  p_artista_id uuid,
  p_items jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_item  record;
  v_cast  public.cast_esterno%ROWTYPE;
  v_count integer := 0;
BEGIN
  IF get_user_role() IS NULL OR get_user_role() NOT IN ('admin', 'operatore') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.artisti WHERE id = p_artista_id) THEN
    RAISE EXCEPTION 'artista_non_trovato' USING ERRCODE = 'P0002';
  END IF;

  FOR v_item IN
    SELECT x.cast_id, x.ruolo_id
    FROM jsonb_to_recordset(COALESCE(p_items, '[]'::jsonb)) AS x(cast_id uuid, ruolo_id uuid)
  LOOP
    IF v_item.cast_id IS NULL OR v_item.ruolo_id IS NULL THEN
      CONTINUE;
    END IF;

    SELECT * INTO v_cast FROM public.cast_esterno WHERE id = v_item.cast_id FOR UPDATE;
    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.partecipazioni p
      WHERE p.artista_id = p_artista_id
        AND p.opera_id = v_cast.opera_id
        AND p.episodio_id IS NOT DISTINCT FROM v_cast.episodio_id
        AND p.ruolo_id = v_item.ruolo_id
    ) THEN
      INSERT INTO public.partecipazioni (
        artista_id, opera_id, episodio_id, ruolo_id, personaggio, metadati, created_by, updated_by
      )
      VALUES (
        p_artista_id,
        v_cast.opera_id,
        v_cast.episodio_id,
        v_item.ruolo_id,
        v_cast.personaggio,
        jsonb_build_object(
          'origine', 'cast_esterno',
          'primarieta', v_cast.primarieta,
          'nome_cast_esterno', v_cast.nome
        ),
        auth.uid(),
        auth.uid()
      );
      v_count := v_count + 1;
    END IF;

    DELETE FROM public.cast_esterno WHERE id = v_cast.id;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.converti_cast_esterno_in_partecipazioni(uuid, jsonb) TO authenticated, service_role;
