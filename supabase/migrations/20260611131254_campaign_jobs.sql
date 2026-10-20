-- Tabella di stato per i job di elaborazione eseguiti dal worker Node.js
-- (server/ su Railway). Il worker orchestra le RPC pesanti (individuazione,
-- caricamento programmazioni) e scrive qui l'avanzamento; il frontend fa
-- polling di questa riga. Persiste oltre i restart del container.

CREATE TABLE IF NOT EXISTS public.campaign_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo text NOT NULL DEFAULT 'individuazione',          -- 'individuazione' | 'programmazione'
    stato text NOT NULL DEFAULT 'queued',                 -- queued | running | completed | error | cancelled
    fase text,                                            -- init | processing | finalizing | completed | error
    campagne_programmazione_id uuid NOT NULL,
    campagne_individuazione_id uuid,
    programmazioni_totali integer NOT NULL DEFAULT 0,
    programmazioni_processate integer NOT NULL DEFAULT 0,
    individuazioni_create integer NOT NULL DEFAULT 0,
    current_chunk integer NOT NULL DEFAULT 0,
    total_chunks integer NOT NULL DEFAULT 0,
    error text,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Lookup del job attivo per campagna (findActiveJob) e per la dashboard.
CREATE INDEX IF NOT EXISTS idx_campaign_jobs_campagna
    ON public.campaign_jobs (campagne_programmazione_id, stato);

CREATE INDEX IF NOT EXISTS idx_campaign_jobs_stato
    ON public.campaign_jobs (stato, created_at DESC);

-- RLS: il worker usa la service-role key (bypassa RLS). Gli utenti autenticati
-- possono LEGGERE i job per fare polling dell'avanzamento dal browser; la
-- scrittura resta esclusiva del worker.
ALTER TABLE public.campaign_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_jobs_select_authenticated" ON public.campaign_jobs;
CREATE POLICY "campaign_jobs_select_authenticated"
    ON public.campaign_jobs
    FOR SELECT
    TO authenticated
    USING (true);
