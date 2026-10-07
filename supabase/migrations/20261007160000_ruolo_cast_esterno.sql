-- Ruolo del cast non RASI: attore/doppiatore × primario/comprimario.
-- Le righe già salvate come "primario/comprimario" diventano attore primario/comprimario.

DO $$ BEGIN
  CREATE TYPE public.ruolo_cast AS ENUM (
    'attore_primario',
    'attore_comprimario',
    'doppiatore_primario',
    'doppiatore_comprimario'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.cast_esterno
  ADD COLUMN IF NOT EXISTS ruolo public.ruolo_cast;

UPDATE public.cast_esterno
SET ruolo = CASE primarieta
  WHEN 'primario' THEN 'attore_primario'::public.ruolo_cast
  ELSE 'attore_comprimario'::public.ruolo_cast
END
WHERE ruolo IS NULL;

ALTER TABLE public.cast_esterno
  ALTER COLUMN ruolo SET DEFAULT 'attore_comprimario';

ALTER TABLE public.cast_esterno
  ALTER COLUMN ruolo SET NOT NULL;

CREATE OR REPLACE FUNCTION public.replace_cast_esterno(p_opera_id uuid, p_rows jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF get_user_role() IS NULL OR get_user_role() NOT IN ('admin', 'operatore') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.cast_esterno WHERE opera_id = p_opera_id;

  INSERT INTO public.cast_esterno (opera_id, nome, personaggio, ruolo, primarieta, imdb_nconst, fonte, ordine)
  SELECT
    p_opera_id,
    trim(x.nome),
    NULLIF(trim(COALESCE(x.personaggio, '')), ''),
    CASE
      WHEN x.ruolo IN (
        'attore_primario',
        'attore_comprimario',
        'doppiatore_primario',
        'doppiatore_comprimario'
      ) THEN x.ruolo::public.ruolo_cast
      WHEN COALESCE(NULLIF(x.primarieta, ''), 'comprimario') = 'primario' THEN 'attore_primario'::public.ruolo_cast
      ELSE 'attore_comprimario'::public.ruolo_cast
    END,
    CASE
      WHEN x.ruolo IN ('attore_primario', 'doppiatore_primario') THEN 'primario'::public.primarieta_cast
      WHEN x.ruolo IN ('attore_comprimario', 'doppiatore_comprimario') THEN 'comprimario'::public.primarieta_cast
      WHEN COALESCE(NULLIF(x.primarieta, ''), 'comprimario') = 'primario' THEN 'primario'::public.primarieta_cast
      ELSE 'comprimario'::public.primarieta_cast
    END,
    NULLIF(trim(COALESCE(x.imdb_nconst, '')), ''),
    CASE WHEN x.fonte = 'imdb' THEN 'imdb' ELSE 'manuale' END,
    COALESCE(x.ordine, 0)
  FROM jsonb_to_recordset(COALESCE(p_rows, '[]'::jsonb)) AS x(
    nome text,
    personaggio text,
    ruolo text,
    primarieta text,
    imdb_nconst text,
    fonte text,
    ordine int
  )
  WHERE trim(COALESCE(x.nome, '')) <> '';
END;
$$;

COMMENT ON COLUMN public.cast_esterno.ruolo IS
  'Attore o doppiatore, primario o comprimario. primarieta resta allineata per compatibilità.';
