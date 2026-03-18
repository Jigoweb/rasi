-- ====================================
-- INDICI OTTIMIZZATI PER PERFORMANCE
-- Allineati al DB reale (2026-03-18)
-- ====================================

-- ====================================
-- TRIGRAM SEARCH
-- ====================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_artisti_trgm_nome') THEN
        CREATE INDEX idx_artisti_trgm_nome ON artisti USING GIN((nome || ' ' || cognome) gin_trgm_ops);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_opere_trgm_titolo') THEN
        CREATE INDEX idx_opere_trgm_titolo ON opere USING GIN(titolo gin_trgm_ops);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_programmazioni_trgm_titolo') THEN
        CREATE INDEX idx_programmazioni_trgm_titolo ON programmazioni USING GIN(titolo gin_trgm_ops);
    END IF;
END $$;

-- ====================================
-- ARTISTI
-- ====================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_artisti_stato_attivo') THEN
        CREATE INDEX idx_artisti_stato_attivo ON artisti(stato) WHERE stato = 'attivo';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_artisti_nome_cognome') THEN
        CREATE INDEX idx_artisti_nome_cognome ON artisti(nome, cognome);
    END IF;
    -- data_inizio_mandato (rinominata da data_iscrizione nella migrazione)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_artisti_data_inizio_mandato') THEN
        CREATE INDEX idx_artisti_data_inizio_mandato ON artisti(data_inizio_mandato);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_artisti_is_rasi') THEN
        CREATE INDEX idx_artisti_is_rasi ON artisti(is_rasi);
    END IF;
END $$;

-- ====================================
-- OPERE
-- ====================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_opere_anno_produzione') THEN
        CREATE INDEX idx_opere_anno_produzione ON opere(anno_produzione) WHERE anno_produzione IS NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_opere_imdb_tconst') THEN
        CREATE INDEX idx_opere_imdb_tconst ON opere(imdb_tconst) WHERE imdb_tconst IS NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_opere_has_episodes') THEN
        CREATE INDEX idx_opere_has_episodes ON opere(has_episodes) WHERE has_episodes = true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_opere_dettagli_serie') THEN
        CREATE INDEX idx_opere_dettagli_serie ON opere USING GIN(dettagli_serie);
    END IF;
END $$;

-- ====================================
-- EPISODI
-- ====================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_episodi_opera_id') THEN
        CREATE INDEX idx_episodi_opera_id ON episodi(opera_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_episodi_imdb_tconst') THEN
        CREATE INDEX idx_episodi_imdb_tconst ON episodi(imdb_tconst) WHERE imdb_tconst IS NOT NULL;
    END IF;
END $$;

-- ====================================
-- EMITTENTI
-- ====================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_emittenti_configurazione') THEN
        CREATE INDEX idx_emittenti_configurazione ON emittenti USING GIN(configurazione);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_emittenti_tipo_attiva') THEN
        CREATE INDEX idx_emittenti_tipo_attiva ON emittenti(tipo, attiva);
    END IF;
END $$;

-- ====================================
-- PROGRAMMAZIONI
-- ====================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_programmazioni_metadati') THEN
        CREATE INDEX idx_programmazioni_metadati ON programmazioni USING GIN(metadati_trasmissione);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_programmazioni_processato') THEN
        CREATE INDEX idx_programmazioni_processato ON programmazioni(processato) WHERE processato = false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_programmazioni_campagna_created') THEN
        CREATE INDEX idx_programmazioni_campagna_created ON programmazioni(campagna_programmazione_id, created_at DESC, id DESC);
    END IF;
END $$;

-- ====================================
-- INDIVIDUAZIONI
-- ====================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_individuazioni_campagna_stato') THEN
        CREATE INDEX idx_individuazioni_campagna_stato ON individuazioni(campagna_individuazioni_id, stato);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_individuazioni_opera_campagna') THEN
        CREATE INDEX idx_individuazioni_opera_campagna ON individuazioni(opera_id, campagna_individuazioni_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_individuazioni_punteggio') THEN
        CREATE INDEX idx_individuazioni_punteggio ON individuazioni(punteggio_matching) WHERE punteggio_matching >= 80;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_individuazioni_programmazione_id') THEN
        CREATE INDEX idx_individuazioni_programmazione_id ON individuazioni(programmazione_id);
    END IF;
END $$;

-- ====================================
-- RIPARTIZIONI (ex ripartizioni_dettaglio)
-- ====================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ripartizioni_artista_campagna') THEN
        CREATE INDEX idx_ripartizioni_artista_campagna ON ripartizioni(artista_id, campagna_ripartizione_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ripartizioni_campagna_importo') THEN
        CREATE INDEX idx_ripartizioni_campagna_importo ON ripartizioni(campagna_ripartizione_id, importo_netto);
    END IF;
END $$;

-- ====================================
-- FUNZIONI DI RICERCA FUZZY
-- ====================================

-- Ricerca fuzzy su opere (titolo e titolo_originale)
CREATE OR REPLACE FUNCTION search_opere_fuzzy(
    query_text TEXT,
    similarity_threshold REAL DEFAULT 0.3
)
RETURNS TABLE (
    id UUID,
    titolo VARCHAR,
    titolo_originale VARCHAR,
    anno_produzione INTEGER,
    similarity_score REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id,
        o.titolo,
        o.titolo_originale,
        o.anno_produzione,
        GREATEST(
            similarity(o.titolo, query_text),
            COALESCE(similarity(o.titolo_originale, query_text), 0)
        ) AS similarity_score
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

-- Ricerca fuzzy su artisti (nome+cognome, nome_arte)
CREATE OR REPLACE FUNCTION search_artisti_fuzzy(
    query_text TEXT,
    similarity_threshold REAL DEFAULT 0.3
)
RETURNS TABLE (
    id UUID,
    codice_ipn TEXT,
    nome VARCHAR,
    cognome VARCHAR,
    nome_arte VARCHAR,
    similarity_score REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.codice_ipn,
        a.nome,
        a.cognome,
        a.nome_arte,
        GREATEST(
            similarity(a.nome || ' ' || a.cognome, query_text),
            COALESCE(similarity(a.nome_arte, query_text), 0)
        ) AS similarity_score
    FROM artisti a
    WHERE
        a.stato = 'attivo'
        AND (
            a.search_vector @@ plainto_tsquery('italian', query_text)
            OR (a.nome || ' ' || a.cognome) % query_text
            OR (a.nome_arte IS NOT NULL AND a.nome_arte % query_text)
        )
        AND GREATEST(
            similarity(a.nome || ' ' || a.cognome, query_text),
            COALESCE(similarity(a.nome_arte, query_text), 0)
        ) >= similarity_threshold
    ORDER BY similarity_score DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

-- ====================================
-- ANALISI STATISTICHE
-- ====================================

ANALYZE artisti;
ANALYZE opere;
ANALYZE episodi;
ANALYZE partecipazioni;
ANALYZE programmazioni;
ANALYZE individuazioni;
ANALYZE ripartizioni;
