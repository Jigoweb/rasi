-- Upload programmazioni via Railway worker.
--
-- The upload worker can retry and resume chunks. `import_row_uid` makes writes
-- idempotent so repeated chunks do not duplicate programmazioni.

ALTER TABLE public.programmazioni
  ADD COLUMN IF NOT EXISTS import_row_uid text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_programmazioni_import_row_uid
  ON public.programmazioni (import_row_uid);

CREATE TABLE IF NOT EXISTS public.upload_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campagna_programmazione_id uuid NOT NULL REFERENCES public.campagne_programmazione(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  mapping_snapshot jsonb NOT NULL,
  stato text NOT NULL DEFAULT 'queued',
  fase text,
  righe_totali integer NOT NULL DEFAULT 0,
  righe_processate integer NOT NULL DEFAULT 0,
  righe_inserite integer NOT NULL DEFAULT 0,
  righe_duplicate_saltate integer NOT NULL DEFAULT 0,
  current_chunk integer NOT NULL DEFAULT 0,
  total_chunks integer NOT NULL DEFAULT 0,
  chunk_size integer NOT NULL DEFAULT 500,
  error text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_upload_jobs_owner_campaign_state_updated
  ON public.upload_jobs (created_by, campagna_programmazione_id, stato, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_upload_jobs_state_created
  ON public.upload_jobs (stato, created_at ASC);

ALTER TABLE public.upload_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "upload_jobs_select_owner" ON public.upload_jobs;
CREATE POLICY "upload_jobs_select_owner"
  ON public.upload_jobs
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- The browser uploads raw files directly to this private bucket; the Railway
-- worker reads them with the service-role key.
INSERT INTO storage.buckets (id, name, public)
VALUES ('programmazioni-uploads', 'programmazioni-uploads', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "programmazioni_uploads_insert_own_folder" ON storage.objects;
CREATE POLICY "programmazioni_uploads_insert_own_folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'programmazioni-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "programmazioni_uploads_select_own_folder" ON storage.objects;
CREATE POLICY "programmazioni_uploads_select_own_folder"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'programmazioni-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
