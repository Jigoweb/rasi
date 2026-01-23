-- Migration: Aggiungere campo imdb_tconst alla tabella episodi
-- Data: 2024

-- Aggiungi colonna imdb_tconst alla tabella episodi
ALTER TABLE episodi 
ADD COLUMN IF NOT EXISTS imdb_tconst VARCHAR(15);

-- Crea indice per migliorare le performance delle query
CREATE INDEX IF NOT EXISTS idx_episodi_imdb_tconst 
ON episodi(imdb_tconst) 
WHERE imdb_tconst IS NOT NULL;

-- Migra eventuali tconst già presenti in metadati alla nuova colonna
UPDATE episodi
SET imdb_tconst = (metadati->>'imdb_tconst')::VARCHAR(15)
WHERE metadati IS NOT NULL 
  AND metadati->>'imdb_tconst' IS NOT NULL
  AND imdb_tconst IS NULL;

-- Commento sulla colonna
COMMENT ON COLUMN episodi.imdb_tconst IS 'IMDb ID (tconst) dell''episodio per riferimento diretto a IMDb';









