-- Allow multiple individuazione runs for the same programmazione while keeping
-- duplicate matches impossible inside a single campagne_individuazione run.

ALTER TABLE public.individuazioni
  DROP CONSTRAINT IF EXISTS individuazioni_unique_programma_artista_ruolo;

ALTER TABLE public.individuazioni
  ADD CONSTRAINT individuazioni_unique_programma_artista_ruolo
  UNIQUE NULLS NOT DISTINCT (
    campagna_individuazioni_id,
    programmazione_id,
    artista_id,
    ruolo_id,
    episodio_id
  );

COMMENT ON CONSTRAINT individuazioni_unique_programma_artista_ruolo
  ON public.individuazioni IS
  'Prevents duplicate matches within the same campagne_individuazione run while allowing repeated runs for the same programmazione.';
