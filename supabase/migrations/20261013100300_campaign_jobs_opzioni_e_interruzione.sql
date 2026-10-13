-- campaign_jobs: opzioni del run e interruzione per riavvio del worker.
--
-- opzioni        soglia_titolo, artista_ids, mandato_override_artist_ids del
--                run. "Riprendi" e la ripresa automatica le riusano invece di
--                ripartire senza filtri.
-- interrotto_at  valorizzato dal worker quando riceve SIGTERM (deploy) mentre
--                il job gira: il job torna 'queued' e il worker successivo lo
--                riprende da solo sulla stessa riga.

ALTER TABLE public.campaign_jobs
  ADD COLUMN IF NOT EXISTS opzioni jsonb,
  ADD COLUMN IF NOT EXISTS interrotto_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_campaign_jobs_interrotti
  ON public.campaign_jobs (interrotto_at)
  WHERE interrotto_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_jobs_campagna_individuazione
  ON public.campaign_jobs (campagne_individuazione_id, created_at DESC)
  WHERE campagne_individuazione_id IS NOT NULL;
