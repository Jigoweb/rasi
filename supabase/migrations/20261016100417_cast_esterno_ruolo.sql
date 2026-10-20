-- Cast esterno: oltre a primario/comprimario, distingue attore e doppiatore.
-- Le righe esistenti (e quelle scaricate da IMDb) restano "attore".
ALTER TABLE public.cast_esterno
  ADD COLUMN IF NOT EXISTS ruolo TEXT NOT NULL DEFAULT 'attore'
    CHECK (ruolo IN ('attore', 'doppiatore'));
