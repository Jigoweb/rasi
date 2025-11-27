# 🎯 Soluzione Finale: Individuazioni con Snapshot Storico

## 📋 Requisiti Chiave

1. ✅ **Individuazioni dipendono necessariamente da partecipazioni** (solo artisti già nel catalogo)
2. ✅ **Snapshot storico**: Le individuazioni di una campagna 2024 rimangono immutate anche se partecipazioni/artisti cambiano
3. ✅ **Performance**: Query frequenti per reportistica

---

## 🏗️ SOLUZIONE RACCOMANDATA: FK a Partecipazioni + Snapshot Denormalizzato

### Strategia Ibrida

```sql
individuazioni:
  - partecipazione_id → partecipazioni(id) [FK - RESTRICT, NON CASCADE]
  - artista_id → artisti(id) [SNAPSHOT - copia al momento della creazione]
  - ruolo_id → ruoli_tipologie(id) [SNAPSHOT - copia al momento della creazione]
```

### Perché Questa Soluzione?

#### ✅ Vantaggi:

1. **Snapshot Storico Garantito**
   - `artista_id` e `ruolo_id` sono copiati al momento della creazione
   - Se partecipazione viene modificata/eliminata, l'individuazione mantiene i dati originali
   - Perfetto per campagne storiche (2024 rimane sempre 2024)

2. **Tracciabilità**
   - `partecipazione_id` mantiene il collegamento alla partecipazione originale
   - Puoi sempre risalire alla fonte

3. **Performance Ottimali**
   - Query dirette su `artista_id` e `ruolo_id` (snapshot) → veloci
   - JOIN con partecipazioni solo quando serve la partecipazione completa

4. **Integrità Referenziale**
   - FK con `ON DELETE RESTRICT` (non CASCADE)
   - Se tenti di eliminare una partecipazione con individuazioni, viene bloccato
   - Protegge i dati storici

5. **Flessibilità**
   - Se partecipazione viene eliminata, l'individuazione resta con snapshot
   - Puoi fare soft delete di partecipazioni in futuro senza perdere individuazioni

---

## 📐 Struttura Dettagliata

```sql
ALTER TABLE individuazioni
ADD COLUMN partecipazione_id UUID NOT NULL REFERENCES partecipazioni(id) ON DELETE RESTRICT,
ADD COLUMN artista_id UUID NOT NULL REFERENCES artisti(id) ON DELETE RESTRICT,
ADD COLUMN ruolo_id UUID NOT NULL REFERENCES ruoli_tipologie(id) ON DELETE RESTRICT;

-- Constraint: stesso artista+ruolo non può essere individuato 2 volte nella stessa programmazione
ALTER TABLE individuazioni
ADD CONSTRAINT individuazioni_unique_programma_artista_ruolo
UNIQUE (programmazione_id, artista_id, ruolo_id, episodio_id);

-- Commenti per chiarezza
COMMENT ON COLUMN individuazioni.partecipazione_id IS 
'FK alla partecipazione originale da cui deriva questa individuazione (per tracciabilità)';

COMMENT ON COLUMN individuazioni.artista_id IS 
'Snapshot dell''artista al momento della creazione (valore storico, non cambia)';

COMMENT ON COLUMN individuazioni.ruolo_id IS 
'Snapshot del ruolo al momento della creazione (valore storico, non cambia)';
```

---

## 🔄 Flusso di Creazione Individuazione

```sql
-- 1. Matching trova una partecipazione
SELECT * FROM partecipazioni 
WHERE opera_id = 'opera-trovata' 
  AND episodio_id = 'episodio-trovato';

-- 2. Crea individuazione con snapshot
INSERT INTO individuazioni (
    campagna_individuazioni_id,
    programmazione_id,
    opera_id,
    episodio_id,
    partecipazione_id,  -- FK alla partecipazione
    artista_id,         -- SNAPSHOT dalla partecipazione.artista_id
    ruolo_id,           -- SNAPSHOT dalla partecipazione.ruolo_id
    punteggio_matching,
    dettagli_matching
) VALUES (
    'campagna-2024',
    'programmazione-123',
    'opera-456',
    'episodio-789',
    'partecipazione-abc',  -- FK
    'artista-xyz',         -- SNAPSHOT
    'ruolo-123',           -- SNAPSHOT
    95.5,
    '{"matching_score": 95.5}'
);
```

**Note**:
- `artista_id` e `ruolo_id` vengono **copiati** dalla partecipazione al momento dell'inserimento
- Se in futuro la partecipazione cambia (artista rimosso, ruolo modificato), l'individuazione mantiene i valori originali

---

## 📊 Query Ottimizzate

### Query Frequente: "Quanti artisti individuati per campagna"

```sql
-- Usa direttamente artista_id (snapshot) - VELOCE
SELECT 
    COUNT(DISTINCT artista_id) as artisti_individuati,
    COUNT(*) as totale_individuazioni
FROM individuazioni
WHERE campagna_individuazioni_id = 'campagna-2024';
```

### Query: "Dettagli artista e ruolo"

```sql
-- Usa snapshot - VELOCE (2 JOIN)
SELECT 
    i.*,
    a.nome, a.cognome,
    r.nome as ruolo_nome
FROM individuazioni i
JOIN artisti a ON i.artista_id = a.id
JOIN ruoli_tipologie r ON i.ruolo_id = r.id
WHERE i.campagna_individuazioni_id = 'campagna-2024';
```

### Query: "Verifica partecipazione originale (se esiste ancora)"

```sql
-- Opzionale: usa partecipazione_id solo quando serve
SELECT 
    i.*,
    p.personaggio,  -- dalla partecipazione originale
    p.note
FROM individuazioni i
LEFT JOIN partecipazioni p ON i.partecipazione_id = p.id  -- LEFT JOIN perché può essere eliminata
WHERE i.campagna_individuazioni_id = 'campagna-2024';
```

---

## 🛡️ Gestione Eliminazioni

### Scenario: Partecipazione Eliminata

```sql
-- Tentativo di eliminare partecipazione con individuazioni
DELETE FROM partecipazioni WHERE id = 'partecipazione-abc';
-- ❌ ERRORE: RESTRICT block - non puoi eliminare

-- Se vuoi eliminare, prima elimina individuazioni (soft delete)
UPDATE individuazioni 
SET stato = 'annullata' 
WHERE partecipazione_id = 'partecipazione-abc';

-- Poi elimina partecipazione
DELETE FROM partecipazioni WHERE id = 'partecipazione-abc';
```

### Scenario: Soft Delete Partecipazioni (Futuro)

Se aggiungi soft delete a `partecipazioni`:

```sql
-- Aggiungi campo deleted_at
ALTER TABLE partecipazioni
ADD COLUMN deleted_at TIMESTAMPTZ;

-- Query individuazioni: sempre usa snapshot, non importa se partecipazione eliminata
SELECT * FROM individuazioni 
WHERE campagna_individuazioni_id = 'campagna-2024';
-- ✅ Funziona sempre, anche se partecipazione eliminata
```

---

## 🔍 Confronto con Alternative

### ❌ Solo FK a Partecipazioni (senza snapshot)

```sql
-- Problema: Se partecipazione eliminata, perdiamo artista_id/ruolo_id
-- Query diventano complesse (3 JOIN sempre)
-- Non preserva snapshot storico
```

### ❌ Solo Snapshot (senza FK)

```sql
-- Perde tracciabilità alla partecipazione originale
-- Non può verificare se partecipazione esiste ancora
```

### ✅ Ibrido (FK + Snapshot) - RACCOMANDATO

```sql
-- ✅ Snapshot storico garantito
-- ✅ Tracciabilità mantenuta
-- ✅ Performance ottimali
-- ✅ Flessibilità per future modifiche
```

---

## 📋 Indici Consigliati

```sql
-- Indice sulla FK partecipazione (per JOIN opzionali)
CREATE INDEX idx_individuazioni_partecipazione_id 
ON individuazioni(partecipazione_id);

-- Indici sui snapshot (per query frequenti)
CREATE INDEX idx_individuazioni_artista_id 
ON individuazioni(artista_id);

CREATE INDEX idx_individuazioni_ruolo_id 
ON individuazioni(ruolo_id);

-- Indice composito per query campagna + artista
CREATE INDEX idx_individuazioni_campagna_artista 
ON individuazioni(campagna_individuazioni_id, artista_id);

-- Indice composito per unique constraint (già creato automaticamente)
-- UNIQUE (programmazione_id, artista_id, ruolo_id, episodio_id)
```

---

## ✅ Checklist Implementazione

- [x] Aggiungere `partecipazione_id` (FK RESTRICT)
- [x] Aggiungere `artista_id` (snapshot, FK RESTRICT)
- [x] Aggiungere `ruolo_id` (snapshot, FK RESTRICT)
- [x] Aggiungere constraint UNIQUE per evitare duplicati
- [x] Creare indici per performance
- [x] Aggiungere commenti per documentazione
- [x] Modificare logica inserimento per copiare snapshot

---

## 🎯 Vantaggi Finali

1. ✅ **Snapshot Storico**: Campagne 2024 rimangono sempre corrette
2. ✅ **Performance**: Query veloci usando snapshot
3. ✅ **Tracciabilità**: Collegamento alla partecipazione originale
4. ✅ **Integrità**: RESTRICT protegge dati storici
5. ✅ **Flessibilità**: Gestisce modifiche future a partecipazioni

Questa soluzione è la **più robusta** per il tuo caso d'uso! 🚀

