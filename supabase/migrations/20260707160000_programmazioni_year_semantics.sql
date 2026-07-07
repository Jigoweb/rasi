-- Semantic year fields for programmazioni + production end year on opere.
-- rilascio = historic air/release; produzione = end of production (TIM ANNO_DI_RIFERIMENTO).

ALTER TABLE public.programmazioni
  ADD COLUMN IF NOT EXISTS anno_fine integer,
  ADD COLUMN IF NOT EXISTS anno_rilascio integer,
  ADD COLUMN IF NOT EXISTS anno_rilascio_fine integer,
  ADD COLUMN IF NOT EXISTS anno_produzione integer,
  ADD COLUMN IF NOT EXISTS anno_produzione_fine integer,
  ADD COLUMN IF NOT EXISTS anno_grezzo text,
  ADD COLUMN IF NOT EXISTS anno_semantica text;

ALTER TABLE public.opere
  ADD COLUMN IF NOT EXISTS anno_produzione_fine integer;

COMMENT ON COLUMN public.programmazioni.anno IS
  'Anno canonico per match_key e matcher: di norma anno_rilascio, altrimenti anno_produzione.';
COMMENT ON COLUMN public.programmazioni.anno_fine IS
  'Fine range dell''anno canonico quando il sorgente espone un intervallo (es. 2021-2024).';
COMMENT ON COLUMN public.programmazioni.anno_rilascio IS
  'Anno di messa in onda / rilascio storico (programma, stagione o episodio).';
COMMENT ON COLUMN public.programmazioni.anno_rilascio_fine IS
  'Fine intervallo rilascio quando presente nel file sorgente.';
COMMENT ON COLUMN public.programmazioni.anno_produzione IS
  'Anno di produzione / fine produzione riportato dall''emittente (es. TIM ANNO_DI_RIFERIMENTO).';
COMMENT ON COLUMN public.programmazioni.anno_produzione_fine IS
  'Fine intervallo produzione quando presente nel file sorgente.';
COMMENT ON COLUMN public.programmazioni.anno_grezzo IS
  'Valore grezzo della colonna che ha popolato l''anno canonico.';
COMMENT ON COLUMN public.programmazioni.anno_semantica IS
  'Semantica dell''anno canonico: rilascio | produzione.';
COMMENT ON COLUMN public.opere.anno_produzione_fine IS
  'Anno fine produzione serie (es. IMDB endYear).';
