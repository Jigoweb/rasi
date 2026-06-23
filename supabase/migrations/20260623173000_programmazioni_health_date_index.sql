-- supabase: no-transaction
--
-- Speeds up health date range lookups:
-- WHERE campagna_programmazione_id = ? AND data_trasmissione IS NOT NULL
-- ORDER BY data_trasmissione ASC/DESC LIMIT 1

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_programmazioni_campagna_data_trasmissione
  ON public.programmazioni (campagna_programmazione_id, data_trasmissione);
