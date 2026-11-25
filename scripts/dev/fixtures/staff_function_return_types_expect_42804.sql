-- Chiama la lista campagne come admin. Prima del cast, plpgsql deve
-- rifiutare il RETURN QUERY con SQLSTATE 42804. Non modifica dati.

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}',
  false
);

DO $expect_42804$
BEGIN
  PERFORM 1
  FROM public.get_campagne_programmazione_with_counts()
  LIMIT 1;
  RAISE EXCEPTION 'atteso SQLSTATE 42804, la funzione è tornata senza errore';
EXCEPTION
  WHEN datatype_mismatch THEN
    NULL;
END
$expect_42804$;
