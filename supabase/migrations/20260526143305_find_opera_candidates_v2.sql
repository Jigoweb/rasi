-- B.6 — Hierarchical opera matching RPC v2.
--
-- Cascade (each step is independent and emits ranked candidates):
--   1. alias_emittente  — opera_aliases hit with emittente_id = prog.emittente_id
--                         on either strict or loose key. Confidence from row.
--   2. alias_canonical  — same as (1) but emittente_id IS NULL (canonical aliases:
--                         titolo_originale + alias_titoli[]). Confidence 0.92.
--   3. codice_isan      — exact ISAN match from prog.metadati_trasmissione. 1.00.
--   4. imdb_tconst      — exact IMDB tconst. 1.00.
--   5. match_key_strict — opere.match_key_strict join. 0.90. Preserves sequels.
--   6. match_key_loose  — opere.match_key_loose join (skipped if same as strict). 0.85.
--   7. fuzzy_trgm       — trigram similarity + anno tolerance ±3. 0.50-0.80.
--
-- Returns up to ~25 candidates across strategies. Caller picks the top.

DROP FUNCTION IF EXISTS public.find_opera_candidates(uuid, real, integer);

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
    WHERE o.codice_isan = (v_prog.metadati_trasmissione->>'codice_isan')
    LIMIT 3;
  END IF;

  -- 4. Canonical ID — IMDB tconst
  IF v_prog.metadati_trasmissione ? 'imdb_tconst' THEN
    RETURN QUERY
    SELECT o.id, 'imdb_tconst'::text, 1.00::numeric,
           jsonb_build_object('imdb_tconst', o.imdb_tconst)
    FROM public.opere o
    WHERE o.imdb_tconst = (v_prog.metadati_trasmissione->>'imdb_tconst')
    LIMIT 3;
  END IF;

  -- 5. match_key_strict (preserves sequel/series-with-numeral identity)
  RETURN QUERY
  SELECT o.id, 'match_key_strict'::text, 0.90::numeric,
         jsonb_build_object('match_key', o.match_key_strict, 'titolo', o.titolo)
  FROM public.opere o
  WHERE o.match_key_strict = v_prog.match_key_strict
    AND v_prog.match_key_strict IS NOT NULL
    AND v_prog.match_key_strict <> ''
  LIMIT 5;

  -- 6. match_key_loose (collapses season-N onto canonical series)
  -- Skip if loose == strict (avoid emitting the same opera with lower confidence)
  RETURN QUERY
  SELECT o.id, 'match_key_loose'::text, 0.85::numeric,
         jsonb_build_object('match_key', o.match_key_loose, 'titolo', o.titolo)
  FROM public.opere o
  WHERE o.match_key_loose = v_prog.match_key_loose
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
  WHERE v_prog.titolo IS NOT NULL
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
