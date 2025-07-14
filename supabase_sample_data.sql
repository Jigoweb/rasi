-- ====================================
-- DATI DI ESEMPIO E TEST
-- Database COLLECTING RASI (VERSIONE PULITA)
-- ====================================

-- ====================================
-- 1. SETUP RUOLI TIPOLOGIE STANDARD
-- ====================================

INSERT INTO ruoli_tipologie (codice, nome, categoria, parametri_ripartizione, descrizione, ordinamento) VALUES
('PROT_PRIM', 'Protagonista Primario', 'recitazione', 
 '{"peso_base": 3.0, "percentuale_base": 40, "moltiplicatore": 1.0}', 
 'Ruolo principale maschile o femminile', 1),

('PROT_SEC', 'Protagonista Secondario', 'recitazione', 
 '{"peso_base": 2.0, "percentuale_base": 25, "moltiplicatore": 1.0}', 
 'Secondo ruolo per importanza', 2),

('COMP_PRIM', 'Comprimario Primario', 'recitazione', 
 '{"peso_base": 1.5, "percentuale_base": 15, "moltiplicatore": 1.0}', 
 'Ruolo di supporto principale', 3),

('COMP_SEC', 'Comprimario Secondario', 'recitazione', 
 '{"peso_base": 1.0, "percentuale_base": 10, "moltiplicatore": 1.0}', 
 'Ruolo di supporto secondario', 4),

('DOPP_PRIM', 'Doppiatore Primario', 'doppiaggio', 
 '{"peso_base": 2.5, "percentuale_base": 35, "moltiplicatore": 1.0}', 
 'Doppiaggio voce principale', 1),

('DOPP_SEC', 'Doppiatore Secondario', 'doppiaggio', 
 '{"peso_base": 1.5, "percentuale_base": 20, "moltiplicatore": 1.0}', 
 'Doppiaggio voce secondaria', 2),

('DIR_DOPP', 'Direzione Doppiaggio', 'direzione', 
 '{"peso_base": 2.0, "percentuale_base": 30, "moltiplicatore": 1.0}', 
 'Direzione del doppiaggio', 1),

('ADATT', 'Adattamento Dialoghi', 'tecnico', 
 '{"peso_base": 1.2, "percentuale_base": 12, "moltiplicatore": 1.0}', 
 'Adattamento e traduzione dialoghi', 1);

-- ====================================
-- 2. SETUP EMITTENTI PRINCIPALI
-- ====================================

INSERT INTO emittenti (codice, nome, tipo, configurazione, contatti) VALUES
('AMZN', 'Amazon Prime Video', 'streaming', 
 '{
   "coefficiente_base": 1.2,
   "fasce_orarie": {
     "prima_serata": {"inizio": "20:30", "coefficiente": 1.5},
     "seconda_serata": {"inizio": "22:30", "coefficiente": 1.2},
     "access": {"inizio": "18:00", "coefficiente": 1.0},
     "daytime": {"inizio": "14:00", "coefficiente": 0.8}
   }
 }', 
 '{"email": "licensing.it@amazon.com", "paese": "IT"}'),

('NFLX', 'Netflix', 'streaming', 
 '{
   "coefficiente_base": 1.3,
   "fasce_orarie": {
     "prima_serata": {"inizio": "20:30", "coefficiente": 1.4},
     "seconda_serata": {"inizio": "22:30", "coefficiente": 1.1}
   }
 }', 
 '{"email": "content.it@netflix.com", "paese": "IT"}'),

('DSNP', 'Disney+', 'streaming', 
 '{
   "coefficiente_base": 1.1,
   "fasce_orarie": {
     "prima_serata": {"inizio": "20:00", "coefficiente": 1.3}
   }
 }', 
 '{"email": "licensing.emea@disney.com", "paese": "IT"}'),

('SKY', 'Sky Italia', 'pay_tv', 
 '{
   "coefficiente_base": 1.4,
   "fasce_orarie": {
     "prima_serata": {"inizio": "21:15", "coefficiente": 1.6},
     "seconda_serata": {"inizio": "23:00", "coefficiente": 1.3},
     "access": {"inizio": "19:00", "coefficiente": 1.1}
   }
 }', 
 '{"email": "acquisitions@sky.it", "paese": "IT"}'),

('RAI1', 'Rai Uno', 'tv_generalista', 
 '{
   "coefficiente_base": 1.5,
   "fasce_orarie": {
     "prima_serata": {"inizio": "21:25", "coefficiente": 1.8},
     "seconda_serata": {"inizio": "23:30", "coefficiente": 1.4},
     "access": {"inizio": "18:45", "coefficiente": 1.2}
   }
 }', 
 '{"email": "fiction@rai.it", "paese": "IT"}');

-- ====================================
-- 3. ARTISTI DI ESEMPIO
-- ====================================

INSERT INTO artisti (codice_artista, nome, cognome, nome_arte, codice_fiscale, data_nascita, data_iscrizione, stato, contatti, imdb_nconst) VALUES
('ART000001', 'Marco', 'Rossi', NULL, 'RSSMRC80A01H501Z', '1980-01-01', '2020-01-15', 'attivo', 
 ROW('marco.rossi@email.it', '+39 333 1234567', 'Via Roma 123, Milano')::contatto, 'nm1234567'),

('ART000002', 'Anna', 'Bianchi', 'Anna B.', 'BNCNNA85M45F205X', '1985-08-15', '2019-03-20', 'attivo', 
 ROW('anna.bianchi@email.it', '+39 339 7654321', 'Corso Venezia 45, Milano')::contatto, 'nm2345678'),

('ART000003', 'Giuseppe', 'Verdi', 'Peppe Verdi', 'VRDGPP78D12L219Y', '1978-04-12', '2018-06-10', 'attivo', 
 ROW('giuseppe.verdi@email.it', '+39 347 9876543', 'Via Garibaldi 67, Roma')::contatto, 'nm3456789'),

('ART000004', 'Maria', 'Ferrari', NULL, 'FRRMRA82S55H501W', '1982-11-15', '2021-02-28', 'attivo', 
 ROW('maria.ferrari@email.it', '+39 335 5432109', 'Piazza Duomo 12, Milano')::contatto, 'nm4567890'),

('ART000005', 'Luca', 'Neri', 'Luke Black', 'NRELCU86R03F839V', '1986-10-03', '2019-09-12', 'attivo', 
 ROW('luca.neri@email.it', '+39 338 1357924', 'Via del Teatro 89, Roma')::contatto, 'nm5678901');

-- ====================================
-- 4. OPERE DI ESEMPIO
-- ====================================

INSERT INTO opere (codice_opera, titolo, titolo_originale, tipo, generi, anno_produzione, durata_minuti, paese_produzione, casa_produzione, regista, imdb_tconst, dettagli_serie) VALUES
('OP00000001', 'Il Commissario Montalbano', 'Il Commissario Montalbano', 'serie_tv', 
 ARRAY['Giallo', 'Drammatico'], 1999, 90, ARRAY['Italia'], 'Palomar', ARRAY['Alberto Sironi'], 'tt0319172',
 '{"numero_stagioni": 15, "numero_episodi_totali": 37, "in_produzione": true}'),

('OP00000002', 'Gomorrah - La Serie', 'Gomorra - La serie', 'serie_tv', 
 ARRAY['Crime', 'Drammatico'], 2014, 50, ARRAY['Italia'], 'Cattleya', ARRAY['Stefano Sollima'], 'tt2049116',
 '{"numero_stagioni": 5, "numero_episodi_totali": 58, "in_produzione": false}'),

('OP00000003', 'La Grande Bellezza', 'The Great Beauty', 'film', 
 ARRAY['Drammatico'], 2013, 141, ARRAY['Italia', 'Francia'], 'Indigo Film', ARRAY['Paolo Sorrentino'], 'tt2358891', '{}'),

('OP00000004', 'Perfetti Sconosciuti', 'Perfect Strangers', 'film', 
 ARRAY['Commedia', 'Drammatico'], 2016, 97, ARRAY['Italia'], 'Medusa Film', ARRAY['Paolo Genovese'], 'tt4901306', '{}'),

('OP00000005', 'Baby', 'Baby', 'serie_tv', 
 ARRAY['Drammatico', 'Teen'], 2018, 45, ARRAY['Italia'], 'Fabula Pictures', ARRAY['Andrea De Sica'], 'tt7221388',
 '{"numero_stagioni": 3, "numero_episodi_totali": 18, "in_produzione": false}');

-- ====================================
-- 5. EPISODI DI ESEMPIO (per serie TV)
-- ====================================

INSERT INTO episodi (opera_id, numero_stagione, numero_episodio, titolo_episodio, durata_minuti, data_prima_messa_in_onda) VALUES
((SELECT id FROM opere WHERE codice_opera = 'OP00000001'), 1, 1, 'La forma dell''acqua', 90, '1999-05-06'),
((SELECT id FROM opere WHERE codice_opera = 'OP00000001'), 1, 2, 'Il cane di terracotta', 90, '1999-05-13'),
((SELECT id FROM opere WHERE codice_opera = 'OP00000002'), 1, 1, 'Imma', 50, '2014-05-06'),
((SELECT id FROM opere WHERE codice_opera = 'OP00000002'), 1, 2, 'Conta i soldi', 50, '2014-05-13'),
((SELECT id FROM opere WHERE codice_opera = 'OP00000005'), 1, 1, 'Episodio 1', 45, '2018-11-30');

-- ====================================
-- 6. PARTECIPAZIONI DI ESEMPIO
-- ====================================

INSERT INTO partecipazioni (artista_id, opera_id, episodio_id, ruolo_id, personaggio, stato_validazione, note) VALUES
-- Marco Rossi in Montalbano
((SELECT id FROM artisti WHERE codice_artista = 'ART000001'), 
 (SELECT id FROM opere WHERE codice_opera = 'OP00000001'), 
 NULL, 
 (SELECT id FROM ruoli_tipologie WHERE codice = 'PROT_PRIM'), 
 'Commissario Montalbano', 'validato', 'Protagonista principale della serie'),

-- Anna Bianchi in Gomorrah
((SELECT id FROM artisti WHERE codice_artista = 'ART000002'), 
 (SELECT id FROM opere WHERE codice_opera = 'OP00000002'), 
 NULL, 
 (SELECT id FROM ruoli_tipologie WHERE codice = 'COMP_PRIM'), 
 'Patrizia', 'validato', 'Personaggio ricorrente'),

-- Giuseppe Verdi in La Grande Bellezza
((SELECT id FROM artisti WHERE codice_artista = 'ART000003'), 
 (SELECT id FROM opere WHERE codice_opera = 'OP00000003'), 
 NULL, 
 (SELECT id FROM ruoli_tipologie WHERE codice = 'PROT_PRIM'), 
 'Jep Gambardella', 'validato', 'Protagonista principale'),

-- Maria Ferrari in Perfetti Sconosciuti
((SELECT id FROM artisti WHERE codice_artista = 'ART000004'), 
 (SELECT id FROM opere WHERE codice_opera = 'OP00000004'), 
 NULL, 
 (SELECT id FROM ruoli_tipologie WHERE codice = 'COMP_PRIM'), 
 'Eva', 'validato', 'Uno dei protagonisti del gruppo'),

-- Luca Neri come doppiatore
((SELECT id FROM artisti WHERE codice_artista = 'ART000005'), 
 (SELECT id FROM opere WHERE codice_opera = 'OP00000005'), 
 NULL, 
 (SELECT id FROM ruoli_tipologie WHERE codice = 'DOPP_PRIM'), 
 'Damiano (voce)', 'validato', 'Doppiaggio protagonista maschile');

-- ====================================
-- 7. PROGRAMMAZIONI DI ESEMPIO
-- ====================================

INSERT INTO programmazioni (emittente_id, data_trasmissione, ora_inizio, ora_fine, durata_minuti, titolo_programmazione, fascia_oraria, tipo_trasmissione, metadati_trasmissione) VALUES
-- Programmazioni Netflix
((SELECT id FROM emittenti WHERE codice = 'NFLX'), '2024-12-15', '20:30:00', '22:00:00', 90, 
 'Il Commissario Montalbano - La forma dell''acqua', 'prima_serata', 'prima_visione',
 '{"stagione": 1, "episodio": 1, "categoria": "crime"}'),

((SELECT id FROM emittenti WHERE codice = 'NFLX'), '2024-12-16', '21:00:00', '22:30:00', 90, 
 'Il Commissario Montalbano - Il cane di terracotta', 'prima_serata', 'prima_visione',
 '{"stagione": 1, "episodio": 2, "categoria": "crime"}'),

-- Programmazioni Amazon Prime
((SELECT id FROM emittenti WHERE codice = 'AMZN'), '2024-12-20', '20:00:00', '21:30:00', 90, 
 'Gomorrah S01E01', 'prima_serata', 'replica',
 '{"stagione": 1, "episodio": 1, "categoria": "crime"}'),

-- Programmazioni Sky
((SELECT id FROM emittenti WHERE codice = 'SKY'), '2024-12-25', '21:15:00', '23:30:00', 141, 
 'La Grande Bellezza', 'prima_serata', 'replica',
 '{"anno": 2013, "categoria": "drammatico", "awards": ["Oscar"]}'),

-- Programmazioni RAI
((SELECT id FROM emittenti WHERE codice = 'RAI1'), '2024-12-31', '21:25:00', '23:00:00', 97, 
 'Perfetti Sconosciuti', 'prima_serata', 'replica',
 '{"anno": 2016, "categoria": "commedia"}');

-- ====================================
-- 8. CAMPAGNA DI INDIVIDUAZIONE DI ESEMPIO
-- ====================================

INSERT INTO campagne_individuazione (nome, descrizione, data_inizio, data_fine, stato, configurazione_matching) VALUES
('Campagna Q4 2024', 'Individuazione opere nel quarto trimestre 2024', '2024-10-01', '2024-12-31', 'completata',
 '{
   "soglia_matching": 85.0,
   "algoritmo": "fuzzy_string_v2",
   "parametri": {
     "peso_titolo": 0.7,
     "peso_anno": 0.2,
     "peso_durata": 0.1
   },
   "filtri": {
     "solo_artisti_collecting": true,
     "escludere_duplicati": true
   }
 }');

-- ====================================
-- 9. INDIVIDUAZIONI DI ESEMPIO
-- ====================================

INSERT INTO individuazioni (campagna_id, programmazione_id, opera_id, episodio_id, punteggio_matching, dettagli_matching, stato) VALUES
-- Individuazione Montalbano su Netflix
((SELECT id FROM campagne_individuazione WHERE nome = 'Campagna Q4 2024'),
 (SELECT id FROM programmazioni WHERE titolo_programmazione LIKE '%Montalbano - La forma%'),
 (SELECT id FROM opere WHERE codice_opera = 'OP00000001'),
 (SELECT id FROM episodi WHERE numero_stagione = 1 AND numero_episodio = 1 AND opera_id = (SELECT id FROM opere WHERE codice_opera = 'OP00000001')),
 95.5,
 '{"punteggio_titolo": 95.0, "punteggio_anno": 100.0, "metodo": "exact_match", "confidence": "high"}',
 'validato'),

-- Individuazione Gomorrah su Amazon
((SELECT id FROM campagne_individuazione WHERE nome = 'Campagna Q4 2024'),
 (SELECT id FROM programmazioni WHERE titolo_programmazione LIKE '%Gomorrah%'),
 (SELECT id FROM opere WHERE codice_opera = 'OP00000002'),
 (SELECT id FROM episodi WHERE numero_stagione = 1 AND numero_episodio = 1 AND opera_id = (SELECT id FROM opere WHERE codice_opera = 'OP00000002')),
 88.0,
 '{"punteggio_titolo": 90.0, "punteggio_anno": 85.0, "metodo": "fuzzy_match", "confidence": "medium"}',
 'validato'),

-- Individuazione La Grande Bellezza su Sky
((SELECT id FROM campagne_individuazione WHERE nome = 'Campagna Q4 2024'),
 (SELECT id FROM programmazioni WHERE titolo_programmazione LIKE '%Grande Bellezza%'),
 (SELECT id FROM opere WHERE codice_opera = 'OP00000003'),
 NULL,
 92.0,
 '{"punteggio_titolo": 95.0, "punteggio_anno": 100.0, "metodo": "exact_match", "confidence": "high"}',
 'validato');

-- ====================================
-- 10. PARAMETRI RIPARTIZIONE
-- ====================================

INSERT INTO parametri_ripartizione (nome, categoria, configurazione, valido_dal, descrizione) VALUES
('Coefficiente Base Streaming', 'emittente', 
 '{"valore": 1.2, "tipo": "moltiplicatore", "applicazione": "streaming"}', 
 '2024-01-01', 'Coefficiente base per piattaforme streaming'),

('Coefficiente Prima Serata', 'fascia_oraria', 
 '{"valore": 1.5, "tipo": "moltiplicatore", "fascia": "prima_serata"}', 
 '2024-01-01', 'Maggiorazione per prima serata'),

('Soglia Minima Ripartizione', 'generale', 
 '{"valore": 10.00, "tipo": "soglia", "unita": "euro"}', 
 '2024-01-01', 'Importo minimo per procedere alla ripartizione');

-- ====================================
-- 11. CAMPAGNA RIPARTIZIONE DI ESEMPIO
-- ====================================

INSERT INTO campagne_ripartizione (nome, descrizione, periodo_riferimento_inizio, periodo_riferimento_fine, importo_totale_disponibile, stato, configurazione_calcolo) VALUES
('Ripartizione Q4 2024', 'Ripartizione compensi per il quarto trimestre 2024', 
 '2024-10-01', '2024-12-31', 100000.00, 'calcolata',
 '{
   "formula_base": "standard_rasi",
   "parametri_personalizzati": {
     "maggiorazione_streaming": 1.2,
     "maggiorazione_prima_serata": 1.5
   },
   "filtri_applicabili": ["solo_individuazioni_validate", "soglia_minima"]
 }');

-- ====================================
-- 12. RIPARTIZIONI DETTAGLIO DI ESEMPIO
-- ====================================

INSERT INTO ripartizioni_dettaglio (campagna_ripartizione_id, artista_id, numero_individuazioni, calcoli, importo_lordo, trattenuta_collecting, importo_netto) VALUES
-- Marco Rossi (Montalbano)
((SELECT id FROM campagne_ripartizione WHERE nome = 'Ripartizione Q4 2024'),
 (SELECT id FROM artisti WHERE codice_artista = 'ART000001'),
 5,
 '{
   "punteggio_totale": 475.0,
   "coefficiente_finale": 0.15,
   "breakdown": {
     "peso_ruolo_protagonista": 3.0,
     "individuazioni_prima_serata": 3,
     "maggiorazione_streaming": 1.2
   }
 }',
 15000.00, 2250.00, 12750.00),

-- Anna Bianchi (Gomorrah)
((SELECT id FROM campagne_ripartizione WHERE nome = 'Ripartizione Q4 2024'),
 (SELECT id FROM artisti WHERE codice_artista = 'ART000002'),
 3,
 '{
   "punteggio_totale": 225.0,
   "coefficiente_finale": 0.08,
   "breakdown": {
     "peso_ruolo_comprimario": 1.5,
     "individuazioni_prima_serata": 2,
     "maggiorazione_streaming": 1.2
   }
 }',
 8000.00, 1200.00, 6800.00),

-- Giuseppe Verdi (La Grande Bellezza)
((SELECT id FROM campagne_ripartizione WHERE nome = 'Ripartizione Q4 2024'),
 (SELECT id FROM artisti WHERE codice_artista = 'ART000003'),
 2,
 '{
   "punteggio_totale": 300.0,
   "coefficiente_finale": 0.10,
   "breakdown": {
     "peso_ruolo_protagonista": 3.0,
     "individuazioni_prima_serata": 1,
     "maggiorazione_pay_tv": 1.4
   }
 }',
 10000.00, 1500.00, 8500.00);

-- ====================================
-- 13. AGGIORNA STATISTICHE
-- ====================================

-- Aggiorna statistiche campagna
UPDATE campagne_ripartizione 
SET statistiche_calcolo = '{
  "numero_artisti_coinvolti": 3,
  "importo_totale_distribuito": 100000.00,
  "importo_medio_per_artista": 11000.00,
  "numero_individuazioni_totali": 10,
  "data_ultimo_calcolo": "2024-12-20T10:00:00Z"
}'
WHERE nome = 'Ripartizione Q4 2024';

-- ====================================
-- 14. TEST QUERIES BASE
-- ====================================

-- Test conteggi base
SELECT 
    'Artisti Attivi' as categoria,
    COUNT(*) as valore
FROM artisti WHERE stato = 'attivo'
UNION ALL
SELECT 
    'Opere Catalogate' as categoria,
    COUNT(*) as valore
FROM opere
UNION ALL
SELECT 
    'Individuazioni Validate' as categoria,
    COUNT(*) as valore
FROM individuazioni WHERE stato = 'validato'
UNION ALL
SELECT 
    'Compensi Totali Distribuiti' as categoria,
    SUM(importo_netto)::INTEGER as valore
FROM ripartizioni_dettaglio;

-- Test ricerca semplice artisti
SELECT nome, cognome, codice_artista 
FROM artisti 
WHERE nome ILIKE '%Marco%' OR cognome ILIKE '%Rossi%'
LIMIT 5;

-- Test ricerca semplice opere
SELECT titolo, anno_produzione, tipo 
FROM opere 
WHERE titolo ILIKE '%Montalbano%'
LIMIT 5;

-- ====================================
-- MESSAGGIO COMPLETAMENTO
-- ====================================

DO $$
DECLARE
    artisti_count INTEGER;
    opere_count INTEGER;
    individuazioni_count INTEGER;
    ripartizioni_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO artisti_count FROM artisti;
    SELECT COUNT(*) INTO opere_count FROM opere;
    SELECT COUNT(*) INTO individuazioni_count FROM individuazioni;
    SELECT COUNT(*) INTO ripartizioni_count FROM ripartizioni_dettaglio;
    
    RAISE NOTICE '=== DATABASE INIZIALIZZATO CON SUCCESSO ===';
    RAISE NOTICE 'Artisti inseriti: %', artisti_count;
    RAISE NOTICE 'Opere inserite: %', opere_count;
    RAISE NOTICE 'Individuazioni: %', individuazioni_count;
    RAISE NOTICE 'Ripartizioni: %', ripartizioni_count;
    RAISE NOTICE 'Database pronto per l''uso!';
    RAISE NOTICE '';
    RAISE NOTICE 'PROSSIMI PASSI:';
    RAISE NOTICE '1. Eseguire supabase_indexes_clean.sql per performance ottimali';
    RAISE NOTICE '2. Testare le funzioni di ricerca con search_artisti_fuzzy()';
    RAISE NOTICE '3. Configurare autenticazione utenti nel dashboard Supabase';
    RAISE NOTICE '4. Testare Row Level Security policies';
END $$;