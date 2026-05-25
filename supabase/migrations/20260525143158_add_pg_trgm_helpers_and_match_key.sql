-- pg_trgm is already installed; this migration adds:
--   1. build_match_key(text, integer) SQL helper — mirrors TS buildMatchKey()
--      from src/features/programmazioni/utils/title-normalize.ts step-by-step.
--      Applies all 9 normalization transforms in TS order:
--        1. trim
--        2. EDITION_SQUARE     /\s*\[\s*ED\.?\s*\d+\s*\]/gi
--        3. EDITION_PAREN      /\s*\(\s*ED\.?\s*\d+\s*\)/gi
--        4. REPLICA_PAREN      /\s*\(\s*R(\s+\d+'?)?\s*\)/gi
--        5. SEASON_PAREN       /\s*\(\s*SEASON\s+\d+\s*\)/gi
--        6. SEASON_TRAIL       /\s+S\.?\s*\d+\s*$/i
--        7. EPISODE_TRAIL      /\s+EP\.?\s*\d+.*$/i
--        8. EPISODIO_IT        /\s+EPISODIO\s+\d+.*$/i
--        9. ROMAN_TRAIL        /\s+[IVX]{2,}\s*$/i
--       10. Single typographic quotes (U+2018, U+2019) → ASCII '
--       11. Double typographic quotes (U+201C, U+201D) → ASCII "
--       12. Collapse whitespace
--       13. lower()
--       14. ARTICLES_RX        /^(the|il|la|le|lo|gli|un|uno|una|i)\s+/i
--       15. append ::year when present
--   2. opere.match_key column + trigger + btree index
-- Programmazioni.match_key follows in a separate migration (Phase 2)
-- to avoid a long-running UPDATE on the 4M row table in this phase.

-- ─── build_match_key SQL helper ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.build_match_key(t text, y integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN t IS NULL OR length(trim(t)) = 0 THEN ''
    ELSE
      -- normalize → lowercase → strip leading article → append ::year
      regexp_replace(
        lower(
          regexp_replace(
            -- collapse whitespace
            regexp_replace(
              -- normalize typographic double quotes → "
              translate(
                -- normalize typographic single quotes → '
                regexp_replace(
                  -- 9. ROMAN_TRAIL
                  regexp_replace(
                    -- 8. EPISODIO_IT
                    regexp_replace(
                      -- 7. EPISODE_TRAIL
                      regexp_replace(
                        -- 6. SEASON_TRAIL
                        regexp_replace(
                          -- 5. SEASON_PAREN
                          regexp_replace(
                            -- 4. REPLICA_PAREN
                            regexp_replace(
                              -- 3. EDITION_PAREN
                              regexp_replace(
                                -- 2. EDITION_SQUARE
                                regexp_replace(
                                  trim(t),
                                  '\s*\[\s*ED\.?\s*\d+\s*\]', '', 'gi'),
                                '\s*\(\s*ED\.?\s*\d+\s*\)', '', 'gi'),
                              '\s*\(\s*R(\s+\d+''?)?\s*\)', '', 'gi'),
                            '\s*\(\s*SEASON\s+\d+\s*\)', '', 'gi'),
                          '\s+S\.?\s*\d+\s*$', '', 'i'),
                        '\s+EP\.?\s*\d+.*$', '', 'i'),
                      '\s+EPISODIO\s+\d+.*$', '', 'i'),
                    '\s+[IVX]{2,}\s*$', '', 'i'),
                  -- single typographic → ASCII apostrophe (handles both U+2018 and U+2019)
                  E'[‘’]', '''', 'g'),
                -- double typographic → ASCII doublequote (translate is 1:1 mapping)
                E'“”', '""'),
              '\s+', ' ', 'g')
          ),
          '^(the|il|la|le|lo|gli|un|uno|una|i)\s+', '', 'i')
        || COALESCE('::' || y::text, '')
  END
$$;

COMMENT ON FUNCTION public.build_match_key IS
  'Deterministic match key for matching programmazioni to opere. Mirrored in TS at src/features/programmazioni/utils/title-normalize.ts (buildMatchKey).';

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
