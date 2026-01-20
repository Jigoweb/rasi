-- ====================================
-- Migration: Aggiunta colonna updated_by alla tabella partecipazioni
-- ====================================

-- La tabella partecipazioni usa il trigger update_updated_at_column() che
-- cerca di impostare updated_by, ma il campo non esiste.
-- Questa migration aggiunge il campo mancante.

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'partecipazioni' 
        AND column_name = 'updated_by'
    ) THEN
        ALTER TABLE partecipazioni 
        ADD COLUMN updated_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Aggiungi commento alla colonna
COMMENT ON COLUMN partecipazioni.updated_by IS 'Utente che ha effettuato l''ultimo aggiornamento';

