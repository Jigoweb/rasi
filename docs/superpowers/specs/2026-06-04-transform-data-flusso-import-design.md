# Transform colonne nel flusso import programmazioni (B)

**Data:** 2026-06-04
**Stato:** Design approvato (in attesa review spec)

## Problema

L'upload del catalogo Netflix (`NETFLIX_RASI_CATALOG_USAGE_2025.csv`, 70.766 righe) fallisce con:

```
Errore nelle righe 2-501: date/time field value out of range: "2025-31-12"
```

La colonna `end_date` usa il formato US `MM/DD/YYYY` (`12/31/2025`, identico su tutte le righe — snapshot di fine catalogo). La pipeline di upload assume il formato europeo `DD/MM/YYYY`:

- `page.tsx` → `applyMapping(rows, mapping, ctx, rules)`
- `applyMapping` → `coerce(field, rawValue)` (salta i transform)
- `coerce('data_trasmissione')` → `validateDate` (solo `DD/MM/YYYY`)

`12/31/2025` viene letto come `day=12, month=31, year=2025` → `2025-31-12` → Postgres rifiuta (mese 31).

## Causa radice (oltre il singolo errore)

Il sistema di transform **esiste già completo** in `src/features/programmazioni/utils/transforms.ts` (18 transform: date, durate, sentinelle null, mojibake, ecc.) con `applyTransform(name, value)`. Tuttavia **non è agganciato al path di upload live**:

- `applyMapping` (path usato dalla pagina) chiama `coerce` direttamente, senza transform.
- `applyMappingWithTransforms` e lo schema `ParserConfigV2` (transform per-colonna) esistono ma sono usati **solo nei test** — morti in produzione.

Quindi tutti i transform (non solo i date) sono irraggiungibili dal flusso mapping live degli emittenti. La data US è il primo sintomo di questo gap.

## Obiettivo

Collegare il motore transform esistente al flusso di upload live ed esporlo nel MappingWizard, in modo deterministico e versatile (tutti i formati noti, non solo date). Retrocompatibile al 100%.

## Limite noto (decisione esplicita)

Nessun sistema può auto-indovinare una data **intrinsecamente ambigua** (`03/04/2025` = 4 marzo US oppure 3 aprile EU) dal solo valore. La versatilità reale richiede **dichiarazione esplicita** del formato per colonna/emittente. Heuristic (swap automatico quando un componente >12) resta solo come suggerimento UI, mai come conversione silenziosa.

## Design

### 1. Modello dati (persistenza)

Estendere `ImportMappingConfig` (v1) in `import-mapping.service.ts`:

```ts
export interface ImportMappingConfig {
  version: 1
  colonne_rilevate: string[]
  ultimo_upload: string | null
  mapping: Record<string, string>
  rules?: Record<string, FieldRule>
  transforms?: Record<string, TransformName>  // chiave = nome colonna sorgente
}
```

- Campo opzionale → assenza = comportamento attuale invariato (retrocompat totale).
- Persistito nel mapping dell'emittente: il formato dichiarato viene ricordato ai prossimi upload.

### 2. Wiring nel path live (`applyMapping`)

In `applyMapping`, per ogni target field:

1. Risolvere `rawValue` **e** la colonna sorgente vincente (`winningSourceCol`).
2. `transformed = applyTransform(transforms?.[winningSourceCol] ?? null, rawValue)`
3. `coerced = coerce(field, transformed)`

`resolveFieldValue` va modificata per restituire anche quale source ha vinto (necessario per le rule coalesce multi-colonna). Per il mapping 1:1 la source è già nota.

I transform data emettono ISO `YYYY-MM-DD`; `coerce → validateDate` riconosce l'ISO e lo lascia passare (ramo già esistente). Effetto collaterale positivo: sblocca anche durate/sentinelle/mojibake nel flusso live.

`buildLegacyPayload` (path template canonico) resta invariato: non usa mapping emittente, quindi non porta transform.

### 3. Nuovi transform data (`transforms.ts`)

Aggiungere come pure function, stesso pattern degli esistenti, output ISO `YYYY-MM-DD`:

- `eu_date_to_iso` — `DD/MM/YYYY`, `DD-MM-YYYY`
- `iso_date` — valida/normalizza `YYYY-MM-DD`, `YYYY/MM/DD` (passthrough difensivo)
- `eu_date_short` — `DD/MM/YY` (anno ≤50 → 20xx, >50 → 19xx)
- `us_date_short` — `MM/DD/YY` (stessa logica anno)
- `excel_serial_to_iso` — seriale Excel (es. `45657`), base epoch `1899-12-30`, aritmetica UTC

Esistenti riutilizzati: `us_date_to_iso` (`MM/DD/YYYY`), `yyyymmdd_int_to_iso` (`20251231`).

Ogni nuovo transform con unit test in `transforms.test.ts` (input valido, formato errato → null, edge: anno 2 cifre boundary 50/51, excel bug 1900).

Aggiornare il tipo union `TransformName` con i nuovi nomi.

### 4. UI — selettore nel MappingWizard

Accanto a ogni colonna mappata, dropdown **"Trasformazione: [Nessuna (auto) ▾]"**:

- Opzioni filtrate per pertinenza al target: target data (`data_trasmissione`, `data_inizio`, `data_fine`) → solo transform data; target `durata_minuti` → transform durata; ecc.
- Default `Nessuna` = nessun transform (comportamento invariato).
- La selezione popola `transforms[colonnaSorgente]` nel config salvato.

Collocazione esatta (MappingWizard vs MappingRulesEditor) da definire nel piano in base alla struttura UI corrente; il selettore è logicamente per-colonna-sorgente.

### 5. Auto-suggest (incluso)

Quando una colonna è mappata su un campo data, il wizard ispeziona i valori campione rilevati:

- Se trova un componente **>12** in posizione inequivocabile (es. `31` in `12/31/2025` → secondo campo >12 ⇒ `MM/DD`; `31/12/2025` → primo campo >12 ⇒ `DD/MM`), **pre-suggerisce** il transform corrispondente con un hint visivo.
- Date ambigue (entrambi i campi ≤12) → nessun suggerimento; scelta manuale.
- Il suggerimento è pre-selezione modificabile, mai applicazione automatica forzata.

### 6. Nessuna heuristic silenziosa in `validateDate`

`validateDate` **non** viene modificata per fare swap automatico: manterrebbe il rischio di corruzione silenziosa su date ambigue. Principio: **esplicito > indovinare**. Colonne non mappate con formato anomalo continuano a fallire in modo rumoroso (comportamento corretto e attuale).

## Componenti e confini

| Unità | Responsabilità | Dipendenze |
|-------|----------------|------------|
| `transforms.ts` | Funzioni pure formato→valore; nuovi transform data | nessuna |
| `import-mapping.service.ts` | `ImportMappingConfig.transforms`; `applyMapping` applica transform; `resolveFieldValue` ritorna source vincente | `transforms.ts`, `coercion.ts` |
| MappingWizard / RulesEditor | Selettore transform per colonna + auto-suggest | `transforms.ts` (lista+pertinenza), service |
| Persistenza mapping emittente | Salva/carica `transforms` nel config | service |

## Testing

- **Unit `transforms.test.ts`**: ogni nuovo transform (valido, invalido→null, edge year/excel).
- **Unit `import-mapping.service.test.ts`**: `applyMapping` con `transforms` applica il transform prima di coerce; rule coalesce multi-source applica il transform della source vincente; assenza transforms = comportamento invariato.
- **Caso Netflix end-to-end**: riga con `end_date=12/31/2025` + `transforms={end_date: 'us_date_to_iso'}` → payload `data_trasmissione='2025-12-31'`.
- **Retrocompat**: config v1 senza `transforms` produce output identico a prima.

## Fuori scope (YAGNI)

- Migrazione a `ParserConfigV2` (encoding/delimitatori/fixed-width/xls): non necessaria per risolvere il problema; valutabile separatamente.
- Auto-detect di formati intrinsecamente ambigui: impossibile per definizione.
- Conversione automatica silenziosa in `validateDate`.

## Caso d'uso immediato

File Netflix: `end_date` unico `12/31/2025` (non ambiguo, `31>12`). Auto-suggest propone `us_date_to_iso`; l'utente conferma; tutte le 70.766 righe → `2025-12-31`. Upload completa.
