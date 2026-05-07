# Design: Pipeline Individuazioni Scalabile e Adattiva

**Data:** 2026-05-07  
**Stato:** Approvato  
**Scope:** Import normalizzazione + algoritmo matching adattivo  

---

## Contesto e problema

Il sistema di individuazioni riceve programmazioni da emittenti eterogenei (Paramount Plus, Pluto TV, Rakuten, ecc.) con dataset strutturalmente diversi:

- Titoli in ALL CAPS (Pluto TV: ~32% dei titoli)
- Valori `tipo` non canonici (`tv`, `movie`, `episode` invece di `serie`, `film`)
- `data_trasmissione` assente per contenuti streaming (Paramount: usa `sales_month`)
- `regia` assente su larga parte del catalogo VOD
- Anno di distribuzione invece di anno di produzione (scarto tipico 1–5 anni)

L'algoritmo attuale (`match_programmazione_to_partecipazioni`) penalizza dati mancanti anche quando la loro assenza è strutturale all'emittente, non un errore. Il comportamento è identico per tutti, senza adattamento al contenuto disponibile.

**Obiettivo:** Rendere import e matching più robusti e scalabili **senza aggiungere lavoro all'admin** e senza complicare la UX.

---

## Decisioni di design

### 1. Nessuna configurazione per emittente

Non viene aggiunto nessun pannello admin, nessun form di configurazione, nessuna colonna DB per emittente. Tutte le trasformazioni e i parametri di matching sono automatici o globalmente migliorati.

**Motivazione:** Il valore aggiunto di una config per emittente è minore rispetto al costo di mantenerla (UI da costruire, admin che deve impostarla, rischio configurazioni errate). Le stesse regole automatiche coprono tutti i casi rilevati.

### 2. Normalizzazione all'import — solo estetica

Il matching è già case-insensitive (`LOWER()` su entrambi i lati nella funzione SQL). La normalizzazione titlecase viene applicata all'import esclusivamente per migliorare la visualizzazione nella UI.

### 3. Algoritmo adattivo — usa ciò che c'è, ignora ciò che manca

Il principio guida: **se un campo è NULL nella programmazione, il suo discriminante viene saltato senza penalità**. Il punteggio finale viene ricalibrato sui discriminanti disponibili.

---

## Componente 1 — Normalizzazione Import

### Dove si applica

Nel service `uploadProgrammazioni` (`src/features/programmazioni/services/programmazioni.service.ts`) prima dell'insert in Supabase, su ogni riga del payload.

### Trasformazioni applicate (sempre, per tutti gli emittenti)

#### 1.1 Titolo → Title Case

```typescript
function toTitleCase(str: string): string {
  if (!str) return str
  // Se meno del 40% delle lettere sono lowercase, è probabilmente ALL CAPS
  const lower = str.replace(/[^a-zA-Z]/g, '')
  const lowerCount = (str.match(/[a-z]/g) || []).length
  if (lower.length > 0 && lowerCount / lower.length < 0.4) {
    return str.toLowerCase().replace(/(?:^|\s|[-–(])\S/g, c => c.toUpperCase())
  }
  return str
}
```

Applicato a: `titolo`, `titolo_originale`, `titolo_episodio`, `titolo_episodio_originale`

#### 1.2 Rimozione suffissi ridondanti

Lista globale fissa, applicata dopo title case:

```typescript
const SUFFISSI_DA_RIMUOVERE = [
  /\s*\(original\)/gi,
  /\s*\(versione italiana\)/gi,
  /\s*\(ov\)/gi,
  /\s*\(sub ita\)/gi,
]
```

#### 1.3 Mapping tipo → canonico

Dizionario globale fisso:

```typescript
const TIPO_MAPPING: Record<string, string> = {
  tv:        'serie',
  series:    'serie',
  episode:   'serie',
  movie:     'film',
  film:      'film',
  feature:   'film',
  live:      'live',
  'live tv': 'live',
  special:   'speciale',
}

function normalizzaTipo(tipo: string | null): string | null {
  if (!tipo) return null
  return TIPO_MAPPING[tipo.toLowerCase().trim()] ?? tipo.toLowerCase().trim()
}
```

#### 1.4 Date fallback automatico

```typescript
function normalizzaData(row: ProgrammazionePayload): string | null {
  if (row.data_trasmissione) return row.data_trasmissione
  if (row.sales_month) {
    // sales_month formato: "2024-03" → "2024-03-01"
    const match = String(row.sales_month).match(/^(\d{4})-(\d{2})$/)
    if (match) return `${match[1]}-${match[2]}-01`
  }
  if (row.data_inizio) return row.data_inizio
  return null
}
```

### Dove non si interviene

- `numero_episodio`, `numero_stagione` — non modificati (il matching gestisce i casi anomali)
- `regia` — non modificata
- Campi economici (`views`, `retail_price`, `total_revenue`, ecc.) — passati as-is

---

## Componente 2 — Algoritmo Matching Adattivo

### File da modificare

`db/init/03_matching_functions.sql` — funzione `match_programmazione_to_partecipazioni`

### 2.1 Fix discriminante anno — tolleranza configurabile

**Attuale (hardcoded):**
```sql
-- ±1 anno: +10.5 punti
-- ±2 anni: +4.5 punti  
-- >2 anni: -19.5 punti PENALITÀ
```

**Nuovo (parametri con default generosi):**

```sql
CREATE OR REPLACE FUNCTION match_programmazione_to_partecipazioni(
    p_programmazione_id UUID,
    p_soglia_titolo NUMERIC DEFAULT 0.7,
    p_artista_ids UUID[] DEFAULT NULL,
    p_tolleranza_anno_soft INT DEFAULT 3,   -- ±N anni: nessuna penalità
    p_tolleranza_anno_hard INT DEFAULT 5    -- oltre N anni: scarto
)
```

Logica anno aggiornata:
```sql
-- Se anno assente in programmazione O in opera → skip (punteggio neutro = 0)
-- Se anno presente in entrambi:
--   |diff| <= p_tolleranza_anno_soft → +15 punti (full)
--   |diff| <= p_tolleranza_anno_hard → +5 punti (ridotto)
--   |diff| > p_tolleranza_anno_hard  → skip match (return dalla loop iteration)
```

**Motivazione:** Anno di produzione (DB RASI) vs anno di distribuzione (emittente) può differire di 1–5 anni. La penalità attuale -19.5 causa falsi negativi sistematici.

### 2.2 Fix discriminante regia — null-safe

**Bug attuale:** Se `v_prog.regia IS NULL`, alcune path nel codice SQL assegnano comunque la penalità -15.

**Fix:**
```sql
-- DISCRIMINANTE REGIA
IF v_prog.regia IS NOT NULL AND v_prog.regia != '' 
   AND v_opera.regista IS NOT NULL AND v_opera.regista != '' THEN
    -- calcola v_score_regia normalmente
    -- match >= 0.7 → +10, parziale >= 0.4 → +5, no match → -15
ELSE
    -- Dati assenti: discriminante non applicato, punteggio neutro
    v_score_regia := 0;
END IF;
```

### 2.3 Ricalibrazione punteggio massimo adattiva

Con discriminanti saltati, il punteggio massimo teorico si abbassa. Per mantenere la soglia minima (35 punti) comparabile, il punteggio viene normalizzato sui discriminanti effettivamente usati:

```sql
-- Calcola peso massimo possibile con i dati disponibili
v_peso_massimo := 50; -- titolo sempre presente
IF v_score_titolo_orig > 0 THEN v_peso_massimo := v_peso_massimo + 10; END IF;
IF v_anno_disponibile THEN v_peso_massimo := v_peso_massimo + 15; END IF;
IF v_regia_disponibile THEN v_peso_massimo := v_peso_massimo + 10; END IF;
IF v_episodio_disponibile THEN v_peso_massimo := v_peso_massimo + 15; END IF;

-- Soglia adattata: 35% del peso massimo disponibile
v_soglia_adattata := v_peso_massimo * 0.35;
IF v_score_totale < v_soglia_adattata THEN CONTINUE; END IF;
```

**Effetto:** Una programmazione senza regia e senza anno viene giudicata su titolo+episodio con soglia proporzionata, non confrontata con il massimo teorico di 100.

---

## Componente 3 — Parametri campagna

### Passaggio tolleranza anno dal frontend

Il frontend (contesto `individuazione-process-context.tsx`) passa i parametri alla campagna. I parametri di default della funzione SQL gestiscono il caso in cui non vengano passati.

Per un'eventuale futura UI che esponga la tolleranza anno (es. "campagna conservativa" vs "campagna ampia"), i parametri sono già pronti nell'overload della funzione.

---

## File da modificare

| File | Tipo modifica |
|------|--------------|
| `src/features/programmazioni/services/programmazioni.service.ts` | Aggiungere funzioni `toTitleCase`, `normalizzaTipo`, `normalizzaData` + applicarle in `uploadProgrammazioni`. Estendere `ProgrammazionePayload` con `sales_month`, `data_inizio`, `data_fine` se assenti. |
| `db/init/03_matching_functions.sql` | (1) `match_programmazione_to_partecipazioni`: parametri `p_tolleranza_anno_soft/hard`, fix null-safe regia, soglia adattiva. (2) `process_programmazioni_chunk`: aggiungere e passare i nuovi parametri al chiamante interno. |
| `src/app/api/campagne-individuazione/process-chunk/route.ts` | Passare `p_tolleranza_anno_soft` e `p_tolleranza_anno_hard` alla RPC `process_programmazioni_chunk` (con valori default 3 e 5). |

Nessuna migrazione DB. Nessuna nuova tabella. Nessuna modifica UI.

---

## Non in scope

- Configurazione per emittente (esclusa per semplicità e UX)
- Pannello admin configurazione normalizzazione
- Conversione numerazione episodi continua (problema raro, gestito manualmente nel template)
- Modifiche al flusso di upload (wizard, preview, ecc.)

---

## Verifica post-implementazione

1. Upload file Pluto TV con titoli ALL CAPS → verificare che in `programmazioni` appaiano in title case
2. Upload file Paramount con `sales_month` invece di `data_trasmissione` → verificare che `data_trasmissione` venga popolata con primo giorno del mese
3. Lanciare campagna su Pluto TV senza regia → verificare che il punteggio non penalizzi per regia mancante (confrontare `dettagli_matching` JSONB prima/dopo)
4. Lanciare campagna con opera DB anno 2020 e programmazione anno 2023 → verificare che non venga scartata (±3 anni soft)
