# Normalizzazione globale dati assenti — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalizzare i marcatori di dato assente (`N.D.`, `N/A`, `null`, `-`, `--`) a cella vuota, globalmente su tutte le colonne di tutti gli emittenti, e rimuovere i 4 transform `null_if_*`.

**Architecture:** Un modulo puro condiviso (`absent-data`, duplicato client+server per la build separata) espone `isAbsentMarker(value)`. Entrambi i path di apply (`applyMapping` client, `applyConfiguredMapping` server) azzerano il valore raw a `null` prima del transform per-colonna; la stessa funzione alimenta il blank-check delle regole coalesce. I 4 transform legacy vengono rimossi dal registry.

**Tech Stack:** TypeScript. Test client: Jest. Test server: `node:test` via `tsx`.

**Spec:** `docs/superpowers/specs/2026-07-07-normalizzazione-dati-assenti-import-design.md`

---

### Task 1: Modulo condiviso client `absent-data.ts`

**Files:**
- Create: `src/features/programmazioni/utils/absent-data.ts`
- Test: `src/features/programmazioni/utils/absent-data.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/programmazioni/utils/absent-data.test.ts
import { isAbsentMarker } from './absent-data'

describe('isAbsentMarker', () => {
  it('matches known markers, case-insensitive and trimmed', () => {
    expect(isAbsentMarker('N/A')).toBe(true)
    expect(isAbsentMarker(' n/a ')).toBe(true)
    expect(isAbsentMarker('NA')).toBe(true)
    expect(isAbsentMarker('N.D.')).toBe(true)
    expect(isAbsentMarker('n.d')).toBe(true)
    expect(isAbsentMarker('nd')).toBe(true)
    expect(isAbsentMarker('null')).toBe(true)
    expect(isAbsentMarker('-')).toBe(true)
    expect(isAbsentMarker('--')).toBe(true)
  })
  it('does not match substrings or real values', () => {
    expect(isAbsentMarker('The N/A Story')).toBe(false)
    expect(isAbsentMarker('12-34')).toBe(false)
    expect(isAbsentMarker('---')).toBe(false)
    expect(isAbsentMarker('Nashville')).toBe(false)
  })
  it('returns false for non-strings', () => {
    expect(isAbsentMarker(0)).toBe(false)
    expect(isAbsentMarker(null)).toBe(false)
    expect(isAbsentMarker(undefined)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/programmazioni/utils/absent-data.test.ts`
Expected: FAIL — cannot find module `./absent-data`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/features/programmazioni/utils/absent-data.ts
/**
 * Marcatori globali di "dato assente" per l'import programmazioni.
 *
 * Convenzioni universali (N.D., N/A, null, trattino) che indicano un valore
 * mancante nei file degli emittenti. Vengono normalizzate a cella vuota su
 * TUTTE le colonne di TUTTI gli emittenti, in fase di apply del mapping.
 *
 * Match su cella intera, trimmed, case-insensitive — mai su sottostringa.
 * La cella vuota/whitespace NON è qui: resta gestita da `coerce`.
 */
export const ABSENT_MARKERS: ReadonlySet<string> = new Set([
  'n/a', 'na',
  'n.d.', 'n.d', 'nd',
  'null',
  '-', '--',
])

/** True se il valore raw è un marcatore di dato assente (match cella intera). */
export function isAbsentMarker(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return ABSENT_MARKERS.has(value.trim().toLowerCase())
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/features/programmazioni/utils/absent-data.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/programmazioni/utils/absent-data.ts src/features/programmazioni/utils/absent-data.test.ts
git commit -m "feat(programmazioni): add global absent-marker matcher (client)"
```

---

### Task 2: Modulo condiviso server `absent-data.ts`

**Files:**
- Create: `server/src/lib/absent-data.ts`
- Test: `server/src/lib/absent-data.test.ts`

Contenuto identico al client (build separata, `server/src` non importa da `src/`). Il file di test è raccolto dal glob esistente `src/**/*.test.ts` dello script server (una dir sotto `src/`).

- [ ] **Step 1: Write the failing test**

```ts
// server/src/lib/absent-data.test.ts
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isAbsentMarker } from './absent-data.js'

describe('isAbsentMarker (server)', () => {
  it('matches known markers', () => {
    assert.equal(isAbsentMarker('N/A'), true)
    assert.equal(isAbsentMarker(' n.d. '), true)
    assert.equal(isAbsentMarker('null'), true)
    assert.equal(isAbsentMarker('--'), true)
  })
  it('ignores substrings and non-strings', () => {
    assert.equal(isAbsentMarker('The N/A Story'), false)
    assert.equal(isAbsentMarker('---'), false)
    assert.equal(isAbsentMarker(0), false)
    assert.equal(isAbsentMarker(null), false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix server test`
Expected: FAIL — cannot find module `./absent-data.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
// server/src/lib/absent-data.ts
/**
 * Marcatori globali di "dato assente" per l'import programmazioni (worker).
 * Copia server del modulo client `src/features/programmazioni/utils/absent-data.ts`
 * (build separata: `server/src` non importa da `src/`).
 *
 * Match su cella intera, trimmed, case-insensitive — mai su sottostringa.
 */
export const ABSENT_MARKERS: ReadonlySet<string> = new Set([
  'n/a', 'na',
  'n.d.', 'n.d', 'nd',
  'null',
  '-', '--',
])

/** True se il valore raw è un marcatore di dato assente (match cella intera). */
export function isAbsentMarker(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return ABSENT_MARKERS.has(value.trim().toLowerCase())
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix server test`
Expected: PASS (tutti i test server, inclusi i 2 nuovi).

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/absent-data.ts server/src/lib/absent-data.test.ts
git commit -m "feat(programmazioni): add global absent-marker matcher (server)"
```

---

### Task 3: Integrazione client — `applyMapping` + coalesce

**Files:**
- Modify: `src/features/programmazioni/services/import-mapping.service.ts`
- Test: `src/features/programmazioni/services/import-mapping.service.test.ts`

- [ ] **Step 1: Write the failing tests**

Aggiungi in fondo a `import-mapping.service.test.ts` (l'import di testa già include `applyMapping`, `FieldRule`):

```ts
describe('applyMapping absent-data normalization', () => {
  const ctx = { campagnaProgrammazioneId: 'c1', emittenteId: 'e1' }

  it('drops fields whose cell is a global absent-marker', () => {
    const rows = [{ TITOLO: 'Real Movie', REGIA: 'N/A', ANNO: '--' }]
    const mapping = { TITOLO: 'titolo', REGIA: 'regia', ANNO: 'anno' }
    const out = applyMapping(rows, mapping, ctx)
    expect(out[0].titolo).toBe('Real Movie')
    expect(out[0].regia).toBeUndefined()
    expect(out[0].anno).toBeUndefined()
  })

  it('skips a row whose titolo is an absent-marker', () => {
    const rows = [
      { TITOLO: 'N.D.', TIPO: 'film' },
      { TITOLO: 'Good One', TIPO: 'film' },
    ]
    const out = applyMapping(rows, { TITOLO: 'titolo', TIPO: 'tipo' }, ctx)
    expect(out).toHaveLength(1)
    expect(out[0].titolo).toBe('Good One')
  })

  it('coalesce rule falls through when first source is an absent-marker', () => {
    const rows = [{ A: 'null', B: 'Fallback Title' }]
    const rules: Record<string, FieldRule> = { titolo: { sources: ['A', 'B'] } }
    const out = applyMapping(rows, {}, ctx, rules)
    expect(out[0].titolo).toBe('Fallback Title')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/features/programmazioni/services/import-mapping.service.test.ts -t "absent-data"`
Expected: FAIL — `regia`/`anno` valorizzati con il marcatore, riga `N.D.` non scartata, coalesce non cade sulla sorgente B.

- [ ] **Step 3: Add the import**

In cima al file, dopo gli import esistenti dei `../utils/...`:

```ts
import { isAbsentMarker } from '../utils/absent-data'
```

- [ ] **Step 4: Null-out del marcatore prima del transform**

In `applyMapping`, sostituisci le tre righe attuali (registry lookup + applyTransform):

```ts
      const rawName = sourceCol ? transforms?.[sourceCol] : undefined
      const transformName = isKnownTransform(rawName) ? rawName : null
      const transformed = applyTransform(transformName, rawValue)
```

con:

```ts
      const rawName = sourceCol ? transforms?.[sourceCol] : undefined
      const transformName = isKnownTransform(rawName) ? rawName : null
      const cleaned = isAbsentMarker(rawValue) ? null : rawValue
      const transformed = applyTransform(transformName, cleaned)
```

- [ ] **Step 5: Allinea `isBlankValue` al set globale**

Sostituisci il blocco `BLANK_SENTINELS` + `isBlankValue` (attualmente basato su un set hardcoded) con:

```ts
/** True when a cell carries no usable value (empty/null or a global absent-marker). */
export function isBlankValue(v: unknown): boolean {
  if (v === null || v === undefined) return true
  if (String(v).trim() === '') return true
  return isAbsentMarker(v)
}
```

Rimuovi la riga `const BLANK_SENTINELS = new Set([...])` (non più usata).

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx jest src/features/programmazioni/services/import-mapping.service.test.ts`
Expected: PASS (nuovi test + tutti i pre-esistenti).

- [ ] **Step 7: Commit**

```bash
git add src/features/programmazioni/services/import-mapping.service.ts src/features/programmazioni/services/import-mapping.service.test.ts
git commit -m "feat(programmazioni): apply global absent-marker cleanup in applyMapping"
```

---

### Task 4: Integrazione server — `applyConfiguredMapping` + coalesce

**Files:**
- Modify: `server/src/jobs/programmazioni-import-core.ts`
- Test: `server/src/jobs/programmazioni-import-core.test.ts`

- [ ] **Step 1: Write the failing test**

Aggiungi in fondo a `programmazioni-import-core.test.ts`:

```ts
describe('programmazioni import core absent-data normalization', () => {
  const snapshot = {
    kind: 'apply_existing' as const,
    mapping: {
      version: 1 as const,
      colonne_rilevate: ['Titolo', 'Regia'],
      ultimo_upload: null,
      mapping: { Titolo: 'titolo', Regia: 'regia' },
    },
  }
  const ctx = { campagnaProgrammazioneId: 'c1', emittenteId: 'e1' }

  it('omits absent-marker fields and skips absent-marker titles', () => {
    const payloads = buildProgrammazioniPayloads(
      [
        { Titolo: 'Real', Regia: 'N/A' },
        { Titolo: 'N.D.', Regia: 'Someone' },
      ],
      snapshot,
      ctx,
    )
    assert.equal(payloads.length, 1)
    assert.equal(payloads[0].titolo, 'Real')
    assert.equal(payloads[0].regia, undefined)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix server test`
Expected: FAIL — `regia` = `Someone`/`N/A` non azzerata, riga `N.D.` non scartata.

- [ ] **Step 3: Add the import**

In cima al file, dopo l'import di `year-import.js`:

```ts
import { isAbsentMarker } from '../lib/absent-data.js'
```

- [ ] **Step 4: Null-out del marcatore prima del transform**

In `applyConfiguredMapping`, sostituisci:

```ts
    const transformed = applyTransform(sourceCol ? config.transforms?.[sourceCol] : undefined, rawValue)
```

con:

```ts
    const cleaned = isAbsentMarker(rawValue) ? null : rawValue
    const transformed = applyTransform(sourceCol ? config.transforms?.[sourceCol] : undefined, cleaned)
```

- [ ] **Step 5: Allinea `isBlankValue` al set globale**

Sostituisci la funzione `isBlankValue` (attualmente con set hardcoded inline):

```ts
function isBlankValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (String(value).trim() === '') return true
  return isAbsentMarker(value)
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm --prefix server test`
Expected: PASS (nuovo test + tutti i pre-esistenti).

- [ ] **Step 7: Commit**

```bash
git add server/src/jobs/programmazioni-import-core.ts server/src/jobs/programmazioni-import-core.test.ts
git commit -m "feat(programmazioni): apply global absent-marker cleanup in worker import"
```

---

### Task 5: Rimozione dei 4 transform `null_if_*` (client registry + test)

**Files:**
- Modify: `src/features/programmazioni/utils/transforms.ts`
- Modify: `src/features/programmazioni/utils/transforms.test.ts`

- [ ] **Step 1: Aggiorna i test per riflettere la rimozione**

In `transforms.test.ts`:

1. Elimina l'intero blocco `describe('null_if_NA / null_if_ND / null_if_NULL_str', ...)`.
2. Elimina l'intero blocco `describe('null_if_dashes', ...)`.
3. Nel test `transformsForField: campo senza transform dedicati → solo generici`, sostituisci:

```ts
    expect(t).toContain('null_if_NULL_str')
```

con:

```ts
    expect(t).toContain('mojibake_repair')
```

- [ ] **Step 2: Rimuovi i 4 transform dal registry**

In `transforms.ts`:

1. Nella union `TransformName`, elimina le righe `| 'null_if_NA'`, `| 'null_if_ND'`, `| 'null_if_NULL_str'`, `| 'null_if_dashes'`.
2. In `TRANSFORMS`, elimina le funzioni `null_if_NA`, `null_if_ND`, `null_if_NULL_str`, `null_if_dashes`.
3. In `TRANSFORM_LABELS`, elimina le 4 righe corrispondenti (`null_if_NA`, `null_if_ND`, `null_if_NULL_str`, `null_if_dashes`).
4. Sostituisci `GENERIC_TRANSFORMS`:

```ts
const GENERIC_TRANSFORMS: TransformName[] = [
  'mojibake_repair', 'nbsp_to_space',
]
```

- [ ] **Step 3: Run tests + typecheck to verify green**

Run: `npx jest src/features/programmazioni/utils/transforms.test.ts && npm run typecheck`
Expected: PASS; nessun errore TS (i 4 nomi non sono più referenziati altrove nel client).

- [ ] **Step 4: Commit**

```bash
git add src/features/programmazioni/utils/transforms.ts src/features/programmazioni/utils/transforms.test.ts
git commit -m "refactor(programmazioni): remove per-column null_if_* transforms"
```

---

### Task 6: Pulizia `applyTransform` server (ramo `null_if`)

**Files:**
- Modify: `server/src/jobs/programmazioni-import-core.ts`

- [ ] **Step 1: Rimuovi il ramo `null_if`**

In `applyTransform`, elimina il blocco:

```ts
  if (name.startsWith('null_if') && typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['na', 'n/a', 'nd', 'n.d.', 'null', '--', '-'].includes(normalized)) return null
  }
```

La funzione risultante:

```ts
function applyTransform(name: string | undefined, value: unknown): unknown {
  if (!name) return value
  if (name.includes('minutes') || name.includes('seconds') || name.includes('duration')) {
    return coerce('durata_minuti', value)
  }
  if (name.includes('date') || name.includes('iso')) {
    return value
  }
  return value
}
```

- [ ] **Step 2: Run server tests + typecheck**

Run: `npm run verify:server`
Expected: PASS (i marcatori sono già azzerati a monte in Task 4; nessuna regressione).

- [ ] **Step 3: Commit**

```bash
git add server/src/jobs/programmazioni-import-core.ts
git commit -m "refactor(programmazioni): drop null_if branch from worker applyTransform"
```

---

### Task 7: Verifica finale full-stack

**Files:** nessuna modifica (solo verifica).

- [ ] **Step 1: Lint + typecheck + test client + build + verifica server**

Run: `npm run verify`
Expected: tutti gli step verdi (`lint`, `typecheck`, `test`, `build`, `verify:server`).

- [ ] **Step 2: Se la build fallisce solo per motivi non correlati (working tree preesistente)**

Nota: il working tree contiene già molte modifiche non correlate. Se `npm run build` fallisce per file estranei a questo piano, isola la verifica ai soli ambiti toccati:

Run: `npx jest src/features/programmazioni && npm run verify:server`
Expected: PASS.

- [ ] **Step 3: Commit finale (solo se restano modifiche non committate di questo piano)**

```bash
git status --short
```

Se pulito rispetto al piano, nessun commit aggiuntivo necessario.
