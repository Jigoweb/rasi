-- Backfill aliases from existing individuazioni: each (emittente, prog title, prog year, opera_id)
-- triple becomes an alias with confidence 0.95 (high but not 1.0, since some are wrong).

INSERT INTO public.opera_aliases (
  opera_id, emittente_id, alias_titolo, alias_anno, source, confidence, hit_count, created_at
)
SELECT
  i.opera_id,
  p.emittente_id,
  p.titolo,
  p.anno,
  'historical',
  0.95,
  COUNT(*) AS hits,
  MIN(i.created_at) AS first_seen
FROM public.individuazioni i
JOIN public.programmazioni p ON p.id = i.programmazione_id
WHERE i.opera_id IS NOT NULL
  AND p.titolo IS NOT NULL
  AND length(trim(p.titolo)) > 0
GROUP BY i.opera_id, p.emittente_id, p.titolo, p.anno
ON CONFLICT (opera_id, emittente_id, alias_titolo_norm, alias_anno) DO NOTHING;
