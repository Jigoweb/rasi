-- ====================================
-- INDICI OTTIMIZZATI PER PERFORMANCE
-- Database COLLECTING RASI (SENZA DUPLICATI)
-- ====================================

-- ====================================
-- INDICI FULL-TEXT SEARCH AGGIUNTIVI
-- ====================================

-- Trigram search per artisti (se non esistente)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_artisti_trgm_nome') THEN
        CREATE INDEX idx_artisti_trgm_nome ON artisti USING GIN((nome || ' ' || cognome) gin_trgm_ops);
    END IF;
END $$;

-- Trigram search per opere (se non esistente)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_opere_trgm_titolo') THEN
        CREATE INDEX idx_opere_trgm_titolo ON opere USING GIN(titolo gin_trgm_ops);
    END IF;
END $$;

-- Trigram search per programmazioni (se non esistente)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_programmazioni_trgm_titolo') THEN
        CREATE INDEX idx_programmazioni_trgm_titolo ON programmazioni USING GIN(titolo_programmazione gin_trgm_ops);
    END IF;
END $$;

-- ====================================
-- INDICI PER QUERY COMUNI
-- ====================================

-- Artisti - Query aggiuntive
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_artisti_stato_attivo') THEN
        CREATE INDEX idx_artisti_stato_attivo ON artisti(stato) WHERE stato = 'attivo';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_artisti_nome_cognome') THEN
        CREATE INDEX idx_artisti_nome_cognome ON artisti(nome, cognome);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_artisti_data_iscrizione') THEN
        CREATE INDEX idx_artisti_data_iscrizione ON artisti(data_iscrizione);
    END IF;
END $$;

-- Opere - Query aggiuntive
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_opere_anno_produzione') THEN
        CREATE INDEX idx_opere_anno_produzione ON opere(anno_produzione) WHERE anno_produzione IS NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_opere_imdb_tconst') THEN
        CREATE INDEX idx_opere_imdb_tconst ON opere(imdb_tconst) WHERE imdb_tconst IS NOT NULL;
    END IF;
END $$;

-- ====================================
-- INDICI PER REPORTISTICA
-- ====================================

-- Individuazioni
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_individuazioni_campagna_stato') THEN
        CREATE INDEX idx_individuazioni_campagna_stato ON individuazioni(campagna_id, stato);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_individuazioni_opera_campagna') THEN
        CREATE INDEX idx_individuazioni_opera_campagna ON individuazioni(opera_id, campagna_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_individuazioni_punteggio') THEN
        CREATE INDEX idx_individuazioni_punteggio ON individuazioni(punteggio_matching) 
        WHERE punteggio_matching >= 80;
    END IF;
END $$;

-- Ripartizioni
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ripartizioni_artista_campagna') THEN
        CREATE INDEX idx_ripartizioni_artista_campagna ON ripartizioni_dettaglio(artista_id, campagna_ripartizione_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ripartizioni_campagna_importo') THEN
        CREATE INDEX idx_ripartizioni_campagna_importo ON ripartizioni_dettaglio(campagna_ripartizione_id, importo_netto);
    END IF;
END $$;

-- ====================================
-- INDICI PER JSONB
-- ====================================

-- Opere JSONB
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_opere_generi') THEN
        CREATE INDEX idx_opere_generi ON opere USING GIN(generi);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_opere_dettagli_serie') THEN
        CREATE INDEX idx_opere_dettagli_serie ON opere USING GIN(dettagli_serie);
    END IF;
END $$;

-- Emittenti JSONB
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_emittenti_configurazione') THEN
        CREATE INDEX idx_emittenti_configurazione ON emittenti USING GIN(configurazione);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_emittenti_tipo_attiva') THEN
        CREATE INDEX idx_emittenti_tipo_attiva ON emittenti(tipo, attiva);
    END IF;
END $$;

-- Programmazioni JSONB
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_programmazioni_metadati') THEN
        CREATE INDEX idx_programmazioni_metadati ON programmazioni USING GIN(metadati_trasmissione);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_programmazioni_processato') THEN
        CREATE INDEX idx_programmazioni_processato ON programmazioni(processato) WHERE processato = false;
    END IF;
END $$;

-- ====================================
-- INDICI PER FOREIGN KEYS
-- ====================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_episodi_opera_id') THEN
        CREATE INDEX idx_episodi_opera_id ON episodi(opera_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_individuazioni_programmazione_id') THEN
        CREATE INDEX idx_individuazioni_programmazione_id ON individuazioni(programmazione_id);
    END IF;
END $$;

-- ====================================
-- FUNZIONI DI RICERCA OTTIMIZZATE
-- ====================================

-- Funzione per ricerca fuzzy opere
CREATE OR REPLACE FUNCTION search_opere_fuzzy(
    query_text TEXT,
    similarity_threshold REAL DEFAULT 0.3
)
RETURNS TABLE (
    id UUID,
    titolo VARCHAR(500),
    titolo_originale VARCHAR(500),
    anno_produzione INTEGER,
    generi VARCHAR(100)[],
    similarity_score REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.titolo,
        o.titolo_originale,
        o.anno_produzione,
        o.generi,
        GREATEST(
            similarity(o.titolo, query_text),
            COALESCE(similarity(o.titolo_originale, query_text), 0)
        ) as similarity_score
    FROM opere o
    WHERE 
        (o.search_vector @@ plainto_tsquery('italian', query_text)
        OR o.titolo % query_text
        OR (o.titolo_originale IS NOT NULL AND o.titolo_originale % query_text))
        AND GREATEST(
            similarity(o.titolo, query_text),
            COALESCE(similarity(o.titolo_originale, query_text), 0)
        ) >= similarity_threshold
    ORDER BY similarity_score DESC, o.anno_produzione DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

-- Funzione per ricerca artisti
CREATE OR REPLACE FUNCTION search_artisti_fuzzy(
    query_text TEXT,
    similarity_threshold REAL DEFAULT 0.3
)
RETURNS TABLE (
    id UUID,
    codice_artista VARCHAR(20),
    nome VARCHAR(100),
    cognome VARCHAR(100),
    nome_arte VARCHAR(200),
    similarity_score REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.codice_artista,
        a.nome,
        a.cognome,
        a.nome_arte,
        GREATEST(
            similarity(a.nome || ' ' || a.cognome, query_text),
            COALESCE(similarity(a.nome_arte, query_text), 0)
        ) as similarity_score
    FROM artisti a
    WHERE 
        a.stato = 'attivo'
        AND (
            (a.search_vector @@ plainto_tsquery('italian', query_text)
            OR (a.nome || ' ' || a.cognome) % query_text
            OR (a.nome_arte IS NOT NULL AND a.nome_arte % query_text))
            AND GREATEST(
                similarity(a.nome || ' ' || a.cognome, query_text),
                COALESCE(similarity(a.nome_arte, query_text), 0)
            ) >= similarity_threshold
        )
    ORDER BY similarity_score DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

-- ====================================
-- STATISTICHE E MANUTENZIONE
-- ====================================

-- Aggiorna statistiche per ottimizzazione query planner
ANALYZE artisti;
ANALYZE opere;
ANALYZE partecipazioni;
ANALYZE programmazioni;
ANALYZE individuazioni;
ANALYZE ripartizioni_dettaglio;

-- ====================================
-- MESSAGGIO COMPLETAMENTO
-- ====================================

DO $$
DECLARE
    index_count INTEGER;
    function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%';
    
    SELECT COUNT(*) INTO function_count 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname LIKE 'search_%_fuzzy';
    
    RAISE NOTICE 'Indici ottimizzati completati!';
    RAISE NOTICE 'Totale indici custom: %', index_count;
    RAISE NOTICE 'Funzioni di ricerca: %', function_count;
    RAISE NOTICE 'Database ottimizzato per performance elevate!';
END $$;