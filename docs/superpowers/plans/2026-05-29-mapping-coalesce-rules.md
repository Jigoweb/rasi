# Mapping Coalesce Rules (serie TV multi-colonna) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let one emittente mapping route a mixed film+series file (e.g. TIMVision) into the right DB fields in a single upload, by allowing a target field to coalesce from multiple ordered source columns plus an optional "populate-only-if" guard.

**Architecture:** Extend the LIVE v1 import path. Add an optional `rules` map to `ImportMappingConfig` (`target field → { sources[], onlyIfPresent? }`). A pure resolver picks the first non-blank source ("N.D."/"N/A"/empty count as blank). `applyMapping` consults `rules` before the plain 1:1 `mapping`. The MappingWizard gets an "Advanced rules" editor (focused on the 4 title fields) with a one-click "Serie TV" preset and a live resolved preview. No DB schema change — all 6 title/episode columns already exist in `programmazioni`, and `rules` rides inside the existing `emittenti.mapping_import` JSON.

**Tech Stack:** TypeScript, React (Next.js App Router client component), Jest, shadcn/ui (Select/Button/Badge), Supabase (no migration).

---

## Background (read before starting)

The TIMVision SVOD/TVOD file mixes films and TV-series episodes in one sheet:

| File column | Film row | Series row |
|---|---|---|
| `TITOLO` / `TITOLO_ORIGINALE` | film title ("Barbarian") | **episode** title ("Episodio 85", "Ep. 36") |
| `NOME_SERIE` | `N.D.` | **series mother** title ("CENTOVETRINE") |
| `NUMERO_STAGIONE` / `NUMERO_EPISODIO` | `N.D.` | season / episode number |
| `CATEGORIA_EDITORIALE` | `CINEMA` | `SERIE` |

Desired DB result (the matchable opera is the **series mother**, never the episode):

```
titolo                    = NOME_SERIE if present, else TITOLO
titolo_originale          = NOME_SERIE if present, else TITOLO_ORIGINALE
titolo_episodio           = TITOLO            (only when NOME_SERIE present)
titolo_episodio_originale = TITOLO_ORIGINALE  (only when NOME_SERIE present)
```

Today the live upload path (`src/app/dashboard/programmazioni/page.tsx` ~line 418) calls
`applyMapping(rows, uploadDecision.mapping.mapping, ctx)` where `mapping` is a strict
1-source→1-target `Record<string,string>` — it cannot express "first non-blank of N columns"
nor "only if another column is filled". That single limitation is what this plan removes.

**Backward compatibility is mandatory:** existing emittenti configs have no `rules`, so the
`rules` path must be a no-op when absent and leave current behavior byte-identical.

---

## File Structure

- `src/features/programmazioni/services/import-mapping.service.ts` — add `FieldRule` type, `isBlankValue`, `getRowValue`, `resolveFieldValue`, `validateImportRules`; extend `ImportMappingConfig` and `applyMapping`. (Single cohesive home: the apply logic already lives here.)
- `src/features/programmazioni/services/import-mapping.service.test.ts` — add unit tests for the helpers, the resolver, the validator, and `applyMapping` with rules.
- `src/app/dashboard/programmazioni/components/MappingRulesEditor.tsx` — NEW client component: edits the 4 title-group rules with a live preview + "Serie TV" preset.
- `src/app/dashboard/programmazioni/components/MappingWizard.tsx` — render the editor in step 2, hold `rules` in state, emit it in `handleSave`, fix the "titolo mapped" gate.
- `src/app/dashboard/programmazioni/page.tsx` — pass `uploadDecision.mapping.rules` into `applyMapping`.

---

### Task 1: `FieldRule` type + blank/value helpers

**Files:**
- Modify: `src/features/programmazioni/services/import-mapping.service.ts` (add after the `ImportMappingConfig` interface, ~line 24, and export helpers near the bottom)
- Test: `src/features/programmazioni/services/import-mapping.service.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/features/programmazioni/services/import-mapping.service.test.ts`:

```typescript
import {
  isBlankValue,
  getRowValue,
} from './import-mapping.service'

describe('isBlankValue', () => {
  it('treats null/undefined/empty as blank', () => {
    expect(isBlankValue(null)).toBe(true)
    expect(isBlankValue(undefined)).toBe(true)
    expect(isBlankValue('')).toBe(true)
    expect(isBlankValue('   ')).toBe(true)
  })
  it('treats N.D. / N/A sentinels as blank (case/space insensitive)', () => {
    expect(isBlankValue('N.D.')).toBe(true)
    expect(isBlankValue(' n.d ')).toBe(true)
    expect(isBlankValue('N/A')).toBe(true)
    expect(isBlankValue('na')).toBe(true)
  })
  it('treats real values as non-blank', () => {
    expect(isBlankValue('Centovetrine')).toBe(false)
    expect(isBlankValue(0)).toBe(false)
    expect(isBlankValue('0')).toBe(false)
  })
})

describe('getRowValue', () => {
  it('reads exact, trimmed, and normalized-key variants', () => {
    expect(getRowValue({ NOME_SERIE: 'X' }, 'NOME_SERIE')).toBe('X')
    expect(getRowValue({ NOME_SERIE: 'X' }, ' NOME_SERIE ')).toBe('X')
    expect(getRowValue({ nome_serie: 'X' }, 'NOME_SERIE')).toBe('X')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/features/programmazioni/services/import-mapping.service.test.ts -t "isBlankValue"`
Expected: FAIL with "isBlankValue is not a function" / import error.

- [ ] **Step 3: Implement the type + helpers**

In `src/features/programmazioni/services/import-mapping.service.ts`, add the type right after the `ImportMappingConfig` interface (after line 24):

```typescript
/**
 * Resolution rule for a single target field. Used to coalesce a value from
 * several source columns and/or gate population on another column.
 */
export interface FieldRule {
  /** Ordered source columns; the first non-blank value wins. */
  sources: string[]
  /** If set, the field is populated only when this source column is non-blank. */
  onlyIfPresent?: string
}
```

Extend the existing `ImportMappingConfig` interface (add the optional `rules` line):

```typescript
export interface ImportMappingConfig {
  version: 1
  colonne_rilevate: string[]
  ultimo_upload: string | null
  /** Mapping: chiave = nome colonna sorgente nel file, valore = nome campo template */
  mapping: Record<string, string>
  /** Advanced per-target rules (coalesce / conditional). Overrides `mapping` for that target. */
  rules?: Record<string, FieldRule>
}
```

Add the helpers near the bottom of the file (export them):

```typescript
// ============================================
// FIELD RULES (coalesce / conditional)
// ============================================

const BLANK_SENTINELS = new Set(['', 'n.d.', 'n.d', 'nd', 'na', 'n/a'])

/** True when a cell carries no usable value (null/empty or an "N.D."-style sentinel). */
export function isBlankValue(v: unknown): boolean {
  if (v === null || v === undefined) return true
  const s = String(v).trim().toLowerCase()
  return BLANK_SENTINELS.has(s)
}

/** Reads a column value tolerating capitalization/spacing variants (mirrors applyMapping). */
export function getRowValue(row: Record<string, any>, col: string): any {
  return row[col] ?? row[col.trim()] ?? row[normalizeKey(col)]
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/features/programmazioni/services/import-mapping.service.test.ts -t "isBlankValue|getRowValue"`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/programmazioni/services/import-mapping.service.ts src/features/programmazioni/services/import-mapping.service.test.ts
git commit -m "feat(mapping): add FieldRule type + isBlankValue/getRowValue helpers"
```

---

### Task 2: `resolveFieldValue` resolver

**Files:**
- Modify: `src/features/programmazioni/services/import-mapping.service.ts` (add below the helpers from Task 1)
- Test: `src/features/programmazioni/services/import-mapping.service.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to the test file:

```typescript
import { resolveFieldValue, type FieldRule } from './import-mapping.service'

describe('resolveFieldValue', () => {
  it('returns the first non-blank source (coalesce priority)', () => {
    const rule: FieldRule = { sources: ['NOME_SERIE', 'TITOLO'] }
    expect(resolveFieldValue({ NOME_SERIE: 'Centovetrine', TITOLO: 'Ep 1' }, rule)).toBe('Centovetrine')
    expect(resolveFieldValue({ NOME_SERIE: 'N.D.', TITOLO: 'Barbarian' }, rule)).toBe('Barbarian')
    expect(resolveFieldValue({ NOME_SERIE: '', TITOLO: '' }, rule)).toBeUndefined()
  })
  it('honors onlyIfPresent guard', () => {
    const rule: FieldRule = { sources: ['TITOLO'], onlyIfPresent: 'NOME_SERIE' }
    // guard present -> use TITOLO as episode title
    expect(resolveFieldValue({ NOME_SERIE: 'Centovetrine', TITOLO: 'Episodio 26' }, rule)).toBe('Episodio 26')
    // guard blank (film row) -> field stays empty
    expect(resolveFieldValue({ NOME_SERIE: 'N.D.', TITOLO: 'Barbarian' }, rule)).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/features/programmazioni/services/import-mapping.service.test.ts -t "resolveFieldValue"`
Expected: FAIL with "resolveFieldValue is not a function".

- [ ] **Step 3: Implement the resolver**

Add below `getRowValue` in `import-mapping.service.ts`:

```typescript
/**
 * Resolves a target field value from a row using a FieldRule:
 *  - if `onlyIfPresent` is set and that column is blank → undefined (skip);
 *  - otherwise return the first non-blank value among `sources` (in order);
 *  - undefined when every source is blank.
 */
export function resolveFieldValue(row: Record<string, any>, rule: FieldRule): any {
  if (rule.onlyIfPresent && isBlankValue(getRowValue(row, rule.onlyIfPresent))) {
    return undefined
  }
  for (const src of rule.sources) {
    const v = getRowValue(row, src)
    if (!isBlankValue(v)) return v
  }
  return undefined
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/features/programmazioni/services/import-mapping.service.test.ts -t "resolveFieldValue"`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/programmazioni/services/import-mapping.service.ts src/features/programmazioni/services/import-mapping.service.test.ts
git commit -m "feat(mapping): add resolveFieldValue coalesce/conditional resolver"
```

---

### Task 3: Wire `rules` into `applyMapping`

**Files:**
- Modify: `src/features/programmazioni/services/import-mapping.service.ts:236-288` (the `applyMapping` function)
- Test: `src/features/programmazioni/services/import-mapping.service.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to the test file:

```typescript
describe('applyMapping with rules (mixed film + series)', () => {
  const ctx = { campagnaProgrammazioneId: 'c1', emittenteId: 'e1' }
  const mapping = { NUMERO_STAGIONE: 'numero_stagione', NUMERO_EPISODIO: 'numero_episodio' }
  const rules = {
    titolo: { sources: ['NOME_SERIE', 'TITOLO'] },
    titolo_originale: { sources: ['NOME_SERIE', 'TITOLO_ORIGINALE'] },
    titolo_episodio: { sources: ['TITOLO'], onlyIfPresent: 'NOME_SERIE' },
    titolo_episodio_originale: { sources: ['TITOLO_ORIGINALE'], onlyIfPresent: 'NOME_SERIE' },
  }

  it('routes a series row: serie madre → titolo, episode → titolo_episodio', () => {
    const rows = [{
      NOME_SERIE: 'CENTOVETRINE', TITOLO: 'Episodio 26', TITOLO_ORIGINALE: 'Episodio 26',
      NUMERO_STAGIONE: '1', NUMERO_EPISODIO: '26',
    }]
    const out = applyMapping(rows, mapping, ctx, rules)
    expect(out[0].titolo).toBe('Centovetrine')
    expect(out[0].titolo_episodio).toBe('Episodio 26')
    expect(out[0].numero_stagione).toBe(1)
    expect(out[0].numero_episodio).toBe(26)
  })

  it('routes a film row: TITOLO → titolo, no episode title', () => {
    const rows = [{
      NOME_SERIE: 'N.D.', TITOLO: 'Barbarian', TITOLO_ORIGINALE: 'Barbarian',
      NUMERO_STAGIONE: 'N.D.', NUMERO_EPISODIO: 'N.D.',
    }]
    const out = applyMapping(rows, mapping, ctx, rules)
    expect(out[0].titolo).toBe('Barbarian')
    expect(out[0].titolo_episodio).toBeUndefined()
    expect(out[0].numero_stagione).toBeUndefined()
  })

  it('is a no-op when rules is omitted (backward compat)', () => {
    const rows = [{ TITOLO: 'BEAUTIFUL XXXIII', TIPO: 'serie' }]
    const out = applyMapping(rows, { TITOLO: 'titolo', TIPO: 'tipo' }, ctx)
    expect(out[0].titolo).toBe('Beautiful')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/features/programmazioni/services/import-mapping.service.test.ts -t "applyMapping with rules"`
Expected: FAIL — `applyMapping` ignores the 4th argument (titolo would be undefined / wrong), TypeScript also errors on arity.

- [ ] **Step 3: Implement the rules branch in `applyMapping`**

Replace the body of `applyMapping` (current lines 236-288) with:

```typescript
export function applyMapping(
  rows: Record<string, any>[],
  mapping: Record<string, string>,
  context: ApplyMappingContext,
  rules?: Record<string, FieldRule>
): ProgrammazionePayload[] {
  // Mappa inversa: campo template → colonna sorgente (l'ultima vince in caso di duplicati)
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
      // A rule for this target takes precedence over the plain 1:1 mapping.
      const rule = rules?.[field]
      let rawValue: any
      if (rule) {
        rawValue = resolveFieldValue(row, rule)
      } else {
        const sourceCol = reverseMap[field]
        if (!sourceCol) continue
        rawValue = getRowValue(row, sourceCol)
      }
      const coerced = coerce(field, rawValue)
      if (coerced !== undefined) {
        payload[field] = coerced
      }
    }

    // Normalize title-like fields after coercion
    for (const f of ['titolo', 'titolo_originale', 'titolo_episodio', 'titolo_episodio_originale'] as const) {
      if (typeof payload[f] === 'string') {
        const normalized = normalizeTitle(payload[f])
        if (normalized) payload[f] = normalized
        else delete payload[f]
      }
    }

    // Validazione minima: titolo deve essere presente
    if (!payload.titolo) continue
    // Default tipo se non mappato
    if (!payload.tipo) payload.tipo = ''

    result.push(payload as ProgrammazionePayload)
  }

  return result
}
```

- [ ] **Step 4: Run the full file test to verify pass + no regressions**

Run: `npx jest src/features/programmazioni/services/import-mapping.service.test.ts`
Expected: PASS (all prior `applyMapping` / `applyMappingWithTransforms` tests still green + new rules tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/programmazioni/services/import-mapping.service.ts src/features/programmazioni/services/import-mapping.service.test.ts
git commit -m "feat(mapping): apply field rules (coalesce/conditional) in applyMapping"
```

---

### Task 4: Pass `rules` from the live upload path

**Files:**
- Modify: `src/app/dashboard/programmazioni/page.tsx:418-422` (the `buildAll` closure)

- [ ] **Step 1: Read the current call site**

Confirm lines ~417-422 read:

```typescript
      const buildAll = (rows: any[]): ProgrammazionePayload[] => {
        if (uploadDecision.kind === 'apply_existing' || uploadDecision.kind === 'warn_format_changed') {
          return applyMapping(rows, uploadDecision.mapping.mapping, ctx)
        }
        return buildLegacyPayload(rows, ctx)
      }
```

(If the exact branch condition differs, keep it — only the `applyMapping(...)` argument list changes.)

- [ ] **Step 2: Pass the optional rules**

Change the `applyMapping` call to forward the saved rules:

```typescript
          return applyMapping(rows, uploadDecision.mapping.mapping, ctx, uploadDecision.mapping.rules)
```

`uploadDecision.mapping` is typed `ImportMappingConfig`, which now carries optional `rules`, so this type-checks with no other change. `saveMapping` already persists the whole config via `{ ...config, version: 1 }`, so `rules` round-trips through `emittenti.mapping_import` automatically.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors referencing `applyMapping` or `page.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/programmazioni/page.tsx
git commit -m "feat(mapping): forward saved field rules into live upload applyMapping"
```

---

### Task 5: `validateImportRules` (pure validator for the editor)

**Files:**
- Modify: `src/features/programmazioni/services/import-mapping.service.ts` (add below `resolveFieldValue`)
- Test: `src/features/programmazioni/services/import-mapping.service.test.ts`

- [ ] **Step 1: Write the failing tests**

Append:

```typescript
import { validateImportRules } from './import-mapping.service'

describe('validateImportRules', () => {
  const columns = ['NOME_SERIE', 'TITOLO', 'TITOLO_ORIGINALE']

  it('passes a valid rule set', () => {
    const rules = {
      titolo: { sources: ['NOME_SERIE', 'TITOLO'] },
      titolo_episodio: { sources: ['TITOLO'], onlyIfPresent: 'NOME_SERIE' },
    }
    expect(validateImportRules(rules, columns)).toEqual([])
  })
  it('flags empty sources', () => {
    const errs = validateImportRules({ titolo: { sources: [] } }, columns)
    expect(errs.some(e => e.includes('titolo'))).toBe(true)
  })
  it('flags unknown source / guard columns', () => {
    const errs = validateImportRules(
      { titolo: { sources: ['NOPE'], onlyIfPresent: 'ALSO_NOPE' } },
      columns,
    )
    expect(errs.length).toBeGreaterThanOrEqual(2)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/features/programmazioni/services/import-mapping.service.test.ts -t "validateImportRules"`
Expected: FAIL with "validateImportRules is not a function".

- [ ] **Step 3: Implement the validator**

Add below `resolveFieldValue`:

```typescript
/**
 * Validates a rules map against the detected columns. Returns a list of
 * human-readable errors (empty = valid). Used by the wizard before save.
 */
export function validateImportRules(
  rules: Record<string, FieldRule>,
  columns: string[],
): string[] {
  const errors: string[] = []
  const known = new Set(columns.map(c => c.trim()))
  for (const [field, rule] of Object.entries(rules)) {
    if (!TEMPLATE_FIELDS_SET.has(field)) {
      errors.push(`campo sconosciuto '${field}'`)
      continue
    }
    if (!Array.isArray(rule.sources) || rule.sources.length === 0) {
      errors.push(`'${field}': serve almeno una colonna sorgente`)
    } else {
      for (const s of rule.sources) {
        if (!known.has(s.trim())) errors.push(`'${field}': colonna '${s}' non presente nel file`)
      }
    }
    if (rule.onlyIfPresent && !known.has(rule.onlyIfPresent.trim())) {
      errors.push(`'${field}': colonna condizione '${rule.onlyIfPresent}' non presente nel file`)
    }
  }
  return errors
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/features/programmazioni/services/import-mapping.service.test.ts -t "validateImportRules"`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/programmazioni/services/import-mapping.service.ts src/features/programmazioni/services/import-mapping.service.test.ts
git commit -m "feat(mapping): add validateImportRules for the wizard"
```

---

### Task 6: `MappingRulesEditor` component

**Files:**
- Create: `src/app/dashboard/programmazioni/components/MappingRulesEditor.tsx`

This component edits the 4 title-group rules with an ordered source picker, an optional
"solo se" guard, a live resolved preview, and a one-click "Serie TV" preset.

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useMemo } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Plus, X, Wand2 } from 'lucide-react'
import {
  resolveFieldValue,
  type FieldRule,
} from '@/features/programmazioni/services/import-mapping.service'

/** Fields this editor manages (the series/episode title group). */
const RULE_FIELDS = [
  'titolo',
  'titolo_originale',
  'titolo_episodio',
  'titolo_episodio_originale',
] as const

const NONE = '__none__'

interface MappingRulesEditorProps {
  columns: string[]
  rules: Record<string, FieldRule>
  onChange: (rules: Record<string, FieldRule>) => void
  previewRow?: Record<string, any>
}

export default function MappingRulesEditor({
  columns,
  rules,
  onChange,
  previewRow = {},
}: MappingRulesEditorProps) {
  const hasSeriesShape = useMemo(
    () => columns.includes('NOME_SERIE') && columns.includes('TITOLO'),
    [columns],
  )

  const setRule = (field: string, next: FieldRule | null) => {
    const copy = { ...rules }
    if (!next || next.sources.length === 0) delete copy[field]
    else copy[field] = next
    onChange(copy)
  }

  const addSource = (field: string, col: string) => {
    const cur = rules[field] ?? { sources: [] }
    if (cur.sources.includes(col)) return
    setRule(field, { ...cur, sources: [...cur.sources, col] })
  }

  const removeSource = (field: string, col: string) => {
    const cur = rules[field]
    if (!cur) return
    setRule(field, { ...cur, sources: cur.sources.filter(s => s !== col) })
  }

  const setGuard = (field: string, col: string) => {
    const cur = rules[field] ?? { sources: [] }
    setRule(field, { ...cur, onlyIfPresent: col === NONE ? undefined : col })
  }

  const applySeriesPreset = () => {
    onChange({
      titolo: { sources: ['NOME_SERIE', 'TITOLO'] },
      titolo_originale: { sources: ['NOME_SERIE', 'TITOLO_ORIGINALE'] },
      titolo_episodio: { sources: ['TITOLO'], onlyIfPresent: 'NOME_SERIE' },
      titolo_episodio_originale: { sources: ['TITOLO_ORIGINALE'], onlyIfPresent: 'NOME_SERIE' },
    })
  }

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-gray-50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Regole avanzate titoli (serie TV)</p>
          <p className="text-xs text-gray-500">
            Per file che mischiano film e serie: il titolo prende la prima colonna non vuota.
          </p>
        </div>
        {hasSeriesShape && (
          <Button type="button" variant="outline" size="sm" onClick={applySeriesPreset}>
            <Wand2 className="h-4 w-4 mr-1" /> Preset Serie TV
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {RULE_FIELDS.map(field => {
          const rule = rules[field]
          const sources = rule?.sources ?? []
          const available = columns.filter(c => !sources.includes(c))
          const resolved = rule ? resolveFieldValue(previewRow, rule) : undefined
          return (
            <div key={field} className="bg-white border rounded p-2 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs w-56 shrink-0">{field}</span>
                <div className="flex flex-wrap items-center gap-1 flex-1">
                  {sources.map((s, i) => (
                    <Badge key={s} variant="secondary" className="gap-1">
                      {i > 0 && <span className="text-gray-400 text-[10px]">poi</span>}
                      {s}
                      <button
                        type="button"
                        onClick={() => removeSource(field, s)}
                        className="ml-0.5 text-gray-400 hover:text-red-600"
                        aria-label={`Rimuovi ${s}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {available.length > 0 && (
                    <Select value="" onValueChange={v => v && addSource(field, v)}>
                      <SelectTrigger className="h-7 w-40 text-xs">
                        <span className="flex items-center gap-1 text-gray-500">
                          <Plus className="h-3 w-3" /> aggiungi
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {available.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span className="w-56 shrink-0">popola solo se valorizzato:</span>
                <Select value={rule?.onlyIfPresent ?? NONE} onValueChange={v => setGuard(field, v)}>
                  <SelectTrigger className="h-7 w-48 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— sempre —</SelectItem>
                    {columns.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {rule && (
                  <span className="ml-auto truncate max-w-[220px]">
                    anteprima: <strong>{resolved === undefined ? '— (vuoto)' : String(resolved)}</strong>
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check the new component**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors in `MappingRulesEditor.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/programmazioni/components/MappingRulesEditor.tsx
git commit -m "feat(mapping): add MappingRulesEditor with Serie TV preset + live preview"
```

---

### Task 7: Integrate the editor into `MappingWizard`

**Files:**
- Modify: `src/app/dashboard/programmazioni/components/MappingWizard.tsx`

- [ ] **Step 1: Add imports + rules state**

After the existing import block, add (line ~22, alongside the other imports):

```tsx
import MappingRulesEditor from './MappingRulesEditor'
import type { FieldRule } from '@/features/programmazioni/services/import-mapping.service'
```

Add a `rules` state next to `mapping` (after line 46 `const [mapping, ...]`):

```tsx
  const [rules, setRules] = useState<Record<string, FieldRule>>({})
```

- [ ] **Step 2: Reset/prefill `rules` with the rest of the state**

In the "Reset on open" effect (after line 57 `setMapping(initialConfig?.mapping ?? {})`), add:

```tsx
    setRules(initialConfig?.rules ?? {})
```

In `handleFile`, inside the `if (initialConfig) { ... } else { ... }` block (lines 81-89), set rules alongside mapping:

```tsx
      if (initialConfig) {
        const filtered: Record<string, string> = {}
        for (const c of r.columns) {
          if (initialConfig.mapping[c]) filtered[c] = initialConfig.mapping[c]
        }
        setMapping(filtered)
        setRules(initialConfig.rules ?? {})
      } else {
        setMapping({})
        setRules({})
      }
```

- [ ] **Step 3: Allow proceeding when titolo comes from a rule**

Replace the `canProceedToStep3` definition (line 125):

```tsx
  const titoloFromRule = (rules.titolo?.sources?.length ?? 0) > 0
  const canProceedToStep3 = hasTitoloMapped || titoloFromRule
```

And update the "Mappa titolo per continuare" badge condition (line 199) so it hides when a rule supplies titolo:

```tsx
              {!hasTitoloMapped && !titoloFromRule && (
                <Badge variant="destructive" className="text-xs">
                  Mappa "titolo" per continuare
                </Badge>
              )}
```

- [ ] **Step 4: Render the editor under the mapping table (step 2)**

Immediately after the closing `</div>` of the mapping table block (after line 254, before the step-2 wrapper closes at line 255), insert:

```tsx
            <MappingRulesEditor
              columns={detected.columns}
              rules={rules}
              onChange={setRules}
              previewRow={previewRow}
            />
```

- [ ] **Step 5: Persist `rules` in `handleSave`**

Update the `config` object in `handleSave` (lines 132-137) to include rules (omit when empty):

```tsx
      const config: ImportMappingConfig = {
        version: 1,
        colonne_rilevate: detected.columns,
        ultimo_upload: new Date().toISOString(),
        mapping,
        ...(Object.keys(rules).length > 0 ? { rules } : {}),
      }
```

- [ ] **Step 6: Type-check + full test suite**

Run: `npx tsc --noEmit -p tsconfig.json && npx jest src/features/programmazioni`
Expected: no type errors; all programmazioni unit tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/programmazioni/components/MappingWizard.tsx
git commit -m "feat(mapping): wire MappingRulesEditor into MappingWizard (state, gate, save)"
```

---

### Task 8: Manual end-to-end verification with the TIMVision file

**Files:** none (manual QA)

- [ ] **Step 1: Build to catch integration breakage**

Run: `npm run build`
Expected: build succeeds (the page + wizard compile).

- [ ] **Step 2: Drive the wizard against the real file**

1. `cp "/Users/matteo/Downloads/TIMVISION SVOD-TVOD 2024.xlsx" /tmp/tim.xlsx` (run by the user — Downloads is sandboxed).
2. In the app, open the TIMVision emittente mapping wizard, upload the SVOD sheet sample.
3. Plain-map: `NUMERO_STAGIONE → numero_stagione`, `NUMERO_EPISODIO → numero_episodio`, `ANNO_RILASCIO_ITALIA → anno`. Leave `TITOLO`/`NOME_SERIE` on "— ignora —" (rules drive them).
4. In "Regole avanzate", click **Preset Serie TV**. Confirm the live preview shows `titolo = CENTOVETRINE` (series) and the episode preview filled.
5. Save. Reopen the wizard and confirm the rules persisted.

- [ ] **Step 3: Verify routed data in the DB after a real upload**

Upload the file, then run (via the Supabase SQL tool, project `jdflzupcfwdcajxfobfj`):

```sql
SELECT titolo, titolo_episodio, numero_stagione, numero_episodio
FROM public.programmazioni
WHERE emittente_id = '<TIMVISION_EMITTENTE_ID>'
ORDER BY created_at DESC
LIMIT 20;
```

Expected:
- Series rows: `titolo` = series mother (e.g. "Centovetrine"), `titolo_episodio` populated (e.g. "Episodio 26").
- Film rows: `titolo` = film title, `titolo_episodio` NULL.

- [ ] **Step 4: Final commit (if any QA tweaks were needed)**

```bash
git add -A
git commit -m "test(mapping): verify TIMVision mixed film/series routing end-to-end"
```

---

## Self-Review

**1. Spec coverage:**
- Coalesce (first non-blank of N columns) → Task 2 `resolveFieldValue` + Task 3 `applyMapping`. ✅
- Conditional "only if present" (films get no episode title) → Task 2 `onlyIfPresent` + Task 3 tests. ✅
- "N.D." sentinel treated as empty → Task 1 `isBlankValue`. ✅
- Single mixed-file upload, no manual split → Task 3 + Task 4 (live path). ✅
- UX: ordered multi-source + "solo se" + preset + preview → Task 6 + Task 7. ✅
- Reusable per other emittenti → generic `rules` map, not TIMVision-hardcoded (preset is a convenience only). ✅
- No DB change → confirmed: all 6 columns exist; `rules` rides in `mapping_import` JSON. ✅
- Backward compatibility → Task 3 "no-op when rules omitted" test. ✅

**2. Placeholder scan:** No TBD/TODO/"handle edge cases"; every code step shows complete code. ✅

**3. Type consistency:** `FieldRule { sources: string[]; onlyIfPresent?: string }` is defined once (Task 1) and used identically in Tasks 2, 3, 5, 6, 7. `applyMapping(rows, mapping, context, rules?)` arity matches the page.tsx call (Task 4) and tests (Task 3). `ImportMappingConfig.rules?` matches `saveMapping` spread and `uploadDecision.mapping.rules` read. ✅

**Out of scope (intentionally, YAGNI):** wiring the dormant v2 `applyMappingWithTransforms` path; per-row `tipo` derivation from `CATEGORIA_EDITORIALE`; transform-aware blanking beyond the sentinel set. These can follow if needed.
