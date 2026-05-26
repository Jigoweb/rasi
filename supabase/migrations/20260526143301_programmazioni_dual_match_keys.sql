-- B.2 — programmazioni dual match keys (column + trigger, NO backfill in this file).
-- 4M rows: ADD COLUMN with NULL default is a catalog-only change (fast).
-- The trigger handles new INSERTs; the backfill runs in migration 20260526143302.

ALTER TABLE public.programmazioni
  ADD COLUMN IF NOT EXISTS match_key_strict text,
  ADD COLUMN IF NOT EXISTS match_key_loose text;

CREATE OR REPLACE FUNCTION public.trg_programmazioni_sync_match_keys()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.match_key_strict := public.build_match_key_strict(NEW.titolo, NEW.anno);
  NEW.match_key_loose  := public.build_match_key(NEW.titolo, NEW.anno);
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS programmazioni_match_keys_sync ON public.programmazioni;
CREATE TRIGGER programmazioni_match_keys_sync
  BEFORE INSERT OR UPDATE OF titolo, anno ON public.programmazioni
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_programmazioni_sync_match_keys();
