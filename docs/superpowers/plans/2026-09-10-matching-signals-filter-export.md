# Matching Signals Filter (Export + App) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Esporre i segnali di matching problematici come colonne `SI`/`NO` nell’export e come filtri multi-select OR/AND server-side nella UI dettaglio campagna.

**Architecture:** Catalogo puro `matching-signal-codes.ts` deriva flag booleani da `dettagli_matching` (+ campi episodio riga). Export e badge riusano `extractMatchingSignalFlags`. I filtri app applicano predicati PostgREST/JSONB via helper dedicato, combinati in OR/AND, dentro `getIndividuazioni`.

**Tech Stack:** TypeScript, Jest, Supabase JS (PostgREST JSONB filters), React (Checkbox + Popover).

**Spec:** `docs/superpowers/specs/2026-09-10-matching-signals-filter-export-design.md`

## Global Constraints

- Solo segnali problematici del catalogo MVP (niente ok/neutral in export/filtri).
- Valori Excel: `SI` | `NO`; header = label italiana del catalogo.
- Default modalità filtro: `OR`.
- Niente migrazioni DB / modifiche matcher SQL.
- Codici immutabili: `titolo_debole`, `titolo_originale_debole`, `anno_scostamento`, `anno_fuori_tolleranza`, `regia_incoerente`, `episodio_mancante`, `episodio_da_verificare`.

## File map

| File | Ruolo |
|------|--------|
| `src/features/individuazioni/utils/matching-signal-codes.ts` | Catalogo + `extractMatchingSignalFlags` |
| `src/features/individuazioni/utils/matching-signal-filters.ts` | Predicati PostgREST OR/AND |
| `src/features/individuazioni/services/individuazioni-export.service.ts` | Select `dettagli_matching` + colonne SI/NO |
| `src/features/individuazioni/services/individuazioni.service.ts` | Opzioni filtro segnale in `getIndividuazioni` |
| `src/app/dashboard/individuazioni/[id]/hooks/useIndividuazioneDetail.ts` | Stato filtri segnale |
| `src/app/dashboard/individuazioni/[id]/page.tsx` | UI multi-select + toggle OR/AND |
| `src/app/dashboard/individuazioni/[id]/components/IndividuazioniDetailTable.tsx` | Badge allineati al catalogo |

---

### Task 1: Catalogo segnali

**Files:**
- Create: `src/features/individuazioni/utils/matching-signal-codes.ts`
- Test: `src/features/individuazioni/utils/matching-signal-codes.test.ts`

**Interfaces:**
- Produces: `MatchingSignalCode`, `MATCHING_SIGNAL_CATALOG`, `extractMatchingSignalFlags(dettagli, row?)`, `formatSignalFlag(value)`, `getActiveMatchingSignalCodes(...)`

- [ ] **Step 1: Write failing tests** for empty payload, titolo debole, anno hard scarto vs scostamento, regia, episodio mancante, episodio da verificare (fallback + codice emittente), mutua esclusione episodio.

- [ ] **Step 2: Implement catalog + extractor** with soglie 70/60 allineate a `getSimilarityTone`.

- [ ] **Step 3: Run** `npx jest src/features/individuazioni/utils/matching-signal-codes.test.ts` — PASS

- [ ] **Step 4: Commit** `feat(individuazioni): catalogo codici segnali matching`

---

### Task 2: Export colonne SI/NO

**Files:**
- Modify: `individuazioni-export.service.ts`
- Modify: `individuazioni-export.service.test.ts`

- [ ] **Step 1: Failing tests** — export con `dettagli_matching` produce colonne label=`SI`/`NO`; senza dettagli tutte `NO`.

- [ ] **Step 2: Include** `dettagli_matching` in select export; merge flag in `formatIndividuazioniForExport`.

- [ ] **Step 3: Run export tests** — PASS

- [ ] **Step 4: Commit** `feat(individuazioni): colonne segnali matching in export`

---

### Task 3: Predicati filtro + service

**Files:**
- Create: `matching-signal-filters.ts` + test
- Modify: `individuazioni.service.ts` (`getIndividuazioni` options)

- [ ] **Step 1: Tests** builder OR/AND e selezione vuota = no-op.

- [ ] **Step 2: Implement** `applyMatchingSignalFilters(query, codes, mode)` usando path JSONB PostgREST coerenti col catalogo.

- [ ] **Step 3: Wire** `matchingSignalCodes?: MatchingSignalCode[]`, `matchingSignalMode?: 'or' | 'and'` in `getIndividuazioni`.

- [ ] **Step 4: Commit** `feat(individuazioni): filtri server-side segnali matching`

---

### Task 4: UI filtri + hook

**Files:**
- Modify: `useIndividuazioneDetail.ts`, `page.tsx`

- [ ] **Step 1: Stato** `matchingSignalCodes`, `matchingSignalMode` (default `or`) nel hook; passare a `getIndividuazioni`; reset page a 1 al cambio.

- [ ] **Step 2: UI** Popover multi-checkbox catalogo + Select/toggle OR|AND vicino ai filtri esistenti; reset filtri include segnali.

- [ ] **Step 3: Smoke** typecheck/lint file toccati.

- [ ] **Step 4: Commit** `feat(ui): filtri segnali matching OR/AND in dettaglio campagna`

---

### Task 5: Badge tabella

**Files:**
- Modify: `IndividuazioniDetailTable.tsx` (+ test se serve)

- [ ] **Step 1: `getReviewReasons`** usa `getActiveMatchingSignalCodes` / label catalogo; fallback stato se nessuno.

- [ ] **Step 2: Run** table + signal tests — PASS

- [ ] **Step 3: Commit** `fix(ui): badge revisione allineati ai segnali matching`

---

### Task 6: Verifica finale

- [ ] Run: `npx jest` sui path individuazioni segnali/export/table
- [ ] Update PR description
- [ ] Mark spec stato implementato nel commit docs se utile
