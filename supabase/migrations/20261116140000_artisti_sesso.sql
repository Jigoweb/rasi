-- Campo «sesso» dell'artista (richiesto per l'onboarding SCAPR, riunione 11/11/2026).
-- M = maschile, F = femminile, X = altro / non binario; NULL = non indicato.
-- L'artista non lo modifica dal profilo: il trigger dei campi bloccati
-- (artisti_artista_colonne_consentite) non lo elenca tra quelli consentiti.

ALTER TABLE public.artisti
  ADD COLUMN IF NOT EXISTS sesso text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'artisti_sesso_check' AND conrelid = 'public.artisti'::regclass
  ) THEN
    ALTER TABLE public.artisti
      ADD CONSTRAINT artisti_sesso_check CHECK (sesso IS NULL OR sesso IN ('M', 'F', 'X'));
  END IF;
END
$$;

COMMENT ON COLUMN public.artisti.sesso IS 'M, F, X (altro); NULL = non indicato';
