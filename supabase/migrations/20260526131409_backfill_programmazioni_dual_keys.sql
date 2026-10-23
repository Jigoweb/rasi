-- B.3 — batched backfill of programmazioni.match_key_strict + match_key_loose.
-- 4M rows in chunks of 50K. Expected runtime: 10-20 minutes.
-- Run during low-traffic window. FOR UPDATE SKIP LOCKED makes the batch safe
-- against concurrent writers (they update independently).

DO $$
DECLARE
  v_batch_size CONSTANT integer := 50000;
  v_updated bigint := 0;
  v_total bigint := 0;
  v_iter integer := 0;
BEGIN
  LOOP
    v_iter := v_iter + 1;
    WITH to_update AS (
      SELECT id
      FROM public.programmazioni
      WHERE match_key_strict IS NULL OR match_key_loose IS NULL
      LIMIT v_batch_size
      FOR UPDATE SKIP LOCKED
    )
    UPDATE public.programmazioni p
    SET match_key_strict = public.build_match_key_strict(p.titolo, p.anno),
        match_key_loose  = public.build_match_key(p.titolo, p.anno)
    FROM to_update t
    WHERE p.id = t.id;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    v_total := v_total + v_updated;
    RAISE NOTICE 'Iter %: % rows (cumulative %)', v_iter, v_updated, v_total;
    EXIT WHEN v_updated = 0;
  END LOOP;
  RAISE NOTICE 'Backfill complete: % total rows', v_total;
END
$$;
