# Transform colonne nel flusso import — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agganciare il motore transform esistente al flusso di upload live e esporlo nel MappingWizard, così gli emittenti con formati data non-EU (es. Netflix `MM/DD/YYYY`) importano correttamente.

**Architecture:** Si estende `ImportMappingConfig` v1 con una mappa `transforms` (colonna sorgente → nome transform), persistita nel JSON `emittenti.mapping_import` (nessuna migrazione DB). `applyMapping` applica `applyTransform` prima di `coerce`. Si aggiungono nuovi transform data puri in `transforms.ts`. Il wizard espone un selettore per-colonna filtrato per pertinenza al campo target, con auto-suggest sui campi data.

**Tech Stack:** Next.js / React, TypeScript, Jest (test runner del repo, globals `describe`/`it`/`expect` senza import), Supabase.

**Spec di riferimento:** `docs/superpowers/specs/2026-06-04-transform-data-flusso-import-design.md`

---

## File Structure

| File | Responsabilità | Azione |
|------|----------------|--------|
| `src/features/programmazioni/utils/transforms.ts` | Funzioni pure formato→valore; nuovi transform data; tabella label + pertinenza per UI | Modifica |
| `src/features/programmazioni/utils/transforms.test.ts` | Unit test nuovi transform | Modifica |
| `src/features/programmazioni/services/import-mapping.service.ts` | `ImportMappingConfig.transforms`; `resolveFieldValueWithSource`; `applyMapping` applica transform | Modifica |
| `src/features/programmazioni/services/import-mapping.service.test.ts` | Unit test wiring transform in applyMapping | Modifica |
| `src/app/dashboard/programmazioni/page.tsx` | Passa `transforms` ad `applyMapping` | Modifica |
| `src/app/dashboard/programmazioni/components/MappingWizard.tsx` | Stato `transforms`, colonna selettore, auto-suggest, persistenza | Modifica |

**Nota sul test runner:** verificare il comando reale prima di iniziare (`package.json` → `scripts.test`). I comandi sotto assumono `npx jest <file>`. Se il repo usa `npm test -- <file>` o jest, adattare in modo coerente per tutte le task.

---

### Task 0: Verifica baseline

**Files:** nessuno (solo lettura)

- [ ] **Step 1: Identifica il comando di test**

Run: `cat package.json | grep -A3 '"scripts"' | grep -i test`
Expected: `"test": "jest"`. Usa `npx jest <file>` in tutte le task seguenti.

- [ ] **Step 2: Esegui i test esistenti dei file toccati per avere il verde di partenza**

Run: `npx jest src/features/programmazioni/utils/transforms.test.ts src/features/programmazioni/services/import-mapping.service.test.ts`
Expected: PASS (baseline verde). Se rosso, fermati e segnala prima di procedere.

---

### Task 1: Nuovi transform data in `transforms.ts`

**Files:**
- Modify: `src/features/programmazioni/utils/transforms.ts` (union `TransformName` ~12-30; oggetto `TRANSFORMS` ~99)
- Test: `src/features/programmazioni/utils/transforms.test.ts`

- [ ] **Step 1: Scrivi i test che falliscono**

Aggiungi in fondo a `transforms.test.ts`. `describe`/`it`/`expect` sono globali Jest (nessun import). `applyTransform` è già importato in cima al file (`import { applyTransform, TRANSFORMS } from './transforms'`) — non ri-importarlo.

```ts
describe('date transforms', () => {
  it('eu_date_to_iso: DD/MM/YYYY → YYYY-MM-DD', () => {
    expect(applyTransform('eu_date_to_iso', '31/12/2025')).toBe('2025-12-31')
    expect(applyTransform('eu_date_to_iso', '5/3/2025')).toBe('2025-03-05')
    expect(applyTransform('eu_date_to_iso', '31-12-2025')).toBe('2025-12-31')
    expect(applyTransform('eu_date_to_iso', '12/31/2025')).toBe('2025-31-12') // input EU letterale: nessuna validazione semantica qui
    expect(applyTransform('eu_date_to_iso', 'boh')).toBe(null)
    expect(applyTransform('eu_date_to_iso', '')).toBe(null)
  })

  it('iso_date: passthrough/normalizzazione', () => {
    expect(applyTransform('iso_date', '2025-12-31')).toBe('2025-12-31')
    expect(applyTransform('iso_date', '2025/12/31')).toBe('2025-12-31')
    expect(applyTransform('iso_date', '2025-1-3')).toBe(null) // richiede 2 cifre
    expect(applyTransform('iso_date', 'x')).toBe(null)
  })

  it('eu_date_short: anno 2 cifre con cutoff 50', () => {
    expect(applyTransform('eu_date_short', '31/12/25')).toBe('2025-12-31')
    expect(applyTransform('eu_date_short', '01/06/49')).toBe('2049-06-01')
    expect(applyTransform('eu_date_short', '01/06/51')).toBe('1951-06-01')
    expect(applyTransform('eu_date_short', 'no')).toBe(null)
  })

  it('us_date_short: MM/DD/YY con cutoff 50', () => {
    expect(applyTransform('us_date_short', '12/31/25')).toBe('2025-12-31')
    expect(applyTransform('us_date_short', '06/01/51')).toBe('1951-06-01')
    expect(applyTransform('us_date_short', 'no')).toBe(null)
  })

  it('excel_serial_to_iso: seriale Excel (base 1899-12-30)', () => {
    expect(applyTransform('excel_serial_to_iso', 44197)).toBe('2021-01-01')
    expect(applyTransform('excel_serial_to_iso', '44197')).toBe('2021-01-01')
    expect(applyTransform('excel_serial_to_iso', 0)).toBe(null)
    expect(applyTransform('excel_serial_to_iso', 'x')).toBe(null)
  })
})
```

- [ ] **Step 2: Esegui i test per verificarne il fallimento**

Run: `npx jest src/features/programmazioni/utils/transforms.test.ts`
Expected: FAIL — i nuovi nomi non esistono nella union `TransformName` / in `TRANSFORMS` (errore TS o `applyTransform` ritorna il valore non trasformato).

- [ ] **Step 3: Aggiungi i nomi alla union `TransformName`**

In `transforms.ts`, nella union (attorno alla riga 25-30), aggiungi le voci:

```ts
  | 'us_date_to_iso'
  | 'yyyymmdd_int_to_iso'
  | 'eu_date_to_iso'
  | 'iso_date'
  | 'eu_date_short'
  | 'us_date_short'
  | 'excel_serial_to_iso'
```

(lascia invariate le voci già presenti: `mojibake_repair`, `nbsp_to_space`, `null_if_dashes`, `year_range_first`, ecc.)

- [ ] **Step 4: Implementa i transform nell'oggetto `TRANSFORMS`**

Aggiungi dentro l'oggetto `TRANSFORMS` (vicino a `us_date_to_iso`, riga ~211):

```ts
  eu_date_to_iso: (value) => {
    if (value === null || value === undefined) return null
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    if (trimmed === '') return null
    const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
    if (!match) return null
    const dd = match[1].padStart(2, '0')
    const mm = match[2].padStart(2, '0')
    const yyyy = match[3]
    return `${yyyy}-${mm}-${dd}`
  },

  iso_date: (value) => {
    if (value === null || value === undefined) return null
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    if (trimmed === '') return null
    const match = trimmed.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/)
    if (!match) return null
    return `${match[1]}-${match[2]}-${match[3]}`
  },

  eu_date_short: (value) => {
    if (value === null || value === undefined) return null
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    if (trimmed === '') return null
    const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/)
    if (!match) return null
    const dd = match[1].padStart(2, '0')
    const mm = match[2].padStart(2, '0')
    const yy = parseInt(match[3], 10)
    const yyyy = yy > 50 ? `19${match[3]}` : `20${match[3]}`
    return `${yyyy}-${mm}-${dd}`
  },

  us_date_short: (value) => {
    if (value === null || value === undefined) return null
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    if (trimmed === '') return null
    const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/)
    if (!match) return null
    const mm = match[1].padStart(2, '0')
    const dd = match[2].padStart(2, '0')
    const yy = parseInt(match[3], 10)
    const yyyy = yy > 50 ? `19${match[3]}` : `20${match[3]}`
    return `${yyyy}-${mm}-${dd}`
  },

  excel_serial_to_iso: (value) => {
    const n = parseNumber(value)
    if (n === null) return null
    const days = Math.trunc(n)
    if (days < 1) return null
    // Base 1899-12-30 compensa il bug dell'anno bisestile 1900 di Excel.
    const ms = Date.UTC(1899, 11, 30) + days * 86400000
    const d = new Date(ms)
    if (Number.isNaN(d.getTime())) return null
    const yyyy = d.getUTCFullYear()
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(d.getUTCDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  },
```

Nota: `parseNumber` è già definita e usata in questo file (es. `seconds_to_minutes`). Non ridefinirla.

- [ ] **Step 5: Esegui i test per verificarne il passaggio**

Run: `npx jest src/features/programmazioni/utils/transforms.test.ts`
Expected: PASS (tutti, inclusi i preesistenti).

- [ ] **Step 6: Commit**

```bash
git add src/features/programmazioni/utils/transforms.ts src/features/programmazioni/utils/transforms.test.ts
git commit -m "feat(import): nuovi transform data (eu/iso/short/excel-serial)"
```

---

### Task 2: Metadati UI — label e pertinenza transform per campo

**Files:**
- Modify: `src/features/programmazioni/utils/transforms.ts`
- Test: `src/features/programmazioni/utils/transforms.test.ts`

Espone, per il wizard, etichette leggibili e l'elenco di transform pertinenti a un campo template.

- [ ] **Step 1: Scrivi i test che falliscono**

Aggiungi a `transforms.test.ts`:

```ts
import { TRANSFORM_LABELS, transformsForField } from './transforms'

describe('transform metadata', () => {
  it('TRANSFORM_LABELS copre ogni TransformName', () => {
    // ogni transform implementato ha una label
    expect(TRANSFORM_LABELS['us_date_to_iso']).toBeTruthy()
    expect(TRANSFORM_LABELS['excel_serial_to_iso']).toBeTruthy()
    expect(TRANSFORM_LABELS['hhmmss_to_minutes']).toBeTruthy()
  })

  it('transformsForField: campi data → transform data', () => {
    const t = transformsForField('data_trasmissione')
    expect(t).toContain('us_date_to_iso')
    expect(t).toContain('eu_date_to_iso')
    expect(t).toContain('excel_serial_to_iso')
    expect(t).not.toContain('hhmmss_to_minutes')
  })

  it('transformsForField: durata → transform durata', () => {
    const t = transformsForField('durata_minuti')
    expect(t).toContain('hhmmss_to_minutes')
    expect(t).not.toContain('us_date_to_iso')
  })

  it('transformsForField: campo senza transform dedicati → solo generici', () => {
    const t = transformsForField('titolo')
    expect(t).toContain('null_if_NULL_str')
    expect(t).not.toContain('us_date_to_iso')
  })
})
```

- [ ] **Step 2: Esegui i test per verificarne il fallimento**

Run: `npx jest src/features/programmazioni/utils/transforms.test.ts`
Expected: FAIL — `TRANSFORM_LABELS` / `transformsForField` non esistono.

- [ ] **Step 3: Implementa label e pertinenza**

Aggiungi in fondo a `transforms.ts` (dopo `applyTransform`):

```ts
/** Etichette leggibili per la UI (selettore transform nel wizard). */
export const TRANSFORM_LABELS: Record<TransformName, string> = {
  hhmmss_to_minutes: 'Durata HH:MM:SS → minuti',
  seconds_to_minutes: 'Durata secondi → minuti',
  fractional_hours_to_minutes: 'Durata ore decimali → minuti',
  fractional_day_to_minutes: 'Durata frazione di giorno → minuti',
  milliseconds_to_minutes: 'Durata millisecondi → minuti',
  iso8601_duration_to_minutes: 'Durata ISO8601 (PT#H#M) → minuti',
  decimal_minutes_to_int: 'Durata minuti decimali → interi',
  rti_apostrophe_minutes: "Durata con apostrofo (12') → minuti",
  null_if_NA: 'Vuoto se "N/A"',
  null_if_ND: 'Vuoto se "N.D."',
  null_if_NULL_str: 'Vuoto se "null"',
  netflix_episode_nbr: 'Numero episodio Netflix (-- → vuoto)',
  us_date_to_iso: 'Data US MM/DD/YYYY → ISO',
  yyyymmdd_int_to_iso: 'Data intero YYYYMMDD → ISO',
  eu_date_to_iso: 'Data EU DD/MM/YYYY → ISO',
  iso_date: 'Data ISO YYYY-MM-DD (normalizza)',
  eu_date_short: 'Data EU DD/MM/YY (anno 2 cifre) → ISO',
  us_date_short: 'Data US MM/DD/YY (anno 2 cifre) → ISO',
  excel_serial_to_iso: 'Data seriale Excel → ISO',
  mojibake_repair: 'Ripara mojibake (encoding)',
  nbsp_to_space: 'Spazio unicode → spazio normale',
  null_if_dashes: 'Vuoto se trattini',
  year_range_first: 'Range anni → primo anno',
}

const DATE_TRANSFORMS: TransformName[] = [
  'us_date_to_iso', 'eu_date_to_iso', 'iso_date',
  'us_date_short', 'eu_date_short', 'yyyymmdd_int_to_iso', 'excel_serial_to_iso',
]

const DURATION_TRANSFORMS: TransformName[] = [
  'hhmmss_to_minutes', 'seconds_to_minutes', 'fractional_hours_to_minutes',
  'fractional_day_to_minutes', 'milliseconds_to_minutes', 'iso8601_duration_to_minutes',
  'decimal_minutes_to_int', 'rti_apostrophe_minutes',
]

const GENERIC_TRANSFORMS: TransformName[] = [
  'null_if_NA', 'null_if_ND', 'null_if_NULL_str', 'null_if_dashes',
  'mojibake_repair', 'nbsp_to_space',
]

/** Transform pertinenti a un campo template, per il filtro del selettore UI. */
export function transformsForField(field: string): TransformName[] {
  if (field === 'data_trasmissione' || field === 'data_inizio' || field === 'data_fine') {
    return [...DATE_TRANSFORMS, ...GENERIC_TRANSFORMS]
  }
  if (field === 'durata_minuti') {
    return [...DURATION_TRANSFORMS, ...GENERIC_TRANSFORMS]
  }
  if (field === 'numero_episodio') {
    return ['netflix_episode_nbr', ...GENERIC_TRANSFORMS]
  }
  if (field === 'anno') {
    return ['year_range_first', ...GENERIC_TRANSFORMS]
  }
  return GENERIC_TRANSFORMS
}
```

- [ ] **Step 4: Esegui i test per verificarne il passaggio**

Run: `npx jest src/features/programmazioni/utils/transforms.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/programmazioni/utils/transforms.ts src/features/programmazioni/utils/transforms.test.ts
git commit -m "feat(import): metadati transform (label + pertinenza per campo)"
```

---

### Task 3: Wiring transform in `applyMapping`

**Files:**
- Modify: `src/features/programmazioni/services/import-mapping.service.ts` (`FieldRule`/`ImportMappingConfig` ~22-37; `resolveFieldValue` ~392; `applyMapping` ~249-314)
- Test: `src/features/programmazioni/services/import-mapping.service.test.ts`

- [ ] **Step 1: Scrivi i test che falliscono**

Aggiungi a `import-mapping.service.test.ts` (riusa lo stile dei test esistenti; `ctx` è già definito nel file — se non lo è nello scope del nuovo `describe`, ridichiaralo: `const ctx = { campagnaProgrammazioneId: 'c1', emittenteId: 'e1' }`):

```ts
describe('applyMapping con transforms', () => {
  const ctx = { campagnaProgrammazioneId: 'c1', emittenteId: 'e1' }

  it('applica il transform della colonna sorgente prima di coerce (data US)', () => {
    const rows = [{ end_date: '12/31/2025', show_name: 'Sr.' }]
    const mapping = { end_date: 'data_trasmissione', show_name: 'titolo' }
    const transforms = { end_date: 'us_date_to_iso' as const }
    const out = applyMapping(rows, mapping, ctx, undefined, transforms)
    expect(out[0].data_trasmissione).toBe('2025-12-31')
  })

  it('senza transforms il comportamento resta invariato', () => {
    const rows = [{ Data: '31/12/2025', Titolo: 'X' }]
    const mapping = { Data: 'data_trasmissione', Titolo: 'titolo' }
    const out = applyMapping(rows, mapping, ctx)
    expect(out[0].data_trasmissione).toBe('2025-12-31') // validateDate EU come prima
  })

  it('rule coalesce: applica il transform della colonna sorgente vincente', () => {
    const rows = [{ date_a: '', date_b: '12/31/2025', Titolo: 'X' }]
    const mapping = { Titolo: 'titolo' }
    const rules = { data_trasmissione: { sources: ['date_a', 'date_b'] } }
    const transforms = { date_b: 'us_date_to_iso' as const }
    const out = applyMapping(rows, mapping, ctx, rules, transforms)
    expect(out[0].data_trasmissione).toBe('2025-12-31')
  })
})
```

- [ ] **Step 2: Esegui i test per verificarne il fallimento**

Run: `npx jest src/features/programmazioni/services/import-mapping.service.test.ts`
Expected: FAIL — `applyMapping` non accetta il 5º argomento `transforms` (errore TS) e/o `data_trasmissione` è `2025-31-12`.

- [ ] **Step 3: Estendi `ImportMappingConfig` e importa il tipo**

In `import-mapping.service.ts`, l'import di `TransformName` è già presente (riga 11). Aggiungi il campo a `ImportMappingConfig` (attorno alla riga 29-37):

```ts
export interface ImportMappingConfig {
  version: 1
  colonne_rilevate: string[]
  ultimo_upload: string | null
  mapping: Record<string, string>
  rules?: Record<string, FieldRule>
  /** Colonna sorgente → transform applicato prima di coerce. */
  transforms?: Record<string, TransformName>
}
```

- [ ] **Step 4: Aggiungi `resolveFieldValueWithSource`**

Subito sopra (o sotto) `resolveFieldValue` (riga ~392), aggiungi una variante che riporta anche la colonna vincente, e riscrivi `resolveFieldValue` come wrapper per non rompere i chiamanti esistenti:

```ts
/**
 * Come resolveFieldValue, ma riporta anche quale colonna sorgente ha vinto
 * (serve per applicare il transform corretto sul valore coalesce).
 */
export function resolveFieldValueWithSource(
  row: Record<string, any>,
  rule: FieldRule,
): { value: any; source: string | null } {
  if (rule.onlyIfPresent !== undefined && isBlankValue(getRowValue(row, rule.onlyIfPresent))) {
    return { value: undefined, source: null }
  }
  for (const src of rule.sources) {
    const v = getRowValue(row, src)
    if (!isBlankValue(v)) return { value: v, source: src }
  }
  return { value: undefined, source: null }
}

export function resolveFieldValue(row: Record<string, any>, rule: FieldRule): any {
  return resolveFieldValueWithSource(row, rule).value
}
```

Rimuovi la vecchia implementazione di `resolveFieldValue` (quella con il `for` loop inline) per evitare duplicati.

- [ ] **Step 5: Aggiungi il parametro `transforms` e applicalo in `applyMapping`**

Importa `applyTransform` se non già importato (riga 11 importa già `applyTransform` e `TransformName`).

Modifica la firma e il corpo di `applyMapping` (riga ~249-285):

```ts
export function applyMapping(
  rows: Record<string, any>[],
  mapping: Record<string, string>,
  context: ApplyMappingContext,
  rules?: Record<string, FieldRule>,
  transforms?: Record<string, TransformName>,
): ProgrammazionePayload[] {
  const reverseMap: Record<string, string> = {}
  for (const [source, target] of Object.entries(mapping)) {
    if (target && TEMPLATE_FIELDS_SET.has(target)) {
      reverseMap[target] = source
    }
  }

  const result: ProgrammazionePayload[] = []
  for (const row of rows) {
    const payload: any = {
      campagna_programmazione_id: context.campagnaProgrammazioneId,
      emittente_id: context.emittenteId,
    }

    for (const field of TEMPLATE_FIELDS) {
      const rule = rules?.[field]
      let rawValue: any
      let sourceCol: string | null
      if (rule) {
        const resolved = resolveFieldValueWithSource(row, rule)
        rawValue = resolved.value
        sourceCol = resolved.source
      } else {
        sourceCol = reverseMap[field] ?? null
        if (!sourceCol) continue
        rawValue = getRowValue(row, sourceCol)
      }
      const transformName = sourceCol ? (transforms?.[sourceCol] ?? null) : null
      const transformed = applyTransform(transformName, rawValue)
      const coerced = coerce(field, transformed)
      if (coerced !== undefined) {
        payload[field] = coerced
      }
    }

    // ... (lascia INVARIATO il resto: normalizzazione titoli, guard titolo, push)
```

Mantieni inalterato tutto il blocco successivo (normalizzazione `titolo`/`titolo_episodio`, `if (!payload.titolo) continue`, default `tipo`, `result.push`).

- [ ] **Step 6: Esegui i test per verificarne il passaggio**

Run: `npx jest src/features/programmazioni/services/import-mapping.service.test.ts`
Expected: PASS (inclusi i test preesistenti che chiamano `applyMapping`/`resolveFieldValue` senza il nuovo argomento).

- [ ] **Step 7: Commit**

```bash
git add src/features/programmazioni/services/import-mapping.service.ts src/features/programmazioni/services/import-mapping.service.test.ts
git commit -m "feat(import): applyMapping applica i transform per colonna prima di coerce"
```

---

### Task 4: Passa i transform dal flusso di upload (`page.tsx`)

**Files:**
- Modify: `src/app/dashboard/programmazioni/page.tsx:418-423` (funzione `buildAll`)

- [ ] **Step 1: Aggiorna la chiamata `applyMapping`**

In `handleUploadDatabase`, dentro `buildAll`, passa i transform della config:

```ts
      const buildAll = (rows: any[]): ProgrammazionePayload[] => {
        if (uploadDecision.kind === 'apply_existing') {
          return applyMapping(
            rows,
            uploadDecision.mapping.mapping,
            ctx,
            uploadDecision.mapping.rules,
            uploadDecision.mapping.transforms,
          )
        }
        return buildLegacyPayload(rows, ctx)
      }
```

- [ ] **Step 2: Verifica compilazione typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: PASS (nessun errore di tipo su `transforms`). Se il repo non ha questo target tsconfig, usa il comando typecheck del `package.json`.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/programmazioni/page.tsx
git commit -m "feat(import): l'upload passa i transform configurati ad applyMapping"
```

---

### Task 5: Selettore transform nel MappingWizard (step 2)

**Files:**
- Modify: `src/app/dashboard/programmazioni/components/MappingWizard.tsx`

- [ ] **Step 1: Aggiungi stato e import**

In cima al componente, aggiungi import dei metadati e del tipo:

```ts
import { transformsForField, TRANSFORM_LABELS, type TransformName } from '@/features/programmazioni/utils/transforms'
```

Aggiungi lo stato accanto a `rules` (riga ~50):

```ts
  const [transforms, setTransforms] = useState<Record<string, TransformName>>({})
```

Nei due punti di reset/prefill in cui si imposta `setRules(initialConfig?.rules ?? {})` (riga ~62 nell'effect di reset e riga ~92 in `handleFile`), aggiungi accanto:

```ts
    setTransforms(initialConfig?.transforms ?? {})
```

(nel ramo `else` di `handleFile`, riga ~94-96, imposta `setTransforms({})`).

- [ ] **Step 2: Costante "nessun transform"**

Accanto a `const IGNORE = '__ignore__'` (riga 37) aggiungi:

```ts
const NO_TRANSFORM = '__none__'
```

- [ ] **Step 3: Handler di selezione**

Accanto a `handleSelect` (riga ~115), aggiungi:

```ts
  const handleTransform = (sourceCol: string, t: string) => {
    setTransforms(prev => {
      const next = { ...prev }
      if (t === NO_TRANSFORM || !t) delete next[sourceCol]
      else next[sourceCol] = t as TransformName
      return next
    })
  }
```

- [ ] **Step 4: Aggiungi la colonna "Trasformazione" alla tabella step 2**

Nell'header della tabella (riga ~221-227) aggiungi una `<th>` dopo "→ Campo template":

```tsx
                    <th className="text-left px-3 py-2 font-medium">Trasformazione</th>
```

Nel corpo riga (dentro il `map`, dopo la `<td>` del Select del target, prima della `<td>` Anteprima, riga ~259), aggiungi:

```tsx
                        <td className="px-3 py-2">
                          {mapping[col] ? (
                            <Select
                              value={transforms[col] ?? NO_TRANSFORM}
                              onValueChange={v => handleTransform(col, v)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NO_TRANSFORM}>— nessuna —</SelectItem>
                                {transformsForField(mapping[col]).map(t => (
                                  <SelectItem key={t} value={t}>
                                    {TRANSFORM_LABELS[t]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
```

- [ ] **Step 5: Persisti i transform nel salvataggio**

In `handleSave` (riga ~145-151), aggiungi `transforms` al config quando non vuoto:

```ts
      const config: ImportMappingConfig = {
        version: 1,
        colonne_rilevate: detected.columns,
        ultimo_upload: new Date().toISOString(),
        mapping,
        ...(Object.keys(rules).length > 0 ? { rules } : {}),
        ...(Object.keys(transforms).length > 0 ? { transforms } : {}),
      }
```

- [ ] **Step 6: Verifica typecheck + avvio dev**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: PASS.

- [ ] **Step 7: Verifica manuale nel browser (preview)**

Avvia il dev server, apri il wizard di mapping di un emittente, carica un CSV con una colonna data. Mappa la colonna su `data_trasmissione` e verifica che compaia il selettore "Trasformazione" con le opzioni data (US/EU/ISO/Excel). Verifica che salvando e riaprendo il valore selezionato persista.

(Usa il workflow preview_* per snapshot/screenshot a conferma.)

- [ ] **Step 8: Commit**

```bash
git add src/app/dashboard/programmazioni/components/MappingWizard.tsx
git commit -m "feat(import): selettore transform per colonna nel MappingWizard"
```

---

### Task 6: Auto-suggest formato data nel wizard

**Files:**
- Modify: `src/features/programmazioni/utils/transforms.ts` (helper di rilevamento)
- Modify: `src/app/dashboard/programmazioni/components/MappingWizard.tsx`
- Test: `src/features/programmazioni/utils/transforms.test.ts`

- [ ] **Step 1: Scrivi il test che fallisce (helper di rilevamento)**

Aggiungi a `transforms.test.ts`:

```ts
import { suggestDateTransform } from './transforms'

describe('suggestDateTransform', () => {
  it('rileva US quando il 2º campo > 12', () => {
    expect(suggestDateTransform('12/31/2025')).toBe('us_date_to_iso')
  })
  it('rileva EU quando il 1º campo > 12', () => {
    expect(suggestDateTransform('31/12/2025')).toBe('eu_date_to_iso')
  })
  it('rileva ISO', () => {
    expect(suggestDateTransform('2025-12-31')).toBe('iso_date')
  })
  it('rileva seriale Excel', () => {
    expect(suggestDateTransform('45657')).toBe('excel_serial_to_iso')
  })
  it('ambiguo (entrambi <= 12) → null', () => {
    expect(suggestDateTransform('03/04/2025')).toBe(null)
  })
  it('vuoto/non data → null', () => {
    expect(suggestDateTransform('')).toBe(null)
    expect(suggestDateTransform('ciao')).toBe(null)
  })
})
```

- [ ] **Step 2: Esegui il test per verificarne il fallimento**

Run: `npx jest src/features/programmazioni/utils/transforms.test.ts`
Expected: FAIL — `suggestDateTransform` non esiste.

- [ ] **Step 3: Implementa `suggestDateTransform`**

Aggiungi a `transforms.ts`:

```ts
/**
 * Suggerisce un transform data da un valore campione, SENZA mai indovinare
 * date intrinsecamente ambigue (entrambi i campi <= 12 → null).
 */
export function suggestDateTransform(sample: unknown): TransformName | null {
  if (sample === null || sample === undefined) return null
  const s = String(sample).trim()
  if (s === '') return null
  if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(s)) return 'iso_date'
  if (/^\d{8}$/.test(s)) return 'yyyymmdd_int_to_iso'
  const slash = s.match(/^(\d{1,2})[/-](\d{1,2})[/-]\d{2,4}$/)
  if (slash) {
    const a = parseInt(slash[1], 10)
    const b = parseInt(slash[2], 10)
    if (b > 12 && a <= 12) return 'us_date_to_iso'
    if (a > 12 && b <= 12) return 'eu_date_to_iso'
    return null // ambiguo: non indovinare
  }
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10)
    if (n >= 10000 && n <= 100000) return 'excel_serial_to_iso'
  }
  return null
}
```

- [ ] **Step 4: Esegui il test per verificarne il passaggio**

Run: `npx jest src/features/programmazioni/utils/transforms.test.ts`
Expected: PASS.

- [ ] **Step 5: Integra l'auto-suggest nel wizard**

In `MappingWizard.tsx`, importa `suggestDateTransform`:

```ts
import { transformsForField, TRANSFORM_LABELS, suggestDateTransform, type TransformName } from '@/features/programmazioni/utils/transforms'
```

In `handleSelect` (riga ~115), quando si mappa una colonna su un campo data e non c'è ancora un transform per quella colonna, pre-seleziona il suggerimento usando il valore di anteprima:

```ts
  const handleSelect = (sourceCol: string, target: string) => {
    setMapping(prev => {
      const next = { ...prev }
      if (target === IGNORE || !target) {
        delete next[sourceCol]
      } else {
        for (const k of Object.keys(next)) {
          if (next[k] === target && k !== sourceCol) delete next[k]
        }
        next[sourceCol] = target
      }
      return next
    })
    const isDateField = target === 'data_trasmissione' || target === 'data_inizio' || target === 'data_fine'
    if (isDateField) {
      setTransforms(prev => {
        if (prev[sourceCol]) return prev // non sovrascrivere scelta esistente
        const suggested = suggestDateTransform(previewRow[sourceCol])
        if (!suggested) return prev
        return { ...prev, [sourceCol]: suggested }
      })
    }
  }
```

(`previewRow` è già definito alla riga ~113: `const previewRow = detected?.preview?.[0] ?? {}`.)

- [ ] **Step 6: Indicatore visivo del suggerimento**

Sotto il Select della trasformazione (Task 5 Step 4), mostra un hint quando il valore corrente coincide col suggerimento per quella colonna data:

```tsx
                          {(() => {
                            const target = mapping[col]
                            const isDate = target === 'data_trasmissione' || target === 'data_inizio' || target === 'data_fine'
                            if (!isDate) return null
                            const suggested = suggestDateTransform(previewRow[col])
                            if (suggested && transforms[col] === suggested) {
                              return <span className="text-[10px] text-emerald-600 mt-1 block">suggerito dall'anteprima</span>
                            }
                            return null
                          })()}
```

(inserisci questo blocco subito dopo il `</Select>` ... in fondo alla `<td>` "Trasformazione", dentro lo stesso ramo `mapping[col] ?`.)

- [ ] **Step 7: Verifica typecheck + browser**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: PASS.

Verifica manuale: carica un CSV con `end_date = 12/31/2025`, mappa su `data_trasmissione` → il selettore deve pre-selezionare "Data US MM/DD/YYYY → ISO" con l'etichetta "suggerito dall'anteprima".

- [ ] **Step 8: Commit**

```bash
git add src/features/programmazioni/utils/transforms.ts src/features/programmazioni/utils/transforms.test.ts src/app/dashboard/programmazioni/components/MappingWizard.tsx
git commit -m "feat(import): auto-suggest formato data nel MappingWizard"
```

---

### Task 7: Verifica end-to-end del caso Netflix

**Files:** nessuna modifica (validazione)

- [ ] **Step 1: Esegui l'intera suite dei file toccati**

Run: `npx jest src/features/programmazioni/utils/transforms.test.ts src/features/programmazioni/services/import-mapping.service.test.ts`
Expected: PASS tutti.

- [ ] **Step 2: Typecheck globale**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: PASS.

- [ ] **Step 3: Prova reale dell'upload Netflix (browser/preview)**

Con dev server attivo: apri la campagna Netflix, configura/aggiorna il mapping in modo che `end_date → data_trasmissione` con transform `us_date_to_iso` (auto-suggerito), poi esegui "Upload dati database" sul file `NETFLIX_RASI_CATALOG_USAGE_2025.csv`. Atteso: nessun errore "date/time field value out of range"; le righe si caricano e `data_trasmissione` risulta `2025-12-31`.

- [ ] **Step 4: Commit finale (se servono fix dalla verifica)**

```bash
git add -A
git commit -m "test(import): verifica end-to-end transform data Netflix"
```

---

## Self-Review

- **Spec coverage:** §1 modello dati → Task 3 Step 3. §2 wiring applyMapping → Task 3. §3 nuovi transform → Task 1. §4 UI selettore → Task 5. §5 auto-suggest → Task 6. §6 niente heuristic in validateDate → rispettato (nessuna modifica a `validateDate`; lo swap vive solo in `suggestDateTransform` come suggerimento UI). Passaggio transform dall'upload → Task 4. Tutto coperto.
- **Type consistency:** `TransformName` esteso una sola volta (Task 1 Step 3); `transforms?: Record<string, TransformName>` usato identico in config, firma `applyMapping`, stato wizard; `resolveFieldValueWithSource` ritorna `{ value, source }` usato in `applyMapping`; `NO_TRANSFORM` / `IGNORE` costanti distinte.
- **Placeholder scan:** nessun TODO/TBD; ogni step di codice mostra il codice; comandi con output atteso.
- **Test runner:** Jest (confermato in `package.json` → `"test": "jest"`); globals senza import. I file `transforms.test.ts` / `import-mapping.service.test.ts` importano già le funzioni sotto test in cima — le Task 2/6 aggiungono solo i named import mancanti.
