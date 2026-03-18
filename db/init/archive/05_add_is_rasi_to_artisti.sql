-- ====================================
-- Migration: Aggiunta colonna is_rasi alla tabella artisti
-- ====================================

-- Aggiungi colonna is_rasi per distinguere artisti rappresentati da RASI
-- Default true per gli artisti esistenti (sono tutti rappresentati da RASI)
-- Usa DO block per gestire il caso in cui la colonna esista già
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'artisti' 
        AND column_name = 'is_rasi'
    ) THEN
        ALTER TABLE artisti 
        ADD COLUMN is_rasi BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- Aggiungi commento alla colonna
COMMENT ON COLUMN artisti.is_rasi IS 'Indica se l''artista è rappresentato da RASI (true) o è un artista esterno (false)';

-- Crea indice per migliorare le performance delle query filtrate
-- Usa IF NOT EXISTS per evitare errori se l'indice esiste già
CREATE INDEX IF NOT EXISTS idx_artisti_is_rasi ON artisti(is_rasi);

