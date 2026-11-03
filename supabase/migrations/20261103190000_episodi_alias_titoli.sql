-- Alias / titoli alternativi episodio, analoghi a opere.alias_titoli.
-- Non usati dal matcher in questo intervento.
ALTER TABLE public.episodi
  ADD COLUMN IF NOT EXISTS alias_titoli text[];

COMMENT ON COLUMN public.episodi.alias_titoli IS
  'Titoli alternativi / alias dell''episodio, analoghi a opere.alias_titoli. Non usati dal matcher in questo intervento.';
