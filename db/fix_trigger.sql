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
            COALESCE(array_to_string(NEW.alias_titoli, ' '), '')
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