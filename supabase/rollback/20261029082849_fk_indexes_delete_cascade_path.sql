-- Rollback di 20261029082849_fk_indexes_delete_cascade_path.sql.
-- Eseguire fuori transazione (DROP INDEX CONCURRENTLY).
-- supabase: no-transaction

SET statement_timeout = 0;

DROP INDEX CONCURRENTLY IF EXISTS public.idx_individuazioni_episodio_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_partecipazioni_episodio_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_partecipazioni_ruolo_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_ci_episode_alerts_opera_id;
