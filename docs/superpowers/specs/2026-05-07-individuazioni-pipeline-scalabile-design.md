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

### 2. Normalizzazione all'import — cosmetica + funzionale

Il matching è già case-insensitive (`LOWER()` su entrambi i lati nella funzione SQL):
- **Title case**: cosmetico, migliora visualizzazione UI senza impattare matching.
- **Rimozione suffissi** (`(Original)`, `(OV)`, ecc.): funzionale, migliora similarity score quando il DB opera non contiene quei suffissi.
- **Mapping tipo, fallback data, normalizzazione episodio**: funzionali, abilitano matching corretto.

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

**Pre-requisito tipo**: cambiare `ProgrammazionePayload.sales_month` da `number` a `string | number` (Excel può portarlo come string `"2024-03"`, numero `202403`, decimale `2024.03`, o serial date Excel come `45352`).

```typescript
function parseSalesMonth(value: string | number | undefined | null): string | null {
  if (value == null || value === '') return null
  const str = String(value).trim()

  // Formato "YYYY-MM" o "YYYY/MM"
  let m = str.match(/^(\d{4})[-/](\d{1,2})$/)
  if (m) {
    const month = m[2].padStart(2, '0')
    return `${m[1]}-${month}-01`
  }

  // Formato "YYYYMM" (es. 202403)
  m = str.match(/^(\d{4})(\d{2})$/)
  if (m) return `${m[1]}-${m[2]}-01`

  // Formato decimale "YYYY.MM" (es. 2024.03)
  m = str.match(/^(\d{4})\.(\d{1,2})$/)
  if (m) {
    const month = m[2].padStart(2, '0')
    return `${m[1]}-${month}-01`
  }

  // Excel serial date (numero > 30000, < 60000 plausibile range moderno)
  const n = Number(str)
  if (Number.isFinite(n) && n > 30000 && n < 60000) {
    // Excel epoch: 1899-12-30 (con bug 1900-02-29 incluso)
    const ms = (n - 25569) * 86400 * 1000
    const d = new Date(ms)
    if (!isNaN(d.getTime())) {
      const y = d.getUTCFullYear()
      const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
      return `${y}-${mo}-01`
    }
  }

  return null
}

function normalizzaData(row: ProgrammazionePayload): string | null {
  if (row.data_trasmissione) return row.data_trasmissione
  const fromSales = parseSalesMonth(row.sales_month)
  if (fromSales) return fromSales
  if (row.data_inizio) return row.data_inizio
  return null
}
```

#### 1.5 Normalizzazione numero episodio — encoding compatto (auto-detection)

Alcuni emittenti (rilevato su Pluto TV) codificano il numero episodio come `stagione * 100 + episodio_reale`:
- S17 Ep1701 → episodio reale = 1
- S7 Ep728 → episodio reale = 28

Il pattern è rilevabile e non ambiguo: nessun emittente con numerazione standard avrebbe l'episodio 1701 in stagione 17.

```typescript
function normalizzaEpisodio(
  numero_episodio: number | null,
  numero_stagione: number | null
): number | null {
  if (!numero_episodio || !numero_stagione) return numero_episodio
  const prefix = numero_stagione * 100
  // Encoding compatto rilevato: ep in range [s*100+1, s*100+99]
  if (numero_episodio >= prefix + 1 && numero_episodio <= prefix + 99) {
    return numero_episodio - prefix
  }
  return numero_episodio
}
```

Applicato a `numero_episodio` (con `numero_stagione` come contesto), prima dell'insert.

### Dove non si interviene

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

**Aggiornare anche l'overload 1** (delega, riga 17-36) per passare i nuovi default:
```sql
CREATE OR REPLACE FUNCTION match_programmazione_to_partecipazioni(
    p_programmazione_id UUID,
    p_soglia_titolo NUMERIC DEFAULT 0.7
)
RETURNS TABLE (...)
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM match_programmazione_to_partecipazioni(
        p_programmazione_id, p_soglia_titolo, NULL::UUID[], 3, 5
    );
END;
$$ LANGUAGE plpgsql STABLE;
```

Aggiungere i `DROP FUNCTION IF EXISTS` per la firma vecchia a 3 parametri prima delle nuove `CREATE OR REPLACE`:
```sql
DROP FUNCTION IF EXISTS match_programmazione_to_partecipazioni(uuid, numeric, uuid[]);
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

### 2.2 Discriminante regia — già null-safe (no fix)

**Stato attuale:** Il codice è già corretto. Il guard a riga 232:
```sql
IF v_prog.regia IS NOT NULL AND LENGTH(TRIM(v_prog.regia)) > 0
   AND v_opera.regista IS NOT NULL AND array_length(v_opera.regista, 1) > 0 THEN
    -- penalità -1.5 stanno DENTRO al guard, non si applicano se NULL
END IF;
```

Quando regia è NULL su un lato, `v_score_regia` resta 0 (inizializzazione). Nessun bug.

**Cosa cambia in questo design:** il fatto che `v_score_regia = 0` venga applicato senza ricalibrazione della soglia (35 hardcoded) causa falsi negativi quando l'emittente non fornisce regia su molti record. Il fix vero è la **soglia adattiva** (§ 2.3), non il discriminante stesso.

### 2.2bis Fix serie senza dati episodio — CONTINUE prematuro

**Bug attuale (riga 340-342):**
```sql
IF v_is_serie THEN
    -- ... loop episodi ...
    IF NOT v_episodio_trovato THEN
        CONTINUE;  -- ❌ scarta l'opera se serie senza match episodio
    END IF;
END IF;
```

`v_is_serie` viene determinato dalla presenza di **uno qualsiasi** tra `numero_episodio`, `numero_stagione`, `titolo_episodio`. Se la programmazione ha `numero_stagione=2` ma `numero_episodio=NULL` (caso comune in alcuni emittenti), e nessun episodio della stagione 2 ha titolo matchabile, viene scartato anche se il titolo opera matcha al 100%.

**Fix:**
```sql
-- Sostituire CONTINUE con: skip solo episodio scoring, non l'opera
IF v_is_serie THEN
    -- ... loop episodi (invariato) ...

    IF NOT v_episodio_trovato THEN
        -- Distinguiamo due casi:
        IF v_prog.numero_episodio IS NOT NULL OR v_prog.titolo_episodio IS NOT NULL THEN
            -- Caso A: prog ha dati episodio specifici, ma nessun match → scarta
            CONTINUE;
        END IF;
        -- Caso B: prog è "marcata serie" solo per numero_stagione, senza specifici
        --         → procedi senza episode scoring, soglia adattiva lo gestirà
        v_score_episodio := 0;
    ELSE
        v_score_episodio := v_best_episodio_score;
    END IF;
END IF;
```

### 2.3 Ricalibrazione punteggio massimo adattiva

Con discriminanti saltati, il punteggio massimo teorico si abbassa. La soglia hardcoded `35` (riga 386) viene **rimossa** e sostituita con una soglia adattiva normalizzata sui discriminanti effettivamente usati.

**Da rimuovere (riga 386):**
```sql
IF v_score_totale < 35 THEN CONTINUE; END IF;
```

**Sostituire con:**
```sql
-- Determina quali discriminanti hanno contribuito (entrambi i lati avevano dato)
v_anno_disponibile := (v_prog.anno IS NOT NULL AND v_opera.anno_produzione IS NOT NULL);
v_regia_disponibile := (
    v_prog.regia IS NOT NULL AND LENGTH(TRIM(v_prog.regia)) > 0
    AND v_opera.regista IS NOT NULL AND array_length(v_opera.regista, 1) > 0
);
v_episodio_applicato := (v_is_serie AND v_episodio_trovato);

-- Calcola peso massimo possibile con i dati disponibili
v_peso_massimo := 50; -- titolo sempre presente
IF v_score_titolo_orig > 0 THEN v_peso_massimo := v_peso_massimo + 10; END IF;
IF v_anno_disponibile THEN v_peso_massimo := v_peso_massimo + 15; END IF;
IF v_regia_disponibile THEN v_peso_massimo := v_peso_massimo + 10; END IF;
IF v_episodio_applicato THEN v_peso_massimo := v_peso_massimo + 15; END IF;

-- Soglia adattata: 35% del peso massimo disponibile,
-- con floor a 25 per evitare match troppo deboli quando solo titolo è presente
v_soglia_adattata := GREATEST(v_peso_massimo * 0.35, 25);
IF v_score_totale < v_soglia_adattata THEN CONTINUE; END IF;
```

**Variabili da dichiarare** in sezione `DECLARE` della funzione:
```sql
v_anno_disponibile BOOLEAN;
v_regia_disponibile BOOLEAN;
v_episodio_applicato BOOLEAN;
v_peso_massimo NUMERIC;
v_soglia_adattata NUMERIC;
```

**Effetto:** Una programmazione senza regia e senza anno viene giudicata su titolo+episodio con soglia proporzionata (es. peso_massimo = 65 → soglia = 25). Floor a 25 previene match di solo titolo a similarity 0.5 (= 25 punti) che sarebbero deboli.

---

## Componente 3 — Wrapper `process_programmazioni_chunk`

### Localizzazione attuale

La funzione `process_programmazioni_chunk` **non è in repo** (solo deployata su Supabase). Va decisa una strategia di gestione:

**Opzione scelta: aggiungere al repo**. Creare il file `db/init/03b_process_chunk.sql` (o aggiungere in coda a `03_matching_functions.sql`) con la definizione corrente esportata da Supabase + le modifiche.

**Procedura prima dell'implementazione:**
1. Esportare la definizione corrente con `pg_get_functiondef('process_programmazioni_chunk'::regproc)` via MCP Supabase.
2. Salvare in `db/init/`.
3. Applicare le modifiche di seguito.

### Modifiche a `process_programmazioni_chunk`

Aggiungere parametri tolleranza alla firma e passarli al chiamante interno:

```sql
CREATE OR REPLACE FUNCTION process_programmazioni_chunk(
    p_campagne_individuazione_id UUID,
    p_programmazione_ids UUID[],
    p_soglia_titolo NUMERIC DEFAULT 0.7,
    p_artista_ids UUID[] DEFAULT NULL,
    p_tolleranza_anno_soft INT DEFAULT 3,   -- nuovo
    p_tolleranza_anno_hard INT DEFAULT 5    -- nuovo
)
-- ... internamente chiama match_programmazione_to_partecipazioni(
--     prog_id, p_soglia_titolo, p_artista_ids,
--     p_tolleranza_anno_soft, p_tolleranza_anno_hard
-- )
```

### Passaggio dal frontend (futuro)

Per un'eventuale UI che esponga la tolleranza anno (es. "campagna conservativa" vs "campagna ampia"), i parametri sono già pronti nella firma. Per ora, il route `process-chunk/route.ts` passa i default 3 e 5.

---

## File da modificare

| File | Tipo modifica |
|------|--------------|
| `src/features/programmazioni/services/programmazioni.service.ts` | Aggiungere `toTitleCase`, `normalizzaTipo`, `parseSalesMonth`, `normalizzaData`, `normalizzaEpisodio`, `SUFFISSI_DA_RIMUOVERE`, `TIPO_MAPPING` + applicarli in `uploadProgrammazioni`. Cambiare `ProgrammazionePayload.sales_month` da `number` a `string \| number`. |
| `db/init/03_matching_functions.sql` | `match_programmazione_to_partecipazioni`: (1) nuovi parametri `p_tolleranza_anno_soft/hard`, (2) overload 1 delega aggiornata, (3) DROP firma vecchia, (4) fix CONTINUE prematuro per serie senza dati episodio, (5) rimozione soglia hardcoded 35 + soglia adattiva, (6) logica anno con tolleranze parametriche. |
| `db/init/03b_process_chunk.sql` *(NUOVO)* | Esportare definizione corrente di `process_programmazioni_chunk` da Supabase, aggiungere parametri `p_tolleranza_anno_soft/hard` e propagarli al chiamante interno. |
| `src/app/api/campagne-individuazione/process-chunk/route.ts` | Passare `p_tolleranza_anno_soft: 3` e `p_tolleranza_anno_hard: 5` alla RPC. |

### Verifiche pre-implementazione

1. **CHECK constraint su `programmazioni.tipo`**: verificare se schema impone valori specifici. Se sì, allineare output di `TIPO_MAPPING` ai valori accettati. Comando:
   ```sql
   SELECT conname, pg_get_constraintdef(oid)
   FROM pg_constraint
   WHERE conrelid = 'programmazioni'::regclass AND contype = 'c';
   ```
2. **Export `process_programmazioni_chunk`**: prima dell'implementazione, salvare definizione corrente in repo.

Nessuna migrazione di dati. Nessuna nuova tabella. Nessuna modifica UI.

---

## Non in scope

- Configurazione per emittente (esclusa per semplicità e UX)
- Pannello admin configurazione normalizzazione
- Conversione numerazione episodi continua (problema raro, gestito manualmente nel template)
- Modifiche al flusso di upload (wizard, preview, ecc.)

---

## Verifica post-implementazione

1. **Title case**: upload Pluto con titoli ALL CAPS → `programmazioni.titolo` in Title Case.
2. **Suffix removal**: upload Rakuten con titoli `Titolo (Original)` → suffisso strippato in DB.
3. **Sales month fallback**: upload Paramount con `sales_month` numero/stringa/decimale → `data_trasmissione` = primo del mese.
4. **Episode encoding**: upload Pluto con `numero_stagione=17, numero_episodio=1701` → in DB `numero_episodio=1`.
5. **Episode encoding non triggera per dati normali**: prog con `numero_stagione=1, numero_episodio=5` → resta `5`.
6. **Regia mancante**: campagna Pluto senza regia, opera DB con regia → match non scartato, `dettagli_matching` mostra regia score 0 senza penalità.
7. **Tolleranza anno**: opera DB anno 2020, programmazione anno 2023 → match accettato (±3 soft).
8. **Tolleranza anno hard**: opera DB anno 2020, programmazione anno 2026 → match scartato (>5).
9. **Serie senza episodio**: prog serie con solo `numero_stagione`, no `numero_episodio` → opera matchata su titolo+anno, episode score = 0.
10. **Serie con episodio non matchato**: prog serie con `numero_episodio=99` su serie che ha solo 10 episodi → scartata correttamente (caso A del fix CONTINUE).
11. **Soglia adattiva**: prog solo con titolo (no anno, no regia, no episodio) → soglia 25, match accettato solo se similarity titolo > 0.5.
12. **CHECK constraint tipo**: insert con `tipo='speciale'` non fallisce.
