-- Keep programmazioni_count in sync without updating the parent campaign once
-- per row. Direct deletes of large campagne_programmazione cascade through
-- programmazioni; a row-level count trigger can exceed the PostgREST timeout.

DROP TRIGGER IF EXISTS trg_programmazioni_count ON public.programmazioni;

CREATE OR REPLACE FUNCTION public.trg_sync_programmazioni_count_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF current_setting('rasi.skip_programmazioni_count_trigger', true) = 'on' THEN
    RETURN NULL;
  END IF;

  UPDATE public.campagne_programmazione cp
  SET programmazioni_count = cp.programmazioni_count + counts.row_count
  FROM (
    SELECT campagna_programmazione_id, COUNT(*)::bigint AS row_count
    FROM new_rows
    GROUP BY campagna_programmazione_id
  ) counts
  WHERE cp.id = counts.campagna_programmazione_id;

  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_sync_programmazioni_count_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF current_setting('rasi.skip_programmazioni_count_trigger', true) = 'on' THEN
    RETURN NULL;
  END IF;

  UPDATE public.campagne_programmazione cp
  SET programmazioni_count = GREATEST(cp.programmazioni_count - counts.row_count, 0)
  FROM (
    SELECT campagna_programmazione_id, COUNT(*)::bigint AS row_count
    FROM old_rows
    GROUP BY campagna_programmazione_id
  ) counts
  WHERE cp.id = counts.campagna_programmazione_id;

  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_sync_programmazioni_count_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF current_setting('rasi.skip_programmazioni_count_trigger', true) = 'on' THEN
    RETURN NULL;
  END IF;

  WITH deltas AS (
    SELECT old_rows.campagna_programmazione_id, -COUNT(*)::bigint AS delta
    FROM old_rows
    JOIN new_rows USING (id)
    WHERE old_rows.campagna_programmazione_id IS DISTINCT FROM new_rows.campagna_programmazione_id
    GROUP BY old_rows.campagna_programmazione_id
    UNION ALL
    SELECT new_rows.campagna_programmazione_id, COUNT(*)::bigint AS delta
    FROM old_rows
    JOIN new_rows USING (id)
    WHERE old_rows.campagna_programmazione_id IS DISTINCT FROM new_rows.campagna_programmazione_id
    GROUP BY new_rows.campagna_programmazione_id
  ),
  grouped AS (
    SELECT campagna_programmazione_id, SUM(delta) AS delta
    FROM deltas
    GROUP BY campagna_programmazione_id
    HAVING SUM(delta) <> 0
  )
  UPDATE public.campagne_programmazione cp
  SET programmazioni_count = GREATEST(cp.programmazioni_count + grouped.delta, 0)
  FROM grouped
  WHERE cp.id = grouped.campagna_programmazione_id;

  RETURN NULL;
END;
$function$;

CREATE TRIGGER trg_programmazioni_count_insert
  AFTER INSERT ON public.programmazioni
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trg_sync_programmazioni_count_insert();

CREATE TRIGGER trg_programmazioni_count_delete
  AFTER DELETE ON public.programmazioni
  REFERENCING OLD TABLE AS old_rows
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trg_sync_programmazioni_count_delete();

CREATE TRIGGER trg_programmazioni_count_update
  AFTER UPDATE ON public.programmazioni
  REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trg_sync_programmazioni_count_update();

REVOKE EXECUTE ON FUNCTION public.trg_sync_programmazioni_count_insert() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_sync_programmazioni_count_insert() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_sync_programmazioni_count_delete() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_sync_programmazioni_count_delete() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_sync_programmazioni_count_update() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_sync_programmazioni_count_update() FROM anon, authenticated;
