CREATE TABLE IF NOT EXISTS public.public_form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kind TEXT NOT NULL CHECK (kind IN ('contatti', 'mandato', 'promozione')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'done')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.public_form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anonimi possono inserire submissions pubbliche"
  ON public.public_form_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (kind IN ('contatti', 'mandato', 'promozione'));

CREATE POLICY "Utenti autenticati leggono e aggiornano submissions"
  ON public.public_form_submissions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.public_form_submissions TO anon, authenticated, service_role;

INSERT INTO storage.buckets (id, name, public)
VALUES ('public-uploads', 'public-uploads', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Lettura pubblica upload sito"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'public-uploads');

CREATE POLICY "Autenticati e service caricano sul bucket pubblico"
  ON storage.objects FOR INSERT
  TO authenticated, service_role
  WITH CHECK (bucket_id = 'public-uploads');

