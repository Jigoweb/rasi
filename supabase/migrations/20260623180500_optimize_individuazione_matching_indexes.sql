-- supabase: no-transaction
--
-- `match_programmazione_to_partecipazioni` compares LOWER(opere.titolo)
-- with the trigram `%` operator, so plain `titolo gin_trgm_ops` indexes are
-- not enough for that expression. These indexes keep each per-row match under
-- the PostgREST statement timeout during Railway jobs.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_opere_trgm_lower_titolo
  ON public.opere USING gin (lower(titolo) gin_trgm_ops)
  WHERE titolo IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_opere_trgm_lower_titolo_originale
  ON public.opere USING gin (lower(titolo_originale) gin_trgm_ops)
  WHERE titolo_originale IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_partecipazioni_opera
  ON public.partecipazioni (opera_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_partecipazioni_opera_episodio
  ON public.partecipazioni (opera_id, episodio_id);
