-- Import cast da template: una persona non presente in anagrafica RASI
-- va nel cast esterno, senza creare una riga in artisti.
-- Lo schema attuale di cast_esterno non può conservare né il ruolo
-- (ruoli_tipologie.nome: il campo ruolo accetta solo attore|doppiatore)
-- né l'IPN. Senza queste colonne il duplicato "stesso ruolo" e il
-- confronto Nome+Cognome+IPN non sono rappresentabili.
-- ruolo (attore|doppiatore) e primarieta restano per il cast manuale e IMDb.
-- Non applicare questa migrazione da questo PR: la history di produzione
-- è in riparazione.

ALTER TABLE public.cast_esterno
  ADD COLUMN IF NOT EXISTS ruolo_id UUID REFERENCES public.ruoli_tipologie(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS codice_ipn TEXT;

COMMENT ON COLUMN public.cast_esterno.ruolo_id IS
  'Ruolo di ruoli_tipologie per le righe importate dal template. NULL sul cast manuale o IMDb.';

COMMENT ON COLUMN public.cast_esterno.codice_ipn IS
  'IPN indicato nel template quando la persona non è un artista RASI. Non crea una scheda artista.';

CREATE INDEX IF NOT EXISTS idx_cast_esterno_ruolo
  ON public.cast_esterno(ruolo_id);
