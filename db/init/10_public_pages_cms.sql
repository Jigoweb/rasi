-- Migrazione: Supabase CMS per Pagine Pubbliche R.A.S.I.

-- 1. Tabella pages
CREATE TABLE public.pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    template_type TEXT NOT NULL CHECK (template_type IN ('institutional', 'service', 'document_list', 'faq', 'bando')),
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category, slug)
);

-- 2. Tabella documents
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('modulistica', 'contratti', 'norme', 'allegati_bando')),
    page_id UUID REFERENCES public.pages(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabella bandi_news
CREATE TABLE public.bandi_news (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'closed')),
    cover_image_url TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Abilita RLS
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bandi_news ENABLE ROW LEVEL SECURITY;

-- Policy di Lettura (Pubblica)
CREATE POLICY "Permetti lettura pubblica delle pagine pubblicate" ON public.pages FOR SELECT USING (is_published = true);
CREATE POLICY "Permetti lettura pubblica dei documenti" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Permetti lettura pubblica dei bandi" ON public.bandi_news FOR SELECT USING (true);

-- Policy di Scrittura (Solo admin)
-- Assumiamo che gli admin abbiano un ruolo specifico o che l'accesso sia protetto a livello di applicazione
-- Per semplicità, qui lasciamo le policy di default chiuse per la scrittura pubblica, 
-- delegando le operazioni CRUD ai service key o ruoli autenticati admin
CREATE POLICY "Permetti gestione admin pages" ON public.pages USING (auth.role() = 'authenticated');
CREATE POLICY "Permetti gestione admin documents" ON public.documents USING (auth.role() = 'authenticated');
CREATE POLICY "Permetti gestione admin bandi_news" ON public.bandi_news USING (auth.role() = 'authenticated');
