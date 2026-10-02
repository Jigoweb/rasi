-- Distinzione artisti musica / cinema / entrambi
CREATE TYPE public.ambito_artista AS ENUM ('musica', 'cinema', 'entrambi');

ALTER TABLE public.artisti
  ADD COLUMN ambito public.ambito_artista;

CREATE INDEX idx_artisti_ambito ON public.artisti(ambito);
