-- pg_trgm is already installed; this migration adds:
--   1. build_match_key(text, integer) SQL helper (mirrors TS normalizeTitle)
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
      lower(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(
                      regexp_replace(trim(t),
                        '\s*\[\s*ED\.?\s*\d+\s*\]', '', 'gi'),
                      '\s*\(\s*ED\.?\s*\d+\s*\)', '', 'gi'),
                    '\s*\(\s*R(\s+\d+''?)?\s*\)', '', 'gi'),
                  '\s+S\.?\s*\d+\s*$', '', 'i'),
                '\s*\(\s*SEASON\s+\d+\s*\)', '', 'gi'),
              '\s+EP\.?\s*\d+.*$', '', 'i'),
            '\s+', ' ', 'g'),
          '^(the|il|la|le|lo|gli|un|uno|una|i)\s+', '', 'i')
      ) || COALESCE('::' || y::text, '')
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
