ALTER TABLE public.upload_jobs
  ADD COLUMN IF NOT EXISTS quality_report jsonb;

ALTER TABLE public.upload_jobs
  DROP CONSTRAINT IF EXISTS upload_jobs_quality_report_object_check;

ALTER TABLE public.upload_jobs
  ADD CONSTRAINT upload_jobs_quality_report_object_check
  CHECK (quality_report IS NULL OR jsonb_typeof(quality_report) = 'object');

COMMENT ON COLUMN public.upload_jobs.quality_report IS
  'Aggregated non-blocking import-quality report produced by the upload worker. Contains warning counts and report version.';
