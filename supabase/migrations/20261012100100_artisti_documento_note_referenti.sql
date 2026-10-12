-- Scheda artista: documento d'identità, data di decesso, note interne,
-- tutori legali (minorenni) ed eredi (deceduti).
-- Le note e i referenti stanno in tabelle separate visibili solo allo staff:
-- la riga `artisti` è leggibile e modificabile anche dall'artista stesso.

ALTER TABLE public.artisti
  ADD COLUMN IF NOT EXISTS documento_tipo TEXT,
  ADD COLUMN IF NOT EXISTS documento_numero TEXT,
  ADD COLUMN IF NOT EXISTS documento_data_rilascio DATE,
  ADD COLUMN IF NOT EXISTS documento_data_scadenza DATE,
  ADD COLUMN IF NOT EXISTS data_decesso DATE;

CREATE INDEX IF NOT EXISTS idx_artisti_documento_scadenza
  ON public.artisti(documento_data_scadenza)
  WHERE documento_data_scadenza IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_artisti_data_nascita
  ON public.artisti(data_nascita)
  WHERE data_nascita IS NOT NULL;

-- I minorenni restano mandati attivi: il ruolo readonly deve vederli.
ALTER POLICY "artisti_select_policy" ON public.artisti
  USING (
    get_user_role() IN ('admin', 'operatore')
    OR (get_user_role() = 'artista' AND id = get_user_artista_id())
    OR (get_user_role() = 'readonly' AND stato IN ('attivo', 'minorenne'))
  );

-- Note interne (una per artista)
CREATE TABLE IF NOT EXISTS public.artisti_note (
  artista_id  UUID PRIMARY KEY REFERENCES public.artisti(id) ON DELETE CASCADE,
  note        TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE OR REPLACE FUNCTION public.set_updated_by_auth_uid()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER update_artisti_note_updated_at
  BEFORE UPDATE ON public.artisti_note
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_artisti_note_updated_by
  BEFORE INSERT OR UPDATE ON public.artisti_note
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_by_auth_uid();

ALTER TABLE public.artisti_note ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artisti_note_select_policy" ON public.artisti_note
  FOR SELECT
  USING (get_user_role() IN ('admin', 'operatore', 'readonly'));

CREATE POLICY "artisti_note_write_policy" ON public.artisti_note
  FOR ALL
  USING (get_user_role() IN ('admin', 'operatore'))
  WITH CHECK (get_user_role() IN ('admin', 'operatore'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.artisti_note TO authenticated, service_role;

COMMENT ON TABLE public.artisti_note IS
  'Note interne sulla scheda artista. Visibili solo allo staff, non all''artista.';

-- Tutori legali ed eredi
CREATE TABLE IF NOT EXISTS public.artisti_referenti (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artista_id         UUID NOT NULL REFERENCES public.artisti(id) ON DELETE CASCADE,
  tipo               TEXT NOT NULL CHECK (tipo IN ('tutore', 'erede')),
  nome               TEXT NOT NULL,
  cognome            TEXT,
  codice_fiscale     TEXT,
  relazione          TEXT,
  quota_percentuale  NUMERIC(5, 2) CHECK (quota_percentuale IS NULL OR (quota_percentuale >= 0 AND quota_percentuale <= 100)),
  email              TEXT,
  telefono           TEXT,
  indirizzo          TEXT,
  note               TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artisti_referenti_artista ON public.artisti_referenti(artista_id);

CREATE OR REPLACE TRIGGER update_artisti_referenti_updated_at
  BEFORE UPDATE ON public.artisti_referenti
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.artisti_referenti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artisti_referenti_select_policy" ON public.artisti_referenti
  FOR SELECT
  USING (get_user_role() IN ('admin', 'operatore', 'readonly'));

CREATE POLICY "artisti_referenti_write_policy" ON public.artisti_referenti
  FOR ALL
  USING (get_user_role() IN ('admin', 'operatore'))
  WITH CHECK (get_user_role() IN ('admin', 'operatore'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.artisti_referenti TO authenticated, service_role;

COMMENT ON TABLE public.artisti_referenti IS
  'Tutori legali (artisti minorenni) ed eredi (artisti deceduti).';
