-- supabase: no-transaction
--
-- Indice per la selezione a cursore dei lotti di individuazione
-- (get_campagna_programmazioni_batch): WHERE campagna_programmazione_id = ?
-- AND id > ? ORDER BY id LIMIT n. Senza questo indice ogni lotto doveva
-- riscorrere tutte le righe già elaborate della campagna (costo quadratico,
-- statement timeout sulle campagne grandi come IRIS 2024, 89k righe).

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_programmazioni_campagna_id
  ON public.programmazioni (campagna_programmazione_id, id);
