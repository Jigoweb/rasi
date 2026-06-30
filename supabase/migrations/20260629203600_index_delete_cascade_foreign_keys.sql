-- Support fast cascade checks when deleting large campagne_programmazione.
-- PostgreSQL needs indexes on referencing foreign-key columns to avoid repeated
-- scans of child tables during cascaded deletes.

CREATE INDEX IF NOT EXISTS idx_individuazione_episode_alerts_programmazione_id
  ON public.campagne_individuazione_episode_alerts (programmazione_id);

CREATE INDEX IF NOT EXISTS idx_upload_jobs_campagna_programmazione_id
  ON public.upload_jobs (campagna_programmazione_id);
