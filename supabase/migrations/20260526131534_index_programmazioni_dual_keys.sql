-- B.4 — Indexes for programmazioni dual match keys.
-- CONCURRENTLY avoids blocking write traffic during the index build on 4M rows.
-- NOTE: Supabase migration runner wraps migrations in transactions by default,
-- but CONCURRENTLY cannot run inside a transaction. Disable transaction wrapping:
-- supabase: no-transaction

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_programmazioni_match_key_strict
  ON public.programmazioni(match_key_strict)
  WHERE match_key_strict IS NOT NULL AND match_key_strict <> '';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_programmazioni_match_key_loose
  ON public.programmazioni(match_key_loose)
  WHERE match_key_loose IS NOT NULL AND match_key_loose <> '';
