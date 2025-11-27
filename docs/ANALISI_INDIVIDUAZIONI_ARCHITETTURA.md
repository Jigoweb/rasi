# 🏗️ Analisi Architetturale: Individuazioni - FK Dirette vs FK a Partecipazioni

## 📊 Situazione Attuale

### Struttura `individuazioni` (attuale):
- `campagna_individuazioni_id` → campagne_individuazione
- `programmazione_id` → programmazioni  
- `opera_id` → opere
- `episodio_id` → episodi
- `punteggio_matching`, `dettagli_matching`, `stato`, ecc.

### Struttura `partecipazioni`:
- `artista_id` → artisti (FK)
- `opera_id` → opere (FK)
- `episodio_id` → episodi (FK)
- `ruolo_id` → ruoli_tipologie (FK)
- UNIQUE(artista_id, opera_id, episodio_id, ruolo_id)

**Nota importante**: Uno stesso artista può avere **MULTIPLE partecipazioni** nella stessa opera con **ruoli diversi**.

---

## 🎯 Scenario di Matching (Come Immagino il Flusso)

```
Programmazione (RAI1, "Gomorrah S01E01", 2024-12-20)
    ↓
Matching con Partecipazioni
    ↓
Trovate 3 partecipazioni:
  - Artista A, Ruolo "Attore Protagonista"
  - Artista B, Ruolo "Attore Non Protagonista"  
  - Artista C, Ruolo "Doppiatore"
    ↓
Creazione di 3 INDIVIDUAZIONI separate:
  - Individuazione 1: Programma X + Artista A + Ruolo "Attore Protagonista"
  - Individuazione 2: Programma X + Artista B + Ruolo "Attore Non Protagonista"
  - Individuazione 3: Programma X + Artista C + Ruolo "Doppiatore"
```

**Ogni individuazione = 1 programmazione + 1 artista + 1 ruolo specifico**

---

## 🔄 OPZIONE A: Foreign Key Dirette (Raccomandata ⭐)

### Struttura Proposta:
```sql
ALTER TABLE individuazioni
ADD COLUMN artista_id UUID NOT NULL REFERENCES artisti(id),
ADD COLUMN ruolo_id UUID NOT NULL REFERENCES ruoli_tipologie(id);
```

### Pro ✅:

1. **Query Dirette e Veloci**
   ```sql
   -- Ottieni direttamente artista e ruolo senza JOIN extra
   SELECT 
       i.*,
       a.nome, a.cognome,
       r.nome as ruolo_nome
   FROM individuazioni i
   JOIN artisti a ON i.artista_id = a.id
   JOIN ruoli_tipologie r ON i.ruolo_id = r.id;
   ```

2. **Flessibilità**
   - Puoi creare individuazioni anche per artisti **non ancora nel database** (artista individuato ma non in `artisti`)
   - Se un artista viene identificato nella programmazione ma non c'è partecipazione, puoi comunque creare l'individuazione

3. **Chiarezza e Semplicità**
   - La struttura è chiara: "questa individuazione è per questo artista con questo ruolo"
   - Facile da capire per sviluppatori
   - Reportistica semplice

4. **Integrità dei Dati**
   - Se `partecipazioni` cambia, `individuazioni` resta coerente
   - L'individuazione è uno "snapshot" al momento della creazione

5. **Indici Efficaci**
   ```sql
   -- Puoi creare indici compositi utili
   CREATE INDEX idx_individuazioni_artista_campagna 
   ON individuazioni(artista_id, campagna_individuazioni_id);
   
   CREATE INDEX idx_individuazioni_ruolo_artista 
   ON individuazioni(ruolo_id, artista_id);
   ```

### Contro ❌:

1. **Duplicazione Concettuale**
   - `artista_id` e `ruolo_id` sono già in `partecipazioni`
   - Ma questa non è una vera duplicazione, è una **relazione logica diversa**

2. **Spazio Disco Leggermente Maggiore**
   - Due campi UUID aggiuntivi = 32 bytes per record
   - Con 1 milione di individuazioni = ~32 MB (trascurabile)

---

## 🔗 OPZIONE B: Foreign Key a Partecipazioni

### Struttura Proposta:
```sql
ALTER TABLE individuazioni
ADD COLUMN partecipazione_id UUID NOT NULL REFERENCES partecipazioni(id);
```

### Pro ✅:

1. **Source of Truth Unica**
   - Non duplica `artista_id` e `ruolo_id`
   - Se `partecipazioni` cambia, hai sempre i dati aggiornati

2. **Normalizzazione**
   - Segue i principi di normalizzazione del database
   - Un solo posto dove sono memorizzati artista/ruolo per opera

### Contro ❌:

1. **Query Sempre con JOIN**
   ```sql
   -- DEVI sempre fare JOIN per ottenere artista/ruolo
   SELECT 
       i.*,
       a.nome, a.cognome,
       r.nome as ruolo_nome
   FROM individuazioni i
   JOIN partecipazioni p ON i.partecipazione_id = p.id
   JOIN artisti a ON p.artista_id = a.id
   JOIN ruoli_tipologie r ON p.ruolo_id = r.id;
   ```
   - **3 JOIN invece di 2** (più lento)
   - Codice più complesso

2. **Meno Flessibile**
   - **NON puoi creare individuazioni senza partecipazione esistente**
   - Se individui un artista nella programmazione ma non c'è partecipazione → devi prima creare la partecipazione

3. **Dipendenze Rigide**
   - Se `partecipazioni` viene eliminata (soft delete?), l'individuazione perde il riferimento
   - Devi gestire CASCADE o RESTRICT con più attenzione

4. **Query di Reportistica Più Complesse**
   ```sql
   -- "Quanti artisti sono stati individuati in questa campagna?"
   -- Con Opzione B: devi fare JOIN con partecipazioni, poi con artisti
   -- Con Opzione A: SELECT COUNT(DISTINCT artista_id) FROM individuazioni
   ```

5. **Problema della Cardinalità**
   - Una `partecipazione` è (artista, opera, episodio, ruolo)
   - Ma `individuazioni` potrebbe voler tracciare: "quante volte questo artista è stato individuato"
   - Con FK a partecipazioni, diventa più difficile

---

## 📈 Analisi Performance

### Scenario: Query "Lista tutte le individuazioni di una campagna con artista e ruolo"

**OPZIONE A (FK Dirette):**
```sql
SELECT 
    i.*,
    a.nome, a.cognome,
    r.nome as ruolo
FROM individuazioni i
JOIN artisti a ON i.artista_id = a.id
JOIN ruoli_tipologie r ON i.ruolo_id = r.id
WHERE i.campagna_individuazioni_id = 'xxx';
```
- **2 JOIN** necessari
- Indici diretti su `artista_id` e `ruolo_id` → veloce

**OPZIONE B (FK a Partecipazioni):**
```sql
SELECT 
    i.*,
    a.nome, a.cognome,
    r.nome as ruolo
FROM individuazioni i
JOIN partecipazioni p ON i.partecipazione_id = p.id
JOIN artisti a ON p.artista_id = a.id
JOIN ruoli_tipologie r ON p.ruolo_id = r.id
WHERE i.campagna_individuazioni_id = 'xxx';
```
- **3 JOIN** necessari
- Deve attraversare `partecipazioni` prima → più lento

**Vincitore**: Opzione A (meno JOIN = più veloce)

---

## 🎯 Raccomandazione Finale: **OPZIONE A (FK Dirette)** ⭐⭐⭐

### Perché?

1. **Performance**: Meno JOIN = query più veloci
2. **Flessibilità**: Puoi individuare artisti anche senza partecipazioni esistenti
3. **Semplicità**: Codice più chiaro e facile da mantenere
4. **Reportistica**: Query più semplici per statistiche e report
5. **Snapshot Semantico**: L'individuazione è un "momento nel tempo", non deve dipendere da partecipazioni future

### Quando Scegliere Opzione B?

Solo se:
- **MAI** creerai individuazioni senza partecipazioni esistenti
- La **performance non è critica** (poche query, poche individuazioni)
- Vuoi **forte normalizzazione** a tutti i costi

---

## 📝 Implementazione Consigliata (Opzione A)

```sql
-- Aggiungi i campi
ALTER TABLE individuazioni
ADD COLUMN artista_id UUID NOT NULL REFERENCES artisti(id),
ADD COLUMN ruolo_id UUID NOT NULL REFERENCES ruoli_tipologie(id);

-- Aggiungi constraint UNIQUE per evitare duplicati
-- (stessa programmazione + stesso artista + stesso ruolo = duplicato)
ALTER TABLE individuazioni
ADD CONSTRAINT individuazioni_unique_programma_artista_ruolo
UNIQUE (programmazione_id, artista_id, ruolo_id, episodio_id);

-- Aggiungi indici per performance
CREATE INDEX idx_individuazioni_artista_id 
ON individuazioni(artista_id);

CREATE INDEX idx_individuazioni_ruolo_id 
ON individuazioni(ruolo_id);

CREATE INDEX idx_individuazioni_artista_campagna 
ON individuazioni(artista_id, campagna_individuazioni_id);

CREATE INDEX idx_individuazioni_campagna_artista_ruolo 
ON individuazioni(campagna_individuazioni_id, artista_id, ruolo_id);
```

---

## 🤔 Domande per Confermare la Scelta

1. **Le individuazioni saranno create SOLO da partecipazioni esistenti?**
   - SÌ → Opzione B potrebbe essere valida (ma ancora preferisco A)
   - NO → Opzione A obbligatoria

2. **Vorrai mai individuare artisti "nuovi" direttamente dalle programmazioni?**
   - SÌ → Opzione A
   - NO → Puoi considerare Opzione B

3. **Le query di reportistica sono frequenti?**
   - SÌ → Opzione A (più veloce)
   - NO → Entrambe vanno bene

4. **Quanti record ci saranno in individuazioni?**
   - Milioni → Opzione A (performance critica)
   - Migliaia → Entrambe vanno bene

---

## ✅ Decisione Finale

**Raccomando OPZIONE A (FK Dirette)** per:
- ✅ Performance migliori
- ✅ Maggiore flessibilità
- ✅ Codice più semplice
- ✅ Query più veloci

La "duplicazione" di `artista_id`/`ruolo_id` è accettabile perché:
- Sono solo 32 bytes per record
- Hanno significato semantico diverso (individuazione vs partecipazione)
- L'individuazione è uno snapshot storico

