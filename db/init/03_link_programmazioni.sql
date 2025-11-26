-- Add/align campagna_programmazione_id on programmazioni
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='programmazioni' AND column_name='campagna_id'
  ) THEN
    ALTER TABLE programmazioni RENAME COLUMN campagna_id TO campagna_programmazione_id;
  END IF;
END $$;

ALTER TABLE programmazioni 
ADD COLUMN IF NOT EXISTS campagna_programmazione_id UUID REFERENCES campagne_programmazione(id) ON DELETE CASCADE;

DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT tc.constraint_name INTO fk_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
  WHERE tc.table_name = 'programmazioni'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'campagna_programmazione_id'
    AND ccu.table_name = 'campagne_programmazione';

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE programmazioni DROP CONSTRAINT %I', fk_name);
  END IF;

  ALTER TABLE programmazioni
    ADD CONSTRAINT programmazioni_campagna_programmazione_id_fkey
    FOREIGN KEY (campagna_programmazione_id)
    REFERENCES campagne_programmazione(id)
    ON DELETE CASCADE;
END $$;

CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'artisti' THEN
        NEW.search_vector := to_tsvector('italian', 
            COALESCE(NEW.nome, '') || ' ' || 
            COALESCE(NEW.cognome, '') || ' ' || 
            COALESCE(NEW.nome_arte, '')
        );
    ELSIF TG_TABLE_NAME = 'opere' THEN
        NEW.search_vector := to_tsvector('italian',
            COALESCE(NEW.titolo, '') || ' ' || 
            COALESCE(NEW.titolo_originale, '') || ' ' ||
            COALESCE(array_to_string(NEW.alias_titoli, ' '), '') || ' ' ||
            COALESCE(array_to_string(NEW.generi, ' '), '')
        );
    ELSIF TG_TABLE_NAME = 'programmazioni' THEN
        NEW.search_vector := to_tsvector('italian', 
            COALESCE(NEW.titolo, '') || ' ' || 
            COALESCE(NEW.descrizione, '')
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_programmazioni_trgm_titolo'
  ) THEN
    DROP INDEX idx_programmazioni_trgm_titolo;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_programmazioni_trgm_titolo ON programmazioni USING GIN(titolo gin_trgm_ops);

-- Update the schema file logic (already done in 00_schema.sql, but this applies to live DB)
-- Ensure RLS policies are active (already done in 02_rls.sql)

-- Ensure ON DELETE CASCADE from individuazioni -> programmazioni
DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT tc.constraint_name INTO fk_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
  WHERE tc.table_name = 'individuazioni'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'programmazione_id'
    AND ccu.table_name = 'programmazioni';

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE individuazioni DROP CONSTRAINT %I', fk_name);
  END IF;

  ALTER TABLE individuazioni
    ADD CONSTRAINT individuazioni_programmazione_id_fkey
    FOREIGN KEY (programmazione_id)
    REFERENCES programmazioni(id)
    ON DELETE CASCADE;
END $$;
