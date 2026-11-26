-- SCAPR accetta il sesso solo come M / F (riunione 25/11/2026): niente «X».
-- In produzione nessun artista ha sesso = 'X' (verificato il 26/11/2026);
-- per sicurezza eventuali X tornano a NULL («non indicato»).

UPDATE public.artisti SET sesso = NULL WHERE sesso = 'X';

ALTER TABLE public.artisti DROP CONSTRAINT IF EXISTS artisti_sesso_check;
ALTER TABLE public.artisti
  ADD CONSTRAINT artisti_sesso_check CHECK (sesso IS NULL OR sesso IN ('M', 'F'));

COMMENT ON COLUMN public.artisti.sesso IS 'M o F (formato SCAPR); NULL = non indicato';
