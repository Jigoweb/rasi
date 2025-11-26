-- ====================================
-- ROW LEVEL SECURITY POLICIES
-- Database COLLECTING RASI
-- ====================================

-- Abilita RLS su tutte le tabelle
ALTER TABLE artisti ENABLE ROW LEVEL SECURITY;
ALTER TABLE opere ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodi ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruoli_tipologie ENABLE ROW LEVEL SECURITY;
ALTER TABLE partecipazioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE emittenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE programmazioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE campagne_individuazione ENABLE ROW LEVEL SECURITY;
ALTER TABLE individuazioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE parametri_ripartizione ENABLE ROW LEVEL SECURITY;
ALTER TABLE campagne_ripartizione ENABLE ROW LEVEL SECURITY;
ALTER TABLE ripartizioni_dettaglio ENABLE ROW LEVEL SECURITY;

-- ====================================
-- POLICIES PER ARTISTI
-- ====================================

-- Lettura: Admin/Operatori vedono tutto, Artisti solo i propri dati
CREATE POLICY "artisti_select_policy" ON artisti
    FOR SELECT
    USING (
        get_user_role() IN ('admin', 'operatore')
        OR (get_user_role() = 'artista' AND id = get_user_artista_id())
        OR (get_user_role() = 'readonly' AND stato = 'attivo')
    );

-- Insert: Solo admin e operatori
CREATE POLICY "artisti_insert_policy" ON artisti
    FOR INSERT
    WITH CHECK (get_user_role() IN ('admin', 'operatore'));

-- Update: Admin, operatori e artisti (solo propri dati)
CREATE POLICY "artisti_update_policy" ON artisti
    FOR UPDATE
    USING (
        get_user_role() IN ('admin', 'operatore')
        OR (get_user_role() = 'artista' AND id = get_user_artista_id())
    );

-- Delete: Solo admin
CREATE POLICY "artisti_delete_policy" ON artisti
    FOR DELETE
    USING (get_user_role() = 'admin');

-- ====================================
-- POLICIES PER OPERE
-- ====================================

-- Lettura: Tutti possono vedere opere
CREATE POLICY "opere_select_policy" ON opere
    FOR SELECT
    USING (true);

-- Scrittura: Solo admin e operatori
CREATE POLICY "opere_write_policy" ON opere
    FOR ALL
    USING (get_user_role() IN ('admin', 'operatore'));

-- ====================================
-- POLICIES PER EPISODI
-- ====================================

-- Lettura: Tutti
CREATE POLICY "episodi_select_policy" ON episodi
    FOR SELECT
    USING (true);

-- Scrittura: Admin e operatori
CREATE POLICY "episodi_write_policy" ON episodi
    FOR ALL
    USING (get_user_role() IN ('admin', 'operatore'));

-- ====================================
-- POLICIES PER RUOLI TIPOLOGIE
-- ====================================

-- Lettura: Tutti
CREATE POLICY "ruoli_tipologie_select_policy" ON ruoli_tipologie
    FOR SELECT
    USING (attivo = true OR get_user_role() IN ('admin', 'operatore'));

-- Scrittura: Solo admin
CREATE POLICY "ruoli_tipologie_write_policy" ON ruoli_tipologie
    FOR ALL
    USING (get_user_role() = 'admin');

-- ====================================
-- POLICIES PER PARTECIPAZIONI
-- ====================================

-- Lettura: Dipende dalla validazione e ruolo
CREATE POLICY "partecipazioni_select_policy" ON partecipazioni
    FOR SELECT
    USING (
        stato_validazione = 'validato'
        OR get_user_role() IN ('admin', 'operatore')
        OR (get_user_role() = 'artista' AND artista_id = get_user_artista_id())
    );

-- Insert/Update: Admin e operatori
CREATE POLICY "partecipazioni_write_policy" ON partecipazioni
    FOR ALL
    USING (get_user_role() IN ('admin', 'operatore'));

-- ====================================
-- POLICIES PER EMITTENTI
-- ====================================

-- Lettura: Tutti vedono emittenti attive
CREATE POLICY "emittenti_select_policy" ON emittenti
    FOR SELECT
    USING (attiva = true OR get_user_role() IN ('admin', 'operatore'));

-- Scrittura: Admin e operatori
CREATE POLICY "emittenti_write_policy" ON emittenti
    FOR ALL
    USING (get_user_role() IN ('admin', 'operatore'));

-- ====================================
-- POLICIES PER PROGRAMMAZIONI
-- ====================================

-- Lettura: Tutti
CREATE POLICY "programmazioni_select_policy" ON programmazioni
    FOR SELECT
    USING (true);

-- Scrittura: Admin e operatori
CREATE POLICY "programmazioni_write_policy" ON programmazioni
    FOR ALL
    USING (get_user_role() IN ('admin', 'operatore'));

-- ====================================
-- POLICIES PER CAMPAGNE PROGRAMMAZIONE
-- ====================================

ALTER TABLE campagne_programmazione ENABLE ROW LEVEL SECURITY;

-- Lettura: Admin e operatori
CREATE POLICY "campagne_programmazione_select_policy" ON campagne_programmazione
    FOR SELECT
    USING (get_user_role() IN ('admin', 'operatore'));

-- Scrittura: Admin e operatori
CREATE POLICY "campagne_programmazione_write_policy" ON campagne_programmazione
    FOR ALL
    USING (get_user_role() IN ('admin', 'operatore'));

-- ====================================
-- POLICIES PER CAMPAGNE INDIVIDUAZIONE
-- ====================================

-- Lettura: Tutti vedono campagne completate, admin/operatori vedono tutto
CREATE POLICY "campagne_individuazione_select_policy" ON campagne_individuazione
    FOR SELECT
    USING (
        stato = 'completata'
        OR get_user_role() IN ('admin', 'operatore')
    );

-- Scrittura: Admin e operatori
CREATE POLICY "campagne_individuazione_write_policy" ON campagne_individuazione
    FOR ALL
    USING (get_user_role() IN ('admin', 'operatore'));

-- ====================================
-- POLICIES PER INDIVIDUAZIONI
-- ====================================

-- Lettura: Dipende dallo stato e dal ruolo
CREATE POLICY "individuazioni_select_policy" ON individuazioni
    FOR SELECT
    USING (
        stato IN ('validato', 'individuato')
        OR get_user_role() IN ('admin', 'operatore')
        OR (
            get_user_role() = 'artista' 
            AND EXISTS (
                SELECT 1 FROM partecipazioni p 
                WHERE p.opera_id = individuazioni.opera_id 
                AND p.artista_id = get_user_artista_id()
                AND p.stato_validazione = 'validato'
            )
        )
    );

-- Scrittura: Admin e operatori
CREATE POLICY "individuazioni_write_policy" ON individuazioni
    FOR ALL
    USING (get_user_role() IN ('admin', 'operatore'));

-- ====================================
-- POLICIES PER PARAMETRI RIPARTIZIONE
-- ====================================

-- Lettura: Tutti vedono parametri validi
CREATE POLICY "parametri_ripartizione_select_policy" ON parametri_ripartizione
    FOR SELECT
    USING (
        (valido_al IS NULL OR valido_al >= CURRENT_DATE)
        AND valido_dal <= CURRENT_DATE
    );

-- Scrittura: Solo admin
CREATE POLICY "parametri_ripartizione_write_policy" ON parametri_ripartizione
    FOR ALL
    USING (get_user_role() = 'admin');

-- ====================================
-- POLICIES PER CAMPAGNE RIPARTIZIONE
-- ====================================

-- Lettura: Admin/operatori vedono tutto, artisti vedono solo approvate
CREATE POLICY "campagne_ripartizione_select_policy" ON campagne_ripartizione
    FOR SELECT
    USING (
        get_user_role() IN ('admin', 'operatore')
        OR (get_user_role() = 'artista' AND stato = 'approvata')
        OR (get_user_role() = 'readonly' AND stato = 'distribuita')
    );

-- Scrittura: Admin e operatori
CREATE POLICY "campagne_ripartizione_write_policy" ON campagne_ripartizione
    FOR ALL
    USING (get_user_role() IN ('admin', 'operatore'));

-- ====================================
-- POLICIES PER RIPARTIZIONI DETTAGLIO
-- ====================================

-- Lettura: Artisti vedono solo le proprie, admin/operatori vedono tutto
CREATE POLICY "ripartizioni_dettaglio_select_policy" ON ripartizioni_dettaglio
    FOR SELECT
    USING (
        get_user_role() IN ('admin', 'operatore')
        OR (get_user_role() = 'artista' AND artista_id = get_user_artista_id())
    );

-- Scrittura: Solo admin e operatori
CREATE POLICY "ripartizioni_dettaglio_write_policy" ON ripartizioni_dettaglio
    FOR ALL
    USING (get_user_role() IN ('admin', 'operatore'));

-- ====================================
-- POLICIES SPECIALI
-- ====================================

-- Policy per permettere ai nuovi utenti di vedere le tabelle di configurazione
CREATE POLICY "config_tables_public_read" ON ruoli_tipologie
    FOR SELECT
    USING (true);

-- ====================================
-- NOTIFICHE REAL-TIME
-- ====================================

-- Funzione per notificare cambiamenti individuazioni
CREATE OR REPLACE FUNCTION notify_individuazione_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM pg_notify(
            'individuazione_insert', 
            json_build_object(
                'id', NEW.id,
                'campagna_id', NEW.campagna_id,
                'opera_id', NEW.opera_id,
                'stato', NEW.stato,
                'punteggio_matching', NEW.punteggio_matching
            )::text
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM pg_notify(
            'individuazione_update',
            json_build_object(
                'id', NEW.id,
                'old_stato', OLD.stato,
                'new_stato', NEW.stato,
                'campagna_id', NEW.campagna_id
            )::text
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger per individuazioni
CREATE TRIGGER individuazioni_notify
    AFTER INSERT OR UPDATE ON individuazioni
    FOR EACH ROW EXECUTE FUNCTION notify_individuazione_change();

-- Funzione per notificare cambiamenti ripartizioni
CREATE OR REPLACE FUNCTION notify_ripartizione_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'ripartizione_update',
        json_build_object(
            'campagna_id', NEW.campagna_ripartizione_id,
            'artista_id', NEW.artista_id,
            'importo_netto', NEW.importo_netto,
            'timestamp', NOW()
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger per ripartizioni
CREATE TRIGGER ripartizioni_notify
    AFTER INSERT OR UPDATE ON ripartizioni_dettaglio
    FOR EACH ROW EXECUTE FUNCTION notify_ripartizione_change();

-- ====================================
-- MESSAGGIO COMPLETAMENTO
-- ====================================

DO $$
BEGIN
    RAISE NOTICE 'Row Level Security configurato con successo!';
    RAISE NOTICE 'Policies create: %', (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public');
    RAISE NOTICE 'Triggers real-time: %', (SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE '%notify%');
END $$;