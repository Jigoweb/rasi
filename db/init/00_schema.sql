-- ====================================
-- INIZIALIZZAZIONE DATABASE COLLECTING RASI
-- PostgreSQL su Supabase (VERSIONE CORRETTA)
-- ====================================

-- Abilita estensioni necessarie
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ====================================
-- TIPI ENUM E CUSTOM TYPES
-- ====================================

-- Stati e tipologie principali
CREATE TYPE stato_iscrizione AS ENUM ('attivo', 'sospeso', 'cessato');
CREATE TYPE tipo_opera AS ENUM ('film', 'serie_tv', 'documentario', 'cartoon', 'altro');
CREATE TYPE categoria_ruolo AS ENUM ('recitazione', 'doppiaggio', 'direzione', 'tecnico');
CREATE TYPE tipo_emittente AS ENUM ('tv_generalista', 'tv_tematica', 'streaming', 'pay_tv');
CREATE TYPE fascia_oraria AS ENUM ('prima_serata', 'seconda_serata', 'access', 'daytime', 'notte');
CREATE TYPE tipo_trasmissione AS ENUM ('prima_visione', 'replica', 'ripetizione');
CREATE TYPE stato_validazione AS ENUM ('da_validare', 'validato', 'respinto');
CREATE TYPE stato_campagna AS ENUM ('pianificata', 'in_corso', 'completata', 'annullata');
CREATE TYPE stato_individuazione AS ENUM ('individuato', 'validato', 'respinto', 'dubbioso');
CREATE TYPE metodo_matching AS ENUM ('automatico', 'manuale', 'validato');
CREATE TYPE stato_ripartizione AS ENUM ('pianificata', 'calcolata', 'approvata', 'distribuita');
CREATE TYPE ruolo_utente AS ENUM ('admin', 'operatore', 'artista', 'readonly');

-- Tipo composite per contatti
CREATE TYPE contatto AS (
    email VARCHAR(255),
    telefono VARCHAR(20),
    indirizzo TEXT
);

-- ====================================
-- FUNZIONI HELPER
-- ====================================

-- Funzione per aggiornamento automatico updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF auth.uid() IS NOT NULL THEN
        NEW.updated_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per aggiornamento search_vector
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
            COALESCE(NEW.titolo_programmazione, '') || ' ' || 
            COALESCE(NEW.descrizione, '')
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Funzione per ottenere ruolo utente
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS ruolo_utente AS $$
BEGIN
    RETURN COALESCE(
        (SELECT raw_user_meta_data->>'ruolo' FROM auth.users WHERE id = auth.uid())::ruolo_utente,
        'readonly'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per ottenere ID artista collegato
CREATE OR REPLACE FUNCTION get_user_artista_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT raw_user_meta_data->>'artista_id' FROM auth.users WHERE id = auth.uid())::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================
-- TABELLE PRINCIPALI
-- ====================================

-- Artisti della collecting
CREATE TABLE artisti (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codice_artista VARCHAR(20) UNIQUE NOT NULL,
    
    -- Dati anagrafici
    nome VARCHAR(100) NOT NULL,
    cognome VARCHAR(100) NOT NULL,
    nome_arte VARCHAR(200),
    codice_fiscale VARCHAR(16) UNIQUE,
    data_nascita DATE,
    luogo_nascita VARCHAR(100),
    nazionalita VARCHAR(50) DEFAULT 'IT',
    
    -- Dati collecting
    data_iscrizione DATE NOT NULL DEFAULT CURRENT_DATE,
    stato stato_iscrizione DEFAULT 'attivo',
    percentuale_trattenuta DECIMAL(5,2) DEFAULT 15.00,
    
    -- Contatti
    contatti contatto,
    
    -- Metadati esterni
    imdb_nconst VARCHAR(15),
    codici_esterni JSONB DEFAULT '{}',
    
    -- Full-text search (senza GENERATED)
    search_vector tsvector,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT chk_percentuale CHECK (percentuale_trattenuta >= 0 AND percentuale_trattenuta <= 100)
);

-- Triggers per artisti
CREATE TRIGGER update_artisti_updated_at 
    BEFORE UPDATE ON artisti 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_artisti_search_vector 
    BEFORE INSERT OR UPDATE ON artisti 
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- Catalogo opere
CREATE TABLE opere (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codice_opera VARCHAR(20) UNIQUE NOT NULL,
    
    -- Identificazione
    titolo VARCHAR(500) NOT NULL,
    titolo_originale VARCHAR(500),
    alias_titoli TEXT[],
    
    -- Classificazione
    tipo tipo_opera NOT NULL,
    generi VARCHAR(100)[],
    tags VARCHAR(50)[],
    
    -- Produzione
    anno_produzione INTEGER CHECK (anno_produzione >= 1900 AND anno_produzione <= 2030),
    durata_minuti INTEGER CHECK (durata_minuti > 0),
    paese_produzione VARCHAR(100)[],
    casa_produzione VARCHAR(200),
    regista VARCHAR(200)[],
    
    -- Serie TV specifici
    dettagli_serie JSONB DEFAULT '{}',
    
    -- Codici esterni
    codice_isan VARCHAR(30),
    imdb_tconst VARCHAR(15),
    codici_esterni JSONB DEFAULT '{}',
    
    -- Metadati aggiuntivi
    metadati JSONB DEFAULT '{}',
    
    -- Full-text search (senza GENERATED)
    search_vector tsvector,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Triggers per opere
CREATE TRIGGER update_opere_updated_at 
    BEFORE UPDATE ON opere 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opere_search_vector 
    BEFORE INSERT OR UPDATE ON opere 
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- Episodi per serie TV
CREATE TABLE episodi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opera_id UUID NOT NULL REFERENCES opere(id) ON DELETE CASCADE,
    
    numero_stagione INTEGER NOT NULL CHECK (numero_stagione > 0),
    numero_episodio INTEGER NOT NULL CHECK (numero_episodio > 0),
    titolo_episodio VARCHAR(500),
    descrizione TEXT,
    durata_minuti INTEGER CHECK (durata_minuti > 0),
    data_prima_messa_in_onda DATE,
    
    -- Metadati specifici episodio
    metadati JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(opera_id, numero_stagione, numero_episodio)
);

-- Tipologie ruoli
CREATE TABLE ruoli_tipologie (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codice VARCHAR(20) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    categoria categoria_ruolo NOT NULL,
    
    -- Parametri ripartizione con JSONB
    parametri_ripartizione JSONB NOT NULL DEFAULT '{
        "peso_base": 1.0,
        "percentuale_base": null,
        "moltiplicatore": 1.0,
        "soglia_minima": null,
        "formula_personalizzata": null
    }',
    
    descrizione TEXT,
    ordinamento INTEGER DEFAULT 0,
    attivo BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_ruoli_tipologie_updated_at 
    BEFORE UPDATE ON ruoli_tipologie 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Partecipazioni artisti-opere
CREATE TABLE partecipazioni (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artista_id UUID NOT NULL REFERENCES artisti(id) ON DELETE CASCADE,
    opera_id UUID NOT NULL REFERENCES opere(id) ON DELETE CASCADE,
    episodio_id UUID REFERENCES episodi(id) ON DELETE CASCADE,
    ruolo_id UUID NOT NULL REFERENCES ruoli_tipologie(id),
    
    -- Dettagli specifici
    personaggio VARCHAR(255),
    note TEXT,
    
    -- Override parametri ripartizione
    parametri_personalizzati JSONB,
    
    -- Validazione
    stato_validazione stato_validazione DEFAULT 'da_validare',
    validato_da UUID REFERENCES auth.users(id),
    validato_il TIMESTAMPTZ,
    note_validazione TEXT,
    
    -- Metadati
    metadati JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(artista_id, opera_id, episodio_id, ruolo_id)
);

CREATE TRIGGER update_partecipazioni_updated_at 
    BEFORE UPDATE ON partecipazioni 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================
-- TABELLE PROGRAMMAZIONI
-- ====================================

-- Emittenti/Piattaforme
CREATE TABLE emittenti (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codice VARCHAR(20) UNIQUE NOT NULL,
    nome VARCHAR(200) NOT NULL,
    
    tipo tipo_emittente NOT NULL,
    paese VARCHAR(50) DEFAULT 'IT',
    
    -- Configurazione avanzata
    configurazione JSONB NOT NULL DEFAULT '{
        "coefficiente_base": 1.0,
        "fasce_orarie": {
            "prima_serata": {"inizio": "20:30", "coefficiente": 1.5},
            "seconda_serata": {"inizio": "22:30", "coefficiente": 1.2},
            "access": {"inizio": "18:00", "coefficiente": 1.0},
            "daytime": {"inizio": "14:00", "coefficiente": 0.8}
        },
        "parametri_speciali": {}
    }',
    
    -- Contatti e metadati
    contatti JSONB,
    metadati JSONB DEFAULT '{}',
    
    attiva BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campagne programmazione
CREATE TABLE campagne_programmazione (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    emittente_id UUID NOT NULL REFERENCES emittenti(id),
    
    nome VARCHAR(200) NOT NULL,
    anno INTEGER NOT NULL,
    stato VARCHAR(50) DEFAULT 'aperta',
    
    -- Metadati
    note TEXT,
    metadati JSONB DEFAULT '{}',
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE TRIGGER update_campagne_programmazione_updated_at 
    BEFORE UPDATE ON campagne_programmazione 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Programmazioni (senza partizionamento per ora)
CREATE TABLE programmazioni (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campagna_id UUID NOT NULL REFERENCES campagne_programmazione(id) ON DELETE CASCADE,
    emittente_id UUID NOT NULL REFERENCES emittenti(id),
    
    -- Temporizzazione
    data_trasmissione DATE NOT NULL,
    ora_inizio TIME NOT NULL,
    ora_fine TIME,
    durata_minuti INTEGER,
    
    -- Contenuto
    titolo_programmazione VARCHAR(500),
    descrizione TEXT,
    
    -- Classificazione
    fascia_oraria fascia_oraria,
    tipo_trasmissione tipo_trasmissione,
    
    -- Metadati
    metadati_trasmissione JSONB DEFAULT '{}',
    
    -- Processamento
    processato BOOLEAN DEFAULT false,
    processato_il TIMESTAMPTZ,
    errori_processamento TEXT[],
    
    -- Full-text search (senza GENERATED)
    search_vector tsvector,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger per programmazioni
CREATE TRIGGER update_programmazioni_search_vector 
    BEFORE INSERT OR UPDATE ON programmazioni 
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- ====================================
-- TABELLE REPORTISTICA
-- ====================================

-- Campagne individuazione
CREATE TABLE campagne_individuazione (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(200) NOT NULL,
    descrizione TEXT,
    
    -- Periodo
    data_inizio DATE NOT NULL,
    data_fine DATE NOT NULL,
    
    stato stato_campagna DEFAULT 'pianificata',
    
    -- Configurazione matching
    configurazione_matching JSONB NOT NULL DEFAULT '{
        "soglia_matching": 85.0,
        "algoritmo": "fuzzy_string",
        "parametri": {
            "peso_titolo": 0.6,
            "peso_anno": 0.2,
            "peso_durata": 0.1,
            "peso_genere": 0.1
        },
        "filtri": {
            "solo_artisti_collecting": true,
            "escludere_duplicati": true
        }
    }',
    
    -- Statistiche
    statistiche JSONB DEFAULT '{}',
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individuazioni
CREATE TABLE individuazioni (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campagna_id UUID NOT NULL REFERENCES campagne_individuazione(id),
    
    programmazione_id UUID NOT NULL REFERENCES programmazioni(id),
    opera_id UUID NOT NULL REFERENCES opere(id),
    episodio_id UUID REFERENCES episodi(id),
    
    -- Risultati matching
    punteggio_matching DECIMAL(5,2) NOT NULL CHECK (punteggio_matching >= 0 AND punteggio_matching <= 100),
    dettagli_matching JSONB NOT NULL,
    metodo metodo_matching DEFAULT 'automatico',
    
    -- Validazione
    stato stato_individuazione DEFAULT 'individuato',
    validato_da UUID REFERENCES auth.users(id),
    validato_il TIMESTAMPTZ,
    note_validazione TEXT,
    
    -- Metadati
    metadati JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(programmazione_id, opera_id, episodio_id)
);

-- Parametri ripartizione
CREATE TABLE parametri_ripartizione (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    
    -- Valori con versioning
    configurazione JSONB NOT NULL,
    
    valido_dal DATE NOT NULL,
    valido_al DATE,
    
    descrizione TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Campagne ripartizione
CREATE TABLE campagne_ripartizione (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(200) NOT NULL,
    descrizione TEXT,
    
    -- Periodo
    periodo_riferimento_inizio DATE NOT NULL,
    periodo_riferimento_fine DATE NOT NULL,
    
    -- Budget
    importo_totale_disponibile DECIMAL(12,2) NOT NULL CHECK (importo_totale_disponibile >= 0),
    
    -- Configurazione
    configurazione_calcolo JSONB NOT NULL DEFAULT '{
        "formula_base": "standard",
        "parametri_personalizzati": {},
        "filtri_applicabili": []
    }',
    
    stato stato_ripartizione DEFAULT 'pianificata',
    
    -- Timeline
    data_calcolo TIMESTAMPTZ,
    data_approvazione TIMESTAMPTZ,
    data_distribuzione TIMESTAMPTZ,
    
    -- Statistiche
    statistiche_calcolo JSONB DEFAULT '{}',
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ripartizioni dettaglio
CREATE TABLE ripartizioni_dettaglio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campagna_ripartizione_id UUID NOT NULL REFERENCES campagne_ripartizione(id),
    artista_id UUID NOT NULL REFERENCES artisti(id),
    
    -- Dati base
    numero_individuazioni INTEGER NOT NULL DEFAULT 0,
    
    -- Calcoli dettagliati
    calcoli JSONB NOT NULL DEFAULT '{
        "punteggio_totale": 0,
        "coefficiente_finale": 0,
        "breakdown": {},
        "applicazioni_parametri": []
    }',
    
    -- Importi
    importo_lordo DECIMAL(10,2) NOT NULL DEFAULT 0,
    trattenuta_collecting DECIMAL(10,2) NOT NULL DEFAULT 0,
    altre_trattenute DECIMAL(10,2) DEFAULT 0,
    importo_netto DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Audit trail
    storico_calcoli JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(campagna_ripartizione_id, artista_id),
    
    CONSTRAINT chk_importi CHECK (
        importo_netto = importo_lordo - trattenuta_collecting - COALESCE(altre_trattenute, 0)
    )
);

-- ====================================
-- INDICI BASE PER PERFORMANCE
-- ====================================

-- Indici per full-text search
CREATE INDEX idx_artisti_search ON artisti USING GIN(search_vector);
CREATE INDEX idx_opere_search ON opere USING GIN(search_vector);
CREATE INDEX idx_programmazioni_search ON programmazioni USING GIN(search_vector);

-- Indici per ricerche comuni
CREATE INDEX idx_artisti_stato ON artisti(stato);
CREATE INDEX idx_artisti_codice_fiscale ON artisti(codice_fiscale);
CREATE INDEX idx_opere_tipo_anno ON opere(tipo, anno_produzione);
CREATE INDEX idx_programmazioni_data ON programmazioni(data_trasmissione);
CREATE INDEX idx_partecipazioni_artista ON partecipazioni(artista_id);
CREATE INDEX idx_individuazioni_campagna ON individuazioni(campagna_id);

-- ====================================
-- COMMENTI TABELLE
-- ====================================

COMMENT ON TABLE artisti IS 'Artisti iscritti alla collecting society';
COMMENT ON TABLE opere IS 'Catalogo opere audiovisive';
COMMENT ON TABLE partecipazioni IS 'Ruoli degli artisti nelle opere';
COMMENT ON TABLE programmazioni IS 'Programmazioni televisive e streaming';
COMMENT ON TABLE individuazioni IS 'Riconoscimento opere nelle programmazioni';
COMMENT ON TABLE ripartizioni_dettaglio IS 'Calcolo compensi per artisti';

-- ====================================
-- INIZIALIZZAZIONE COMPLETATA
-- ====================================

-- Messaggio di conferma
DO $$
BEGIN
    RAISE NOTICE 'Database COLLECTING RASI inizializzato con successo!';
    RAISE NOTICE 'Tipi custom: %', (SELECT COUNT(*) FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') AND typtype = 'e');
    RAISE NOTICE 'Tabelle create: %', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE');
END $$;