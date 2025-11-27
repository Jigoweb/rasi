# 📊 GUIDA: Quando Usare gli Indici nel Database

## 🤔 Cos'è un Indice?

Un indice è come un **indice di un libro**: invece di leggere tutte le pagine per trovare un argomento, vai direttamente alla pagina giusta.

Nel database:
- **Senza indice**: PostgreSQL scansiona tutta la tabella (lento con molti record)
- **Con indice**: PostgreSQL trova i dati direttamente (veloce anche con milioni di record)

---

## ✅ QUANDO CONVIENE CREARE UN INDICE

### 1. **Foreign Keys (Relazioni tra Tabelle)** ⭐⭐⭐ **ALTA PRIORITÀ**

**PERCHÉ**: Le JOIN tra tabelle sono molto comuni e lente senza indici.

#### Esempio Concreto dal Tuo Database:

```sql
-- Query frequente: "Quante individuazioni ci sono per questa campagna?"
SELECT COUNT(*) 
FROM individuazioni 
WHERE campagna_individuazioni_id = 'xxx-xxx-xxx';

-- SENZA INDICE: 
-- - Scansiona TUTTE le 0+ individuazioni (ora è vuota, ma diventerà enorme!)
-- - Tempo: cresce linearmente con i record

-- CON INDICE su campagna_individuazioni_id:
-- - Va direttamente ai record della campagna specifica
-- - Tempo: costante, indipendentemente dalla grandezza totale
```

**✅ CREA SEMPRE INDICI SU FOREIGN KEYS** quando:
- La tabella figlia avrà molti record (come `individuazioni`)
- La tabella parent viene usata spesso nelle JOIN

#### Nel Tuo Caso:

```sql
-- campagna_individuazioni_id in individuazioni
-- → Questa query sarà MOLTO frequente:
SELECT * FROM individuazioni 
WHERE campagna_individuazioni_id = '...';

-- ✅ CREA: idx_individuazioni_campagna_individuazioni_id
```

---

### 2. **Filtri Frequenti (WHERE clause)** ⭐⭐⭐ **ALTA PRIORITÀ**

**PERCHÉ**: Se filtri spesso per un campo, l'indice accelera la ricerca.

#### Esempio:

```sql
-- Query frequente nella dashboard:
SELECT * FROM campagne_individuazione
WHERE anno = 2024
AND emittente_id = 'xxx';

-- Se hai 1000 campagne e fai questa query spesso:
-- SENZA INDICE: scansiona tutte le 1000 ogni volta
-- CON INDICE su (anno, emittente_id): trova solo quelle che servono
```

**✅ CREA INDICI** quando:
- Il campo viene usato spesso in `WHERE`
- La tabella avrà molti record (>1000)
- La query viene eseguita spesso

---

### 3. **Ordinamento (ORDER BY)** ⭐⭐ **MEDIA PRIORITÀ**

**PERCHÉ**: Ordinare senza indice richiede di caricare tutto in memoria e ordinare.

```sql
-- Dashboard mostra campagne ordinate per data:
SELECT * FROM campagne_individuazione
ORDER BY created_at DESC
LIMIT 10;

-- CON INDICE su created_at: trova velocemente le ultime 10
-- SENZA: deve ordinare tutto, poi prende le prime 10
```

**✅ CREA** quando:
- Ordini spesso per quel campo
- La tabella è grande (>10.000 record)

---

### 4. **JOIN tra Tabelle Grandi** ⭐⭐⭐ **ALTA PRIORITÀ**

**PERCHÉ**: JOIN senza indici possono essere ESTREMAMENTE lente.

#### Esempio dal Tuo Database:

```sql
-- Query che farai spesso nel processo di individuazione:
SELECT 
    ci.*,
    cp.nome as campagna_programmazione_nome,
    e.nome as emittente_nome
FROM campagne_individuazione ci
JOIN campagne_programmazione cp ON ci.campagne_programmazione_id = cp.id
JOIN emittenti e ON ci.emittente_id = e.id
WHERE ci.anno = 2024;

-- Se programmazioni ha 436,186 record (come ora),
-- e farai JOIN su campagne_programmazione:
-- SENZA INDICE: potrebbe impiegare SECONDI
-- CON INDICE: millisecondi
```

---

## ❌ QUANDO NON CONVIENE CREARE UN INDICE

### 1. **Tabelle Piccole** (< 1000 record)

**PERCHÉ**: Il costo di mantenere l'indice supera il beneficio.

```sql
-- Se hai solo 10 campagne_individuazione:
-- PostgreSQL può scansionare 10 record in millisecondi
-- L'indice aggiungerebbe overhead senza benefici reali
```

**❌ NON CREARE** se:
- La tabella ha < 1000 record
- Le query sono già veloci (< 10ms)

---

### 2. **Campi Raramente Usati in WHERE**

**PERCHÉ**: Indici non usati occupano spazio e rallentano gli INSERT/UPDATE.

```sql
-- Se hai un campo "note" che raramente filtri:
SELECT * FROM campagne_individuazione WHERE note LIKE '%testo%';
-- Se questa query la fai 1 volta al mese: non serve indice
```

**❌ NON CREARE** se:
- Il campo viene filtrato < 1% delle volte
- La tabella ha molti INSERT/UPDATE

---

### 3. **Tabelle con Scritture Molto Frequenti**

**PERCHÉ**: Ogni INSERT/UPDATE deve aggiornare anche gli indici → più lento.

```sql
-- Se inserisci 1000 individuazioni al secondo:
-- Ogni indice aggiunto rallenta l'inserimento
-- Devi bilanciare velocità di lettura vs scrittura
```

**⚠️ VALUTA** se:
- Hai > 100 INSERT/UPDATE al secondo
- La lettura è più importante della scrittura? → Crea indice
- La scrittura è più importante? → Valuta caso per caso

---

## 📋 ANALISI DEL TUO CASO SPECIFICO

### Situazione Attuale:

- `campagne_individuazione`: **0 record** (nuova tabella)
- `individuazioni`: **0 record** (ma crescerà enormemente!)
- `programmazioni`: **436,186 record** (già molto grande!)

### Raccomandazioni per `campagne_individuazione`:

#### ✅ **CREA SUBITO** (Alta Priorità):

1. **`campagne_programmazione_id`** 
   - ⚡ Query molto frequente: "tutte le campagne_individuazione di una campagna_programmazione"
   - 🔗 Foreign key → sempre utile

2. **`emittente_id`**
   - ⚡ Query frequente: filtraggio per emittente nella dashboard
   - 🔗 Foreign key → sempre utile

#### ⚠️ **VALUTA** (Media Priorità):

3. **`anno`**
   - Se filtri spesso per anno nella dashboard → ✅ CREA
   - Se raramente → ❌ NON CREARE

#### ❌ **NON CREARE ORA** (Bassa Priorità):

4. Campi come `nome`, `descrizione`, `stato`
   - Tabella piccola ora (0 record)
   - Valuta quando avrai > 1000 record e vedrai query lente

---

## 🎯 REGOLA D'ORO

### Domande da Farti Prima di Creare un Indice:

1. **Quanto spesso uso questo campo in WHERE/JOIN?**
   - Spesso (>10% delle query)? → ✅ CREA
   - Raramente (<1%)? → ❌ NON CREARE

2. **Quanti record avrà questa tabella?**
   - > 10,000? → ✅ CREA
   - < 1,000? → ❌ NON CREARE

3. **Quanto è lenta la query ora?**
   - > 100ms e usata spesso? → ✅ CREA
   - < 10ms? → ❌ NON CREARE (a meno che non cresca)

4. **Quante scritture ci sono?**
   - Molte INSERT/UPDATE frequenti? → Valuta il trade-off
   - Poche scritture? → ✅ CREA con più tranquillità

---

## 🔧 COME MONITORARE L'USO DEGLI INDICI

Puoi verificare se un indice viene usato:

```sql
-- Verifica se un indice viene usato nelle query
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as volte_usato,
    idx_tup_read as tuple_lette,
    idx_tup_fetch as tuple_ottenute
FROM pg_stat_user_indexes
WHERE tablename = 'campagne_individuazione'
ORDER BY idx_scan DESC;

-- Se idx_scan è 0 dopo settimane di utilizzo → l'indice NON viene usato
-- Considera di eliminarlo per liberare spazio
```

---

## 💡 CONCLUSIONE PER IL TUO CASO

### ✅ CREA SUBITO:

1. **Indice su `campagne_programmazione_id`** 
   - Foreign key
   - Query frequenti attese
   - Tabella `programmazioni` è già grande (436K record)

2. **Indice su `emittente_id`**
   - Foreign key  
   - Filtraggio frequente atteso

### ⚠️ RIMANDA E VALUTA:

3. **Indice su `anno`**
   - Crea quando vedrai query che filtrano per anno
   - Se la tabella rimane piccola (<1000), non serve

4. **Altri indici**
   - Crea quando avrai dati reali e vedrai query lente
   - Misura prima, ottimizza dopo

---

## 📚 RISORSE

- [PostgreSQL Index Documentation](https://www.postgresql.org/docs/current/indexes.html)
- [When to Index](https://use-the-index-luke.com/)

