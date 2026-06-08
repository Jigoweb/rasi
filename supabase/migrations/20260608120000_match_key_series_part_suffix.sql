-- Mirror of the TS SERIES_PART_TRAIL fix (src/features/programmazioni/utils/title-normalize.ts).
--
-- Netflix/VOD exports title every series row as "Show: Season N" / "Show: Part N" /
-- "Show: Limited Series" / "Show: Volume N" / "Show: Chapter N" / "Show: Collection".
-- The loose normalizer's DIGIT_TRAIL stripped only the trailing number, leaving an
-- orphan "Show: Season" / "Show: Part" that wrecked trigram similarity against the
-- catalog. We collapse those rows onto the base title.
--
-- build_match_key_strict() is the single source the loose build_match_key() reuses,
-- so adding the step here propagates to BOTH keys. New step is inserted right after
-- SEASON_TRAIL (step 7) and before EPISODE_TRAIL (step 8), matching the TS order
-- (SERIES_PART_TRAIL sits next to the other season strippers in normalizeTitleStrict).
--
-- Anchored on the structural colon so real subtitles are preserved ("Mission: Impossible").
-- \y is the Postgres word boundary (so ": Seasonal ..." is NOT stripped).
--
-- NOTE: match_key_strict/loose are consumed by the dual-key cascade
-- (find_opera_candidates), which is NOT yet wired into the live run, so this migration
-- on its own does not change live individuazione results — it keeps TS<->SQL parity and
-- prepares the keys. The live trigram matcher fix ships separately.

CREATE OR REPLACE FUNCTION public.build_match_key_strict(t text, y integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN t IS NULL OR length(trim(replace(t, E' ', ' '))) = 0 THEN ''
    ELSE
      regexp_replace(
        lower(
          -- 17. ARTICLE_TRAIL_PAREN reorder "MADAMA (LA)" → "LA MADAMA"
          regexp_replace(
            -- 16. collapse whitespace
            regexp_replace(
              -- 14. CHANNEL_PREFIX
              regexp_replace(
                -- 13. CATEGORY_PREFIX (case-sensitive: no 'i' flag)
                regexp_replace(
                  -- 12. SPECIAL_PAREN
                  regexp_replace(
                    -- 11. SUFFIX_TAG_TRAIL
                    regexp_replace(
                      -- 10. PUNTATA_TRAIL
                      regexp_replace(
                        -- 9. EPISODIO_IT
                        regexp_replace(
                          -- 8. EPISODE_TRAIL
                          regexp_replace(
                            -- 7b. SERIES_PART_TRAIL — Netflix ": Season/Part/..." suffix
                            regexp_replace(
                              -- 7. SEASON_TRAIL (S or ST)
                              regexp_replace(
                                -- 6. SEASON_PAREN (with optional R suffix)
                                regexp_replace(
                                  -- 5. REPLICA_PAREN
                                  regexp_replace(
                                    -- 4. EDITION_PAREN
                                    regexp_replace(
                                      -- 3. EDITION_SQUARE
                                      regexp_replace(
                                        -- 15. typographic double quotes → "
                                        translate(
                                          -- 15. typographic single quotes → '
                                          regexp_replace(
                                            -- 1+2. NBSP → space, then trim
                                            trim(replace(t, E' ', ' ')),
                                            E'[‘’]', '''', 'g'),
                                          E'“”', '""'),
                                        '\s*\[\s*ED\.?\s*\d+\s*\]', '', 'gi'),
                                      '\s*\(\s*ED\.?\s*\d+\s*\)', '', 'gi'),
                                    '\s*\(\s*R(\s+\d+''?)?\s*\)', '', 'gi'),
                                  '\s*\(\s*SEASON\s+\d+R?\s*\)', '', 'gi'),
                                '\s+(?:S|ST)\.?\s*\d+\s*$', '', 'i'),
                              '\s*:\s*(SEASON|PARTE|PART|VOLUME|VOL|CHAPTER|LIMITED\s+SERIES|COLLECTION|STAGIONE)\y.*$', '', 'i'),
                            '\s+EP\.?\s*\d+.*$', '', 'i'),
                          '\s+EPISODIO\s+\d+.*$', '', 'i'),
                        '\s+-\s*p\.\s*\d+\s*$', '', 'i'),
                      '\s+-\s+(LA\s+SERIE|STAGIONE\s+FINALE|PILOTA|PILLOLE|SPECIALE)\s*$', '', 'i'),
                    '\s*\(\s*(MOVIE|REPEAT\s+VERSION|ONE\s+HOUR\s+REPACK|CHRISTMAS\s+SPECIAL)\s*\)', '', 'gi'),
                  '^(FILM|DOCUMENTARIO)\s+', '', 'g'),
                '^\(\s*[A-Za-z0-9]+\s*\)\s+', '', 'g'),
              '\s+', ' ', 'g'),
            '^(.+?)\s+\((LA|IL|LE|LO|GLI|UN|UNO|UNA|I|THE)\)\s*$', '\2 \1', 'i')
          ),
          '^(the|il|la|le|lo|gli|un|uno|una|i)\s+', '', 'i')
        || COALESCE('::' || y::text, '')
  END
$$;

COMMENT ON FUNCTION public.build_match_key_strict IS
  'Strict match key: preserves trailing Roman/digit/PARTE tokens; strips Netflix ": Season/Part/..." suffixes. Mirrors TS buildMatchKeyStrict() in src/features/programmazioni/utils/title-normalize.ts.';

-- Recompute keys so existing rows pick up the new stripping.
-- opere: ~7K rows, full recompute is fast (<5s).
UPDATE public.opere
SET match_key_strict = public.build_match_key_strict(titolo, anno_produzione),
    match_key_loose  = public.build_match_key(titolo, anno_produzione);

-- programmazioni: ~4M rows total — scope the recompute to ONLY the rows whose title
-- carries the structural suffix (the only rows whose keys actually change). Updating
-- the key columns (not titolo/anno) does not fire the sync trigger, so the explicit
-- values stand. Chunk by emittente_id / campagna if this still runs long.
UPDATE public.programmazioni
SET match_key_strict = public.build_match_key_strict(titolo, anno),
    match_key_loose  = public.build_match_key(titolo, anno)
WHERE titolo ~* '\s*:\s*(SEASON|PARTE|PART|VOLUME|VOL|CHAPTER|LIMITED\s+SERIES|COLLECTION|STAGIONE)\y';
