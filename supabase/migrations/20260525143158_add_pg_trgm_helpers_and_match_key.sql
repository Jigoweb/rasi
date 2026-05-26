-- pg_trgm is already installed; this migration adds:
--   1. build_match_key_strict(text, integer) SQL helper — mirrors TS
--      buildMatchKeyStrict() from src/features/programmazioni/utils/title-normalize.ts.
--      Applies the strict normalization pipeline (preserves Roman/digit/PARTE):
--        1. NBSP (U+00A0) → space
--        2. trim
--        3. EDITION_SQUARE     /\s*\[\s*ED\.?\s*\d+\s*\]/gi
--        4. EDITION_PAREN      /\s*\(\s*ED\.?\s*\d+\s*\)/gi
--        5. REPLICA_PAREN      /\s*\(\s*R(\s+\d+'?)?\s*\)/gi
--        6. SEASON_PAREN       /\s*\(\s*SEASON\s+\d+R?\s*\)/gi
--        7. SEASON_TRAIL       /\s+(?:S|ST)\.?\s*\d+\s*$/i
--        8. EPISODE_TRAIL      /\s+EP\.?\s*\d+.*$/i
--        9. EPISODIO_IT        /\s+EPISODIO\s+\d+.*$/i
--       10. PUNTATA_TRAIL      /\s+-\s*p\.\s*\d+\s*$/i
--       11. SUFFIX_TAG_TRAIL   /\s+-\s+(LA SERIE|STAGIONE FINALE|PILOTA|PILLOLE|SPECIALE)\s*$/i
--       12. SPECIAL_PAREN      /\s*\(\s*(MOVIE|REPEAT VERSION|ONE HOUR REPACK|CHRISTMAS SPECIAL)\s*\)/gi
--       13. CATEGORY_PREFIX    /^(FILM|DOCUMENTARIO)\s+/   (CASE-SENSITIVE)
--       14. CHANNEL_PREFIX     /^\(\s*[A-Za-z0-9]+\s*\)\s+/
--       15. Typographic quotes ‘’“” → ASCII '"
--       16. Collapse whitespace
--       17. ARTICLE_TRAIL_PAREN reorder "MADAMA (LA)" → "LA MADAMA"
--       18. lower()
--       19. ARTICLES_RX        /^(the|il|la|le|lo|gli|un|uno|una|i)\s+/i
--       20. append ::year when present
--   2. build_match_key(text, integer) SQL helper — mirrors TS buildMatchKey()
--      (loose). Applies all of the above, then additionally strips:
--        - ROMAN_TRAIL         /\s+[IVX]{2,}\s*$/i
--        - PARTE_TRAIL         /\s*-?\s*PARTE\s+\d+\s*$/i  (must run before DIGIT_TRAIL)
--        - DIGIT_TRAIL         /\s+\d{1,3}\s*$/
--   3. opere.match_key column + trigger + btree index
-- Programmazioni.match_key follows in a separate migration (Phase 2)
-- to avoid a long-running UPDATE on the 4M row table in this phase.

-- ─── build_match_key_strict SQL helper ─────────────────────────────────────
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
  'Strict match key: preserves trailing Roman/digit/PARTE tokens. Mirrors TS buildMatchKeyStrict() in src/features/programmazioni/utils/title-normalize.ts.';

-- ─── build_match_key SQL helper (loose) ────────────────────────────────────
-- Reuses build_match_key_strict and additionally strips Roman/digit/PARTE trail.
CREATE OR REPLACE FUNCTION public.build_match_key(t text, y integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN t IS NULL OR length(trim(replace(t, E' ', ' '))) = 0 THEN ''
    ELSE
      regexp_replace(
        regexp_replace(
          regexp_replace(
            -- Get the strict normalized string WITHOUT the year suffix.
            regexp_replace(public.build_match_key_strict(t, NULL), '::.*$', ''),
            -- ROMAN_TRAIL
            '\s+[ivx]{2,}\s*$', '', 'i'),
          -- PARTE_TRAIL (must run before DIGIT_TRAIL)
          '\s*-?\s*parte\s+\d+\s*$', '', 'i'),
        -- DIGIT_TRAIL
        '\s+\d{1,3}\s*$', '', 'g')
      || COALESCE('::' || y::text, '')
  END
$$;

COMMENT ON FUNCTION public.build_match_key IS
  'Loose match key: strict cleanup plus Roman/digit/PARTE trail stripping. Mirrors TS buildMatchKey() in src/features/programmazioni/utils/title-normalize.ts.';

-- ─── opere.match_key column ────────────────────────────────────────────────
ALTER TABLE public.opere
  ADD COLUMN IF NOT EXISTS match_key text;

CREATE OR REPLACE FUNCTION public.trg_opere_sync_match_key()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.match_key := public.build_match_key(NEW.titolo, NEW.anno_produzione);
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS opere_match_key_sync ON public.opere;
CREATE TRIGGER opere_match_key_sync
  BEFORE INSERT OR UPDATE OF titolo, anno_produzione ON public.opere
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_opere_sync_match_key();

-- Backfill (7K rows, fast)
UPDATE public.opere
SET match_key = public.build_match_key(titolo, anno_produzione);

-- Index for exact lookup
CREATE INDEX IF NOT EXISTS idx_opere_match_key
  ON public.opere(match_key)
  WHERE match_key IS NOT NULL AND match_key <> '';
