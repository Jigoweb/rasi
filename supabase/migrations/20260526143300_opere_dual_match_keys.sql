-- B.1 — opere dual match keys.
-- Replaces single opere.match_key (created in 20260525143158) with strict + loose
-- variants. Both columns are auto-populated by a trigger that calls
-- build_match_key_strict() and build_match_key() from migration 20260525143158.
-- 7K row backfill is fast (<5s).

ALTER TABLE public.opere
  ADD COLUMN IF NOT EXISTS match_key_strict text,
  ADD COLUMN IF NOT EXISTS match_key_loose text;

-- Drop old single-key trigger + function (created in 20260525143158)
DROP TRIGGER IF EXISTS opere_match_key_sync ON public.opere;
DROP FUNCTION IF EXISTS public.trg_opere_sync_match_key();

CREATE OR REPLACE FUNCTION public.trg_opere_sync_match_keys()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.match_key_strict := public.build_match_key_strict(NEW.titolo, NEW.anno_produzione);
  NEW.match_key_loose  := public.build_match_key(NEW.titolo, NEW.anno_produzione);
  RETURN NEW;
END
$$;

CREATE TRIGGER opere_match_keys_sync
  BEFORE INSERT OR UPDATE OF titolo, anno_produzione ON public.opere
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_opere_sync_match_keys();

-- Backfill both columns
UPDATE public.opere
SET match_key_strict = public.build_match_key_strict(titolo, anno_produzione),
    match_key_loose  = public.build_match_key(titolo, anno_produzione);

-- Drop the obsolete single match_key column + index (replaced by dual columns)
DROP INDEX IF EXISTS public.idx_opere_match_key;
ALTER TABLE public.opere DROP COLUMN IF EXISTS match_key;

-- New indexes for both keys
CREATE INDEX IF NOT EXISTS idx_opere_match_key_strict
  ON public.opere(match_key_strict)
  WHERE match_key_strict IS NOT NULL AND match_key_strict <> '';

CREATE INDEX IF NOT EXISTS idx_opere_match_key_loose
  ON public.opere(match_key_loose)
  WHERE match_key_loose IS NOT NULL AND match_key_loose <> '';
