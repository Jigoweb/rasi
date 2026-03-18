-- ====================================
-- DATABASE COLLECTING RASI
-- Schema allineato al DB Supabase reale
-- Ultimo aggiornamento: 2026-03-18
-- ====================================

-- Estensioni
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ====================================
-- ENUM TYPES
-- ====================================

CREATE TYPE stato_iscrizione   AS ENUM ('attivo', 'sospeso', 'cessato');
CREATE TYPE tipo_opera         AS ENUM ('film', 'serie_tv', 'animazione');
CREATE TYPE categoria_ruolo    AS ENUM ('recitazione', 'doppiaggio', 'direzione', 'tecnico');
CREATE TYPE tipo_emittente     AS ENUM ('tv_generalista', 'tv_tematica', 'streaming', 'pay_tv');
CREATE TYPE fascia_oraria      AS ENUM ('prima_serata', 'seconda_serata', 'access', 'daytime', 'notte');
CREATE TYPE tipo_trasmissione  AS ENUM ('prima_visione', 'replica', 'ripetizione');
CREATE TYPE stato_validazione  AS ENUM ('da_validare', 'validato', 'respinto');
CREATE TYPE stato_campagna     AS ENUM (
    'pianificata', 'in_corso', 'completata', 'annullata',
    'bozza', 'in review', 'approvata', 'individuata',
    'uploading', 'deleting', 'error', 'in_review'
);
CREATE TYPE stato_individuazione AS ENUM ('individuato', 'validato', 'respinto', 'dubbioso');
CREATE TYPE metodo_matching    AS ENUM ('automatico', 'manuale', 'validato');
CREATE TYPE stato_ripartizione AS ENUM ('pianificata', 'calcolata', 'approvata', 'distribuita');
CREATE TYPE ruolo_utente       AS ENUM ('admin', 'operatore', 'artista', 'readonly');
CREATE TYPE territorio_enum    AS ENUM ('WW', 'WW-', 'ITA', 'ITA+');
CREATE TYPE tipologia_enum     AS ENUM ('AIE', 'PRODUTTORE');

-- ====================================
-- FUNZIONI HELPER
-- ====================================

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
            COALESCE(NEW.titolo, '')
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STABLE: auth.uid() non cambia durante una query → caching per RLS
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS ruolo_utente AS $$
BEGIN
    RETURN COALESCE(
        (SELECT raw_user_meta_data->>'ruolo' FROM auth.users WHERE id = auth.uid())::ruolo_utente,
        'readonly'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_artista_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT raw_user_meta_data->>'artista_id' FROM auth.users WHERE id = auth.uid())::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ====================================
-- TABELLE PRINCIPALI
-- ====================================

-- Artisti della collecting
CREATE TABLE artisti (
    id                               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identificativo esterno
    codice_ipn                       TEXT,

    -- Anagrafica
    nome                             VARCHAR NOT NULL,
    cognome                          VARCHAR NOT NULL,
    nome_arte                        VARCHAR,
    codice_fiscale                   VARCHAR,
    data_nascita                     DATE,
    luogo_nascita                    VARCHAR,
    territorio                       territorio_enum,

    -- Dati mandato
    data_inizio_mandato              DATE NOT NULL DEFAULT CURRENT_DATE,
    data_fine_mandato                DATE,
    stato                            stato_iscrizione DEFAULT 'attivo',

    -- Dati persona giuridica
    tipologia                        tipologia_enum,
    ragione_sociale                  TEXT,
    forma_giuridica                  TEXT,
    partita_iva                      BIGINT,
    codice_paese                     VARCHAR,
    componente_stabile_gruppo_orchestra TEXT,

    -- Contatti e indirizzi (JSONB)
    contatti                         JSONB,
    indirizzo                        JSONB,

    -- Diritti e metadati
    diritti_attivi                   JSONB,
    is_rasi                          BOOLEAN NOT NULL DEFAULT true,

    -- Codici esterni
    imdb_nconst                      VARCHAR,
    codici_esterni                   JSONB DEFAULT '{}',

    -- Full-text search
    search_vector                    tsvector,

    -- Validazione
    stato_validazione                stato_validazione DEFAULT 'da_validare',

    -- Audit
    created_at                       TIMESTAMPTZ DEFAULT NOW(),
    updated_at                       TIMESTAMPTZ DEFAULT NOW(),
    created_by                       UUID REFERENCES auth.users(id),
    updated_by                       UUID REFERENCES auth.users(id)
);

CREATE TRIGGER update_artisti_updated_at
    BEFORE UPDATE ON artisti
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_artisti_search_vector
    BEFORE INSERT OR UPDATE ON artisti
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- Catalogo opere audiovisive
CREATE TABLE opere (
    id                               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codice_opera                     VARCHAR,

    -- Identificazione
    titolo                           VARCHAR NOT NULL,
    titolo_originale                 VARCHAR,
    alias_titoli                     TEXT[],

    -- Classificazione
    tipo                             tipo_opera NOT NULL,
    has_episodes                     BOOLEAN NOT NULL DEFAULT false,

    -- Produzione
    anno_produzione                  INTEGER CHECK (anno_produzione >= 1900 AND anno_produzione <= 2030),
    regista                          VARCHAR[],

    -- Serie TV
    dettagli_serie                   JSONB DEFAULT '{}',

    -- Codici esterni
    codice_isan                      VARCHAR,
    imdb_tconst                      VARCHAR,
    codici_esterni                   JSONB DEFAULT '{}',

    -- Metadati aggiuntivi
    metadati                         JSONB DEFAULT '{}',

    -- Full-text search
    search_vector                    tsvector,

    -- Validazione
    stato_validazione                stato_validazione DEFAULT 'da_validare',

    -- Audit
    created_at                       TIMESTAMPTZ DEFAULT NOW(),
    updated_at                       TIMESTAMPTZ DEFAULT NOW(),
    created_by                       UUID REFERENCES auth.users(id),
    updated_by                       UUID REFERENCES auth.users(id)
);

CREATE TRIGGER update_opere_updated_at
    BEFORE UPDATE ON opere
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opere_search_vector
    BEFORE INSERT OR UPDATE ON opere
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- Episodi per serie TV
CREATE TABLE episodi (
    id                               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opera_id                         UUID NOT NULL REFERENCES opere(id) ON DELETE CASCADE,

    numero_stagione                  INTEGER NOT NULL CHECK (numero_stagione > 0),
    numero_episodio                  INTEGER NOT NULL CHECK (numero_episodio > 0),
    titolo_episodio                  VARCHAR,
    descrizione                      TEXT,
    durata_minuti                    INTEGER CHECK (durata_minuti > 0),
    data_prima_messa_in_onda         DATE,

    -- Codici esterni
    imdb_tconst                      VARCHAR,
    codice_isan                      VARCHAR,

    -- Metadati
    metadati                         JSONB DEFAULT '{}',

    created_at                       TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(opera_id, numero_stagione, numero_episodio)
);

-- Tipologie ruoli
CREATE TABLE ruoli_tipologie (
    id                               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codice                           VARCHAR(20) UNIQUE NOT NULL,
    nome                             VARCHAR(100) NOT NULL,
    categoria                        categoria_ruolo NOT NULL,
    parametri_ripartizione           JSONB NOT NULL DEFAULT '{
        "peso_base": 1.0,
        "percentuale_base": null,
        "moltiplicatore": 1.0,
        "soglia_minima": null,
        "formula_personalizzata": null
    }',
    descrizione                      TEXT,
    ordinamento                      INTEGER DEFAULT 0,
    attivo                           BOOLEAN DEFAULT true,
    created_at                       TIMESTAMPTZ DEFAULT NOW(),
    updated_at                       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_ruoli_tipologie_updated_at
    BEFORE UPDATE ON ruoli_tipologie
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Partecipazioni artisti-opere
CREATE TABLE partecipazioni (
    id                               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artista_id                       UUID NOT NULL REFERENCES artisti(id) ON DELETE CASCADE,
    opera_id                         UUID NOT NULL REFERENCES opere(id) ON DELETE CASCADE,
    episodio_id                      UUID REFERENCES episodi(id) ON DELETE CASCADE,
    ruolo_id                         UUID NOT NULL REFERENCES ruoli_tipologie(id),

    -- Dettagli ruolo
    personaggio                      VARCHAR,
    note                             TEXT,
    parametri_personalizzati         JSONB,

    -- Validazione
    validato_da                      UUID REFERENCES auth.users(id),
    validato_il                      TIMESTAMPTZ,
    note_validazione                 TEXT,

    -- Metadati
    metadati                         JSONB DEFAULT '{}',

    -- Audit
    created_at                       TIMESTAMPTZ DEFAULT NOW(),
    updated_at                       TIMESTAMPTZ DEFAULT NOW(),
    created_by                       UUID REFERENCES auth.users(id),
    updated_by                       UUID REFERENCES auth.users(id),

    UNIQUE(artista_id, opera_id, episodio_id, ruolo_id)
);

CREATE TRIGGER update_partecipazioni_updated_at
    BEFORE UPDATE ON partecipazioni
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================
-- TABELLE PROGRAMMAZIONI
-- ====================================

-- Emittenti / Piattaforme
CREATE TABLE emittenti (
    id                               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codice                           VARCHAR NOT NULL UNIQUE,
    nome                             TEXT NOT NULL,
    tipo                             tipo_emittente NOT NULL,
    paese                            VARCHAR DEFAULT 'IT',
    configurazione                   JSONB NOT NULL DEFAULT '{
        "coefficiente_base": 1.0,
        "fasce_orarie": {
            "prima_serata":   {"inizio": "20:30", "coefficiente": 1.5},
            "seconda_serata": {"inizio": "22:30", "coefficiente": 1.2},
            "access":         {"inizio": "18:00", "coefficiente": 1.0},
            "daytime":        {"inizio": "14:00", "coefficiente": 0.8}
        },
        "parametri_speciali": {}
    }',
    contatti                         JSONB,
    metadati                         JSONB DEFAULT '{}',
    attiva                           BOOLEAN DEFAULT true,
    created_at                       TIMESTAMPTZ DEFAULT NOW(),
    updated_at                       TIMESTAMPTZ DEFAULT NOW()
);

-- Campagne di programmazione
CREATE TABLE campagne_programmazione (
    id                               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome                             VARCHAR NOT NULL,
    descrizione                      TEXT,
    emittente_id                     UUID NOT NULL REFERENCES emittenti(id),
    anno                             INTEGER NOT NULL,

    -- Periodo
    data_inizio                      DATE,
    data_fine                        DATE,
    periodo_riferimento_inizio       DATE,
    periodo_riferimento_fine         DATE,
    importo_totale_disponibile       NUMERIC,

    -- Configurazione
    configurazione_programmazione    JSONB NOT NULL DEFAULT '{"filtri": {}, "parametri_personalizzati": {}}',
    configurazione_calcolo           JSONB NOT NULL DEFAULT '{"formula_base": "standard", "parametri_personalizzati": {}}',

    stato                            stato_campagna DEFAULT 'bozza',
    is_individuated                  BOOLEAN NOT NULL DEFAULT false,
    statistiche                      JSONB DEFAULT '{}',

    -- Processing lock
    processing_by                    UUID,
    processing_started_at            TIMESTAMPTZ,

    -- Audit
    created_by                       UUID REFERENCES auth.users(id),
    created_at                       TIMESTAMPTZ DEFAULT NOW(),
    updated_at                       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_campagne_programmazione_updated_at
    BEFORE UPDATE ON campagne_programmazione
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Programmazioni (righe del palinsesto importato)
CREATE TABLE programmazioni (
    id                               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    emittente_id                     UUID NOT NULL REFERENCES emittenti(id),
    campagna_programmazione_id       UUID REFERENCES campagne_programmazione(id) ON DELETE CASCADE,

    -- Trasmissione
    data_trasmissione                DATE,
    ora_inizio                       TIME,
    ora_fine                         TIME,
    durata_minuti                    INTEGER,

    -- Dati originali del palinsesto (snapshot CSV/import)
    canale                           TEXT,
    emittente                        TEXT,
    tipo                             TEXT,
    titolo                           TEXT,
    titolo_originale                 TEXT,
    numero_episodio                  INTEGER,
    titolo_episodio                  TEXT,
    titolo_episodio_originale        TEXT,
    numero_stagione                  INTEGER,
    anno                             INTEGER,
    production                       TEXT,
    regia                            TEXT,
    data_inizio                      DATE,
    data_fine                        DATE,
    retail_price                     NUMERIC,
    sales_month                      INTEGER,
    track_price_local_currency       NUMERIC,
    views                            INTEGER,
    total_net_ad_revenue             NUMERIC,
    total_revenue                    NUMERIC,

    -- Elaborazione
    metadati_trasmissione            JSONB DEFAULT '{}',
    processato                       BOOLEAN DEFAULT false,
    processato_il                    TIMESTAMPTZ,
    errori_processamento             TEXT[],

    -- Full-text search
    search_vector                    tsvector,

    created_at                       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_programmazioni_search_vector
    BEFORE INSERT OR UPDATE ON programmazioni
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- ====================================
-- TABELLE CAMPAGNE INDIVIDUAZIONE
-- ====================================

-- Campagne di individuazione artisti
CREATE TABLE campagne_individuazione (
    id                               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome                             VARCHAR NOT NULL,
    descrizione                      TEXT,
    stato                            stato_campagna DEFAULT 'pianificata',
    emittente_id                     UUID NOT NULL REFERENCES emittenti(id),
    campagne_programmazione_id       UUID NOT NULL REFERENCES campagne_programmazione(id),
    anno                             INTEGER NOT NULL,
    configurazione_matching          JSONB NOT NULL DEFAULT '{
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
    statistiche                      JSONB DEFAULT '{}',
    created_by                       UUID REFERENCES auth.users(id),
    created_at                       TIMESTAMPTZ DEFAULT NOW(),
    updated_at                       TIMESTAMPTZ DEFAULT NOW()
);

-- Individuazioni (match programmazione → opera/artista)
CREATE TABLE individuazioni (
    id                               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campagna_individuazioni_id       UUID NOT NULL REFERENCES campagne_individuazione(id),
    programmazione_id                UUID NOT NULL REFERENCES programmazioni(id) ON DELETE CASCADE,
    opera_id                         UUID NOT NULL REFERENCES opere(id),
    episodio_id                      UUID REFERENCES episodi(id),
    partecipazione_id                UUID,
    artista_id                       UUID NOT NULL REFERENCES artisti(id),
    ruolo_id                         UUID NOT NULL REFERENCES ruoli_tipologie(id),
    emittente_id                     UUID NOT NULL REFERENCES emittenti(id),

    -- Risultati matching
    punteggio_matching               NUMERIC NOT NULL,
    dettagli_matching                JSONB NOT NULL,
    metodo                           metodo_matching DEFAULT 'automatico',

    -- Validazione
    stato                            stato_individuazione DEFAULT 'individuato',
    validato_da                      UUID REFERENCES auth.users(id),
    validato_il                      TIMESTAMPTZ,
    note_validazione                 TEXT,

    -- Snapshot dati trasmissione
    data_trasmissione                DATE,
    ora_inizio                       TIME,
    ora_fine                         TIME,
    durata_minuti                    INTEGER,
    fascia_oraria                    fascia_oraria,
    tipo_trasmissione                tipo_trasmissione,
    canale                           TEXT,
    emittente                        TEXT,
    tipo                             TEXT,
    titolo                           TEXT,
    titolo_originale                 TEXT,
    numero_episodio                  INTEGER,
    titolo_episodio                  TEXT,
    titolo_episodio_originale        TEXT,
    numero_stagione                  INTEGER,
    anno                             INTEGER,
    production                       TEXT,
    regia                            TEXT,
    data_inizio                      DATE,
    data_fine                        DATE,
    retail_price                     NUMERIC,
    sales_month                      INTEGER,
    track_price_local_currency       NUMERIC,
    views                            INTEGER,
    total_net_ad_revenue             NUMERIC,
    total_revenue                    NUMERIC,
    descrizione                      TEXT,

    -- Elaborazione
    metadati_trasmissione            JSONB DEFAULT '{}',
    processato                       BOOLEAN DEFAULT false,
    processato_il                    TIMESTAMPTZ,
    errori_processamento             TEXT[],
    search_vector                    tsvector,

    -- Metadati
    metadati                         JSONB DEFAULT '{}',

    created_at                       TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================
-- TABELLE RIPARTIZIONE
-- ====================================

-- Parametri di ripartizione (versionati)
CREATE TABLE parametri_ripartizione (
    id                               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome                             VARCHAR NOT NULL,
    categoria                        VARCHAR NOT NULL,
    configurazione                   JSONB NOT NULL,
    valido_dal                       DATE NOT NULL,
    valido_al                        DATE,
    descrizione                      TEXT,
    created_at                       TIMESTAMPTZ DEFAULT NOW(),
    created_by                       UUID REFERENCES auth.users(id)
);

-- Campagne di ripartizione compensi
CREATE TABLE campagne_ripartizione (
    id                               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome                             VARCHAR NOT NULL,
    descrizione                      TEXT,
    periodo_riferimento_inizio       DATE NOT NULL,
    periodo_riferimento_fine         DATE NOT NULL,
    importo_totale_disponibile       NUMERIC NOT NULL,
    configurazione_calcolo           JSONB NOT NULL DEFAULT '{
        "formula_base": "standard",
        "parametri_personalizzati": {},
        "filtri_applicabili": []
    }',
    stato                            stato_ripartizione DEFAULT 'pianificata',
    data_calcolo                     TIMESTAMPTZ,
    data_approvazione                TIMESTAMPTZ,
    data_distribuzione               TIMESTAMPTZ,
    statistiche_calcolo              JSONB DEFAULT '{}',
    created_by                       UUID REFERENCES auth.users(id),
    created_at                       TIMESTAMPTZ DEFAULT NOW(),
    updated_at                       TIMESTAMPTZ DEFAULT NOW()
);

-- Dettaglio ripartizione per artista (tabella rinominata da ripartizioni_dettaglio)
CREATE TABLE ripartizioni (
    id                               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campagna_ripartizione_id         UUID NOT NULL REFERENCES campagne_ripartizione(id),
    artista_id                       UUID NOT NULL REFERENCES artisti(id),
    numero_individuazioni            INTEGER NOT NULL DEFAULT 0,
    calcoli                          JSONB NOT NULL DEFAULT '{
        "punteggio_totale": 0,
        "coefficiente_finale": 0,
        "breakdown": {},
        "applicazioni_parametri": []
    }',
    importo_lordo                    NUMERIC NOT NULL DEFAULT 0,
    trattenuta_collecting            NUMERIC NOT NULL DEFAULT 0,
    altre_trattenute                 NUMERIC DEFAULT 0,
    importo_netto                    NUMERIC NOT NULL DEFAULT 0,
    storico_calcoli                  JSONB DEFAULT '[]',
    created_at                       TIMESTAMPTZ DEFAULT NOW(),
    updated_at                       TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(campagna_ripartizione_id, artista_id)
);

-- ====================================
-- INDICI BASE
-- ====================================

CREATE INDEX idx_artisti_search          ON artisti USING GIN(search_vector);
CREATE INDEX idx_opere_search            ON opere USING GIN(search_vector);
CREATE INDEX idx_programmazioni_search   ON programmazioni USING GIN(search_vector);

CREATE INDEX idx_artisti_stato           ON artisti(stato);
CREATE INDEX idx_artisti_codice_fiscale  ON artisti(codice_fiscale);
CREATE INDEX idx_opere_tipo_anno         ON opere(tipo, anno_produzione);
CREATE INDEX idx_programmazioni_data     ON programmazioni(data_trasmissione);
CREATE INDEX idx_programmazioni_created  ON programmazioni(created_at DESC);
CREATE INDEX idx_partecipazioni_artista  ON partecipazioni(artista_id);
CREATE INDEX idx_individuazioni_campagna ON individuazioni(campagna_individuazioni_id);

-- ====================================
-- COMMENTI
-- ====================================

COMMENT ON TABLE artisti          IS 'Artisti iscritti alla collecting society';
COMMENT ON TABLE opere            IS 'Catalogo opere audiovisive';
COMMENT ON TABLE episodi          IS 'Episodi delle serie TV';
COMMENT ON TABLE partecipazioni   IS 'Ruoli degli artisti nelle opere/episodi';
COMMENT ON TABLE programmazioni   IS 'Righe palinsesto importate (snapshot CSV)';
COMMENT ON TABLE individuazioni   IS 'Match programmazione → artista/opera';
COMMENT ON TABLE ripartizioni     IS 'Compensi calcolati per artista (ex ripartizioni_dettaglio)';
