-- ====================================
-- Migration: Rimozione colonna stato_validazione dalla tabella partecipazioni
-- ====================================
-- 
-- Questa migration rimuove il campo stato_validazione dalla tabella partecipazioni
-- dopo che è stato spostato a livello di opera/artista.
-- 
-- NOTA: Prima di eseguire questa migration, assicurati che i dati siano stati migrati
-- a livello di opera/artista se necessario.

DO $$ 
BEGIN
    -- Rimuovi stato_validazione dalla tabella partecipazioni se esiste
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'partecipazioni' 
        AND column_name = 'stato_validazione'
    ) THEN
        ALTER TABLE partecipazioni 
        DROP COLUMN stato_validazione;
    END IF;

    -- Rimuovi anche i campi correlati alla validazione se non più necessari
    -- (manteniamo validato_da, validato_il, note_validazione per eventuali audit futuri)
    -- Se vuoi rimuoverli, decommenta le righe seguenti:
    -- 
    -- IF EXISTS (
    --     SELECT 1 
    --     FROM information_schema.columns 
    --     WHERE table_schema = 'public' 
    --     AND table_name = 'partecipazioni' 
    --     AND column_name = 'validato_da'
    -- ) THEN
    --     ALTER TABLE partecipazioni DROP COLUMN validato_da;
    -- END IF;
    -- 
    -- IF EXISTS (
    --     SELECT 1 
    --     FROM information_schema.columns 
    --     WHERE table_schema = 'public' 
    --     AND table_name = 'partecipazioni' 
    --     AND column_name = 'validato_il'
    -- ) THEN
    --     ALTER TABLE partecipazioni DROP COLUMN validato_il;
    -- END IF;
    -- 
    -- IF EXISTS (
    --     SELECT 1 
    --     FROM information_schema.columns 
    --     WHERE table_schema = 'public' 
    --     AND table_name = 'partecipazioni' 
    --     AND column_name = 'note_validazione'
    -- ) THEN
    --     ALTER TABLE partecipazioni DROP COLUMN note_validazione;
    -- END IF;
END $$;
