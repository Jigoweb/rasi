-- Coda richieste dal sito pubblico (contatti, mandato, promozione).
CREATE TABLE IF NOT EXISTS public.public_form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kind TEXT NOT NULL CHECK (kind IN ('contatti', 'mandato', 'promozione')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'done')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.public_form_submissions ENABLE ROW LEVEL SECURITY;
