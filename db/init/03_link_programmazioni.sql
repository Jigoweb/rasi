-- Add campagna_id to programmazioni table
ALTER TABLE programmazioni 
ADD COLUMN IF NOT EXISTS campagna_id UUID REFERENCES campagne_programmazione(id) ON DELETE CASCADE;

-- Update the schema file logic (already done in 00_schema.sql, but this applies to live DB)
-- Ensure RLS policies are active (already done in 02_rls.sql)
