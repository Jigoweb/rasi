-- Backfill ambito from diritti AU (musica) / AV (audiovisivo) and persist
-- non-RASI cast on an opera without a full anagrafica artist record.
-- Safe to re-run: backfill only fills NULL ambito; cast table uses IF NOT EXISTS.

DO $$ BEGIN
  CREATE TYPE public.ambito_artista AS ENUM ('musica', 'cinema', 'entrambi');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.artisti
  ADD COLUMN IF NOT EXISTS ambito public.ambito_artista;

CREATE INDEX IF NOT EXISTS idx_artisti_ambito ON public.artisti(ambito);

-- AU / AV are tokens in the right name (e.g. " - AU - ", " - AV - ").
-- ALL and AL (lending) are not ambiti.
UPDATE public.artisti AS a
SET ambito = derived.ambito
FROM (
  SELECT
    id,
    CASE
      WHEN has_au AND has_av THEN 'entrambi'::public.ambito_artista
      WHEN has_au THEN 'musica'::public.ambito_artista
      WHEN has_av THEN 'cinema'::public.ambito_artista
      ELSE NULL
    END AS ambito
  FROM (
    SELECT
      art.id,
      bool_or(upper(label) ~ '(^|[^A-Z])AU([^A-Z]|$)') AS has_au,
      bool_or(upper(label) ~ '(^|[^A-Z])AV([^A-Z]|$)') AS has_av
    FROM public.artisti AS art
    CROSS JOIN LATERAL (
      SELECT jsonb_array_elements_text(
        CASE jsonb_typeof(art.diritti_attivi)
          WHEN 'array' THEN art.diritti_attivi
          WHEN 'object' THEN (
            SELECT COALESCE(jsonb_agg(to_jsonb(k)), '[]'::jsonb)
            FROM jsonb_object_keys(art.diritti_attivi) AS k
          )
          ELSE '[]'::jsonb
        END
      ) AS label
    ) AS labels
    WHERE art.ambito IS NULL
      AND jsonb_typeof(art.diritti_attivi) IN ('array', 'object')
    GROUP BY art.id
  ) AS flags
) AS derived
WHERE a.id = derived.id
  AND derived.ambito IS NOT NULL
  AND a.ambito IS NULL;

DO $$ BEGIN
  CREATE TYPE public.primarieta_cast AS ENUM ('primario', 'comprimario');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.cast_esterno (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opera_id      UUID NOT NULL REFERENCES public.opere(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  personaggio   TEXT,
  primarieta    public.primarieta_cast NOT NULL DEFAULT 'comprimario',
  imdb_nconst   TEXT,
  fonte         TEXT NOT NULL DEFAULT 'manuale' CHECK (fonte IN ('imdb', 'manuale')),
  ordine        INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cast_esterno_opera ON public.cast_esterno(opera_id);

DROP TRIGGER IF EXISTS update_cast_esterno_updated_at ON public.cast_esterno;
CREATE TRIGGER update_cast_esterno_updated_at
  BEFORE UPDATE ON public.cast_esterno
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.cast_esterno ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cast_esterno_select_policy" ON public.cast_esterno;
CREATE POLICY "cast_esterno_select_policy" ON public.cast_esterno
  FOR SELECT
  USING (get_user_role() IN ('admin', 'operatore', 'readonly', 'artista'));

DROP POLICY IF EXISTS "cast_esterno_write_policy" ON public.cast_esterno;
CREATE POLICY "cast_esterno_write_policy" ON public.cast_esterno
  FOR ALL
  USING (get_user_role() IN ('admin', 'operatore'))
  WITH CHECK (get_user_role() IN ('admin', 'operatore'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cast_esterno TO authenticated, service_role;

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

  INSERT INTO public.cast_esterno (opera_id, nome, personaggio, primarieta, imdb_nconst, fonte, ordine)
  SELECT
    p_opera_id,
    trim(x.nome),
    NULLIF(trim(COALESCE(x.personaggio, '')), ''),
    COALESCE(NULLIF(x.primarieta, ''), 'comprimario')::public.primarieta_cast,
    NULLIF(trim(COALESCE(x.imdb_nconst, '')), ''),
    CASE WHEN x.fonte = 'imdb' THEN 'imdb' ELSE 'manuale' END,
    COALESCE(x.ordine, 0)
  FROM jsonb_to_recordset(COALESCE(p_rows, '[]'::jsonb)) AS x(
    nome text,
    personaggio text,
    primarieta text,
    imdb_nconst text,
    fonte text,
    ordine int
  )
  WHERE trim(COALESCE(x.nome, '')) <> '';
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_cast_esterno(uuid, jsonb) TO authenticated, service_role;

COMMENT ON TABLE public.cast_esterno IS
  'Cast non RASI collegato a un''opera (nome libero, primarieta). Non richiede una scheda artista.';
