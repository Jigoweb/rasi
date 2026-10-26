-- Add parser_config jsonb to emittenti.
-- Backward-compat: applyMapping reads parser_config when present, falls back to mapping_import.

ALTER TABLE public.emittenti
  ADD COLUMN IF NOT EXISTS parser_config jsonb;

COMMENT ON COLUMN public.emittenti.parser_config IS
  'v2 import config: { version, file_type, encoding, delimiter, header_row, data_start_row, fields{src→tgt}, transforms{src→transformName}, colonne_rilevate }. See src/features/programmazioni/utils/parser-config.ts.';

-- Migrate existing mapping_import → parser_config (idempotent, only fills nulls)
UPDATE public.emittenti
SET parser_config = jsonb_build_object(
  'version', 2,
  'file_type', 'auto',
  'header_row', 0,
  'data_start_row', 1,
  'colonne_rilevate', COALESCE(mapping_import->'colonne_rilevate', '[]'::jsonb),
  'ultimo_upload', mapping_import->'ultimo_upload',
  'fields', COALESCE(mapping_import->'mapping', '{}'::jsonb),
  'transforms', '{}'::jsonb
)
WHERE mapping_import IS NOT NULL AND parser_config IS NULL;

-- Index on parser_config for jsonb path lookups (e.g. by file_type)
CREATE INDEX IF NOT EXISTS idx_emittenti_parser_config
  ON public.emittenti USING gin (parser_config);
