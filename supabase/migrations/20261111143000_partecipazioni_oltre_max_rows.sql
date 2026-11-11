-- PostgREST taglia ogni risposta a max_rows = 1000 (supabase/config.toml).
-- La scheda opera non alza quel tetto: chiede una pagina e il conteggio
-- nella stessa funzione. Il testo cerca su artisti, ruoli ed episodi in
-- LEFT JOIN, così una partecipazione senza episodio resta trovabile per
-- nome. Una OR PostgREST su episodi.* diventerebbe INNER JOIN e la
-- nasconderebbe.
--
-- list_partecipazioni_opera restituisce un solo jsonb (righe + totali),
-- quindi max_rows non tronca la pagina. Il limite interno resta 1000.
--
-- cast_esterno_artisti_corrispondenti accetta gli id della pagina visibile.
-- Senza filtro, su un'opera da 12k righe la risposta si fermava a 1000
-- match e i successivi "in anagrafica" sparivano.
--
-- Non tocca i dati. Non va applicata al database di produzione da questa
-- modifica: si applica insieme al rilascio, sul database deciso da chi approva.
-- La CLI Supabase avvolge il file in una transazione: niente BEGIN interno.

CREATE OR REPLACE FUNCTION public.list_partecipazioni_opera(
  p_opera_id uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL,
  p_ruolo_id uuid DEFAULT NULL,
  p_episodio_id uuid DEFAULT NULL,
  p_senza_episodio boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH params AS (
    SELECT
      LEAST(GREATEST(COALESCE(p_limit, 50), 1), 1000) AS lim,
      GREATEST(COALESCE(p_offset, 0), 0) AS off,
      NULLIF(btrim(COALESCE(p_search, '')), '') AS q
  ),
  pattern AS (
    SELECT
      CASE
        WHEN params.q IS NULL THEN NULL
        ELSE '%' || replace(replace(replace(params.q, '\', '\\'), '%', '\%'), '_', '\_') || '%'
      END AS like_q
    FROM params
  ),
  filtered AS (
    SELECT
      p.id,
      p.personaggio,
      p.note,
      p.created_at,
      p.artista_id,
      p.opera_id,
      p.episodio_id,
      p.ruolo_id,
      a.id AS artista_row_id,
      a.nome AS artista_nome,
      a.cognome AS artista_cognome,
      a.nome_arte AS artista_nome_arte,
      a.codice_ipn AS artista_codice_ipn,
      r.id AS ruolo_row_id,
      r.nome AS ruolo_nome,
      r.descrizione AS ruolo_descrizione,
      e.id AS episodio_row_id,
      e.numero_stagione,
      e.numero_episodio,
      e.titolo_episodio,
      e.titolo_episodio_originale
    FROM public.partecipazioni p
    LEFT JOIN public.artisti a ON a.id = p.artista_id
    LEFT JOIN public.ruoli_tipologie r ON r.id = p.ruolo_id
    LEFT JOIN public.episodi e ON e.id = p.episodio_id
    CROSS JOIN pattern
    WHERE p.opera_id = p_opera_id
      AND (p_ruolo_id IS NULL OR p.ruolo_id = p_ruolo_id)
      AND (COALESCE(p_senza_episodio, false) = false OR p.episodio_id IS NULL)
      AND (p_episodio_id IS NULL OR p.episodio_id = p_episodio_id)
      AND (
        pattern.like_q IS NULL
        OR COALESCE(a.nome::text, '') ILIKE pattern.like_q ESCAPE '\'
        OR COALESCE(a.cognome::text, '') ILIKE pattern.like_q ESCAPE '\'
        OR COALESCE(a.nome_arte::text, '') ILIKE pattern.like_q ESCAPE '\'
        OR COALESCE(r.nome::text, '') ILIKE pattern.like_q ESCAPE '\'
        OR COALESCE(p.personaggio, '') ILIKE pattern.like_q ESCAPE '\'
        OR COALESCE(p.note, '') ILIKE pattern.like_q ESCAPE '\'
        OR COALESCE(e.titolo_episodio::text, '') ILIKE pattern.like_q ESCAPE '\'
        OR COALESCE(e.titolo_episodio_originale::text, '') ILIKE pattern.like_q ESCAPE '\'
      )
  ),
  page AS (
    SELECT *
    FROM filtered
    ORDER BY
      COALESCE(numero_stagione, 9999),
      COALESCE(numero_episodio, 9999),
      lower(COALESCE(artista_cognome::text, '') || ' ' || COALESCE(artista_nome::text, '')),
      id
    LIMIT (SELECT lim FROM params)
    OFFSET (SELECT off FROM params)
  )
  SELECT jsonb_build_object(
    'total', (SELECT COUNT(*)::int FROM filtered),
    'total_opera', (
      SELECT COUNT(*)::int
      FROM public.partecipazioni
      WHERE opera_id = p_opera_id
    ),
    'rows', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', page.id,
          'personaggio', page.personaggio,
          'note', page.note,
          'created_at', page.created_at,
          'artista_id', page.artista_id,
          'opera_id', page.opera_id,
          'episodio_id', page.episodio_id,
          'ruolo_id', page.ruolo_id,
          'artisti', CASE
            WHEN page.artista_row_id IS NULL THEN NULL
            ELSE jsonb_build_object(
              'id', page.artista_row_id,
              'nome', page.artista_nome,
              'cognome', page.artista_cognome,
              'nome_arte', page.artista_nome_arte,
              'codice_ipn', page.artista_codice_ipn
            )
          END,
          'ruoli_tipologie', CASE
            WHEN page.ruolo_row_id IS NULL THEN NULL
            ELSE jsonb_build_object(
              'id', page.ruolo_row_id,
              'nome', page.ruolo_nome,
              'descrizione', page.ruolo_descrizione
            )
          END,
          'episodi', CASE
            WHEN page.episodio_row_id IS NULL THEN NULL
            ELSE jsonb_build_object(
              'id', page.episodio_row_id,
              'numero_stagione', page.numero_stagione,
              'numero_episodio', page.numero_episodio,
              'titolo_episodio', page.titolo_episodio,
              'titolo_episodio_originale', page.titolo_episodio_originale
            )
          END
        )
        ORDER BY
          COALESCE(page.numero_stagione, 9999),
          COALESCE(page.numero_episodio, 9999),
          lower(COALESCE(page.artista_cognome::text, '') || ' ' || COALESCE(page.artista_nome::text, '')),
          page.id
      )
      FROM page
    ), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.list_partecipazioni_opera(uuid, integer, integer, text, uuid, uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_partecipazioni_opera(uuid, integer, integer, text, uuid, uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.list_partecipazioni_opera(uuid, integer, integer, text, uuid, uuid, boolean) TO authenticated, service_role;

-- CREATE OR REPLACE non può aggiungere un argomento: si ricrea la firma.
-- Il default NULL mantiene la lettura di tutti i match dell'opera.
DROP FUNCTION IF EXISTS public.cast_esterno_artisti_corrispondenti(uuid);

CREATE FUNCTION public.cast_esterno_artisti_corrispondenti(
  p_opera_id uuid,
  p_cast_ids uuid[] DEFAULT NULL
)
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
      AND (p_cast_ids IS NULL OR c.id = ANY (p_cast_ids))
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

REVOKE ALL ON FUNCTION public.cast_esterno_artisti_corrispondenti(uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cast_esterno_artisti_corrispondenti(uuid, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.cast_esterno_artisti_corrispondenti(uuid, uuid[]) TO authenticated, service_role;
