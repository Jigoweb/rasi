-- supabase: no-transaction
--
-- A1. Indici sulle foreign key del percorso DELETE/CASCADE.
-- Diagnosi read-only del 2026-10-29 (niente è stato applicato in produzione):
--   individuazioni.episodio_id     265.551 righe, tabella ~488 MB, ON DELETE nessun CASCADE (check)
--   partecipazioni.episodio_id      29.689 righe, ON DELETE CASCADE
--     (esiste solo l'indice (opera_id, episodio_id), inutile per il lookup su episodio_id)
--   campagne_individuazione_episode_alerts.opera_id  64.993 righe, ON DELETE CASCADE
--   partecipazioni.ruolo_id         29.689 righe
--
-- Il runner delle migration Supabase avvolge il file in una transazione.
-- CREATE INDEX CONCURRENTLY non può stare in un blocco transazionale.
-- La riga `-- supabase: no-transaction` (già usata in questo repo) disattiva
-- quel wrapping: gli indici si creano CONCURRENTLY.
--
-- Lock: ShareUpdateExclusiveLock. Non blocca SELECT/INSERT/UPDATE/DELETE.
-- Blocca solo altro DDL sulla stessa tabella, all'inizio e alla fine della build.
-- Senza il marker la migration fallirebbe (CONCURRENTLY inside a transaction)
-- invece di prendere ACCESS EXCLUSIVE.
-- Durata della build non misurata. Su individuazioni (~488 MB / ~265k righe)
-- è il caso più lungo; le altre tre tabelle sono molto più piccole.
--
-- Idempotente: CREATE INDEX IF NOT EXISTS. Se un CONCURRENTLY precedente è
-- fallito, l'indice resta INVALID e IF NOT EXISTS non lo ricostruisce:
-- DROP INDEX CONCURRENTLY sul nome, poi rieseguire questa migration.
-- Non crea gli indici opzionali su validato_da (solo cancellazione utenti).

SET statement_timeout = 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_individuazioni_episodio_id
  ON public.individuazioni (episodio_id)
  WHERE episodio_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_partecipazioni_episodio_id
  ON public.partecipazioni (episodio_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_partecipazioni_ruolo_id
  ON public.partecipazioni (ruolo_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ci_episode_alerts_opera_id
  ON public.campagne_individuazione_episode_alerts (opera_id);

DO $assert_fk_indexes$
DECLARE
  v_missing text;
  v_pred text;
BEGIN
  SELECT string_agg(expected.name, ', ' ORDER BY expected.name)
    INTO v_missing
  FROM (
    VALUES
      ('idx_individuazioni_episodio_id'),
      ('idx_partecipazioni_episodio_id'),
      ('idx_partecipazioni_ruolo_id'),
      ('idx_ci_episode_alerts_opera_id')
  ) AS expected(name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_index i ON i.indexrelid = c.oid
    WHERE n.nspname = 'public'
      AND c.relname = expected.name
      AND i.indisvalid
      AND i.indisready
  );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'indici FK assenti o non validi: %', v_missing;
  END IF;

  SELECT pg_get_expr(i.indpred, i.indrelid)
    INTO v_pred
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_index i ON i.indexrelid = c.oid
  WHERE n.nspname = 'public'
    AND c.relname = 'idx_individuazioni_episodio_id';

  IF v_pred IS DISTINCT FROM '(episodio_id IS NOT NULL)' THEN
    RAISE EXCEPTION 'idx_individuazioni_episodio_id predicato inatteso: %', v_pred;
  END IF;
END
$assert_fk_indexes$;
