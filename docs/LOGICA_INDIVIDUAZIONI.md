# 🔄 Logica di Individuazioni - Documentazione Completa

## 📋 Panoramica

Il processo di individuazione parte da una **campagna_programmazione** e genera le **individuazioni** attraverso un matching automatico tra:
- **Programmazioni** (dati delle trasmissioni dall'emittente)
- **Opere** + **Episodi** (catalogo opere)
- **Partecipazioni** (artisti e ruoli nelle opere)

**Obiettivo**: Per ogni programmazione, trovare gli **artisti** con il loro **ruolo specifico** nell'opera/episodio trasmesso.

---

## 🎯 Flusso Completo

```
1. Utente clicca CTA "Crea Individuazioni" nel front-end
   ↓
2. Front-end chiama API: POST /api/campagne-individuazione/process
   ↓
3. API chiama funzione SQL: process_campagna_individuazione(campagne_programmazione_id)
   ↓
4. Funzione crea record in campagne_individuazione
   ↓
5. Per ogni programmazione della campagna:
   
   5.1 Determina se è FILM o SERIE TV:
       - È SERIE se almeno uno di questi campi è valorizzato:
         numero_episodio, numero_stagione, titolo_episodio, titolo_episodio_originale
   
   5.2 Cerca match con OPERE:
       - Confronto titolo (case insensitive, similarity >= 70%)
       - Bonus: titolo_originale, anno
   
   5.3 Se SERIE TV → cerca EPISODIO specifico (OBBLIGATORIO):
       - Match su numero_stagione + numero_episodio
       - OPPURE match su titolo_episodio / titolo_episodio_originale
       - Se episodio non trovato → SCARTA (no individuazione)
   
   5.4 Trova PARTECIPAZIONI per opera/episodio:
       - Estrae tutti gli artisti con i loro ruoli
   
   5.5 Crea INDIVIDUAZIONI:
       - 1 individuazione per ogni artista/ruolo trovato
       - Snapshot completo di tutti i dati
   ↓
6. Ritorna statistiche (individuazioni create, match trovati, ecc.)
```

---

## 🔧 Componenti Tecnici

### 1. Funzione SQL: `match_programmazione_to_partecipazioni`

**Scopo**: Trova tutte le partecipazioni (artista + ruolo) che matchano con una programmazione.

**Input**: 
- `p_programmazione_id` (UUID)
- `p_soglia_titolo` (NUMERIC, default 0.7)

**Output**: 
- Tabella con: `partecipazione_id`, `opera_id`, `episodio_id`, `artista_id`, `ruolo_id`, `punteggio`, `dettagli_matching`

**Logica Matching**:

#### Per FILM (nessun dato episodio nella programmazione):
- **Titolo** (OBBLIGATORIO): similarity >= 70% tra:
  - `programmazioni.titolo` vs `opere.titolo`
  - `programmazioni.titolo` vs `opere.titolo_originale`
  - `programmazioni.titolo` vs `opere.alias_titoli[]`
- **Titolo originale** (BONUS): se presente in entrambi
- **Anno** (BONUS): +10 punti se uguale, +5 se diff <= 1 anno

#### Per SERIE TV (almeno un campo episodio valorizzato):
- **Titolo serie** (OBBLIGATORIO): come sopra
- **Episodio** (OBBLIGATORIO, almeno uno deve matchare):
  - `numero_stagione` + `numero_episodio` → match esatto
  - OPPURE `titolo_episodio` → similarity >= 60%
  - OPPURE `titolo_episodio_originale` → similarity >= 60%
- Se episodio NON trovato → **NO individuazione**

**Note**: Tutti i confronti sono **case insensitive**

---

### 2. Funzione SQL: `process_campagna_individuazione`

**Scopo**: Processa una intera campagna_programmazione e crea tutte le individuazioni.

**Input**:
- `p_campagne_programmazione_id` (UUID)
- `p_nome_campagna_individuazione` (TEXT, opzionale)
- `p_descrizione` (TEXT, opzionale)

**Processo**:
1. Crea record in `campagne_individuazione` con:
   - `emittente_id`, `campagne_programmazione_id`, `anno` dalla campagna origine
   - `stato = 'in_corso'`
2. Per ogni `programmazione` nella campagna:
   - Chiama `match_programmazione_to_partecipazioni`
   - Per ogni match trovato (artista + ruolo):
     - Crea record in `individuazioni` con:
       - **Relazioni**: campagna_individuazioni_id, programmazione_id, partecipazione_id, artista_id, ruolo_id, opera_id, episodio_id
       - **Snapshot**: tutti i campi della programmazione (titolo, data_trasmissione, ecc.)
       - **Matching**: punteggio, dettagli_matching, metodo='automatico', stato='individuato'
3. Aggiorna `campagne_individuazione.statistiche` con risultati
4. Imposta `campagne_programmazione.is_individuated = TRUE`
5. Ritorna JSONB con risultati

**Output**:
```json
{
  "success": true,
  "campagne_individuazione_id": "uuid",
  "statistiche": {
    "programmazioni_totali": 5000,
    "programmazioni_processate": 5000,
    "programmazioni_con_match": 1500,
    "programmazioni_senza_match": 3500,
    "individuazioni_create": 4500,
    "match_trovati": 4500,
    "match_scartati_duplicati": 0,
    "artisti_distinti": 120,
    "opere_distinte": 800,
    "tempo_processamento_ms": 15000,
    "soglia_titolo": 0.7
  }
}
```

---

### 3. Endpoint API: `POST /api/campagne-individuazione/process`

**Scopo**: Espone la funzione SQL al front-end.

**Request**:
```json
{
  "campagne_programmazione_id": "uuid-della-campagna",
  "nome_campagna_individuazione": "Individuazione Q1 2024 (opzionale)",
  "descrizione": "Descrizione opzionale"
}
```

**Response (successo)**:
```json
{
  "success": true,
  "data": {
    "campagne_individuazione_id": "uuid",
    "statistiche": {
      "programmazioni_processate": 5000,
      "programmazioni_con_match": 1500,
      "individuazioni_create": 4500,
      "artisti_distinti": 120,
      "opere_distinte": 800
    },
    "campagna": { /* dati campagne_individuazione */ }
  }
}
```

**Response (errore)**:
```json
{
  "success": false,
  "error": "Messaggio di errore"
}
```

---

## 📝 Query SQL per Testing

```sql
-- 1. Test matching su una singola programmazione
SELECT * FROM match_programmazione_to_partecipazioni(
    'uuid-programmazione',
    0.7  -- soglia titolo (default)
);

-- 2. Test processo completo campagna
SELECT * FROM process_campagna_individuazione(
    'uuid-campagne-programmazione',
    'Nome campagna individuazione',  -- opzionale
    'Descrizione'  -- opzionale
);

-- 3. Verifica risultati
SELECT 
    i.*,
    a.nome || ' ' || a.cognome as artista,
    r.nome as ruolo,
    o.titolo as opera
FROM individuazioni i
JOIN artisti a ON i.artista_id = a.id
JOIN ruoli_tipologie r ON i.ruolo_id = r.id
JOIN opere o ON i.opera_id = o.id
WHERE i.campagna_individuazioni_id = 'uuid-campagna-individuazione'
ORDER BY i.punteggio_matching DESC;
```

---

## 🎨 Integrazione Front-End

### Esempio React/Next.js

```typescript
// services/campagne-individuazione.service.ts
export const processCampagnaIndividuazione = async (
  campagneProgrammazioneId: string
) => {
  const { data, error } = await supabase.functions.invoke(
    'process-campagna-individuazione',
    {
      body: { campagne_programmazione_id: campagneProgrammazioneId }
    }
  );
  
  return { data, error };
};

// component/ProcessIndividuazioniButton.tsx
const ProcessIndividuazioniButton = ({ campagnaId }: Props) => {
  const [loading, setLoading] = useState(false);
  
  const handleProcess = async () => {
    setLoading(true);
    try {
      const result = await processCampagnaIndividuazione(campagnaId);
      // Mostra risultati o redirect
    } catch (error) {
      // Gestisci errore
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Button onClick={handleProcess} disabled={loading}>
      {loading ? 'Processando...' : 'Crea Individuazioni'}
    </Button>
  );
};
```

---

## ⚙️ Configurazione

La configurazione del matching è in `campagne_individuazione.configurazione_matching`:

```json
{
  "soglia_titolo": 0.7,
  "algoritmo": "similarity_v2",
  "case_insensitive": true,
  "serie_richiede_episodio": true
}
```

**Parametri**:
- `soglia_titolo`: Similarity minima per match titolo (0.7 = 70%)
- `case_insensitive`: Tutti i confronti ignorano maiuscole/minuscole
- `serie_richiede_episodio`: Se true, le serie TV devono matchare l'episodio specifico

---

## 📊 Esempio Reale di Matching

Programmazione:
```
Titolo: "Grey's Anatomy"
Stagione: 7, Episodio: 14
Titolo episodio: "P.Y.T. (Pretty Young Thing)"
```

Risultato matching:
```
✅ Opera trovata: "GREY'S ANATOMY" (similarity 100%)
✅ Episodio trovato: S07E14 "P.Y.T."
✅ Artista individuato: GIUSEPPINA IZZO (nome arte: GIUPPY IZZO)
✅ Ruolo: "Doppiatore primario"
✅ Punteggio: 75/100
```

---

## 📊 Statistiche e Monitoraggio

Le statistiche vengono salvate in `campagne_individuazione.statistiche`:

```json
{
  "programmazioni_totali": 5000,
  "programmazioni_processate": 5000,
  "programmazioni_con_match": 1500,
  "programmazioni_senza_match": 3500,
  "individuazioni_create": 4500,
  "match_trovati": 4500,
  "match_scartati_duplicati": 0,
  "artisti_distinti": 120,
  "opere_distinte": 800,
  "tempo_processamento_ms": 15000,
  "soglia_titolo": 0.7,
  "data_processamento": "2024-01-15T10:30:00Z",
  "errore": false
}
```

---

## 🔍 Debug e Troubleshooting

### Verificare Matching
```sql
-- Vedi tutti i match trovati per una programmazione
SELECT * FROM match_programmazione_to_partecipazioni('uuid')
ORDER BY punteggio DESC;
```

### Verificare Individuazioni Create
```sql
-- Vedi tutte le individuazioni di una campagna
SELECT 
    i.*,
    a.nome, a.cognome,
    r.nome as ruolo_nome,
    o.titolo as opera_titolo
FROM individuazioni i
JOIN artisti a ON i.artista_id = a.id
JOIN ruoli_tipologie r ON i.ruolo_id = r.id
JOIN opere o ON i.opera_id = o.id
WHERE i.campagna_individuazioni_id = 'uuid'
ORDER BY i.punteggio_matching DESC;
```

---

## ⚠️ Note Importanti

1. **Snapshot Storico**: Tutti i dati vengono copiati al momento della creazione (artista_id, ruolo_id, opera_id, dati programmazione)

2. **Idempotenza**: Chiamare più volte la stessa funzione non crea duplicati (constraint UNIQUE)

3. **Performance**: Il processo è ottimizzato per gestire grandi volumi (batch processing)

4. **Errori**: Errori vengono loggati ma non bloccano l'intero processo (continue on error)

