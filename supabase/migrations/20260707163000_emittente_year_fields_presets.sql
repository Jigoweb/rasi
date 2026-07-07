-- Seed year_fields policy into emittente mapping_import (future uploads only).

UPDATE public.emittenti
SET mapping_import = COALESCE(mapping_import, '{}'::jsonb) || jsonb_build_object(
  'year_fields',
  CASE nome
    WHEN 'NETFLIX' THEN '{"rilascio":{"sources":["release_year"]}}'::jsonb
    WHEN 'TIM VISION SVOD' THEN '{"rilascio":{"sources":["ANNO_RILASCIO_ITALIA","ANNO_RILASCIO"]},"produzione":{"sources":["ANNO_DI_RIFERIMENTO"]}}'::jsonb
    WHEN 'TIM VISION TVOD' THEN '{"rilascio":{"sources":["ANNO_RILASCIO_ITALIA","ANNO_RILASCIO"]},"produzione":{"sources":["ANNO_DI_RIFERIMENTO"]}}'::jsonb
    WHEN 'DISNEY PLUS' THEN '{"rilascio":{"sources":["PRODUCTION_YEAR"]}}'::jsonb
    WHEN 'RAKUTEN TVOD' THEN '{"rilascio":{"sources":["CONTENT_YEAR"]}}'::jsonb
    ELSE COALESCE(mapping_import->'year_fields', '{"rilascio":{"sources":[]}}'::jsonb)
  END
)
WHERE nome IN ('NETFLIX', 'TIM VISION SVOD', 'TIM VISION TVOD', 'DISNEY PLUS', 'RAKUTEN TVOD');

UPDATE public.emittenti
SET parser_config = COALESCE(parser_config, '{}'::jsonb) || jsonb_build_object(
  'year_fields', mapping_import->'year_fields'
)
WHERE mapping_import ? 'year_fields';
