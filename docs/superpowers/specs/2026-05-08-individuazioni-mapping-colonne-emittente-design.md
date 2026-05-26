# Design: Mapping Colonne Emittente per Import Diretto

**Data:** 2026-05-08
**Stato:** In review
**Scope:** Eliminare normalizzazione manuale al template — admin carica file emittente originale
**Prerequisito:** Spec 2026-05-07 (pipeline adattiva) già implementato

---

## Contesto

Oggi l'admin riceve file di programmazione dall'emittente con intestazioni native (`series_name`, `season_number`, `release_year`, ecc.) e li copia manualmente in un template Excel con intestazioni canoniche (`titolo`, `numero_stagione`, `anno`, ecc.) prima di caricare in RASI.

Questa fase manuale è ripetitiva, soggetta a errori e blocca la scalabilità con nuovi emittenti.

**Obiettivo:** Permettere all'admin di caricare il file **originale** dell'emittente. Una configurazione di mapping (definita una volta per emittente) trasforma le colonne sorgente nei 24 campi canonici del template prima dell'insert in DB.

---

## Decisioni di scope

### Cosa è in scope (questa versione)

| Decisione | Scelta |
|---|---|
| Quando si configura il mapping | **Sia setup dedicato sulla scheda emittente, sia wizard al primo upload** |
| Tipo di trasformazione supportata | **Solo mapping 1:1** (colonna sorgente → campo template) |
| Persistenza del file campione | **No file** — solo lista colonne rilevate all'ultimo upload |
| Gestione cambio formato file emittente | **Validazione + warning + propone update config** |
| Auto-rilevamento mapping iniziale | **Zero** — admin mappa tutto manualmente la prima volta |

### Cosa NON è in scope (evolutive future)

- Trasformazioni cella (substring, regex, concat, lookup table)
- Estrazione strutturata da stringhe (es. `"S17E01"` → stagione+episodio)
- Mapping condizionale (se valore X → questo, altrimenti quello)
- Aggregazione/esplosione righe (es. `Season` con `total_ep` → N righe episodio)
- Auto-suggerimento fuzzy match tra nome colonna sorgente e campo template
- LLM-based mapping
- Archivio file campione per debugging storico

---

## Modello dati

### Migrazione DB

```sql
ALTER TABLE emittenti
ADD COLUMN mapping_import JSONB DEFAULT NULL;
```

Struttura della config (esempio per Pluto):

```json
{
  "version": 1,
  "colonne_rilevate": [
    "Channel",
    "Series Name",
    "Display Name",
    "Season Number",
    "Episode Number",
    "Release Year",
    "Reporting Period",
    "Views"
  ],
  "ultimo_upload": "2026-05-08T10:23:00Z",
  "mapping": {
    "Channel": "canale",
    "Series Name": "titolo",
    "Display Name": "titolo_episodio",
    "Season Number": "numero_stagione",
    "Episode Number": "numero_episodio",
    "Release Year": "anno",
    "Reporting Period": "sales_month",
    "Views": "views"
  }
}
```

**Campi:**
- `version`: per future evoluzioni dello schema config
- `colonne_rilevate`: lista colonne dell'ultimo file caricato, usata per validazione e UI
- `ultimo_upload`: timestamp utile per debug
- `mapping`: oggetto `{ colonna_sorgente: campo_template }` — campi template non mappati restano vuoti nel record `programmazioni`

**Campi template disponibili come destinazione del mapping:**
`canale, emittente, tipo, titolo, titolo_originale, numero_episodio, titolo_episodio, titolo_episodio_originale, numero_stagione, anno, production, regia, data_trasmissione, ora_inizio, ora_fine, durata_minuti, data_inizio, data_fine, retail_price, sales_month, track_price_local_currency, views, total_net_ad_revenue, total_revenue`

---

## Componente 1 — Service mapping

**Nuovo file**: `src/features/programmazioni/services/import-mapping.service.ts`

### API esposte

```typescript
export interface ImportMappingConfig {
  version: 1
  colonne_rilevate: string[]
  ultimo_upload: string | null
  mapping: Record<string, string>  // sorgente → template
}

/** Legge il mapping salvato per un emittente */
export async function getMappingByEmittente(emittenteId: string): Promise<{
  data: ImportMappingConfig | null
  error: any
}>

/** Salva o aggiorna il mapping di un emittente */
export async function saveMapping(
  emittenteId: string,
  config: ImportMappingConfig
): Promise<{ data: any; error: any }>

/** Estrae nomi colonne da un file (XLSX/CSV) e prime N righe per preview */
export async function detectColumns(file: File): Promise<{
  columns: string[]
  preview: Record<string, any>[]  // prime 5 righe
}>

/**
 * Applica un mapping alle righe sorgente.
 * Restituisce array di ProgrammazionePayload pronti per uploadProgrammazioni.
 */
export function applyMapping(
  rows: Record<string, any>[],
  mapping: Record<string, string>,
  context: { emittenteId: string; campagnaProgrammazioneId: string }
): ProgrammazionePayload[]

/**
 * Diff tra colonne attuali del file e colonne_rilevate salvate.
 * Usato per warning di cambio formato.
 */
export function diffColumns(actual: string[], saved: string[]): {
  added: string[]      // nuove colonne nel file
  removed: string[]    // colonne salvate non più presenti
  unchanged: string[]
}
```

### Comportamento `applyMapping`

- Per ogni riga sorgente, costruisce un `ProgrammazionePayload` iterando il mapping
- I due FK obbligatori (`campagna_programmazione_id`, `emittente_id`) vengono iniettati dal `context` — non sono mappabili dal file
- Campi template non mappati: `undefined` (omessi dal payload)
- **Coercion dei tipi**: riusa la funzione `coerce(key, value)` attualmente inline in `page.tsx`. Estrarla in un util condiviso `src/features/programmazioni/utils/coercion.ts` (move + import sia da `page.tsx` che da `import-mapping.service.ts`):
  - `numero_episodio, numero_stagione, anno, views, durata_minuti, sales_month` → `parseInt` (con fallback string per `sales_month` che ora accetta anche stringhe come "2024-03")
  - `retail_price, track_price_local_currency, total_net_ad_revenue, total_revenue` → `parseFloat` (con replace `,` → `.`)
  - `ora_inizio, ora_fine` → `validateTime`
  - `data_trasmissione, data_inizio, data_fine` → `validateDate`
- Il risultato passa comunque attraverso `normalizzaProgrammazione` (pipeline adattiva del primo spec) all'interno di `uploadProgrammazioni`. Le normalizzazioni (title case, mapping tipo, encoding episodio, fallback data, ecc.) restano centralizzate lì — `applyMapping` si occupa solo della rietichettatura colonne e coercion tipo.

---

## Componente 2 — UI Setup mapping (scheda emittente)

Nella pagina `/dashboard/programmazioni` tab **Emittenti**, scheda dettaglio emittente, aggiungere sezione **"Configurazione import"**.

### Stati possibili

**A) Nessun mapping salvato**
```
┌─ Configurazione import ──────────────────────────────┐
│  Nessuna configurazione presente.                    │
│  Il mapping verrà creato al primo upload, oppure:    │
│                                                       │
│  [ Configura ora ]   (apre dialog upload campione)   │
└───────────────────────────────────────────────────────┘
```

**B) Mapping salvato**
```
┌─ Configurazione import ──────────────────────────────┐
│  Ultimo upload: 2026-05-08 10:23                     │
│  Colonne mappate: 12 / 24 campi template             │
│                                                       │
│  [ Modifica mapping ]   [ Elimina configurazione ]   │
└───────────────────────────────────────────────────────┘
```

### Dialog "Configura mapping"

Tre step:

**Step 1 — Upload file campione**
- Drag/drop o picker XLSX/CSV
- Sistema legge le intestazioni della prima riga + parsea prime 5 righe per preview

**Step 2 — Mapping visuale**
- Tabella a due colonne:
  - Sinistra: lista colonne rilevate (es. "Series Name", "Episode Number", ecc.)
  - Destra: dropdown campo template (24 opzioni + "— ignora —")
- Riga preview sotto la mappatura per visualizzare il risultato sulla prima riga del file campione

```
Series Name       →  [titolo                ▼]   "The Bold Type"
Season Number     →  [numero_stagione       ▼]   1
Episode Number    →  [numero_episodio       ▼]   6
Release Year      →  [anno                  ▼]   2017
Reporting Period  →  [sales_month           ▼]   "2024-03"
Studio            →  [— ignora —            ▼]
Views             →  [views                 ▼]   12345
```

**Step 3 — Conferma**
- Mostra summary mapping
- Bottone "Salva configurazione"
- Salva in `emittenti.mapping_import`

---

## Componente 3 — Upload flow modificato

Modifica a `src/app/dashboard/programmazioni/page.tsx` nel flusso `handleFileUpload` + `handleUploadDatabase`.

### Logica decisionale all'upload

```
1. Admin seleziona file per una campagna programmazione
2. Sistema legge intestazioni del file
3. Carica config emittente (mapping_import)
4. Casi:
   - Nessuna config → mostra wizard mapping inline (Step 1-3 sopra),
     dopo il salva procede automaticamente all'upload
   - Config esistente + colonne combaciano → upload diretto
   - Config esistente + colonne diverse → dialog warning:
     "Il formato del file è cambiato. Colonne aggiunte: [X], rimosse: [Y].
      Vuoi aggiornare la mappatura?"
     [ Aggiorna mapping ] [ Procedi con mapping corrente ] [ Annulla ]
```

### Validazione minima

Anche dopo mapping, il payload deve avere `titolo` mappato e valorizzato — altrimenti riga scartata con warning.

---

## Componente 4 — Retrocompatibilità file template

Gli admin che continuano a usare il template normalizzato manualmente non devono essere bloccati.

**Regola:** Se l'emittente non ha `mapping_import` configurato E il file caricato contiene tutte le intestazioni del template canonico (cioè `titolo`, `emittente`, ecc. tutte presenti), il sistema usa direttamente il flusso attuale senza forzare il wizard.

Implementazione:
```typescript
const isTemplateFile = (columns: string[]) => {
  const required = ['titolo', 'emittente']
  const normalized = columns.map(c => c.toLowerCase().trim())
  return required.every(r => normalized.includes(r))
}

// All'upload:
if (!emittente.mapping_import && isTemplateFile(columns)) {
  // Path legacy: tratta come file template
} else if (!emittente.mapping_import) {
  // Path nuovo: mostra wizard
} else {
  // Path nuovo: applica mapping salvato
}
```

---

## Componente 5 — Validazione cambio formato

Dopo ogni upload riuscito, aggiornare `mapping_import.colonne_rilevate` e `mapping_import.ultimo_upload` per riflettere lo stato corrente.

All'upload successivo, `diffColumns()` confronta:
- `added`: colonne nuove → l'admin potrebbe voler mappare un nuovo campo
- `removed`: colonne mappate ma non più presenti → mapping rotto

Strategia per `removed`:
- Se rimuovono campi non mappati → silent update di `colonne_rilevate`
- Se rimuovono campi mappati → warning bloccante con scelta utente

---

## File da modificare/creare

| File | Tipo |
|------|------|
| **migration SQL** (apply_migration tramite MCP) — aggiungere `emittenti.mapping_import JSONB` | NUOVO |
| `src/features/programmazioni/services/import-mapping.service.ts` | NUOVO |
| `src/features/programmazioni/services/programmazioni.service.ts` | Estendere `ProgrammazionePayload` se servono nuovi campi (non previsto) |
| `src/shared/lib/supabase.ts` | Aggiungere `mapping_import` al type `emittenti` |
| `src/app/dashboard/programmazioni/page.tsx` | Logica decisionale upload + dialog warning cambio formato + rimuovere coercion inline |
| `src/features/programmazioni/utils/coercion.ts` *(NUOVO)* | Funzioni `coerce`, `validateTime`, `validateDate` estratte da `page.tsx` per riuso |
| `src/app/dashboard/programmazioni/components/MappingWizard.tsx` *(NUOVO)* | Dialog wizard 3 step (upload campione → mappatura → conferma) |
| `src/app/dashboard/programmazioni/components/EmittenteMappingSection.tsx` *(NUOVO)* | Sezione "Configurazione import" nella scheda emittente |

---

## Verifica post-implementazione

1. **Emittente nuovo, no config**: upload file Pluto originale → wizard si apre → admin mappa → upload completa → `mapping_import` salvato.
2. **Emittente con config, file stesso formato**: upload completa senza wizard.
3. **Emittente con config, formato cambiato (colonna mappata rimossa)**: warning bloccante con scelta utente.
4. **Emittente con config, formato cambiato (colonna nuova non mappata)**: upload procede, ma `colonne_rilevate` aggiornata e l'admin può vedere la nuova colonna in "Modifica mapping".
5. **File template legacy + emittente senza config**: upload procede via path legacy senza forzare wizard.
6. **Pipeline adattiva ancora attiva**: il payload mappato passa attraverso `normalizzaProgrammazione` (title case, encoding episodio, ecc.).
7. **Campi non mappati**: insert in DB ha `NULL` sui campi template non coperti dal mapping.
8. **Riga senza titolo**: scartata con warning, non insert.

---

## Considerazioni

### Performance

- Detect columns: solo prima riga + 5 di preview, trascurabile
- Apply mapping: O(righe × campi_mappati), <100ms su 100k righe
- Storage: la config è piccola (~1KB per emittente)

### Privacy/sicurezza

- File campione **non viene persistito** (solo nomi colonne)
- Mapping non contiene dati sensibili
- RLS su `emittenti` resta invariata

### Evoluzioni future (fuori scope ora)

| Feature | Quando |
|---|---|
| Trasformazioni cella (substring/regex/concat) | Se serve per altri emittenti dopo i primi 3 |
| Mapping condizionale | Se rilevati pattern multi-tipo su stessa colonna |
| Auto-suggest fuzzy match | Quando si superano 10 emittenti e l'onboarding rallenta |
| Aggregazione/esplosione righe | Solo se Rakuten Season e Paramount mensile rilevati come problematici |
| Import diretto via API (no file) | Se emittente espone API |

Ogni evoluzione richiederà bump di `mapping_import.version` con script di migrazione config.
