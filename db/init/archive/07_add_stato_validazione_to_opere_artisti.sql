-- ====================================
-- Migration: Aggiunta colonna stato_validazione alle tabelle opere e artisti
-- ====================================
-- 
-- Questa migration aggiunge il campo stato_validazione alle tabelle opere e artisti
-- per spostare la gestione dello stato di validazione dal livello partecipazione
-- al livello opera/artista.

DO $$ 
BEGIN
    -- Aggiungi stato_validazione alla tabella opere se non esiste
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'opere' 
        AND column_name = 'stato_validazione'
    ) THEN
        ALTER TABLE opere 
        ADD COLUMN stato_validazione stato_validazione DEFAULT 'da_validare';
        
        COMMENT ON COLUMN opere.stato_validazione IS 'Stato di validazione dell''opera: da_validare, validato, respinto';
    END IF;

    -- Aggiungi stato_validazione alla tabella artisti se non esiste
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'artisti' 
        AND column_name = 'stato_validazione'
    ) THEN
        ALTER TABLE artisti 
        ADD COLUMN stato_validazione stato_validazione DEFAULT 'da_validare';
        
        COMMENT ON COLUMN artisti.stato_validazione IS 'Stato di validazione dell''artista: da_validare, validato, respinto';
    END IF;
END $$;
