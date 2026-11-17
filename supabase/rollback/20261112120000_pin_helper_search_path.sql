-- Rollback di 20261112120000_pin_helper_search_path.sql.
-- NON è una migration: non sta in supabase/migrations e non parte da solo.
--
-- Eseguirlo a mano, in un'unica transazione (BEGIN/COMMIT qui sotto).
-- Non applicarlo insieme alla migration.
--
-- Prima della migration proconfig delle quattro funzioni era NULL
-- (search_path non impostato). RESET, non SET search_path = '': un
-- search_path vuoto non è lo stato precedente e terrebbe la funzione
-- fuori dall'inlining.
--
-- I grant non sono stati modificati. Qui non si fa REVOKE né GRANT:
-- restano quelli trovati al momento del rollback.
-- get_user_role(), get_user_artista_id(), get_user_email_by_id(uuid)
-- e le funzioni staff non sono toccate: non c'è nulla da ripristinare.

BEGIN;

DO $rollback_pin_helper_search_path$
DECLARE
  fn text;
  proc regprocedure;
  bad text[] := ARRAY[]::text[];
  fns text[] := ARRAY[
    'public.build_match_key_strict(text,integer)',
    'public.build_match_key(text,integer)',
    'public.year_range_bounds(integer,integer)',
    'public.year_ranges_overlap(integer,integer,integer,integer)'
  ];
BEGIN
  IF cardinality(fns) <> 4 THEN
    RAISE EXCEPTION 'elenco rollback: attese 4 firme, trovate %', cardinality(fns);
  END IF;

  FOREACH fn IN ARRAY fns LOOP
    IF to_regprocedure(fn) IS NULL THEN
      RAISE EXCEPTION 'firma assente, rollback interrotto: %', fn;
    END IF;
    EXECUTE format('ALTER FUNCTION %s RESET search_path', fn);
  END LOOP;

  FOREACH fn IN ARRAY fns LOOP
    proc := to_regprocedure(fn);
    IF EXISTS (
      SELECT 1
      FROM unnest(COALESCE((SELECT p.proconfig FROM pg_proc p WHERE p.oid = proc), ARRAY[]::text[])) AS cfg
      WHERE replace(cfg, ' ', '') LIKE 'search_path=%'
    ) THEN
      bad := array_append(bad, fn || ': search_path ancora impostato');
    END IF;
  END LOOP;

  IF public.build_match_key_strict('MADAMA (LA)', 2020) IS DISTINCT FROM 'madama::2020'
     OR public.build_match_key('Vikings 5', NULL) IS DISTINCT FROM 'vikings'
     OR public.build_match_key_strict('Show: Season 2', NULL) IS DISTINCT FROM 'show'
     OR public.year_ranges_overlap(2010, 2012, 2012, 2014) IS DISTINCT FROM true
     OR public.year_ranges_overlap(2010, 2011, 2013, 2014) IS DISTINCT FROM false THEN
    bad := array_append(bad, 'valori diversi dopo il RESET');
  END IF;

  IF cardinality(bad) > 0 THEN
    RAISE EXCEPTION 'rollback search_path helper annullato: %', bad;
  END IF;

  RAISE NOTICE 'search_path delle quattro helper riportato a non impostato';
END
$rollback_pin_helper_search_path$;

COMMIT;
