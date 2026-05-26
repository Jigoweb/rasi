-- B.5 — Extend opera_aliases for canonical alternative titles + strict norm.
--
-- Two changes:
--   (a) Add alias_titolo_norm_strict column + extend the normalize trigger to
--       populate both norm variants.
--   (b) Seed opera_aliases with canonical alternative titles from
--       opere.titolo_originale and opere.alias_titoli[] using
--       source='canonical', emittente_id=NULL, confidence=1.00. This avoids
--       creating separate match_key columns for original titles — the cascade
--       RPC checks aliases (including canonical) before falling back to keys.

-- (a) Add strict norm column + update trigger
ALTER TABLE public.opera_aliases
  ADD COLUMN IF NOT EXISTS alias_titolo_norm_strict text;

DROP TRIGGER IF EXISTS opera_aliases_normalize ON public.opera_aliases;
DROP FUNCTION IF EXISTS public.trg_alias_normalize();

CREATE OR REPLACE FUNCTION public.trg_alias_normalize()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.alias_titolo_norm        := public.build_match_key(NEW.alias_titolo, NEW.alias_anno);
  NEW.alias_titolo_norm_strict := public.build_match_key_strict(NEW.alias_titolo, NEW.alias_anno);
  RETURN NEW;
END
$$;

CREATE TRIGGER opera_aliases_normalize
  BEFORE INSERT OR UPDATE OF alias_titolo, alias_anno ON public.opera_aliases
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_alias_normalize();

-- Backfill strict norm for existing rows (historical aliases from 20260525143201)
UPDATE public.opera_aliases
SET alias_titolo_norm_strict = public.build_match_key_strict(alias_titolo, alias_anno)
WHERE alias_titolo_norm_strict IS NULL;

-- (b) Seed canonical aliases from opere.titolo_originale
INSERT INTO public.opera_aliases (
  opera_id, emittente_id, alias_titolo, alias_anno, source, confidence, hit_count
)
SELECT
  id, NULL, titolo_originale, anno_produzione, 'canonical', 1.00, 0
FROM public.opere
WHERE titolo_originale IS NOT NULL
  AND length(trim(titolo_originale)) > 0
  AND lower(trim(titolo_originale)) <> lower(trim(titolo))
ON CONFLICT (opera_id, emittente_id, alias_titolo_norm, alias_anno) DO NOTHING;

-- Seed canonical aliases from opere.alias_titoli[] elements
INSERT INTO public.opera_aliases (
  opera_id, emittente_id, alias_titolo, alias_anno, source, confidence, hit_count
)
SELECT
  o.id, NULL, alias, o.anno_produzione, 'canonical', 1.00, 0
FROM public.opere o,
     unnest(o.alias_titoli) AS alias
WHERE o.alias_titoli IS NOT NULL
  AND array_length(o.alias_titoli, 1) > 0
  AND length(trim(alias)) > 0
  AND lower(trim(alias)) <> lower(trim(o.titolo))
ON CONFLICT (opera_id, emittente_id, alias_titolo_norm, alias_anno) DO NOTHING;

-- Index for strict-key lookup in the cascade RPC
CREATE INDEX IF NOT EXISTS idx_opera_aliases_lookup_strict
  ON public.opera_aliases(emittente_id, alias_titolo_norm_strict, alias_anno);
