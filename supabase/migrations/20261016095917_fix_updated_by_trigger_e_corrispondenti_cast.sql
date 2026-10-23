-- 1) update_updated_at_column() in produzione imposta anche NEW.updated_by,
--    ma cast_esterno, artisti_referenti, ruoli_tipologie (e storage.objects)
--    non hanno quella colonna: ogni UPDATE fatto da un utente falliva con
--    "record new has no field updated_by". Ora updated_by si imposta solo
--    dove la colonna esiste.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = NOW();
  IF auth.uid() IS NOT NULL AND to_jsonb(NEW) ? 'updated_by' THEN
    NEW.updated_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- 2) cast_esterno_artisti_corrispondenti andava in statement timeout: la OR
--    nella join su artisti impediva l'uso degli indici sulle chiavi nome.
--    Ora calcola le chiavi del cast dell'opera e cerca gli artisti con tre
--    join di uguaglianza indicizzate.
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
  WITH ce AS (
    SELECT
      c.id,
      public.nome_persona_key(c.nome) AS chiave,
      NULLIF(trim(COALESCE(c.imdb_nconst, '')), '') AS nconst
    FROM public.cast_esterno c
    WHERE c.opera_id = p_opera_id
  ),
  matches AS (
    SELECT ce.id AS cast_id, a.id AS artista_id, a.nome, a.cognome
    FROM ce
    JOIN public.artisti a
      ON public.nome_persona_key(a.nome::text || ' ' || a.cognome::text) = ce.chiave
    UNION
    SELECT ce.id, a.id, a.nome, a.cognome
    FROM ce
    JOIN public.artisti a
      ON a.nome_arte IS NOT NULL
     AND public.nome_persona_key(a.nome_arte::text) = ce.chiave
    UNION
    SELECT ce.id, a.id, a.nome, a.cognome
    FROM ce
    JOIN public.artisti a
      ON ce.nconst IS NOT NULL
     AND a.imdb_nconst = ce.nconst
  )
  SELECT m.cast_id, m.artista_id, trim(m.nome::text || ' ' || m.cognome::text)
  FROM matches m
  ORDER BY m.cast_id, m.artista_id
$$;

GRANT EXECUTE ON FUNCTION public.cast_esterno_artisti_corrispondenti(uuid) TO authenticated, service_role;
