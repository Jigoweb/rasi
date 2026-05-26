# Matching Reliability — Phase 2 Addendum

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hardening Phase 0/1 utilities based on raw-file audit + replace Phase 2 with dual-key (strict/loose) architecture + alias-canonical fallback for IT/originale matching.

**Architecture:** Two `match_key` columns per row (`_strict` preserves sequel numbers / Roman numerals / `PARTE N`; `_loose` strips them). `opera_aliases` extended to carry canonical alternative titles (`titolo_originale`, `alias_titoli[]`) with `emittente_id=NULL`, removing the need for separate `_orig` columns. RPC cascades alias → ISAN → strict → loose → fuzzy.

**Tech Stack:** PostgreSQL 17 (pg_trgm, btree), TypeScript, Jest, Supabase. Mirrors TS regex in SQL functions.

**Supersedes:** Phase 2 of `2026-05-18-matching-reliability-optimization.md` (Tasks 2.1–2.5 — REPLACED). Phase 0.3 SQL `build_match_key` and Phase 0.4 `opera_aliases` backfill — EXTENDED (not replaced).

**Pre-flight assumption:** Phase 0 + Phase 1 already merged. Existing migrations not yet pushed (`supabase db push` happens at the end as one batch).

---

## Audit-derived facts informing this plan

Examined `/Users/matteo/Downloads/PROGRAMMAZIONI PURE/` (26 files, 22 broadcasters). Findings driving every task below:

| Finding | Affected broadcasters | Where addressed |
|---|---|---|
| Trailing plain digit (`MAKARI 2`, `IP MAN 2`, `UN POSTO AL SOLE 28`) — could be season OR sequel | RAI, SKY, Discovery, Amazon, Apple, Netflix | Task A.1 (dual key) |
| Trailing `ST.NN` season marker | LA7 | Task A.2 (normalize) |
| Trailing tag `- LA SERIE`, `- PILOTA`, `- PILLOLE`, `- SPECIALE`, `- STAGIONE FINALE`, `- p.NN` | SKY, Warner, Mediaset, TIMVision, RAI | Task A.2 |
| Prefix `FILM `, `DOCUMENTARIO `, `(Tv8) ` | TV2000, SKY | Task A.2 |
| Trailing article in parens `(LA)`, `(IL)`, `(THE)` (library cataloguing convention) | RTI CINE COMICO | Task A.2 |
| Special parens `(MOVIE)`, `(REPEAT VERSION)`, `(SEASON 1R)`, `(CHRISTMAS SPECIAL)` | Discovery | Task A.2 |
| NBSP `\xa0` in trailing whitespace | LA7, CHILI | Task A.2 |
| Mojibake `Ã©`, `â€"` (cp1252-as-utf8) | Apple TVOD | Task A.3 (transform) |
| Year range `1976-1980` | Discovery Warner | Task A.3 |
| `--` placeholder for missing values | Netflix | Task A.3 |
| Multiple sheets per file | Sony Culver (4), TIMVision (2) | Task A.4 (parser_config) |
| Header offset (data starts row 3-5) | CHILI, Italolive, VIACOM | Task A.4 |
| Tab-separated `.txt` | SKY (Cielo, Atlantic, TV8, Cinema Action) | Task A.4 |
| Fixed-width `.TXT` raw RTI feed | RTI 9156338 series | Task A.4 (manual columns) |
| Encoding mix (Windows-1252, ISO-8859-1, ASCII, UTF-8-SIG) | SKY, RAI, RTI, Netflix | Task A.4 |
| `TITOLO=Episodio 85` but real series is in `NOME_SERIE` column | TIMVision, Apple TVPlus | Task A.4 (`match_title_column`) |
| Two valid match candidates: IT title + Original title | Sky, Discovery, Sony, RTI | Task B.5 (canonical aliases) |

---

## File Structure

**Files to modify:**
- `src/features/programmazioni/utils/title-normalize.ts` — extend normalize + add `buildMatchKeyStrict`
- `src/features/programmazioni/utils/title-normalize.test.ts` — expand corpus
- `src/features/programmazioni/utils/transforms.ts` — add `mojibake_repair`, `nbsp_to_space`, `null_if_dashes`, `year_range_first`
- `src/features/programmazioni/utils/transforms.test.ts` — tests for new transforms
- `src/features/programmazioni/utils/parser-config.ts` — extend `ParserConfigV2` interface

**Files to create:**
- `supabase/migrations/<ts>_extend_build_match_key_strict_loose.sql`
- `supabase/migrations/<ts>_add_match_key_to_opere_dual.sql` (replaces single-key migration in Phase 0.3 — opere already deployed unilaterally here)
- `supabase/migrations/<ts>_add_match_keys_to_programmazioni.sql`
- `supabase/migrations/<ts>_backfill_programmazioni_match_keys.sql`
- `supabase/migrations/<ts>_index_match_keys_concurrently.sql`
- `supabase/migrations/<ts>_seed_canonical_aliases.sql`
- `supabase/migrations/<ts>_create_find_opera_candidates_rpc_v2.sql`
- `src/features/individuazioni/services/matching.service.ts`
- `src/features/individuazioni/services/matching.service.test.ts`

---

## Phase A — Hardening retroattivo Phase 0/1

These tasks update utilities already committed in Phase 0/1. They must run BEFORE Phase B so the SQL `build_match_key` mirrors the updated TS version.

### Task A.1: Add `buildMatchKeyStrict` variant (TDD)

**Files:**
- Modify: `src/features/programmazioni/utils/title-normalize.ts`
- Modify: `src/features/programmazioni/utils/title-normalize.test.ts`

**Why:** Current `buildMatchKey` collapses `SAW VI` → `saw` and `MAKARI 2` → `makari`. Catalog has 14 sequel-film opere with Roman numerals + many with trailing digits (`IP MAN 2`, `1941`). We need both views: strict (preserves them, matches sequels) and loose (strips them, matches season-N programmazioni against single-opera series).

- [ ] **Step 1: Add failing tests**

```typescript
// title-normalize.test.ts — append
describe('buildMatchKeyStrict', () => {
  it('preserves trailing Roman numerals', () => {
    expect(buildMatchKeyStrict('SAW VI', 2009)).toBe('saw vi::2009')
    expect(buildMatchKeyStrict('Lupin III', null)).toBe('lupin iii')
  })
  it('preserves trailing plain digits', () => {
    expect(buildMatchKeyStrict('IP MAN 2', 2010)).toBe('ip man 2::2010')
    expect(buildMatchKeyStrict('Makari 2', 2022)).toBe('makari 2::2022')
  })
  it('preserves PARTE N trail', () => {
    expect(buildMatchKeyStrict('Il Padrino - Parte 2', 1974)).toBe('padrino - parte 2::1974')
  })
  it('still strips edition/replica/season markers', () => {
    expect(buildMatchKeyStrict('Beautiful XXXIII (R)', 2022)).toBe('beautiful xxxiii::2022')
    expect(buildMatchKeyStrict('House Of The Dragon S.02', 2024)).toBe('house of the dragon::2024')
  })
})

describe('buildMatchKey (loose) — extended', () => {
  it('strips trailing plain digit (2+)', () => {
    expect(buildMatchKey('MAKARI 2', 2022)).toBe('makari::2022')
    expect(buildMatchKey('Ip Man 2', 2010)).toBe('ip man::2010')
    // single digit "0" preserved (real opera "8 1/2")
    expect(buildMatchKey('8 1/2', 1963)).toBe('8 1/2::1963')
  })
  it('strips trailing PARTE N', () => {
    expect(buildMatchKey('Il Padrino - Parte 2', 1974)).toBe('padrino::1974')
  })
})
```

- [ ] **Step 2: Run tests, expect FAIL**

`pnpm test src/features/programmazioni/utils/title-normalize.test.ts`

- [ ] **Step 3: Implement `buildMatchKeyStrict` + extend loose**

```typescript
// title-normalize.ts — add new exports + extend existing

const DIGIT_TRAIL = /\s+\d{1,3}\s*$/                     // "MAKARI 2", "UN POSTO AL SOLE 28"
const PARTE_TRAIL = /\s*-?\s*PARTE\s+\d+\s*$/i           // "- Parte 2", "PARTE 2"

/**
 * Strict match key: applies all noise-stripping EXCEPT romano/digit/PARTE trail.
 * Use case: find opere where the trailing number IS part of the canonical title
 * (sequel films "SAW VI", series-title-with-numeral "LUPIN III", numbered films "IP MAN 2").
 */
export function buildMatchKeyStrict(
  title: string | null | undefined,
  year?: number | null
): string {
  const cleaned = normalizeTitleStrict(title)
  const norm = cleaned.toLowerCase().replace(ARTICLES_RX, '').trim()
  return year ? `${norm}::${year}` : norm
}

/**
 * Strict normalize: same as normalizeTitle BUT keeps ROMAN_TRAIL, DIGIT_TRAIL, PARTE_TRAIL.
 * Exposed for tests + match_key_strict generation only — do NOT use as the user-facing title.
 */
export function normalizeTitleStrict(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return ''
  let s = raw.replace(/\xa0/g, ' ').trim()
  if (!s) return ''
  s = s.replace(EDITION_SQUARE, '')
       .replace(EDITION_PAREN, '')
       .replace(REPLICA_PAREN, '')
       .replace(SEASON_PAREN_R, '')         // (SEASON 1R), (SEASON 4)
       .replace(SEASON_TRAIL, '')           // S.NN, ST.NN
       .replace(EPISODE_TRAIL, '')
       .replace(EPISODIO_IT, '')
       .replace(PUNTATA_TRAIL, '')          // - p.NN
       .replace(SUFFIX_TAG_TRAIL, '')       // - LA SERIE / PILOTA / PILLOLE / SPECIALE / STAGIONE FINALE
       .replace(SPECIAL_PAREN, '')          // (MOVIE) (REPEAT VERSION) (ONE HOUR REPACK) (CHRISTMAS SPECIAL)
       .replace(CATEGORY_PREFIX, '')        // FILM / DOCUMENTARIO at start
       .replace(CHANNEL_PREFIX, '')         // (Tv8) at start
       .replace(/[‘’]/g, "'")
       .replace(/[“”]/g, '"')
       .replace(/\s+/g, ' ')
       .trim()
  // Trailing article-in-parens: "MADAMA (LA)" → "LA MADAMA"
  s = s.replace(ARTICLE_TRAIL_PAREN, (_m, w, art) => `${art} ${w}`).trim()
  return toTitleCase(s)
}

// Then normalizeTitle = normalizeTitleStrict + extra stripping:
export function normalizeTitle(raw: string | null | undefined): string {
  let s = normalizeTitleStrict(raw)
  if (!s) return ''
  s = s.replace(ROMAN_TRAIL, '')
       .replace(DIGIT_TRAIL, '')
       .replace(PARTE_TRAIL, '')
       .trim()
  return s
}
```

Add new regex constants (above the function):
```typescript
const SEASON_TRAIL = /\s+(?:S|ST)\.?\s*\d+\s*$/i        // S.02, ST.1, S02
const SEASON_PAREN_R = /\s*\(\s*SEASON\s+\d+R?\s*\)/gi  // (SEASON 4), (SEASON 1R)
const PUNTATA_TRAIL = /\s+-\s*p\.\s*\d+\s*$/i           // " - p.1", " - p.21"
const SUFFIX_TAG_TRAIL = /\s+-\s+(LA\s+SERIE|STAGIONE\s+FINALE|PILOTA|PILLOLE|SPECIALE)\s*$/i
const SPECIAL_PAREN = /\s*\(\s*(MOVIE|REPEAT\s+VERSION|ONE\s+HOUR\s+REPACK|CHRISTMAS\s+SPECIAL)\s*\)/gi
const CATEGORY_PREFIX = /^(FILM|DOCUMENTARIO)\s+/i
const CHANNEL_PREFIX = /^\(\s*[A-Za-z0-9]+\s*\)\s+/    // (Tv8), (Cielo)
const ARTICLE_TRAIL_PAREN = /^(.+?)\s+\((LA|IL|LE|LO|GLI|UN|UNO|UNA|I|THE)\)\s*$/i
```

- [ ] **Step 4: Run tests, expect PASS**

- [ ] **Step 5: Add idempotency tests** (the new patterns must also be idempotent)

```typescript
// title-normalize.test.ts — extend idempotency block
it('normalizeTitle idempotent on new patterns', () => {
  for (const x of [
    'FILM LA SACRA FAMIGLIA PARTE 2',
    'GOMORRA - LA SERIE',
    'House Of The Dragon ST.02',
    'MAKARI 2',
    'IL PARADISO DELLE SIGNORE DAILY 6',
    'MADAMA (LA)',
    'EARTH’S TROPICAL ISLANDS (R)',
    'La Squadra 4 - p.1                              ',
    '(Tv8) Anica Luglio 2024',
    'ER (E.R. - MEDICI IN PRIMA LINEA) - PILOTA',
  ]) {
    expect(normalizeTitle(normalizeTitle(x))).toBe(normalizeTitle(x))
  }
})
```

- [ ] **Step 6: Commit**

```bash
git add src/features/programmazioni/utils/title-normalize.ts src/features/programmazioni/utils/title-normalize.test.ts
git commit -m "feat(matching): add buildMatchKeyStrict + extend normalize with audit-derived patterns"
```

---

### Task A.2: New transforms — `mojibake_repair`, `nbsp_to_space`, `null_if_dashes`, `year_range_first` (TDD)

**Files:**
- Modify: `src/features/programmazioni/utils/transforms.ts`
- Modify: `src/features/programmazioni/utils/transforms.test.ts`

**Why:** Apple TVOD has 100% mojibake titles. Discovery Warner has year ranges. Netflix uses `--` as null sentinel. All four broadcasters need transforms before the matcher sees the data.

- [ ] **Step 1: Add failing tests**

```typescript
// transforms.test.ts — append
import { applyTransform } from './transforms'

describe('mojibake_repair', () => {
  it('repairs cp1252-as-utf8 mojibake (Italian è/é/ì)', () => {
    expect(applyTransform('mojibake_repair', 'BaarÃ¬a')).toBe('Baarìa')
    expect(applyTransform('mojibake_repair', "Une robe d'Ã©tÃ©")).toBe("Une robe d'été")
    expect(applyTransform('mojibake_repair', 'La scuola Ã¨ finita')).toBe('La scuola è finita')
  })
  it('repairs em/en-dash mojibake', () => {
    expect(applyTransform('mojibake_repair', 'Maze Runner â€" La rivelazione'))
      .toBe('Maze Runner – La rivelazione')
  })
  it('leaves clean strings untouched', () => {
    expect(applyTransform('mojibake_repair', 'Baarìa')).toBe('Baarìa')
    expect(applyTransform('mojibake_repair', 'House Of The Dragon')).toBe('House Of The Dragon')
  })
  it('leaves legitimate Ã not followed by mojibake bigram', () => {
    expect(applyTransform('mojibake_repair', 'BÃCH (Vietnamese surname)'))
      .toBe('BÃCH (Vietnamese surname)')
  })
  it('returns input on un-repairable string (safety gate)', () => {
    // String with mojibake marker but failed decode → keep original
    expect(applyTransform('mojibake_repair', 'Ã©\xff\xfe')).toBe('Ã©\xff\xfe')
  })
  it('handles null/empty', () => {
    expect(applyTransform('mojibake_repair', null)).toBe(null)
    expect(applyTransform('mojibake_repair', '')).toBe('')
  })
})

describe('nbsp_to_space', () => {
  it('replaces NBSP with regular space', () => {
    expect(applyTransform('nbsp_to_space', 'foo\xa0bar')).toBe('foo bar')
    expect(applyTransform('nbsp_to_space', 'a\xa0\xa0b')).toBe('a  b')
  })
})

describe('null_if_dashes', () => {
  it('returns null for double-dash or single-dash placeholder', () => {
    expect(applyTransform('null_if_dashes', '--')).toBe(null)
    expect(applyTransform('null_if_dashes', '-')).toBe(null)
    expect(applyTransform('null_if_dashes', ' -- ')).toBe(null)
  })
  it('preserves real values with dashes', () => {
    expect(applyTransform('null_if_dashes', '12-34')).toBe('12-34')
    expect(applyTransform('null_if_dashes', 'foo')).toBe('foo')
  })
})

describe('year_range_first', () => {
  it('extracts first year from range', () => {
    expect(applyTransform('year_range_first', '1976-1980')).toBe(1976)
    expect(applyTransform('year_range_first', '2010 - 2015')).toBe(2010)
  })
  it('passes single year through as number', () => {
    expect(applyTransform('year_range_first', '2024')).toBe(2024)
    expect(applyTransform('year_range_first', 2024)).toBe(2024)
  })
  it('returns null for unparseable', () => {
    expect(applyTransform('year_range_first', 'nan')).toBe(null)
    expect(applyTransform('year_range_first', '')).toBe(null)
  })
})
```

- [ ] **Step 2: Run tests, expect FAIL**

`pnpm test src/features/programmazioni/utils/transforms.test.ts`

- [ ] **Step 3: Implement transforms**

```typescript
// transforms.ts — append to TRANSFORMS registry

// Detect specific mojibake bigrams that don't occur in clean text
const MOJIBAKE_RX = /Ã[©¨¬²¹±¢¤]|â€[œ"™–"]/

TRANSFORMS.mojibake_repair = (v) => {
  if (v == null) return v
  if (typeof v !== 'string') return v
  if (!MOJIBAKE_RX.test(v)) return v
  try {
    // Round-trip: bytes treated as latin1 then decoded as utf-8 fixes cp1252-as-utf8 mojibake
    const repaired = Buffer.from(v, 'binary').toString('utf-8')
    // Safety: must not produce replacement char and must remove mojibake markers
    if (repaired.includes('�')) return v
    if (MOJIBAKE_RX.test(repaired)) return v
    return repaired
  } catch {
    return v
  }
}

TRANSFORMS.nbsp_to_space = (v) => {
  if (v == null || typeof v !== 'string') return v
  return v.replace(/\xa0/g, ' ')
}

TRANSFORMS.null_if_dashes = (v) => {
  if (v == null) return v
  const s = String(v).trim()
  if (s === '--' || s === '-') return null
  return v
}

TRANSFORMS.year_range_first = (v) => {
  if (v == null) return null
  const s = String(v).trim()
  if (!s || s === 'nan') return null
  const m = s.match(/(\d{4})/)
  if (!m) return null
  const y = Number(m[1])
  return Number.isFinite(y) ? y : null
}
```

Add to `TransformName` union: `'mojibake_repair' | 'nbsp_to_space' | 'null_if_dashes' | 'year_range_first'`.

- [ ] **Step 4: Run tests, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/features/programmazioni/utils/transforms.ts src/features/programmazioni/utils/transforms.test.ts
git commit -m "feat(matching): add mojibake_repair, nbsp_to_space, null_if_dashes, year_range_first transforms"
```

---

### Task A.3: Extend ParserConfigV2 — format/delimiter/encoding/sheets/fixed_width/match_title_column

**Files:**
- Modify: `src/features/programmazioni/utils/parser-config.ts`
- Modify: `src/features/programmazioni/utils/parser-config.test.ts`

**Why:** Audit identified per-file requirements: SKY needs `.txt` + tab delimiter + Windows-1252 encoding; CHILI needs `header_row=2`; Sony Culver has 4 sheets; TIMVision must match on `NOME_SERIE` column not `TITOLO`; RTI raw feed is fixed-width.

- [ ] **Step 1: Update interface + validator + migration helper**

```typescript
// parser-config.ts

export type ParserFormat = 'csv' | 'xlsx' | 'txt' | 'auto'
export type ParserDelimiter = ',' | ';' | '\t' | '|' | 'auto'
export type ParserEncoding = 'utf-8' | 'utf-8-sig' | 'Windows-1252' | 'ISO-8859-1' | 'ascii' | 'auto'

export interface FixedWidthColumn {
  name: string
  start: number   // 0-indexed inclusive
  end: number     // 0-indexed exclusive
}

export interface ParserConfigV2 {
  version: 2
  format?: ParserFormat              // default 'auto' (by file extension)
  delimiter?: ParserDelimiter        // default 'auto' (sniff first 1K chars)
  encoding?: ParserEncoding          // default 'auto' (chardet)
  header_row?: number                // 0-indexed; default 0
  sheets?: string[]                  // xlsx only; default = all sheets, exact or regex match
  fixed_width?: FixedWidthColumn[]   // when delimiter cannot be sniffed
  match_title_column?: string        // column name used for opera matching (default: same as 'titolo' mapping)
  commercial_skip_regex?: string     // skip rows where titolo matches this (e.g. "Anica Luglio")
  // existing fields:
  mapping: Record<string, string>    // dest_col -> source_col
  transforms?: Record<string, TransformName[]>  // dest_col -> ordered transform list
}
```

- [ ] **Step 2: Add validator tests + impl**

```typescript
// parser-config.test.ts — extend
describe('validateParserConfig — v2 extended', () => {
  it('accepts format/delimiter/encoding', () => {
    const cfg = { version: 2, format: 'txt', delimiter: '\t', encoding: 'Windows-1252', mapping: { titolo: 'col' } }
    expect(() => validateParserConfig(cfg)).not.toThrow()
  })
  it('rejects unknown delimiter', () => {
    expect(() => validateParserConfig({ version: 2, delimiter: '/', mapping: {} } as any)).toThrow(/delimiter/)
  })
  it('accepts header_row', () => {
    expect(() => validateParserConfig({ version: 2, header_row: 3, mapping: {} })).not.toThrow()
  })
  it('accepts sheets list', () => {
    expect(() => validateParserConfig({ version: 2, sheets: ['SVOD','TVOD'], mapping: {} })).not.toThrow()
  })
  it('accepts fixed_width column spec', () => {
    expect(() => validateParserConfig({ version: 2, fixed_width: [{ name: 'canale', start: 5, end: 7 }], mapping: {} })).not.toThrow()
  })
  it('rejects overlapping fixed_width columns', () => {
    expect(() => validateParserConfig({
      version: 2,
      fixed_width: [{ name: 'a', start: 0, end: 10 }, { name: 'b', start: 5, end: 15 }],
      mapping: {},
    })).toThrow(/overlap/)
  })
  it('accepts match_title_column', () => {
    expect(() => validateParserConfig({ version: 2, match_title_column: 'NOME_SERIE', mapping: { titolo: 'TITOLO' } })).not.toThrow()
  })
})
```

Update `validateParserConfig`:
```typescript
const VALID_DELIMITERS = new Set([',', ';', '\t', '|', 'auto'])
const VALID_FORMATS = new Set(['csv','xlsx','txt','auto'])
const VALID_ENCODINGS = new Set(['utf-8','utf-8-sig','Windows-1252','ISO-8859-1','ascii','auto'])

export function validateParserConfig(cfg: ParserConfigV2): void {
  if (cfg.version !== 2) throw new Error('parser_config: version must be 2')
  if (cfg.format && !VALID_FORMATS.has(cfg.format)) throw new Error(`parser_config: unknown format ${cfg.format}`)
  if (cfg.delimiter && !VALID_DELIMITERS.has(cfg.delimiter)) throw new Error(`parser_config: unknown delimiter ${cfg.delimiter}`)
  if (cfg.encoding && !VALID_ENCODINGS.has(cfg.encoding)) throw new Error(`parser_config: unknown encoding ${cfg.encoding}`)
  if (cfg.header_row != null && (!Number.isInteger(cfg.header_row) || cfg.header_row < 0)) {
    throw new Error('parser_config: header_row must be non-negative integer')
  }
  if (cfg.fixed_width) {
    const sorted = [...cfg.fixed_width].sort((a, b) => a.start - b.start)
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].start < sorted[i-1].end) {
        throw new Error(`parser_config: fixed_width columns overlap (${sorted[i-1].name}, ${sorted[i].name})`)
      }
    }
  }
  // existing mapping validation continues...
  if (!cfg.mapping || typeof cfg.mapping !== 'object') throw new Error('parser_config: mapping required')
}
```

- [ ] **Step 3: Run tests, expect PASS**

- [ ] **Step 4: Commit**

```bash
git add src/features/programmazioni/utils/parser-config.ts src/features/programmazioni/utils/parser-config.test.ts
git commit -m "feat(matching): extend ParserConfigV2 with format/delimiter/encoding/sheets/fixed_width/match_title_column"
```

---

### Task A.4: Sync SQL `build_match_key` with TS updates + add `build_match_key_strict`

**Files:**
- Create: `supabase/migrations/<ts>_extend_build_match_key_strict_loose.sql`

**Why:** SQL function lives in DB and must produce identical output to TS for join-based matching. Phase 0.3 migration is not yet pushed, so we replace it via `CREATE OR REPLACE`.

- [ ] **Step 1: Create migration**

```bash
cd /Users/matteo/rasi/.worktrees/matching-reliability
supabase migration new extend_build_match_key_strict_loose
```

- [ ] **Step 2: Write migration**

```sql
-- Replace build_match_key with the updated loose version, and add build_match_key_strict.
-- Both functions mirror the TS implementations exactly. If TS regex changes, this MUST change too.
--
-- ORDER of operations matters: the regex order here mirrors the TS chain in normalizeTitle.
-- See src/features/programmazioni/utils/title-normalize.ts for the canonical reference.

CREATE OR REPLACE FUNCTION public.build_match_key_strict(t text, y integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN t IS NULL OR length(trim(t)) = 0 THEN ''
    ELSE
      regexp_replace(
        lower(
          -- Move trailing article-in-parens to front: "MADAMA (LA)" → "LA MADAMA"
          regexp_replace(
            -- Collapse whitespace
            regexp_replace(
              -- Channel prefix "(Tv8) " at start
              regexp_replace(
                -- Category prefix "FILM "/"DOCUMENTARIO " at start
                regexp_replace(
                  -- Special parens (MOVIE)(REPEAT VERSION)(ONE HOUR REPACK)(CHRISTMAS SPECIAL)
                  regexp_replace(
                    -- Suffix tag trail: " - LA SERIE / PILOTA / PILLOLE / SPECIALE / STAGIONE FINALE"
                    regexp_replace(
                      -- Puntata trail " - p.NN"
                      regexp_replace(
                        -- EPISODIO_IT
                        regexp_replace(
                          -- EPISODE_TRAIL "Ep.NN"
                          regexp_replace(
                            -- SEASON_TRAIL extended to S.NN | ST.NN
                            regexp_replace(
                              -- SEASON_PAREN_R "(SEASON 4)" / "(SEASON 1R)"
                              regexp_replace(
                                -- REPLICA_PAREN
                                regexp_replace(
                                  -- EDITION_PAREN
                                  regexp_replace(
                                    -- EDITION_SQUARE
                                    regexp_replace(
                                      -- normalize quotes: typographic → ASCII
                                      translate(
                                        regexp_replace(
                                          replace(trim(t), E' ', ' '),  -- NBSP → space
                                          E'[‘’]', '''', 'g'),
                                        E'“”', '""'),
                                      '\s*\[\s*ED\.?\s*\d+\s*\]', '', 'gi'),
                                    '\s*\(\s*ED\.?\s*\d+\s*\)', '', 'gi'),
                                  '\s*\(\s*R(\s+\d+''?)?\s*\)', '', 'gi'),
                                '\s*\(\s*SEASON\s+\d+R?\s*\)', '', 'gi'),
                              '\s+(?:S|ST)\.?\s*\d+\s*$', '', 'i'),
                            '\s+EP\.?\s*\d+.*$', '', 'i'),
                          '\s+EPISODIO\s+\d+.*$', '', 'i'),
                        '\s+-\s*p\.\s*\d+\s*$', '', 'i'),
                      '\s+-\s+(LA\s+SERIE|STAGIONE\s+FINALE|PILOTA|PILLOLE|SPECIALE)\s*$', '', 'i'),
                    '\s*\(\s*(MOVIE|REPEAT\s+VERSION|ONE\s+HOUR\s+REPACK|CHRISTMAS\s+SPECIAL)\s*\)', '', 'gi'),
                  '^(FILM|DOCUMENTARIO)\s+', '', 'i'),
                '^\(\s*[A-Za-z0-9]+\s*\)\s+', '', 'i'),
              '\s+', ' ', 'g'),
            -- ARTICLE_TRAIL_PAREN: "(.+?) (LA|IL|LE|LO|GLI|UN|UNO|UNA|I|THE)$" → "\2 \1"
            '^(.+?)\s+\((LA|IL|LE|LO|GLI|UN|UNO|UNA|I|THE)\)\s*$', '\2 \1', 'i')
        ),
        '^(the|il|la|le|lo|gli|un|uno|una|i)\s+', '', 'i')
      || COALESCE('::' || y::text, '')
  END
$$;

-- Loose version: same as strict + strip ROMAN_TRAIL, DIGIT_TRAIL, PARTE_TRAIL
CREATE OR REPLACE FUNCTION public.build_match_key(t text, y integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT regexp_replace(
    regexp_replace(
      regexp_replace(
        -- start from strict, then strip roman/digit/parte
        regexp_replace(public.build_match_key_strict(t, NULL), '::.*$', ''),
        '\s+[ivx]{2,}\s*$', '', 'i'),
      '\s+\d{1,3}\s*$', '', 'i'),
    '\s*-?\s*parte\s+\d+\s*$', '', 'i')
  || COALESCE('::' || y::text, '')
$$;

COMMENT ON FUNCTION public.build_match_key_strict IS
  'Strict match key: keeps Roman/digit/PARTE trail. Mirrors TS buildMatchKeyStrict() in src/features/programmazioni/utils/title-normalize.ts';
COMMENT ON FUNCTION public.build_match_key IS
  'Loose match key: strips Roman/digit/PARTE trail. Mirrors TS buildMatchKey() in src/features/programmazioni/utils/title-normalize.ts';
```

- [ ] **Step 3: Smoke test mirror parity (manual, after push)**

```sql
-- Once pushed, validate parity with TS
SELECT
  build_match_key_strict('SAW VI', 2009) = 'saw vi::2009'    AS strict_saw_ok,
  build_match_key('SAW VI', 2009)        = 'saw::2009'       AS loose_saw_ok,
  build_match_key('MADAMA (LA)', NULL)   = 'la madama'       AS article_paren_ok,
  build_match_key('Beautiful XXXIII (R)', 2022) = 'beautiful::2022' AS replica_roman_ok,
  build_match_key('IL PARADISO DELLE SIGNORE DAILY 6', NULL) = 'paradiso delle signore daily' AS daily_n_ok;
```

- [ ] **Step 4: Commit (do NOT push yet)**

```bash
git add supabase/migrations/
git commit -m "feat(matching): SQL build_match_key strict/loose mirroring TS audit-derived patterns"
```

---

## Phase B — Dual-key architecture + canonical aliases + RPC

### Task B.1: Replace opere.match_key with strict + loose pair

**Files:**
- Create: `supabase/migrations/<ts>_opere_dual_match_keys.sql`

**Why:** Phase 0.3 migration (not yet pushed) added single `match_key`. Replace before push so opere has both columns from day 1.

- [ ] **Step 1: Create migration**

```bash
supabase migration new opere_dual_match_keys
```

- [ ] **Step 2: Write migration**

```sql
-- Replace single match_key with strict + loose pair on opere.
-- Safe to use ADD/DROP COLUMN here because Phase 0.3 has NOT been pushed yet.
-- If Phase 0.3 was already pushed in another env, this migration is idempotent via IF NOT EXISTS.

ALTER TABLE public.opere
  ADD COLUMN IF NOT EXISTS match_key_strict text,
  ADD COLUMN IF NOT EXISTS match_key_loose text;

-- Drop old single-column trigger if it exists
DROP TRIGGER IF EXISTS opere_match_key_sync ON public.opere;
DROP FUNCTION IF EXISTS public.trg_opere_sync_match_key();

CREATE OR REPLACE FUNCTION public.trg_opere_sync_match_keys()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.match_key_strict := public.build_match_key_strict(NEW.titolo, NEW.anno_produzione);
  NEW.match_key_loose  := public.build_match_key(NEW.titolo, NEW.anno_produzione);
  RETURN NEW;
END
$$;

CREATE TRIGGER opere_match_keys_sync
  BEFORE INSERT OR UPDATE OF titolo, anno_produzione ON public.opere
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_opere_sync_match_keys();

-- Backfill (7K rows, fast)
UPDATE public.opere
SET match_key_strict = public.build_match_key_strict(titolo, anno_produzione),
    match_key_loose  = public.build_match_key(titolo, anno_produzione);

-- Drop the old single match_key if it exists (we never pushed it)
ALTER TABLE public.opere DROP COLUMN IF EXISTS match_key;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_opere_match_key_strict
  ON public.opere(match_key_strict)
  WHERE match_key_strict IS NOT NULL AND match_key_strict <> '';

CREATE INDEX IF NOT EXISTS idx_opere_match_key_loose
  ON public.opere(match_key_loose)
  WHERE match_key_loose IS NOT NULL AND match_key_loose <> '';
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(matching): opere dual match_key_strict + match_key_loose with trigger and indexes"
```

---

### Task B.2: Add match_key_strict + match_key_loose to programmazioni

**Files:**
- Create: `supabase/migrations/<ts>_programmazioni_dual_match_keys.sql`

**Why:** 4M rows. `ADD COLUMN NULL` is fast (catalog-only change). Trigger handles new inserts. Backfill is a separate task.

- [ ] **Step 1: Create migration**

```bash
supabase migration new programmazioni_dual_match_keys
```

- [ ] **Step 2: Write migration**

```sql
ALTER TABLE public.programmazioni
  ADD COLUMN IF NOT EXISTS match_key_strict text,
  ADD COLUMN IF NOT EXISTS match_key_loose text;

CREATE OR REPLACE FUNCTION public.trg_programmazioni_sync_match_keys()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.match_key_strict := public.build_match_key_strict(NEW.titolo, NEW.anno);
  NEW.match_key_loose  := public.build_match_key(NEW.titolo, NEW.anno);
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS programmazioni_match_keys_sync ON public.programmazioni;
CREATE TRIGGER programmazioni_match_keys_sync
  BEFORE INSERT OR UPDATE OF titolo, anno ON public.programmazioni
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_programmazioni_sync_match_keys();
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(matching): programmazioni dual match_key columns + trigger (no backfill yet)"
```

---

### Task B.3: Backfill programmazioni.match_key_strict + match_key_loose in batches

**Files:**
- Create: `supabase/migrations/<ts>_backfill_programmazioni_dual_keys.sql`

**Why:** 4M rows. Run in 50K chunks to avoid lock contention. Expected runtime 10-20 min.

- [ ] **Step 1: Create migration**

```bash
supabase migration new backfill_programmazioni_dual_keys
```

- [ ] **Step 2: Write batched backfill**

```sql
DO $$
DECLARE
  v_batch_size CONSTANT integer := 50000;
  v_updated bigint := 0;
  v_total bigint := 0;
  v_iter integer := 0;
BEGIN
  LOOP
    v_iter := v_iter + 1;
    WITH to_update AS (
      SELECT id
      FROM public.programmazioni
      WHERE match_key_strict IS NULL OR match_key_loose IS NULL
      LIMIT v_batch_size
      FOR UPDATE SKIP LOCKED
    )
    UPDATE public.programmazioni p
    SET match_key_strict = public.build_match_key_strict(p.titolo, p.anno),
        match_key_loose  = public.build_match_key(p.titolo, p.anno)
    FROM to_update t
    WHERE p.id = t.id;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    v_total := v_total + v_updated;
    RAISE NOTICE 'Iter %: % rows (cumulative %)', v_iter, v_updated, v_total;
    EXIT WHEN v_updated = 0;
  END LOOP;
  RAISE NOTICE 'Backfill complete: % total rows', v_total;
END
$$;
```

- [ ] **Step 3: Verification query (post-push)**

```sql
SELECT
  COUNT(*) FILTER (WHERE match_key_strict IS NULL) AS null_strict,
  COUNT(*) FILTER (WHERE match_key_loose IS NULL) AS null_loose,
  COUNT(*) AS total
FROM programmazioni;
```
Expected: `null_strict = null_loose = 0`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "chore(matching): backfill programmazioni.match_key_strict + match_key_loose"
```

---

### Task B.4: Add CONCURRENT indexes on programmazioni match_key_strict + match_key_loose

**Files:**
- Create: `supabase/migrations/<ts>_index_programmazioni_dual_keys.sql`

**Why:** Lookup performance. CONCURRENTLY avoids write locks during the 30-60s index build on 4M rows.

- [ ] **Step 1: Create migration**

```bash
supabase migration new index_programmazioni_dual_keys
```

- [ ] **Step 2: Write migration**

```sql
-- These must run outside transactions; supabase migration runner handles this
-- when there's only one statement per file or via separate statements.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_programmazioni_match_key_strict
  ON public.programmazioni(match_key_strict)
  WHERE match_key_strict IS NOT NULL AND match_key_strict <> '';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_programmazioni_match_key_loose
  ON public.programmazioni(match_key_loose)
  WHERE match_key_loose IS NOT NULL AND match_key_loose <> '';
```

- [ ] **Step 3: Smoke test (post-push)**

```sql
EXPLAIN ANALYZE
SELECT id, titolo FROM programmazioni WHERE match_key_loose = 'beautiful::2022' LIMIT 100;
```
Expected: `Index Scan` on `idx_programmazioni_match_key_loose`. Time < 50ms.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "perf(matching): concurrent indexes on programmazioni dual match keys"
```

---

### Task B.5: Seed `opera_aliases` with canonical alternatives (titolo_originale + alias_titoli[])

**Files:**
- Create: `supabase/migrations/<ts>_seed_canonical_aliases.sql`

**Why:** Avoid 4 columns per row by using `opera_aliases` (existing table) as a global alias store. Cascade RPC checks aliases first, so `Sky Atlantic House Of The Dragon` (orig title) still finds opera even if the catalog's primary `titolo` is the Italian one.

- [ ] **Step 1: Create migration**

```bash
supabase migration new seed_canonical_aliases
```

- [ ] **Step 2: Write seed migration**

```sql
-- Pre-populate opera_aliases with canonical alternative titles from opere.
-- Two sources:
--   1. opere.titolo_originale (when different from titolo)
--   2. opere.alias_titoli[] (manual alias array)
-- All inserted with source='canonical', emittente_id=NULL, confidence=1.00.
-- Generates BOTH strict and loose keys for each alias.

-- Source 1: titolo_originale
INSERT INTO public.opera_aliases (
  opera_id, emittente_id, alias_titolo, alias_anno, source, confidence, hit_count
)
SELECT
  id,
  NULL,
  titolo_originale,
  anno_produzione,
  'canonical',
  1.00,
  0
FROM public.opere
WHERE titolo_originale IS NOT NULL
  AND length(trim(titolo_originale)) > 0
  AND lower(trim(titolo_originale)) <> lower(trim(titolo))
ON CONFLICT (opera_id, emittente_id, alias_titolo_norm, alias_anno) DO NOTHING;

-- Source 2: alias_titoli[] elements
INSERT INTO public.opera_aliases (
  opera_id, emittente_id, alias_titolo, alias_anno, source, confidence, hit_count
)
SELECT
  o.id,
  NULL,
  alias,
  o.anno_produzione,
  'canonical',
  1.00,
  0
FROM public.opere o,
     unnest(o.alias_titoli) AS alias
WHERE o.alias_titoli IS NOT NULL
  AND array_length(o.alias_titoli, 1) > 0
  AND length(trim(alias)) > 0
  AND lower(trim(alias)) <> lower(trim(o.titolo))
ON CONFLICT (opera_id, emittente_id, alias_titolo_norm, alias_anno) DO NOTHING;

-- We also need alias_titolo_norm to be BOTH strict and loose for fast lookup.
-- Since opera_aliases stores only one normalized form (via the existing trigger),
-- we add a separate column for the strict variant.
ALTER TABLE public.opera_aliases
  ADD COLUMN IF NOT EXISTS alias_titolo_norm_strict text;

-- Update trigger to populate both norm columns
DROP TRIGGER IF EXISTS opera_aliases_normalize ON public.opera_aliases;
DROP FUNCTION IF EXISTS public.trg_alias_normalize();

CREATE OR REPLACE FUNCTION public.trg_alias_normalize()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.alias_titolo_norm        := public.build_match_key(NEW.alias_titolo, NEW.alias_anno);
  NEW.alias_titolo_norm_strict := public.build_match_key_strict(NEW.alias_titolo, NEW.alias_anno);
  RETURN NEW;
END
$$;

CREATE TRIGGER opera_aliases_normalize
  BEFORE INSERT OR UPDATE OF alias_titolo, alias_anno ON public.opera_aliases
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_alias_normalize();

-- Backfill alias_titolo_norm_strict for already-inserted rows
UPDATE public.opera_aliases
SET alias_titolo_norm_strict = public.build_match_key_strict(alias_titolo, alias_anno)
WHERE alias_titolo_norm_strict IS NULL;

-- Index for strict lookup
CREATE INDEX IF NOT EXISTS idx_opera_aliases_lookup_strict
  ON public.opera_aliases(emittente_id, alias_titolo_norm_strict, alias_anno);
```

- [ ] **Step 3: Verification (post-push)**

```sql
SELECT source, COUNT(*) FROM opera_aliases GROUP BY source ORDER BY 1;
-- Expected: 'canonical' = some thousands, 'historical' = thousands (from Phase 0.4)
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(matching): seed canonical opera_aliases from titolo_originale + alias_titoli; add strict norm column"
```

---

### Task B.6: Hierarchical `find_opera_candidates` RPC v2

**Files:**
- Create: `supabase/migrations/<ts>_find_opera_candidates_v2.sql`

**Why:** 5-step cascade replacing the single-strategy original RPC. Each step uses an indexed lookup; only fuzzy fallback scans wider.

**Strategy order + confidence:**
1. `alias_emittente` — alias_titolo_norm match with emittente_id = prog.emittente_id (confidence 0.95-1.00 from row)
2. `alias_canonical` — same but emittente_id IS NULL (canonical aliases) (confidence 0.92)
3. `isan` / `imdb` — exact ID match from prog.metadati_trasmissione (confidence 1.00)
4. `match_key_strict` — opere.match_key_strict = prog.match_key_strict (confidence 0.90)
5. `match_key_loose` — opere.match_key_loose = prog.match_key_loose (confidence 0.85)
6. `fuzzy_trgm` — trigram similarity + year tolerance (confidence 0.50-0.80)

- [ ] **Step 1: Create migration**

```bash
supabase migration new find_opera_candidates_v2
```

- [ ] **Step 2: Write RPC**

```sql
DROP FUNCTION IF EXISTS public.find_opera_candidates(uuid, real, integer);

CREATE OR REPLACE FUNCTION public.find_opera_candidates(
  p_prog_id uuid,
  p_title_threshold real DEFAULT 0.4,
  p_max_results integer DEFAULT 10
)
RETURNS TABLE(
  opera_id uuid,
  strategy text,
  confidence numeric,
  signals jsonb
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_prog public.programmazioni%ROWTYPE;
BEGIN
  SELECT * INTO v_prog FROM public.programmazioni WHERE id = p_prog_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- 1. Alias emittente-scoped (strict OR loose key match, emittente exact)
  RETURN QUERY
  SELECT
    a.opera_id, 'alias_emittente'::text,
    LEAST(1.00, a.confidence)::numeric,
    jsonb_build_object('alias_id', a.id, 'hit_count', a.hit_count, 'source', a.source,
                       'matched_on', CASE WHEN a.alias_titolo_norm_strict = v_prog.match_key_strict
                                          THEN 'strict' ELSE 'loose' END)
  FROM public.opera_aliases a
  WHERE a.emittente_id = v_prog.emittente_id
    AND (a.alias_titolo_norm_strict = v_prog.match_key_strict
      OR a.alias_titolo_norm        = v_prog.match_key_loose)
  ORDER BY a.hit_count DESC, a.confidence DESC
  LIMIT 5;

  -- 2. Canonical alias (titolo_originale, alias_titoli[]) — emittente=NULL
  RETURN QUERY
  SELECT
    a.opera_id, 'alias_canonical'::text, 0.92::numeric,
    jsonb_build_object('alias_id', a.id, 'source', a.source,
                       'matched_on', CASE WHEN a.alias_titolo_norm_strict = v_prog.match_key_strict
                                          THEN 'strict' ELSE 'loose' END)
  FROM public.opera_aliases a
  WHERE a.emittente_id IS NULL
    AND (a.alias_titolo_norm_strict = v_prog.match_key_strict
      OR a.alias_titolo_norm        = v_prog.match_key_loose)
  LIMIT 5;

  -- 3. Canonical ID — ISAN
  IF v_prog.metadati_trasmissione ? 'codice_isan' THEN
    RETURN QUERY
    SELECT o.id, 'codice_isan'::text, 1.00::numeric,
           jsonb_build_object('codice_isan', o.codice_isan)
    FROM public.opere o
    WHERE o.codice_isan = (v_prog.metadati_trasmissione->>'codice_isan')
    LIMIT 3;
  END IF;

  -- 4. Canonical ID — IMDB
  IF v_prog.metadati_trasmissione ? 'imdb_tconst' THEN
    RETURN QUERY
    SELECT o.id, 'imdb_tconst'::text, 1.00::numeric,
           jsonb_build_object('imdb_tconst', o.imdb_tconst)
    FROM public.opere o
    WHERE o.imdb_tconst = (v_prog.metadati_trasmissione->>'imdb_tconst')
    LIMIT 3;
  END IF;

  -- 5. match_key_strict (preserves sequel/series-with-numeral identity)
  RETURN QUERY
  SELECT o.id, 'match_key_strict'::text, 0.90::numeric,
         jsonb_build_object('match_key', o.match_key_strict, 'titolo', o.titolo)
  FROM public.opere o
  WHERE o.match_key_strict = v_prog.match_key_strict
    AND v_prog.match_key_strict IS NOT NULL
    AND v_prog.match_key_strict <> ''
  LIMIT 5;

  -- 6. match_key_loose (collapses season-N onto canonical series)
  RETURN QUERY
  SELECT o.id, 'match_key_loose'::text, 0.85::numeric,
         jsonb_build_object('match_key', o.match_key_loose, 'titolo', o.titolo)
  FROM public.opere o
  WHERE o.match_key_loose = v_prog.match_key_loose
    AND v_prog.match_key_loose IS NOT NULL
    AND v_prog.match_key_loose <> ''
    AND v_prog.match_key_loose <> v_prog.match_key_strict  -- avoid duplicate of step 5
  LIMIT 5;

  -- 7. Fuzzy trigram fallback (with year tolerance ±3)
  RETURN QUERY
  SELECT o.id, 'fuzzy_trgm'::text,
         (0.50 + 0.30 * similarity(LOWER(o.titolo), LOWER(v_prog.titolo)))::numeric,
         jsonb_build_object(
           'similarity', ROUND(similarity(LOWER(o.titolo), LOWER(v_prog.titolo))::numeric, 3),
           'anno_diff',  COALESCE(ABS(o.anno_produzione - v_prog.anno), -1)
         )
  FROM public.opere o
  WHERE v_prog.titolo IS NOT NULL
    AND LOWER(o.titolo) % LOWER(v_prog.titolo)
    AND similarity(LOWER(o.titolo), LOWER(v_prog.titolo)) >= p_title_threshold
    AND (v_prog.anno IS NULL OR o.anno_produzione IS NULL
         OR ABS(o.anno_produzione - v_prog.anno) <= 3)
  ORDER BY similarity(LOWER(o.titolo), LOWER(v_prog.titolo)) DESC
  LIMIT p_max_results;

  RETURN;
END
$$;

COMMENT ON FUNCTION public.find_opera_candidates IS
  '7-step hierarchical opera matcher (alias_emittente → alias_canonical → ISAN → IMDB → match_key_strict → match_key_loose → fuzzy_trgm). Returns up to ~30 candidates ranked across strategies.';

GRANT EXECUTE ON FUNCTION public.find_opera_candidates TO authenticated;
```

- [ ] **Step 3: Smoke test (post-push)**

```sql
-- Test alias hit
WITH p AS (
  SELECT pr.id
  FROM programmazioni pr
  JOIN individuazioni i ON i.programmazione_id = pr.id
  LIMIT 1
)
SELECT * FROM find_opera_candidates((SELECT id FROM p));
-- Expected: alias_emittente or alias_canonical or match_key_loose row

-- Test no-match programmazione
SELECT * FROM find_opera_candidates(
  (SELECT id FROM programmazioni WHERE titolo IS NULL LIMIT 1)
);
-- Expected: 0 rows
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(matching): find_opera_candidates v2 with 7-step cascade (alias+canonical+ID+dual key+fuzzy)"
```

---

### Task B.7: Frontend `matching.service.ts` wrapper (TDD)

**Files:**
- Create: `src/features/individuazioni/services/matching.service.ts`
- Create: `src/features/individuazioni/services/matching.service.test.ts`

**Why:** Type-safe RPC wrapper + confidence classifier used by review-queue and import pipeline.

- [ ] **Step 1: Write failing tests**

```typescript
// matching.service.test.ts
import { findCandidates, classifyConfidence, autoMatchProgrammazione } from './matching.service'

jest.mock('@/shared/lib/supabase', () => ({
  supabase: { rpc: jest.fn() },
}))

import { supabase } from '@/shared/lib/supabase'

describe('classifyConfidence', () => {
  it('auto for >=0.85', () => {
    expect(classifyConfidence(0.85)).toBe('auto')
    expect(classifyConfidence(0.99)).toBe('auto')
  })
  it('review for 0.60–0.84', () => {
    expect(classifyConfidence(0.60)).toBe('review')
    expect(classifyConfidence(0.84)).toBe('review')
  })
  it('no_match below 0.60', () => {
    expect(classifyConfidence(0.59)).toBe('no_match')
  })
})

describe('findCandidates', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls RPC with prog id and returns typed candidates', async () => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({
      data: [{ opera_id: 'o1', strategy: 'match_key_strict', confidence: 0.90, signals: {} }],
      error: null,
    })
    const out = await findCandidates('prog-1')
    expect(supabase.rpc).toHaveBeenCalledWith('find_opera_candidates', expect.objectContaining({
      p_prog_id: 'prog-1', p_title_threshold: 0.4, p_max_results: 10,
    }))
    expect(out).toHaveLength(1)
    expect(out[0].strategy).toBe('match_key_strict')
  })

  it('throws on RPC error', async () => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: new Error('boom') })
    await expect(findCandidates('p')).rejects.toThrow(/boom/)
  })
})

describe('autoMatchProgrammazione', () => {
  it('returns matched=true needs_review=false for high-confidence top hit', async () => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({
      data: [{ opera_id: 'o1', strategy: 'alias_emittente', confidence: 1.00, signals: {} }],
      error: null,
    })
    const r = await autoMatchProgrammazione('p1')
    expect(r).toMatchObject({ matched: true, needs_review: false, opera_id: 'o1' })
  })
  it('returns needs_review=true for mid-confidence top hit', async () => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({
      data: [{ opera_id: 'o1', strategy: 'fuzzy_trgm', confidence: 0.70, signals: {} }],
      error: null,
    })
    const r = await autoMatchProgrammazione('p1')
    expect(r).toMatchObject({ matched: true, needs_review: true })
  })
  it('returns matched=false when no candidates', async () => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: [], error: null })
    const r = await autoMatchProgrammazione('p1')
    expect(r).toMatchObject({ matched: false, needs_review: false, confidence: 0 })
  })
})
```

- [ ] **Step 2: Run tests, expect FAIL**

`pnpm test src/features/individuazioni/services/matching.service.test.ts`

- [ ] **Step 3: Implement service**

```typescript
// matching.service.ts
import { supabase } from '@/shared/lib/supabase'

export type MatchStrategy =
  | 'alias_emittente'
  | 'alias_canonical'
  | 'codice_isan'
  | 'imdb_tconst'
  | 'match_key_strict'
  | 'match_key_loose'
  | 'fuzzy_trgm'

export interface Candidate {
  opera_id: string
  strategy: MatchStrategy
  confidence: number
  signals: Record<string, any>
}

export type ConfidenceClass = 'auto' | 'review' | 'no_match'

export function classifyConfidence(c: number): ConfidenceClass {
  if (c >= 0.85) return 'auto'
  if (c >= 0.60) return 'review'
  return 'no_match'
}

export async function findCandidates(progId: string): Promise<Candidate[]> {
  const { data, error } = await (supabase as any).rpc('find_opera_candidates', {
    p_prog_id: progId,
    p_title_threshold: 0.4,
    p_max_results: 10,
  })
  if (error) throw error
  return (data || []) as Candidate[]
}

export interface AutoMatchResult {
  matched: boolean
  opera_id?: string
  confidence: number
  needs_review: boolean
  strategy?: MatchStrategy
}

export async function autoMatchProgrammazione(progId: string): Promise<AutoMatchResult> {
  const candidates = await findCandidates(progId)
  const top = candidates[0]
  if (!top) return { matched: false, confidence: 0, needs_review: false }
  const cls = classifyConfidence(top.confidence)
  return {
    matched: cls !== 'no_match',
    opera_id: top.opera_id,
    confidence: top.confidence,
    strategy: top.strategy,
    needs_review: cls === 'review',
  }
}
```

- [ ] **Step 4: Run tests, expect PASS**

- [ ] **Step 5: Commit + tag**

```bash
git add src/features/individuazioni/services/matching.service.ts src/features/individuazioni/services/matching.service.test.ts
git commit -m "feat(matching): matching.service.ts wrapper for v2 hierarchical RPC + classifier"
git tag matching-phase-2-addendum
```

---

## Push checkpoint (manual, user-driven)

After all Phase A + Phase B tasks complete locally with green tests, batch-push migrations:

```bash
# Review pending migrations
ls supabase/migrations/ | sort

# Apply (long-running due to backfill — schedule outside peak hours)
supabase db push
```

Expected pushed migrations (in order):
1. Phase 0.3 SQL — `extend_build_match_key_strict_loose` (replaces it before push, so just one file)
2. Phase 0.4 — `create_opera_aliases` + `backfill_opera_aliases_from_individuazioni`
3. Phase 1.3 — `extend_emittenti_parser_config`
4. Phase B.1 — `opere_dual_match_keys`
5. Phase B.2 — `programmazioni_dual_match_keys`
6. Phase B.3 — `backfill_programmazioni_dual_keys` (10-20 min)
7. Phase B.4 — `index_programmazioni_dual_keys` (CONCURRENTLY, 30-60s)
8. Phase B.5 — `seed_canonical_aliases`
9. Phase B.6 — `find_opera_candidates_v2`

Run smoke tests from Task B.6 Step 3 after push.

---

## Self-Review checklist

**Spec coverage:**
- [x] Dual key strict/loose addresses Roman/digit/PARTE sequel vs season-N ambiguity
- [x] Canonical aliases (titolo_originale + alias_titoli[]) eliminate need for `_orig` columns
- [x] Mojibake repair as opt-in transform with safety gate
- [x] TXT generic support via parser_config (auto delimiter, optional fixed_width)
- [x] All audit-derived patterns added to normalize: ST.NN, suffix tags, prefix categoria, channel prefix, articolo-in-parens, special parens, NBSP
- [x] New transforms: mojibake_repair, nbsp_to_space, null_if_dashes, year_range_first
- [x] RPC 7-step cascade with confidence per strategy
- [x] Frontend service with TDD + classifier

**Placeholder scan:** none found.

**Type consistency:** `MatchStrategy` union matches RPC strategy strings exactly. `build_match_key_strict` / `build_match_key` SQL signatures align with TS exports.

**Missing tasks:** Phase 3+ (review queue, learning loop, metrics, alias inspector, mapping wizard) unchanged from original plan.

---

## Execution Handoff

Plan saved. After approval, execution options:
1. **Subagent-Driven** — fresh subagent per task, two-stage review
2. **Inline Execution** — current session, batch checkpoints

Recommend: subagent-driven for Tasks A.1–A.4 (touch existing code, need careful review), inline for B.1–B.7 (mostly new files, simpler).
