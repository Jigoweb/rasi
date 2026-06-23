-- Tighten campaign_jobs reads for browser polling.
--
-- The original SELECT policy allowed every authenticated user to read every
-- campaign_jobs row. Task 5 relies on campaign_jobs as a progress freshness
-- source, so the database policy must enforce the same ownership boundary as
-- the frontend query: users can only read jobs they created. The worker uses the
-- service-role key and continues to bypass RLS for job writes and maintenance.

DROP POLICY IF EXISTS "campaign_jobs_select_authenticated" ON public.campaign_jobs;

CREATE POLICY "campaign_jobs_select_authenticated"
    ON public.campaign_jobs
    FOR SELECT
    TO authenticated
    USING (created_by = auth.uid());

-- Supports owner-scoped progress polling and worker/frontend lookups by campaign
-- and active/recent-error state.
CREATE INDEX IF NOT EXISTS idx_campaign_jobs_owner_campaign_state_updated
    ON public.campaign_jobs (
        created_by,
        campagne_programmazione_id,
        stato,
        updated_at DESC
    );
