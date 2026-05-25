# Matching Reliability Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase individuazione auto-match rate from current ~5% baseline to 30%+ by introducing title normalization, emittente-scoped learning aliases, hierarchical identity resolution, a review queue, and a metrics dashboard.

**Architecture:** Build incrementally on top of the existing `match_programmazione_to_partecipazioni` pipeline (which already uses `pg_trgm` similarity + weighted scoring). Add 5 new capabilities: (1) deterministic title normalization layer with a `match_key` column, (2) `opera_aliases` table with emittente scoping and a `hit_count` learning signal, (3) hierarchical candidate resolution that tries ID → alias → exact match_key → fuzzy → fallback, (4) review queue UI for ambiguous matches, (5) parser_config evolution from current `mapping_import` jsonb to support per-emittente transform pipelines.

**Tech Stack:** PostgreSQL 15 with pg_trgm + btree_gin, Supabase, Next.js 14 App Router, TypeScript, React 18, Vitest for tests, Papa Parse + xlsx for file parsing.

**Project context for the executing engineer:**
- This is RASI, a rights management platform for an Italian artist collecting society
- Tables involved: `opere` (7K rows), `programmazioni` (4M rows!), `individuazioni` (178K), `emittenti` (30), `campagne_individuazione` (52), `partecipazioni` (27K)
- Important: `programmazioni` has 4 million rows — never do full-table scans; always go through indexed paths or RPCs
- Existing key RPCs: `match_programmazione_to_partecipazioni`, `process_campagna_individuazione_optimized`, `search_opere_fuzzy`, `get_processing_progress`
- Existing pg_trgm indexes: `idx_opere_trgm_titolo`, `idx_opere_trgm_titolo_originale`, `idx_programmazioni_trgm_titolo`
- Frontend pattern: feature-folder organization under `src/features/<domain>/{services,utils,components}` + pages under `src/app/dashboard/<domain>/page.tsx`
- Service files cast `supabase as any` for tables/RPCs not in generated types — keep this pattern
- Test file convention: `*.test.ts` co-located with source file, run via `npm test`

**Migration policy:**
- All DB changes go through `supabase migration new <name>` then `supabase db push`
- Existing migrations live in `supabase/migrations/`
- Migrations are immutable once pushed; never rewrite a pushed migration — create a new one to amend

**Commit policy:**
- Conventional Commits: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`
- Each task ends with a commit covering only that task's changes
- Each phase ends with a tag: `git tag matching-phase-N`

---

## File Structure

This is the file layout the plan will create or modify. Each file has one clear responsibility.

### New files (created by this plan)

**Frontend utility:**
- `src/features/programmazioni/utils/title-normalize.ts` — `normalizeTitle()`, `buildMatchKey()`, `toTitleCase()`
- `src/features/programmazioni/utils/title-normalize.test.ts` — snapshot tests on real broadcaster titles
- `src/features/programmazioni/utils/transforms.ts` — typed transform registry (`hhmmss_to_minutes`, `xls_serial_to_date`, etc.)
- `src/features/programmazioni/utils/transforms.test.ts` — unit tests per transform
- `src/features/programmazioni/utils/parser-config.ts` — `ParserConfigV2` types, validators, migration helpers

**Frontend services:**
- `src/features/individuazioni/services/matching.service.ts` — orchestrates `find_opera_candidates` and `autoMatchProgrammazione`
- `src/features/individuazioni/services/matching.service.test.ts`
- `src/features/individuazioni/services/review-queue.service.ts` — CRUD over `individuazioni_review_queue`
- `src/features/opere/services/aliases.service.ts` — CRUD over `opera_aliases`
- `src/features/opere/services/aliases.service.test.ts`

**Frontend pages/components:**
- `src/app/dashboard/individuazioni/review/page.tsx` — review queue page
- `src/app/dashboard/individuazioni/review/components/CandidateCard.tsx`
- `src/app/dashboard/individuazioni/review/components/SignalBadges.tsx`
- `src/app/dashboard/individuazioni/review/components/BulkActions.tsx`
- `src/app/dashboard/individuazioni/metrics/page.tsx` — match rate dashboard
- `src/app/dashboard/opere/[id]/components/AliasInspector.tsx` — alias list with hit_count

**DB migrations** (under `supabase/migrations/`):
- `<ts>_add_pg_trgm_helpers_and_match_key.sql`
- `<ts>_create_opera_aliases.sql`
- `<ts>_backfill_opera_aliases_from_individuazioni.sql`
- `<ts>_add_match_key_to_programmazioni.sql`
- `<ts>_add_match_key_to_opere.sql`
- `<ts>_create_find_opera_candidates_rpc.sql`
- `<ts>_create_review_queue.sql`
- `<ts>_create_auto_match_rpc.sql`
- `<ts>_create_alias_learning_trigger.sql`
- `<ts>_create_matching_metrics_rpc.sql`
- `<ts>_extend_emittenti_parser_config.sql`

### Files modified

- `src/features/programmazioni/services/import-mapping.service.ts` — apply `normalizeTitle` in `applyMapping`, read `parser_config` jsonb
- `src/features/programmazioni/utils/coercion.ts` — extend `coerce()` to accept transform name passthrough
- `src/features/individuazioni/services/individuazioni.service.ts` — call new matching RPC
- `src/app/dashboard/programmazioni/components/MappingWizard.tsx` — add transform dropdown per column
- `src/app/dashboard/individuazioni/page.tsx` — add link to review queue, confidence filter
- `src/app/dashboard/opere/[id]/page.tsx` — render `AliasInspector`

---

## Phase 0 — Quick Wins (Week 1)

Three atomic PRs. Maximum ROI before architecture work. Each PR independent and deployable.

### Task 0.1: Title normalization utility (TDD)

**Files:**
- Create: `src/features/programmazioni/utils/title-normalize.ts`
- Create: `src/features/programmazioni/utils/title-normalize.test.ts`

- [ ] **Step 1: Write the failing test file**

Create `src/features/programmazioni/utils/title-normalize.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { normalizeTitle, buildMatchKey, toTitleCase } from './title-normalize'

describe('toTitleCase', () => {
  it('converts ALL CAPS to Title Case', () => {
    expect(toTitleCase('MIO FRATELLO RINCORRE I DINOSAURI'))
      .toBe('Mio Fratello Rincorre I Dinosauri')
  })
  it('preserves already-cased strings', () => {
    expect(toTitleCase('Mio Fratello')).toBe('Mio Fratello')
  })
  it('returns empty string for null/undefined', () => {
    expect(toTitleCase(null as any)).toBe('')
    expect(toTitleCase(undefined as any)).toBe('')
  })
})

describe('normalizeTitle', () => {
  it('strips edition suffix [ED. 2]', () => {
    expect(normalizeTitle('8 1/2 [ED. 2]')).toBe('8 1/2')
  })
  it('strips edition suffix (ED.3)', () => {
    expect(normalizeTitle('Film X (ED.3)')).toBe('Film X')
  })
  it('strips replica marker (R)', () => {
    expect(normalizeTitle('Beautiful XXXIII (R)')).toBe('Beautiful')
  })
  it("strips replica marker (R 240')", () => {
    expect(normalizeTitle("Big Pacific (R 240')")).toBe('Big Pacific')
  })
  it('strips trailing season marker S.02', () => {
    expect(normalizeTitle('House of the Dragon S.02')).toBe('House of the Dragon')
  })
  it('strips (SEASON 4) paren marker', () => {
    expect(normalizeTitle('Astrid et Raphaelle (SEASON 4)'))
      .toBe('Astrid Et Raphaelle')
  })
  it('strips trailing roman numerals', () => {
    expect(normalizeTitle('Beautiful XXXIII')).toBe('Beautiful')
  })
  it('strips trailing Ep.NN', () => {
    expect(normalizeTitle('Gomorra Ep.01')).toBe('Gomorra')
  })
  it('normalizes typographic quotes', () => {
    expect(normalizeTitle("L'ordine del tempo")).toBe("L'ordine Del Tempo")
  })
  it('collapses whitespace', () => {
    expect(normalizeTitle('Foo    Bar   Baz')).toBe('Foo Bar Baz')
  })
  it('returns empty string for null/undefined/empty', () => {
    expect(normalizeTitle(null)).toBe('')
    expect(normalizeTitle(undefined)).toBe('')
    expect(normalizeTitle('')).toBe('')
  })
})

describe('buildMatchKey', () => {
  it('lowercases and strips articles', () => {
    expect(buildMatchKey('The Snoopy Show', 2022)).toBe('snoopy show::2022')
  })
  it('strips italian articles', () => {
    expect(buildMatchKey("La Storia Della Salvezza", 2018))
      .toBe('storia della salvezza::2018')
  })
  it('produces no year suffix when year is null', () => {
    expect(buildMatchKey('The Plane', null)).toBe('plane')
  })
  it('treats undefined year same as null', () => {
    expect(buildMatchKey('Some Title')).toBe('some title')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/programmazioni/utils/title-normalize.test.ts`
Expected: FAIL with "Cannot find module './title-normalize'" or similar.

- [ ] **Step 3: Write the implementation**

Create `src/features/programmazioni/utils/title-normalize.ts`:

```typescript
/**
 * Title normalization utility for matching individuazioni.
 *
 * Goal: deterministic, idempotent cleanup of broadcaster-supplied titles
 * so the same logical work matches itself across different sources.
 *
 * Used in: import pipeline (applyMapping) and client-side opera search.
 * Mirror in DB: build_match_key() SQL function (see Phase 2 migration).
 */

const ARTICLES_RX = /^(the|il|la|le|lo|gli|un|uno|una|i)\s+/i
const EDITION_SQUARE = /\s*\[\s*ED\.?\s*\d+\s*\]/gi
const EDITION_PAREN = /\s*\(\s*ED\.?\s*\d+\s*\)/gi
const REPLICA_PAREN = /\s*\(\s*R(\s+\d+'?)?\s*\)/gi
const SEASON_TRAIL = /\s+S\.?\s*\d+\s*$/i
const SEASON_PAREN = /\s*\(\s*SEASON\s+\d+\s*\)/gi
const ROMAN_TRAIL = /\s+[IVX]{2,}\s*$/i
const EPISODE_TRAIL = /\s+EP\.?\s*\d+.*$/i
const EPISODIO_IT = /\s+EPISODIO\s+\d+.*$/i

/**
 * Title-case a string if it appears to be ALL CAPS.
 * Heuristic: <40% of letters are lowercase → apply title case.
 * Preserves intentionally-cased strings.
 */
export function toTitleCase(str: string | null | undefined): string {
  if (!str || typeof str !== 'string') return ''
  const totalLetters = (str.match(/[a-zA-Z]/g) || []).length
  if (totalLetters === 0) return str
  const lowerCount = (str.match(/[a-z]/g) || []).length
  if (lowerCount / totalLetters >= 0.4) return str
  return str.toLowerCase().replace(/(?:^|\s|[-–(])\S/g, c => c.toUpperCase())
}

/**
 * Strip broadcaster-specific cruft and normalize a title.
 * Idempotent: normalizeTitle(normalizeTitle(x)) === normalizeTitle(x).
 */
export function normalizeTitle(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return ''
  let s = raw.trim()
  if (!s) return ''
  s = s.replace(EDITION_SQUARE, '')
       .replace(EDITION_PAREN, '')
       .replace(REPLICA_PAREN, '')
       .replace(SEASON_PAREN, '')
       .replace(SEASON_TRAIL, '')
       .replace(EPISODE_TRAIL, '')
       .replace(EPISODIO_IT, '')
       .replace(ROMAN_TRAIL, '')
       .replace(/['']/g, "'")
       .replace(/[""]/g, '"')
       .replace(/\s+/g, ' ')
       .trim()
  return toTitleCase(s)
}

/**
 * Build a deterministic match key for joining programmazioni and opere.
 * Lowercase, strip leading articles, append ::year when present.
 */
export function buildMatchKey(
  title: string | null | undefined,
  year?: number | null
): string {
  const norm = normalizeTitle(title).toLowerCase().replace(ARTICLES_RX, '').trim()
  return year ? `${norm}::${year}` : norm
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/programmazioni/utils/title-normalize.test.ts`
Expected: PASS, all assertions green.

- [ ] **Step 5: Commit**

```bash
git add src/features/programmazioni/utils/title-normalize.ts src/features/programmazioni/utils/title-normalize.test.ts
git commit -m "feat(matching): add deterministic title normalization utility"
```

---

### Task 0.2: Apply normalization in import pipeline

**Files:**
- Modify: `src/features/programmazioni/services/import-mapping.service.ts`
- Create: `src/features/programmazioni/services/import-mapping.service.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/programmazioni/services/import-mapping.service.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { applyMapping } from './import-mapping.service'

describe('applyMapping with title normalization', () => {
  const ctx = { campagnaProgrammazioneId: 'c1', emittenteId: 'e1' }

  it('normalizes ALL CAPS titles', () => {
    const rows = [{ TITOLO: 'BEAUTIFUL XXXIII', TIPO: 'serie' }]
    const mapping = { TITOLO: 'titolo', TIPO: 'tipo' }
    const out = applyMapping(rows, mapping, ctx)
    expect(out[0].titolo).toBe('Beautiful')
  })

  it('strips edition markers', () => {
    const rows = [{ TITOLO: '8 1/2 [ED. 2]', TIPO: 'film' }]
    const out = applyMapping(rows, { TITOLO: 'titolo', TIPO: 'tipo' }, ctx)
    expect(out[0].titolo).toBe('8 1/2')
  })

  it('normalizes titolo_originale and titolo_episodio', () => {
    const rows = [{
      T: 'HOUSE OF THE DRAGON S.02',
      TO: 'HOUSE OF THE DRAGON',
      TE: 'RHAENYRA LA CRUDELE',
      TIPO: 'serie',
    }]
    const mapping = {
      T: 'titolo',
      TO: 'titolo_originale',
      TE: 'titolo_episodio',
      TIPO: 'tipo',
    }
    const out = applyMapping(rows, mapping, ctx)
    expect(out[0].titolo).toBe('House Of The Dragon')
    expect(out[0].titolo_originale).toBe('House Of The Dragon')
    expect(out[0].titolo_episodio).toBe('Rhaenyra La Crudele')
  })

  it('drops rows without a title even after normalization', () => {
    const rows = [{ TITOLO: '', TIPO: 'film' }, { TITOLO: 'Valid', TIPO: 'film' }]
    const out = applyMapping(rows, { TITOLO: 'titolo', TIPO: 'tipo' }, ctx)
    expect(out).toHaveLength(1)
    expect(out[0].titolo).toBe('Valid')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/programmazioni/services/import-mapping.service.test.ts`
Expected: FAIL — current `applyMapping` does not normalize titles.

- [ ] **Step 3: Wire normalization into applyMapping**

Open `src/features/programmazioni/services/import-mapping.service.ts`. Add import at the top:

```typescript
import { normalizeTitle } from '../utils/title-normalize'
```

Find the `applyMapping` function. After the line `if (coerced !== undefined) { payload[field] = coerced }` add a normalization pass right before `if (!payload.titolo) continue`:

```typescript
    // Normalize title-like fields after coercion
    for (const f of ['titolo', 'titolo_originale', 'titolo_episodio', 'titolo_episodio_originale'] as const) {
      if (typeof payload[f] === 'string') {
        const normalized = normalizeTitle(payload[f])
        if (normalized) payload[f] = normalized
        else delete payload[f]
      }
    }
```

Apply the same change to `buildLegacyPayload` right before its `if (!payload.titolo) continue` line.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/programmazioni/services/import-mapping.service.test.ts`
Expected: PASS.

- [ ] **Step 5: Run full test suite to verify no regressions**

Run: `npm test`
Expected: All existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/programmazioni/services/import-mapping.service.ts src/features/programmazioni/services/import-mapping.service.test.ts
git commit -m "feat(matching): apply title normalization in import pipeline"
```

---

### Task 0.3: DB-side build_match_key function + indexes

**Files:**
- Create: `supabase/migrations/<ts>_add_pg_trgm_helpers_and_match_key.sql`

- [ ] **Step 1: Create migration**

Run: `cd /Users/matteo/rasi && supabase migration new add_pg_trgm_helpers_and_match_key`

This creates a file like `supabase/migrations/20260518120000_add_pg_trgm_helpers_and_match_key.sql`.

- [ ] **Step 2: Write migration SQL**

Edit the new migration file:

```sql
-- pg_trgm is already installed; this migration adds:
--   1. build_match_key(text, integer) SQL helper (mirrors TS normalizeTitle)
--   2. opere.match_key column + trigger + btree index
-- Programmazioni.match_key follows in a separate migration (Phase 2)
-- to avoid a long-running UPDATE on the 4M row table in this phase.

-- ─── build_match_key SQL helper ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.build_match_key(t text, y integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN t IS NULL OR length(trim(t)) = 0 THEN ''
    ELSE
      lower(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(
                      regexp_replace(trim(t),
                        '\s*\[\s*ED\.?\s*\d+\s*\]', '', 'gi'),
                      '\s*\(\s*ED\.?\s*\d+\s*\)', '', 'gi'),
                    '\s*\(\s*R(\s+\d+''?)?\s*\)', '', 'gi'),
                  '\s+S\.?\s*\d+\s*$', '', 'i'),
                '\s*\(\s*SEASON\s+\d+\s*\)', '', 'gi'),
              '\s+EP\.?\s*\d+.*$', '', 'i'),
            '\s+', ' ', 'g'),
          '^(the|il|la|le|lo|gli|un|uno|una|i)\s+', '', 'i')
      ) || COALESCE('::' || y::text, '')
  END
$$;

COMMENT ON FUNCTION public.build_match_key IS
  'Deterministic match key for matching programmazioni to opere. Mirrored in TS at src/features/programmazioni/utils/title-normalize.ts (buildMatchKey).';

-- ─── opere.match_key column ────────────────────────────────────────────────
ALTER TABLE public.opere
  ADD COLUMN IF NOT EXISTS match_key text;

CREATE OR REPLACE FUNCTION public.trg_opere_sync_match_key()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.match_key := public.build_match_key(NEW.titolo, NEW.anno_produzione);
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS opere_match_key_sync ON public.opere;
CREATE TRIGGER opere_match_key_sync
  BEFORE INSERT OR UPDATE OF titolo, anno_produzione ON public.opere
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_opere_sync_match_key();

-- Backfill (7K rows, fast)
UPDATE public.opere
SET match_key = public.build_match_key(titolo, anno_produzione);

-- Index for exact lookup
CREATE INDEX IF NOT EXISTS idx_opere_match_key
  ON public.opere(match_key)
  WHERE match_key IS NOT NULL AND match_key <> '';
```

- [ ] **Step 3: Apply migration locally and verify**

Run: `supabase db push`
Expected: Migration applies successfully.

Then verify with a smoke test query via MCP:

```sql
SELECT
  titolo,
  anno_produzione,
  match_key
FROM opere
WHERE titolo ILIKE '%fratello%'
LIMIT 5;
```

Expected: `match_key` populated with lowercase normalized form, e.g. `mio fratello rincorre i dinosauri::2019`.

- [ ] **Step 4: Verify index is used**

Via MCP `execute_sql`:

```sql
EXPLAIN ANALYZE
SELECT id, titolo FROM opere WHERE match_key = 'plane::2023';
```

Expected: Plan uses `idx_opere_match_key` (Index Scan, not Seq Scan).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(matching): add build_match_key SQL helper and opere.match_key column"
```

---

### Task 0.4: opera_aliases table + historical backfill

**Files:**
- Create: `supabase/migrations/<ts>_create_opera_aliases.sql`
- Create: `supabase/migrations/<ts>_backfill_opera_aliases.sql`

- [ ] **Step 1: Create first migration**

Run: `supabase migration new create_opera_aliases`

- [ ] **Step 2: Write opera_aliases schema**

```sql
-- opera_aliases: learned mappings from programmazione titles to opere,
-- scoped by emittente (so the same alias can map differently per emittente).

CREATE TABLE IF NOT EXISTS public.opera_aliases (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  opera_id uuid NOT NULL
    REFERENCES public.opere(id) ON DELETE CASCADE,
  emittente_id uuid
    REFERENCES public.emittenti(id) ON DELETE CASCADE,
  alias_titolo text NOT NULL,
  alias_titolo_norm text NOT NULL,
  alias_anno integer,
  source text NOT NULL
    CHECK (source IN ('manual', 'auto', 'historical', 'api'))
    DEFAULT 'manual',
  confidence numeric(3,2) NOT NULL DEFAULT 1.00
    CHECK (confidence >= 0 AND confidence <= 1),
  hit_count integer NOT NULL DEFAULT 0,
  last_hit_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(opera_id, emittente_id, alias_titolo_norm, alias_anno)
);

COMMENT ON TABLE public.opera_aliases IS
  'Emittente-scoped title aliases used by find_opera_candidates RPC to short-circuit fuzzy matching. Populated by manual review resolution and historical backfill.';

-- Trigger to keep alias_titolo_norm in sync with alias_titolo + alias_anno
CREATE OR REPLACE FUNCTION public.trg_alias_normalize()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.alias_titolo_norm := public.build_match_key(NEW.alias_titolo, NEW.alias_anno);
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS opera_aliases_normalize ON public.opera_aliases;
CREATE TRIGGER opera_aliases_normalize
  BEFORE INSERT OR UPDATE OF alias_titolo, alias_anno ON public.opera_aliases
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_alias_normalize();

-- Lookup index used by find_opera_candidates
CREATE INDEX IF NOT EXISTS idx_opera_aliases_lookup
  ON public.opera_aliases(emittente_id, alias_titolo_norm, alias_anno);

-- Index for hit_count sorting in alias inspector UI
CREATE INDEX IF NOT EXISTS idx_opera_aliases_opera_hits
  ON public.opera_aliases(opera_id, hit_count DESC);

-- RLS policies
ALTER TABLE public.opera_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY opera_aliases_read_all
  ON public.opera_aliases FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY opera_aliases_write_admin
  ON public.opera_aliases FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

- [ ] **Step 3: Apply and verify**

Run: `supabase db push`

Verify via MCP:
```sql
SELECT COUNT(*) FROM opera_aliases;
```
Expected: 0 (empty table).

Verify trigger:
```sql
INSERT INTO opera_aliases (opera_id, emittente_id, alias_titolo, alias_anno)
SELECT (SELECT id FROM opere LIMIT 1), (SELECT id FROM emittenti LIMIT 1), 'THE TEST SHOW S.01', 2024;

SELECT alias_titolo_norm FROM opera_aliases WHERE alias_titolo = 'THE TEST SHOW S.01';
-- Expected: 'test show::2024'

DELETE FROM opera_aliases WHERE alias_titolo = 'THE TEST SHOW S.01';
```

- [ ] **Step 4: Create backfill migration**

Run: `supabase migration new backfill_opera_aliases_from_individuazioni`

Write:

```sql
-- Backfill aliases from existing individuazioni: each (emittente, prog title, prog year, opera_id)
-- triple becomes an alias with confidence 0.95 (high but not 1.0, since some are wrong).

INSERT INTO public.opera_aliases (
  opera_id, emittente_id, alias_titolo, alias_anno, source, confidence, hit_count, created_at
)
SELECT
  i.opera_id,
  p.emittente_id,
  p.titolo,
  p.anno,
  'historical',
  0.95,
  COUNT(*) AS hits,
  MIN(i.created_at) AS first_seen
FROM public.individuazioni i
JOIN public.programmazioni p ON p.id = i.programmazione_id
WHERE i.opera_id IS NOT NULL
  AND p.titolo IS NOT NULL
  AND length(trim(p.titolo)) > 0
GROUP BY i.opera_id, p.emittente_id, p.titolo, p.anno
ON CONFLICT (opera_id, emittente_id, alias_titolo_norm, alias_anno) DO NOTHING;
```

- [ ] **Step 5: Apply and verify**

Run: `supabase db push`

Verify via MCP:
```sql
SELECT
  COUNT(*) AS total_aliases,
  COUNT(DISTINCT opera_id) AS opere_with_alias,
  COUNT(DISTINCT emittente_id) AS emittenti_covered
FROM opera_aliases;
```
Expected: thousands of aliases, most opere covered, all relevant emittenti present.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(matching): create opera_aliases table and backfill from individuazioni"
```

- [ ] **Step 7: Tag end of Phase 0**

```bash
git tag matching-phase-0
```

---

## Phase 1 — Parser Config Foundation (Weeks 1-2)

Migrate `mapping_import` → richer `parser_config` while staying backward-compatible.

### Task 1.1: Transform registry (TDD)

**Files:**
- Create: `src/features/programmazioni/utils/transforms.ts`
- Create: `src/features/programmazioni/utils/transforms.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/features/programmazioni/utils/transforms.test.ts
import { describe, it, expect } from 'vitest'
import { applyTransform, TRANSFORMS } from './transforms'

describe('hhmmss_to_minutes', () => {
  it('converts HH:MM:SS to minutes (rounded)', () => {
    expect(applyTransform('hhmmss_to_minutes', '02:52:16')).toBe(172)
    expect(applyTransform('hhmmss_to_minutes', '00:21:56')).toBe(22)
    expect(applyTransform('hhmmss_to_minutes', '01:04:51')).toBe(65)
  })
  it('returns null for invalid input', () => {
    expect(applyTransform('hhmmss_to_minutes', 'invalid')).toBeNull()
    expect(applyTransform('hhmmss_to_minutes', null)).toBeNull()
    expect(applyTransform('hhmmss_to_minutes', '')).toBeNull()
  })
})

describe('seconds_to_minutes', () => {
  it('converts integer seconds to minutes (rounded)', () => {
    expect(applyTransform('seconds_to_minutes', 5670)).toBe(95)
    expect(applyTransform('seconds_to_minutes', '6480')).toBe(108)
    expect(applyTransform('seconds_to_minutes', 2400)).toBe(40)
  })
  it('returns null for non-numeric', () => {
    expect(applyTransform('seconds_to_minutes', 'foo')).toBeNull()
  })
})

describe('fractional_hours_to_minutes', () => {
  it('LA7 case: 0.454h → 27 min', () => {
    expect(applyTransform('fractional_hours_to_minutes', 0.454)).toBe(27)
  })
})

describe('fractional_day_to_minutes', () => {
  it('CHILI TVOD case: 0.0743 → 107 min', () => {
    expect(applyTransform('fractional_day_to_minutes', 0.07430555555555556)).toBe(107)
  })
})

describe('milliseconds_to_minutes', () => {
  it('Apple TVOD case: 6014000 ms → 100 min', () => {
    expect(applyTransform('milliseconds_to_minutes', 6014000)).toBe(100)
  })
})

describe('iso8601_duration_to_minutes', () => {
  it('PT0H22M0S → 22', () => {
    expect(applyTransform('iso8601_duration_to_minutes', 'PT0H22M0S')).toBe(22)
  })
  it('PT1H30M → 90', () => {
    expect(applyTransform('iso8601_duration_to_minutes', 'PT1H30M')).toBe(90)
  })
})

describe('decimal_minutes_to_int', () => {
  it('Viacom case: 21.683 → 22', () => {
    expect(applyTransform('decimal_minutes_to_int', 21.683333333333334)).toBe(22)
  })
  it('Netflix case: 89.3 → 89', () => {
    expect(applyTransform('decimal_minutes_to_int', '89.3')).toBe(89)
  })
})

describe('rti_apostrophe_minutes', () => {
  it("strips trailing apostrophe: 128' → 128", () => {
    expect(applyTransform('rti_apostrophe_minutes', "128'")).toBe(128)
  })
})

describe('null_if_NA / null_if_ND / null_if_NULL_str', () => {
  it("NA returns null", () => {
    expect(applyTransform('null_if_NA', 'N/A')).toBeNull()
    expect(applyTransform('null_if_NA', 'Real Value')).toBe('Real Value')
  })
  it("ND returns null", () => {
    expect(applyTransform('null_if_ND', 'N.D.')).toBeNull()
    expect(applyTransform('null_if_ND', 'N.D')).toBeNull()
  })
  it("NULL string returns null", () => {
    expect(applyTransform('null_if_NULL_str', 'NULL')).toBeNull()
    expect(applyTransform('null_if_NULL_str', 'real')).toBe('real')
  })
})

describe('netflix_episode_nbr', () => {
  it("'--' → null", () => {
    expect(applyTransform('netflix_episode_nbr', '--')).toBeNull()
  })
  it('number string → int', () => {
    expect(applyTransform('netflix_episode_nbr', '5')).toBe(5)
  })
})

describe('us_date_to_iso', () => {
  it('MM/DD/YYYY → YYYY-MM-DD', () => {
    expect(applyTransform('us_date_to_iso', '12/31/2024')).toBe('2024-12-31')
  })
})

describe('yyyymmdd_int_to_iso', () => {
  it('20231231 → 2023-12-31', () => {
    expect(applyTransform('yyyymmdd_int_to_iso', 20231231)).toBe('2023-12-31')
  })
})

describe('TRANSFORMS registry', () => {
  it('contains all named transforms', () => {
    const expected = [
      'hhmmss_to_minutes', 'seconds_to_minutes',
      'fractional_hours_to_minutes', 'fractional_day_to_minutes',
      'milliseconds_to_minutes', 'iso8601_duration_to_minutes',
      'decimal_minutes_to_int', 'rti_apostrophe_minutes',
      'null_if_NA', 'null_if_ND', 'null_if_NULL_str',
      'netflix_episode_nbr', 'us_date_to_iso', 'yyyymmdd_int_to_iso',
    ]
    for (const name of expected) {
      expect(TRANSFORMS).toHaveProperty(name)
    }
  })

  it('applyTransform returns the value when transform name is null', () => {
    expect(applyTransform(null, 'foo')).toBe('foo')
  })

  it('applyTransform throws for unknown transform', () => {
    expect(() => applyTransform('unknown_xyz' as any, 1)).toThrow(/unknown/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/programmazioni/utils/transforms.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// src/features/programmazioni/utils/transforms.ts
/**
 * Centralized registry of input-data transforms for broadcaster file imports.
 *
 * Each transform takes a raw cell value and returns a value compatible with
 * the RASI template field (e.g. integer minutes, ISO date, normalized string).
 *
 * Transforms are referenced by name in emittenti.parser_config.transforms map:
 *   { "Durata Netta": "decimal_minutes_to_int", "Orario": "xls_fraction_to_time" }
 */

export type TransformName =
  | 'hhmmss_to_minutes'
  | 'seconds_to_minutes'
  | 'fractional_hours_to_minutes'
  | 'fractional_day_to_minutes'
  | 'milliseconds_to_minutes'
  | 'iso8601_duration_to_minutes'
  | 'decimal_minutes_to_int'
  | 'rti_apostrophe_minutes'
  | 'null_if_NA'
  | 'null_if_ND'
  | 'null_if_NULL_str'
  | 'netflix_episode_nbr'
  | 'us_date_to_iso'
  | 'yyyymmdd_int_to_iso'

type TransformFn = (v: any) => any

const parseNumber = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export const TRANSFORMS: Record<TransformName, TransformFn> = {
  hhmmss_to_minutes: (v) => {
    if (typeof v !== 'string') return null
    const m = v.trim().match(/^(\d{1,3}):(\d{2}):(\d{2})$/)
    if (!m) return null
    const h = parseInt(m[1], 10)
    const mm = parseInt(m[2], 10)
    const s = parseInt(m[3], 10)
    return Math.round(h * 60 + mm + s / 60)
  },
  seconds_to_minutes: (v) => {
    const n = parseNumber(v)
    return n === null ? null : Math.round(n / 60)
  },
  fractional_hours_to_minutes: (v) => {
    const n = parseNumber(v)
    return n === null ? null : Math.round(n * 60)
  },
  fractional_day_to_minutes: (v) => {
    const n = parseNumber(v)
    return n === null ? null : Math.round(n * 24 * 60)
  },
  milliseconds_to_minutes: (v) => {
    const n = parseNumber(v)
    return n === null ? null : Math.round(n / 60000)
  },
  iso8601_duration_to_minutes: (v) => {
    if (typeof v !== 'string') return null
    const m = v.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
    if (!m) return null
    const h = parseInt(m[1] || '0', 10)
    const mm = parseInt(m[2] || '0', 10)
    const s = parseInt(m[3] || '0', 10)
    return Math.round(h * 60 + mm + s / 60)
  },
  decimal_minutes_to_int: (v) => {
    const n = parseNumber(v)
    return n === null ? null : Math.round(n)
  },
  rti_apostrophe_minutes: (v) => {
    if (v === null || v === undefined) return null
    const stripped = String(v).replace(/'/g, '').trim()
    const n = parseInt(stripped, 10)
    return Number.isFinite(n) ? n : null
  },
  null_if_NA: (v) => {
    const s = String(v).trim().toUpperCase()
    return s === 'N/A' || s === 'N.A.' || s === '' ? null : v
  },
  null_if_ND: (v) => {
    const s = String(v).trim().toUpperCase()
    return s === 'N.D.' || s === 'N.D' || s === 'ND' || s === '' ? null : v
  },
  null_if_NULL_str: (v) => {
    const s = String(v).trim().toUpperCase()
    return s === 'NULL' ? null : v
  },
  netflix_episode_nbr: (v) => {
    if (String(v).trim() === '--') return null
    const n = parseInt(String(v), 10)
    return Number.isFinite(n) ? n : null
  },
  us_date_to_iso: (v) => {
    if (!v) return null
    const m = String(v).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (!m) return null
    return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  },
  yyyymmdd_int_to_iso: (v) => {
    const n = parseNumber(v)
    if (n === null) return null
    const s = String(Math.trunc(n))
    if (s.length !== 8) return null
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  },
}

/**
 * Apply a named transform to a value. Returns value unchanged when transform is null.
 * Throws on unknown transform name (fail loud — config error must surface).
 */
export function applyTransform(name: TransformName | null | undefined, value: any): any {
  if (!name) return value
  const fn = TRANSFORMS[name]
  if (!fn) throw new Error(`Unknown transform: ${name}`)
  return fn(value)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/programmazioni/utils/transforms.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/programmazioni/utils/transforms.ts src/features/programmazioni/utils/transforms.test.ts
git commit -m "feat(matching): add typed transform registry for broadcaster imports"
```

---

### Task 1.2: parser_config types + validator

**Files:**
- Create: `src/features/programmazioni/utils/parser-config.ts`
- Create: `src/features/programmazioni/utils/parser-config.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/features/programmazioni/utils/parser-config.test.ts
import { describe, it, expect } from 'vitest'
import {
  validateParserConfig,
  migrateLegacyMapping,
  type ParserConfigV2,
} from './parser-config'

describe('validateParserConfig', () => {
  it('accepts valid v2 config', () => {
    const cfg: ParserConfigV2 = {
      version: 2,
      file_type: 'csv',
      delimiter: ',',
      encoding: 'utf-8',
      header_row: 0,
      data_start_row: 1,
      colonne_rilevate: ['titolo', 'durata'],
      fields: { titolo: 'titolo', durata: 'durata_minuti' },
      transforms: { durata: 'seconds_to_minutes' },
    }
    expect(validateParserConfig(cfg)).toEqual({ valid: true, errors: [] })
  })

  it('rejects unknown transform', () => {
    const cfg: any = {
      version: 2,
      file_type: 'csv',
      header_row: 0,
      data_start_row: 1,
      colonne_rilevate: [],
      fields: { durata: 'durata_minuti' },
      transforms: { durata: 'never_heard_of_this' },
    }
    const r = validateParserConfig(cfg)
    expect(r.valid).toBe(false)
    expect(r.errors.join(' ')).toMatch(/unknown transform/i)
  })

  it('rejects missing required fields', () => {
    const r = validateParserConfig({ version: 2 } as any)
    expect(r.valid).toBe(false)
    expect(r.errors.length).toBeGreaterThan(0)
  })
})

describe('migrateLegacyMapping', () => {
  it('converts legacy mapping_import to parser_config v2', () => {
    const legacy = {
      version: 1,
      colonne_rilevate: ['titolo', 'durata'],
      ultimo_upload: '2024-01-01',
      mapping: { titolo: 'titolo', durata: 'durata_minuti' },
    }
    const v2 = migrateLegacyMapping(legacy)
    expect(v2.version).toBe(2)
    expect(v2.fields).toEqual({ titolo: 'titolo', durata: 'durata_minuti' })
    expect(v2.transforms).toEqual({})
    expect(v2.file_type).toBe('auto')
  })

  it('returns null for null/undefined input', () => {
    expect(migrateLegacyMapping(null)).toBeNull()
    expect(migrateLegacyMapping(undefined)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `npx vitest run src/features/programmazioni/utils/parser-config.test.ts`

- [ ] **Step 3: Implement**

```typescript
// src/features/programmazioni/utils/parser-config.ts
import { TRANSFORMS, type TransformName } from './transforms'

export type FileType = 'csv' | 'tsv' | 'xlsx' | 'xls' | 'txt_fixed' | 'auto'

export interface ParserConfigV2 {
  version: 2
  file_type: FileType
  encoding?: 'utf-8' | 'utf-8-sig' | 'latin-1' | 'cp1252'
  delimiter?: string
  sheet_name?: string
  header_row: number
  data_start_row: number
  skip_rows?: number[]
  colonne_rilevate: string[]
  ultimo_upload?: string | null
  /** sourceColumn → templateField */
  fields: Record<string, string>
  /** sourceColumn → transform name */
  transforms: Record<string, TransformName>
}

export interface LegacyMapping {
  version: 1
  colonne_rilevate: string[]
  ultimo_upload?: string | null
  mapping: Record<string, string>
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validateParserConfig(cfg: any): ValidationResult {
  const errors: string[] = []
  if (!cfg || typeof cfg !== 'object') {
    return { valid: false, errors: ['parser_config must be an object'] }
  }
  if (cfg.version !== 2) errors.push('version must be 2')
  if (typeof cfg.file_type !== 'string') errors.push('file_type required')
  if (typeof cfg.header_row !== 'number') errors.push('header_row required')
  if (typeof cfg.data_start_row !== 'number') errors.push('data_start_row required')
  if (!Array.isArray(cfg.colonne_rilevate)) errors.push('colonne_rilevate must be array')
  if (typeof cfg.fields !== 'object' || cfg.fields === null) errors.push('fields must be object')
  if (typeof cfg.transforms !== 'object' || cfg.transforms === null) errors.push('transforms must be object')

  if (cfg.transforms && typeof cfg.transforms === 'object') {
    for (const [col, t] of Object.entries(cfg.transforms)) {
      if (!(t as string in TRANSFORMS)) {
        errors.push(`unknown transform '${t}' for column '${col}'`)
      }
    }
  }
  return { valid: errors.length === 0, errors }
}

export function migrateLegacyMapping(legacy: any): ParserConfigV2 | null {
  if (!legacy || typeof legacy !== 'object') return null
  return {
    version: 2,
    file_type: 'auto',
    header_row: 0,
    data_start_row: 1,
    colonne_rilevate: Array.isArray(legacy.colonne_rilevate) ? legacy.colonne_rilevate : [],
    ultimo_upload: legacy.ultimo_upload ?? null,
    fields: typeof legacy.mapping === 'object' && legacy.mapping ? legacy.mapping : {},
    transforms: {},
  }
}
```

- [ ] **Step 4: Run test, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/features/programmazioni/utils/parser-config.ts src/features/programmazioni/utils/parser-config.test.ts
git commit -m "feat(matching): parser_config v2 types, validator, legacy migration"
```

---

### Task 1.3: Extend emittenti with parser_config column

**Files:**
- Create: `supabase/migrations/<ts>_extend_emittenti_parser_config.sql`

- [ ] **Step 1: Create migration**

`supabase migration new extend_emittenti_parser_config`

- [ ] **Step 2: Write migration**

```sql
-- Add parser_config jsonb to emittenti.
-- Backward-compat: applyMapping reads parser_config when present, falls back to mapping_import.

ALTER TABLE public.emittenti
  ADD COLUMN IF NOT EXISTS parser_config jsonb;

COMMENT ON COLUMN public.emittenti.parser_config IS
  'v2 import config: { version, file_type, encoding, delimiter, header_row, data_start_row, fields{src→tgt}, transforms{src→transformName}, colonne_rilevate }. See src/features/programmazioni/utils/parser-config.ts.';

-- Migrate existing mapping_import → parser_config (idempotent, only fills nulls)
UPDATE public.emittenti
SET parser_config = jsonb_build_object(
  'version', 2,
  'file_type', 'auto',
  'header_row', 0,
  'data_start_row', 1,
  'colonne_rilevate', COALESCE(mapping_import->'colonne_rilevate', '[]'::jsonb),
  'ultimo_upload', mapping_import->'ultimo_upload',
  'fields', COALESCE(mapping_import->'mapping', '{}'::jsonb),
  'transforms', '{}'::jsonb
)
WHERE mapping_import IS NOT NULL AND parser_config IS NULL;

-- Index on parser_config for jsonb path lookups (e.g. by file_type)
CREATE INDEX IF NOT EXISTS idx_emittenti_parser_config
  ON public.emittenti USING gin (parser_config);
```

- [ ] **Step 3: Apply migration**

`supabase db push`

- [ ] **Step 4: Verify backfill**

```sql
SELECT id, nome, parser_config->'version' AS version, jsonb_object_keys(parser_config->'fields') AS field
FROM emittenti
WHERE parser_config IS NOT NULL
LIMIT 5;
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(matching): add emittenti.parser_config column and backfill from mapping_import"
```

---

### Task 1.4: Wire parser_config into applyMapping with backward compat

**Files:**
- Modify: `src/features/programmazioni/services/import-mapping.service.ts`

- [ ] **Step 1: Add failing test for transform application**

Append to `import-mapping.service.test.ts`:

```typescript
import { applyMappingWithTransforms } from './import-mapping.service'

describe('applyMappingWithTransforms', () => {
  const ctx = { campagnaProgrammazioneId: 'c1', emittenteId: 'e1' }

  it('applies transform before coerce', () => {
    const rows = [{ DURATA: '00:21:56', TITOLO: 'Foo' }]
    const config = {
      fields: { TITOLO: 'titolo', DURATA: 'durata_minuti' },
      transforms: { DURATA: 'hhmmss_to_minutes' as const },
    }
    const out = applyMappingWithTransforms(rows, config, ctx)
    expect(out[0].durata_minuti).toBe(22)
  })

  it('applies LA7 fractional_hours_to_minutes', () => {
    const rows = [{ DURATA: 0.454, TITOLO: 'Foo' }]
    const config = {
      fields: { TITOLO: 'titolo', DURATA: 'durata_minuti' },
      transforms: { DURATA: 'fractional_hours_to_minutes' as const },
    }
    const out = applyMappingWithTransforms(rows, config, ctx)
    expect(out[0].durata_minuti).toBe(27)
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

- [ ] **Step 3: Add `applyMappingWithTransforms` to `import-mapping.service.ts`**

Add the import at top:
```typescript
import { applyTransform, type TransformName } from '../utils/transforms'
```

Add the new function after the existing `applyMapping` export:

```typescript
export interface ApplyMappingV2Config {
  fields: Record<string, string>
  transforms: Record<string, TransformName>
}

/**
 * Apply mapping + transforms (parser_config v2). For each row:
 *  1. Look up source column value
 *  2. Apply transform if configured for that column
 *  3. Coerce via existing coerce()
 *  4. Normalize titolo-like fields
 */
export function applyMappingWithTransforms(
  rows: Record<string, any>[],
  config: ApplyMappingV2Config,
  context: ApplyMappingContext
): ProgrammazionePayload[] {
  const reverseMap: Record<string, string> = {}
  for (const [source, target] of Object.entries(config.fields)) {
    if (target && TEMPLATE_FIELDS_SET.has(target)) reverseMap[target] = source
  }

  const result: ProgrammazionePayload[] = []
  for (const row of rows) {
    const payload: any = {
      campagna_programmazione_id: context.campagnaProgrammazioneId,
      emittente_id: context.emittenteId,
    }
    for (const field of TEMPLATE_FIELDS) {
      const sourceCol = reverseMap[field]
      if (!sourceCol) continue
      const raw = row[sourceCol] ?? row[sourceCol.trim()] ?? row[normalizeKey(sourceCol)]
      const transformName = config.transforms[sourceCol] || null
      const transformed = applyTransform(transformName, raw)
      const coerced = coerce(field, transformed)
      if (coerced !== undefined && coerced !== null) payload[field] = coerced
    }
    for (const f of ['titolo','titolo_originale','titolo_episodio','titolo_episodio_originale'] as const) {
      if (typeof payload[f] === 'string') {
        const n = normalizeTitle(payload[f])
        if (n) payload[f] = n
        else delete payload[f]
      }
    }
    if (!payload.titolo) continue
    if (!payload.tipo) payload.tipo = ''
    result.push(payload as ProgrammazionePayload)
  }
  return result
}
```

- [ ] **Step 4: Run test, expect PASS**

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/programmazioni/services/import-mapping.service.ts src/features/programmazioni/services/import-mapping.service.test.ts
git commit -m "feat(matching): applyMappingWithTransforms for parser_config v2"
```

- [ ] **Step 7: Tag end of Phase 1**

```bash
git tag matching-phase-1
```

---

## Phase 2 — programmazioni.match_key + Candidate RPC (Weeks 2-3)

### Task 2.1: Add match_key column to programmazioni (4M rows — careful)

**Files:**
- Create: `supabase/migrations/<ts>_add_match_key_to_programmazioni.sql`

- [ ] **Step 1: Create migration**

`supabase migration new add_match_key_to_programmazioni`

- [ ] **Step 2: Write migration**

```sql
-- Add match_key to programmazioni (4M rows). Strategy:
-- 1. Add nullable column + trigger first (no rewrite of existing rows)
-- 2. Backfill in batches via separate one-off DO block (run during low traffic)
-- 3. Add partial index after backfill is complete

ALTER TABLE public.programmazioni
  ADD COLUMN IF NOT EXISTS match_key text;

CREATE OR REPLACE FUNCTION public.trg_programmazioni_sync_match_key()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.match_key := public.build_match_key(NEW.titolo, NEW.anno);
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS programmazioni_match_key_sync ON public.programmazioni;
CREATE TRIGGER programmazioni_match_key_sync
  BEFORE INSERT OR UPDATE OF titolo, anno ON public.programmazioni
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_programmazioni_sync_match_key();

-- Index will be added in a separate migration after backfill completes
-- to avoid blocking the table during initial deploy.
```

- [ ] **Step 3: Apply**

`supabase db push`

- [ ] **Step 4: Verify trigger fires on new insert**

```sql
-- Pick any campagna id and insert a test row, then check match_key
SELECT match_key FROM programmazioni WHERE id IN (
  INSERT INTO programmazioni (campagna_programmazione_id, emittente_id, titolo, anno)
  VALUES (
    (SELECT id FROM campagne_programmazione LIMIT 1),
    (SELECT id FROM emittenti LIMIT 1),
    'TEST MATCH KEY', 2024
  )
  RETURNING id
);
-- Expected: 'test match key::2024'
DELETE FROM programmazioni WHERE titolo = 'TEST MATCH KEY';
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(matching): add programmazioni.match_key column and sync trigger"
```

---

### Task 2.2: Backfill programmazioni.match_key in batches

**Files:**
- Create: `supabase/migrations/<ts>_backfill_programmazioni_match_key.sql`

- [ ] **Step 1: Create migration**

`supabase migration new backfill_programmazioni_match_key`

- [ ] **Step 2: Write batched backfill**

```sql
-- Backfill match_key for existing 4M programmazioni in chunks of 50K.
-- Uses ctid range to chunk without needing an index.
-- Runs synchronously inside the migration — expect 10-20 minutes total.

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
      WHERE match_key IS NULL
      LIMIT v_batch_size
      FOR UPDATE SKIP LOCKED
    )
    UPDATE public.programmazioni p
    SET match_key = public.build_match_key(p.titolo, p.anno)
    FROM to_update t
    WHERE p.id = t.id;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    v_total := v_total + v_updated;
    RAISE NOTICE 'Iteration %: updated % rows (cumulative %)', v_iter, v_updated, v_total;
    EXIT WHEN v_updated = 0;
  END LOOP;
  RAISE NOTICE 'Backfill complete: % rows', v_total;
END
$$;
```

- [ ] **Step 3: Apply (long-running)**

Run during low-traffic window: `supabase db push`

Verify after completion:
```sql
SELECT COUNT(*) FILTER (WHERE match_key IS NULL) AS null_keys,
       COUNT(*) AS total
FROM programmazioni;
```
Expected: `null_keys = 0`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "chore(matching): backfill programmazioni.match_key in 50k chunks"
```

---

### Task 2.3: Add index on programmazioni.match_key

**Files:**
- Create: `supabase/migrations/<ts>_add_index_programmazioni_match_key.sql`

- [ ] **Step 1: Create migration**

`supabase migration new add_index_programmazioni_match_key`

- [ ] **Step 2: Write CONCURRENT index migration**

```sql
-- Build index CONCURRENTLY to avoid table lock.
-- NOTE: must run outside transaction; ensure your supabase tooling supports this,
-- otherwise create the index manually via `psql -c` from a one-off shell.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_programmazioni_match_key
  ON public.programmazioni(match_key)
  WHERE match_key IS NOT NULL AND match_key <> '';
```

- [ ] **Step 3: Apply (CONCURRENTLY index — won't lock writes)**

`supabase db push`

- [ ] **Step 4: Verify index used**

```sql
EXPLAIN ANALYZE
SELECT id, titolo FROM programmazioni WHERE match_key = 'beautiful::2023' LIMIT 100;
```
Expected: `Index Scan` on `idx_programmazioni_match_key`. Time < 50ms.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "perf(matching): add concurrent index on programmazioni.match_key"
```

---

### Task 2.4: Hierarchical find_opera_candidates RPC

**Files:**
- Create: `supabase/migrations/<ts>_create_find_opera_candidates_rpc.sql`

- [ ] **Step 1: Create migration**

`supabase migration new create_find_opera_candidates_rpc`

- [ ] **Step 2: Write RPC**

```sql
-- find_opera_candidates: hierarchical opera matching for a single programmazione.
-- Returns ranked candidates with strategy + confidence + signals.
-- Strategies tried in order, results aggregated and deduplicated by opera_id:
--   1. alias_emittente   1.00 - opera_aliases hit for (emittente_id, match_key)
--   2. canonical_id      1.00 - ISAN / IMDB tconst exact match
--   3. match_key_exact   0.95 - same match_key (titolo_norm + anno)
--   4. fuzzy_year        0.50-0.80 - pg_trgm similarity > threshold + anno tolerance
--   5. title_only        0.50 - last resort: trigram match without year constraint

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
  v_prog programmazioni%ROWTYPE;
  v_isan_codes text[];
BEGIN
  SELECT * INTO v_prog FROM public.programmazioni WHERE id = p_prog_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Strategy 1: alias hit (emittente + match_key)
  RETURN QUERY
  SELECT
    a.opera_id,
    'alias_emittente'::text,
    LEAST(1.00, a.confidence)::numeric,
    jsonb_build_object('alias_id', a.id, 'hit_count', a.hit_count, 'source', a.source)
  FROM public.opera_aliases a
  WHERE a.emittente_id = v_prog.emittente_id
    AND a.alias_titolo_norm = v_prog.match_key
  ORDER BY a.hit_count DESC, a.confidence DESC
  LIMIT 5;

  -- Strategy 2: canonical IDs (IMDB tconst, ISAN) - mined from metadati jsonb
  -- programmazioni doesn't have isan/imdb_id columns yet, so extract from metadati_trasmissione
  IF v_prog.metadati_trasmissione ? 'imdb_tconst' THEN
    RETURN QUERY
    SELECT
      o.id,
      'imdb_tconst'::text,
      1.00::numeric,
      jsonb_build_object('imdb_tconst', o.imdb_tconst)
    FROM public.opere o
    WHERE o.imdb_tconst = (v_prog.metadati_trasmissione->>'imdb_tconst')
    LIMIT 3;
  END IF;

  IF v_prog.metadati_trasmissione ? 'codice_isan' THEN
    RETURN QUERY
    SELECT
      o.id,
      'codice_isan'::text,
      1.00::numeric,
      jsonb_build_object('codice_isan', o.codice_isan)
    FROM public.opere o
    WHERE o.codice_isan = (v_prog.metadati_trasmissione->>'codice_isan')
    LIMIT 3;
  END IF;

  -- Strategy 3: match_key exact
  RETURN QUERY
  SELECT
    o.id,
    'match_key_exact'::text,
    0.95::numeric,
    jsonb_build_object('match_key', o.match_key, 'titolo', o.titolo)
  FROM public.opere o
  WHERE o.match_key = v_prog.match_key
    AND v_prog.match_key IS NOT NULL
    AND v_prog.match_key <> ''
  LIMIT 5;

  -- Strategy 4: fuzzy trigram with year tolerance (uses idx_opere_trgm_titolo)
  RETURN QUERY
  SELECT
    o.id,
    'fuzzy_year'::text,
    (0.50 + 0.30 * similarity(LOWER(o.titolo), LOWER(v_prog.titolo)))::numeric,
    jsonb_build_object(
      'similarity', ROUND(similarity(LOWER(o.titolo), LOWER(v_prog.titolo))::numeric, 3),
      'anno_diff',  COALESCE(ABS(o.anno_produzione - v_prog.anno), -1)
    )
  FROM public.opere o
  WHERE v_prog.titolo IS NOT NULL
    AND LOWER(o.titolo) % LOWER(v_prog.titolo)
    AND similarity(LOWER(o.titolo), LOWER(v_prog.titolo)) >= p_title_threshold
    AND (
      v_prog.anno IS NULL
      OR o.anno_produzione IS NULL
      OR ABS(o.anno_produzione - v_prog.anno) <= 3
    )
  ORDER BY similarity(LOWER(o.titolo), LOWER(v_prog.titolo)) DESC
  LIMIT p_max_results;

  RETURN;
END
$$;

COMMENT ON FUNCTION public.find_opera_candidates IS
  'Hierarchical opera candidate resolver for a single programmazione. Returns up to ~30 ranked candidates across 4 strategies (alias, canonical ID, match_key, fuzzy).';

GRANT EXECUTE ON FUNCTION public.find_opera_candidates TO authenticated;
```

- [ ] **Step 3: Apply**

`supabase db push`

- [ ] **Step 4: Smoke test**

```sql
-- Pick a programmazione that should have a match
WITH p AS (SELECT id FROM programmazioni WHERE titolo IS NOT NULL LIMIT 1)
SELECT * FROM find_opera_candidates((SELECT id FROM p));
```
Expected: Returns 0-10 rows with `strategy`, `confidence`, `signals`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(matching): add find_opera_candidates hierarchical RPC"
```

---

### Task 2.5: Frontend matching.service.ts wrapper (TDD)

**Files:**
- Create: `src/features/individuazioni/services/matching.service.ts`
- Create: `src/features/individuazioni/services/matching.service.test.ts`

- [ ] **Step 1: Write failing test (mock supabase)**

```typescript
// src/features/individuazioni/services/matching.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}))

import { supabase } from '@/shared/lib/supabase'
import { findCandidates, classifyConfidence } from './matching.service'

describe('classifyConfidence', () => {
  it('returns auto for >= 0.85', () => {
    expect(classifyConfidence(0.85)).toBe('auto')
    expect(classifyConfidence(0.99)).toBe('auto')
  })
  it('returns review for 0.60-0.84', () => {
    expect(classifyConfidence(0.60)).toBe('review')
    expect(classifyConfidence(0.80)).toBe('review')
  })
  it('returns no_match for < 0.60', () => {
    expect(classifyConfidence(0.59)).toBe('no_match')
    expect(classifyConfidence(0)).toBe('no_match')
  })
})

describe('findCandidates', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls find_opera_candidates RPC with prog id', async () => {
    ;(supabase.rpc as any).mockResolvedValue({
      data: [
        { opera_id: 'o1', strategy: 'match_key_exact', confidence: 0.95, signals: {} },
      ],
      error: null,
    })
    const result = await findCandidates('prog-1')
    expect(supabase.rpc).toHaveBeenCalledWith('find_opera_candidates', expect.objectContaining({ p_prog_id: 'prog-1' }))
    expect(result).toHaveLength(1)
    expect(result[0].confidence).toBe(0.95)
  })

  it('throws on RPC error', async () => {
    ;(supabase.rpc as any).mockResolvedValue({ data: null, error: new Error('fail') })
    await expect(findCandidates('prog-1')).rejects.toThrow(/fail/)
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

- [ ] **Step 3: Implement matching.service.ts**

```typescript
// src/features/individuazioni/services/matching.service.ts
import { supabase } from '@/shared/lib/supabase'

export type MatchStrategy =
  | 'alias_emittente'
  | 'imdb_tconst'
  | 'codice_isan'
  | 'match_key_exact'
  | 'fuzzy_year'
  | 'title_only'

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

/**
 * Fetch ranked opera candidates for a programmazione via DB RPC.
 * Throws on error so callers can surface failures.
 */
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

/**
 * Top-level classifier: given a programmazione, decide whether to
 * auto-individuate, send to review, or skip.
 */
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

- [ ] **Step 4: Run test, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/features/individuazioni/services/matching.service.ts src/features/individuazioni/services/matching.service.test.ts
git commit -m "feat(matching): add matching.service.ts frontend wrapper for candidates RPC"
git tag matching-phase-2
```

---

## Phase 3 — Review Queue (Weeks 4-5)

### Task 3.1: Create individuazioni_review_queue table

**Files:**
- Create: `supabase/migrations/<ts>_create_review_queue.sql`

- [ ] **Step 1: Create migration**

`supabase migration new create_review_queue`

- [ ] **Step 2: Write schema**

```sql
CREATE TABLE IF NOT EXISTS public.individuazioni_review_queue (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  programmazione_id uuid NOT NULL
    REFERENCES public.programmazioni(id) ON DELETE CASCADE,
  campagna_individuazione_id uuid
    REFERENCES public.campagne_individuazione(id) ON DELETE CASCADE,
  candidates jsonb NOT NULL DEFAULT '[]'::jsonb,
  top_confidence numeric(3,2) NOT NULL DEFAULT 0,
  status text NOT NULL
    CHECK (status IN ('pending', 'resolved', 'rejected', 'new_opera'))
    DEFAULT 'pending',
  resolved_opera_id uuid REFERENCES public.opere(id) ON DELETE SET NULL,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(programmazione_id, campagna_individuazione_id)
);

CREATE INDEX IF NOT EXISTS idx_review_queue_status
  ON public.individuazioni_review_queue(campagna_individuazione_id, status);

CREATE INDEX IF NOT EXISTS idx_review_queue_pending_conf
  ON public.individuazioni_review_queue(top_confidence DESC)
  WHERE status = 'pending';

ALTER TABLE public.individuazioni_review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY review_queue_authenticated_all
  ON public.individuazioni_review_queue FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

COMMENT ON TABLE public.individuazioni_review_queue IS
  'Programmazioni with ambiguous matches (confidence 0.60-0.84) awaiting human review.';
```

- [ ] **Step 3: Apply + verify**

`supabase db push`

```sql
SELECT * FROM individuazioni_review_queue LIMIT 1;
-- Expected: 0 rows, table exists.
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(matching): create individuazioni_review_queue table"
```

---

### Task 3.2: Review queue service (TDD)

**Files:**
- Create: `src/features/individuazioni/services/review-queue.service.ts`
- Create: `src/features/individuazioni/services/review-queue.service.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/features/individuazioni/services/review-queue.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/lib/supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}))

import { supabase } from '@/shared/lib/supabase'
import { listPending, resolveReview, rejectReview } from './review-queue.service'

beforeEach(() => vi.clearAllMocks())

describe('listPending', () => {
  it('queries review queue filtered by status pending and campagna', async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null })
    const limit = vi.fn(() => ({ then: vi.fn() }))
    const eq2 = vi.fn(() => ({ order, limit }))
    const eq1 = vi.fn(() => ({ eq: eq2 }))
    const select = vi.fn(() => ({ eq: eq1 }))
    ;(supabase.from as any).mockReturnValue({ select })

    await listPending('campagna-1')
    expect(supabase.from).toHaveBeenCalledWith('individuazioni_review_queue')
    expect(eq1).toHaveBeenCalledWith('campagna_individuazione_id', 'campagna-1')
    expect(eq2).toHaveBeenCalledWith('status', 'pending')
  })
})

describe('resolveReview', () => {
  it('updates row with resolved opera_id and resolved_at', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'r1' }, error: null })
    const select = vi.fn(() => ({ single }))
    const eq = vi.fn(() => ({ select }))
    const update = vi.fn(() => ({ eq }))
    ;(supabase.from as any).mockReturnValue({ update })

    await resolveReview('r1', 'opera-99', 'user-1')
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'resolved',
      resolved_opera_id: 'opera-99',
      resolved_by: 'user-1',
    }))
  })
})

describe('rejectReview', () => {
  it('sets status to rejected', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'r1' }, error: null })
    const select = vi.fn(() => ({ single }))
    const eq = vi.fn(() => ({ select }))
    const update = vi.fn(() => ({ eq }))
    ;(supabase.from as any).mockReturnValue({ update })

    await rejectReview('r1', 'user-1', 'wrong opera')
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'rejected',
      notes: 'wrong opera',
    }))
  })
})
```

- [ ] **Step 2: Run test, FAIL**

- [ ] **Step 3: Implement service**

```typescript
// src/features/individuazioni/services/review-queue.service.ts
import { supabase } from '@/shared/lib/supabase'
import type { Candidate } from './matching.service'

export interface ReviewItem {
  id: string
  programmazione_id: string
  campagna_individuazione_id: string
  candidates: Candidate[]
  top_confidence: number
  status: 'pending' | 'resolved' | 'rejected' | 'new_opera'
  resolved_opera_id?: string | null
  resolved_at?: string | null
  notes?: string | null
  created_at: string
}

export async function listPending(campagnaId: string, limit = 50) {
  return (supabase as any)
    .from('individuazioni_review_queue')
    .select('*, programmazione:programmazione_id(*)')
    .eq('campagna_individuazione_id', campagnaId)
    .eq('status', 'pending')
    .order('top_confidence', { ascending: false })
    .limit(limit)
}

export async function resolveReview(reviewId: string, operaId: string, userId: string) {
  return (supabase as any)
    .from('individuazioni_review_queue')
    .update({
      status: 'resolved',
      resolved_opera_id: operaId,
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', reviewId)
    .select()
    .single()
}

export async function rejectReview(reviewId: string, userId: string, reason?: string) {
  return (supabase as any)
    .from('individuazioni_review_queue')
    .update({
      status: 'rejected',
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
      notes: reason ?? null,
    })
    .eq('id', reviewId)
    .select()
    .single()
}

export async function markNewOpera(reviewId: string, userId: string) {
  return (supabase as any)
    .from('individuazioni_review_queue')
    .update({
      status: 'new_opera',
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', reviewId)
    .select()
    .single()
}
```

- [ ] **Step 4: Run test, PASS**

- [ ] **Step 5: Commit**

```bash
git add src/features/individuazioni/services/review-queue.service.ts src/features/individuazioni/services/review-queue.service.test.ts
git commit -m "feat(matching): review queue service with list/resolve/reject"
```

---

### Task 3.3: Review queue page UI

**Files:**
- Create: `src/app/dashboard/individuazioni/review/page.tsx`
- Create: `src/app/dashboard/individuazioni/review/components/CandidateCard.tsx`
- Create: `src/app/dashboard/individuazioni/review/components/SignalBadges.tsx`

- [ ] **Step 1: Create SignalBadges component**

```tsx
// src/app/dashboard/individuazioni/review/components/SignalBadges.tsx
import type { Candidate } from '@/features/individuazioni/services/matching.service'

const STRATEGY_LABEL: Record<Candidate['strategy'], { text: string; color: string }> = {
  alias_emittente:  { text: 'Alias',       color: 'bg-purple-100 text-purple-800' },
  imdb_tconst:      { text: 'IMDb',        color: 'bg-yellow-100 text-yellow-800' },
  codice_isan:      { text: 'ISAN',        color: 'bg-yellow-100 text-yellow-800' },
  match_key_exact:  { text: 'Exact Match', color: 'bg-green-100 text-green-800' },
  fuzzy_year:       { text: 'Fuzzy',       color: 'bg-blue-100 text-blue-800' },
  title_only:       { text: 'Title Only',  color: 'bg-gray-100 text-gray-800' },
}

export function SignalBadges({ candidate }: { candidate: Candidate }) {
  const meta = STRATEGY_LABEL[candidate.strategy]
  const confidencePct = Math.round(candidate.confidence * 100)
  const confColor =
    confidencePct >= 85 ? 'bg-green-100 text-green-800'
    : confidencePct >= 60 ? 'bg-yellow-100 text-yellow-800'
    : 'bg-red-100 text-red-800'

  return (
    <div className="flex gap-2 items-center flex-wrap">
      <span className={`text-xs px-2 py-1 rounded ${meta.color}`}>{meta.text}</span>
      <span className={`text-xs px-2 py-1 rounded font-mono ${confColor}`}>{confidencePct}%</span>
      {candidate.signals?.similarity != null && (
        <span className="text-xs text-gray-500">sim {candidate.signals.similarity}</span>
      )}
      {candidate.signals?.anno_diff != null && candidate.signals.anno_diff !== -1 && (
        <span className="text-xs text-gray-500">Δyr {candidate.signals.anno_diff}</span>
      )}
      {candidate.signals?.hit_count > 0 && (
        <span className="text-xs text-gray-500">×{candidate.signals.hit_count} hits</span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create CandidateCard**

```tsx
// src/app/dashboard/individuazioni/review/components/CandidateCard.tsx
import { useState } from 'react'
import type { Candidate } from '@/features/individuazioni/services/matching.service'
import { SignalBadges } from './SignalBadges'

interface Props {
  candidate: Candidate
  operaTitle: string
  operaYear?: number | null
  operaType?: string | null
  onSelect: () => Promise<void>
  isPreferred?: boolean
}

export function CandidateCard({ candidate, operaTitle, operaYear, operaType, onSelect, isPreferred }: Props) {
  const [busy, setBusy] = useState(false)
  return (
    <div className={`border rounded p-3 ${isPreferred ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{operaTitle}</div>
          <div className="text-sm text-gray-600">
            {operaType && <span>{operaType}</span>}
            {operaYear && <span> · {operaYear}</span>}
          </div>
          <div className="mt-2"><SignalBadges candidate={candidate} /></div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try { await onSelect() } finally { setBusy(false) }
          }}
          className="px-3 py-1 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
        >
          {busy ? '...' : 'Conferma'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create review page**

```tsx
// src/app/dashboard/individuazioni/review/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/shared/lib/supabase'
import { listPending, resolveReview, rejectReview, markNewOpera, type ReviewItem } from '@/features/individuazioni/services/review-queue.service'
import { CandidateCard } from './components/CandidateCard'

interface OperaRef { id: string; titolo: string; anno_produzione: number | null; tipo: string | null }

export default function ReviewQueuePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const campagnaId = searchParams.get('campagna') ?? ''
  const [items, setItems] = useState<ReviewItem[]>([])
  const [opereById, setOpereById] = useState<Record<string, OperaRef>>({})
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  const load = useCallback(async () => {
    if (!campagnaId) return
    setLoading(true)
    try {
      const { data, error } = await listPending(campagnaId, 50)
      if (error) throw error
      const list = (data || []) as ReviewItem[]
      setItems(list)
      // Fetch opera details for candidates in bulk
      const operaIds = new Set<string>()
      list.forEach(item => item.candidates.forEach(c => operaIds.add(c.opera_id)))
      if (operaIds.size > 0) {
        const { data: opere } = await (supabase as any)
          .from('opere')
          .select('id, titolo, anno_produzione, tipo')
          .in('id', Array.from(operaIds))
        const map: Record<string, OperaRef> = {}
        ;(opere || []).forEach((o: OperaRef) => { map[o.id] = o })
        setOpereById(map)
      }
    } finally {
      setLoading(false)
    }
  }, [campagnaId])

  useEffect(() => { load() }, [load])

  const handleResolve = async (reviewId: string, operaId: string) => {
    if (!userId) return
    await resolveReview(reviewId, operaId, userId)
    await load()
  }

  const handleReject = async (reviewId: string) => {
    if (!userId) return
    const reason = window.prompt('Motivo del rifiuto (opzionale):')
    await rejectReview(reviewId, userId, reason || undefined)
    await load()
  }

  if (!campagnaId) {
    return <div className="p-6 text-gray-600">Specifica ?campagna=&lt;id&gt; per visualizzare la review queue.</div>
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Review Queue</h1>
        <div className="text-sm text-gray-600">{items.length} pending</div>
      </div>
      {loading && <div>Caricamento...</div>}
      {!loading && items.length === 0 && (
        <div className="text-gray-500 text-center py-12">Nessun elemento da rivedere.</div>
      )}
      <div className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="border rounded-lg p-4 bg-white">
            <div className="mb-3 pb-3 border-b">
              <div className="font-mono text-xs text-gray-500">prog: {item.programmazione_id.slice(0, 8)}</div>
              <div className="text-sm">
                Top confidence: <span className="font-mono">{Math.round(item.top_confidence * 100)}%</span>
              </div>
            </div>
            <div className="space-y-2">
              {item.candidates.slice(0, 5).map((c, idx) => {
                const o = opereById[c.opera_id]
                if (!o) return null
                return (
                  <CandidateCard
                    key={c.opera_id}
                    candidate={c}
                    operaTitle={o.titolo}
                    operaYear={o.anno_produzione}
                    operaType={o.tipo}
                    isPreferred={idx === 0}
                    onSelect={() => handleResolve(item.id, c.opera_id)}
                  />
                )
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => handleReject(item.id)}
                      className="px-3 py-1 text-sm rounded border border-red-300 text-red-700">
                Rifiuta tutti
              </button>
              <button onClick={() => userId && markNewOpera(item.id, userId).then(load)}
                      className="px-3 py-1 text-sm rounded border border-gray-300">
                Crea nuova opera
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Smoke test the page**

Run dev server: `npm run dev`

Navigate to: `http://localhost:3000/dashboard/individuazioni/review?campagna=<any-campagna-id>`

Expected: page loads with empty state (since no review items exist yet).

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/individuazioni/review/
git commit -m "feat(matching): review queue page with candidate cards and resolve/reject actions"
```

---

### Task 3.4: Auto-route ambiguous matches to review queue

**Files:**
- Create: `supabase/migrations/<ts>_create_auto_match_rpc.sql`

- [ ] **Step 1: Create migration**

`supabase migration new create_auto_match_rpc`

- [ ] **Step 2: Write RPC**

```sql
-- auto_match_programmazione: decide auto-create, send-to-review, or skip.
-- Called per programmazione by the batched processing pipeline.
--
-- Behavior:
--   - confidence ≥ 0.85 → return decision='auto', best opera_id
--   - confidence ≥ 0.60 → insert row into review_queue, return decision='review'
--   - confidence <  0.60 → return decision='skip'

CREATE OR REPLACE FUNCTION public.auto_match_programmazione(
  p_prog_id uuid,
  p_campagna_ind_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_candidates jsonb;
  v_top jsonb;
  v_top_conf numeric;
  v_decision text;
  v_opera_id uuid;
  v_strategy text;
BEGIN
  SELECT jsonb_agg(c) INTO v_candidates
  FROM (
    SELECT opera_id, strategy, confidence, signals
    FROM public.find_opera_candidates(p_prog_id, 0.4, 10)
    ORDER BY confidence DESC
  ) c;

  IF v_candidates IS NULL OR jsonb_array_length(v_candidates) = 0 THEN
    RETURN jsonb_build_object('decision','skip','confidence',0);
  END IF;

  v_top := v_candidates->0;
  v_top_conf := (v_top->>'confidence')::numeric;
  v_opera_id := (v_top->>'opera_id')::uuid;
  v_strategy := v_top->>'strategy';

  IF v_top_conf >= 0.85 THEN
    v_decision := 'auto';
  ELSIF v_top_conf >= 0.60 THEN
    v_decision := 'review';
    INSERT INTO public.individuazioni_review_queue
      (programmazione_id, campagna_individuazione_id, candidates, top_confidence)
    VALUES (p_prog_id, p_campagna_ind_id, v_candidates, v_top_conf)
    ON CONFLICT (programmazione_id, campagna_individuazione_id) DO UPDATE
      SET candidates = EXCLUDED.candidates,
          top_confidence = EXCLUDED.top_confidence,
          status = 'pending';
  ELSE
    v_decision := 'skip';
  END IF;

  RETURN jsonb_build_object(
    'decision', v_decision,
    'confidence', v_top_conf,
    'opera_id', v_opera_id,
    'strategy', v_strategy,
    'candidates', v_candidates
  );
END
$$;

GRANT EXECUTE ON FUNCTION public.auto_match_programmazione TO authenticated;
```

- [ ] **Step 3: Apply + smoke test**

```sql
SELECT auto_match_programmazione(
  (SELECT id FROM programmazioni WHERE titolo IS NOT NULL LIMIT 1),
  (SELECT id FROM campagne_individuazione LIMIT 1)
);
-- Expected: jsonb with decision/confidence/opera_id/candidates
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(matching): auto_match_programmazione RPC routes to review or auto"
git tag matching-phase-3
```

---

## Phase 4 — Learning Loop (Week 5)

### Task 4.1: Trigger to auto-create aliases on review resolution

**Files:**
- Create: `supabase/migrations/<ts>_create_alias_learning_trigger.sql`

- [ ] **Step 1: Create migration**

`supabase migration new create_alias_learning_trigger`

- [ ] **Step 2: Write trigger**

```sql
-- When a review is resolved, automatically create an opera_alias entry
-- (or increment hit_count if it already exists) so future imports of the
-- same title from the same emittente match instantly.

CREATE OR REPLACE FUNCTION public.trg_review_resolved_to_alias()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_prog RECORD;
BEGIN
  IF NEW.status = 'resolved' AND NEW.resolved_opera_id IS NOT NULL
     AND (OLD IS NULL OR OLD.status <> 'resolved') THEN

    SELECT emittente_id, titolo, anno
    INTO v_prog
    FROM public.programmazioni
    WHERE id = NEW.programmazione_id;

    IF v_prog.titolo IS NOT NULL AND length(trim(v_prog.titolo)) > 0 THEN
      INSERT INTO public.opera_aliases
        (opera_id, emittente_id, alias_titolo, alias_anno, source, confidence, hit_count, last_hit_at, created_by)
      VALUES
        (NEW.resolved_opera_id, v_prog.emittente_id, v_prog.titolo, v_prog.anno,
         'manual', 1.00, 1, now(), NEW.resolved_by)
      ON CONFLICT (opera_id, emittente_id, alias_titolo_norm, alias_anno) DO UPDATE
        SET hit_count = public.opera_aliases.hit_count + 1,
            last_hit_at = now(),
            confidence = GREATEST(public.opera_aliases.confidence, 1.00);
    END IF;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS review_to_alias ON public.individuazioni_review_queue;
CREATE TRIGGER review_to_alias
  AFTER UPDATE OF status ON public.individuazioni_review_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_review_resolved_to_alias();
```

- [ ] **Step 3: Apply + manual test**

```sql
-- Insert a fake review
INSERT INTO individuazioni_review_queue (programmazione_id, campagna_individuazione_id, candidates, top_confidence)
SELECT
  (SELECT id FROM programmazioni WHERE titolo IS NOT NULL LIMIT 1),
  (SELECT id FROM campagne_individuazione LIMIT 1),
  '[]'::jsonb, 0.70
RETURNING id AS review_id;

-- Resolve it (substitute IDs)
UPDATE individuazioni_review_queue
SET status='resolved', resolved_opera_id=(SELECT id FROM opere LIMIT 1)
WHERE id = '<review_id>';

-- Confirm alias was created
SELECT * FROM opera_aliases WHERE created_at > now() - interval '1 minute';
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(matching): alias learning trigger on review resolution"
```

---

### Task 4.2: Bulk auto-resolve high-confidence reviews

**Files:**
- Create: `supabase/migrations/<ts>_create_bulk_resolve_reviews_rpc.sql`

- [ ] **Step 1: Create migration**

`supabase migration new create_bulk_resolve_reviews_rpc`

- [ ] **Step 2: Write RPC**

```sql
-- bulk_resolve_reviews: auto-resolve all reviews above a threshold.
-- The alias-learning trigger fires automatically for each resolved row.

CREATE OR REPLACE FUNCTION public.bulk_resolve_reviews(
  p_review_ids uuid[],
  p_user_id uuid,
  p_min_confidence numeric DEFAULT 0.75
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH updated AS (
    UPDATE public.individuazioni_review_queue r
    SET status = 'resolved',
        resolved_opera_id = (r.candidates->0->>'opera_id')::uuid,
        resolved_by = p_user_id,
        resolved_at = now()
    WHERE r.id = ANY(p_review_ids)
      AND r.status = 'pending'
      AND r.top_confidence >= p_min_confidence
      AND r.candidates IS NOT NULL
      AND jsonb_array_length(r.candidates) > 0
    RETURNING r.id
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  RETURN jsonb_build_object('resolved_count', v_count);
END
$$;

GRANT EXECUTE ON FUNCTION public.bulk_resolve_reviews TO authenticated;
```

- [ ] **Step 3: Apply**

- [ ] **Step 4: Add BulkActions UI component**

Create `src/app/dashboard/individuazioni/review/components/BulkActions.tsx`:

```tsx
import { useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { ReviewItem } from '@/features/individuazioni/services/review-queue.service'

interface Props {
  items: ReviewItem[]
  userId: string | null
  onResolved: () => void
}

export function BulkActions({ items, userId, onResolved }: Props) {
  const [running, setRunning] = useState(false)
  const [threshold, setThreshold] = useState(0.75)

  const eligible = items.filter(i => i.top_confidence >= threshold)

  const run = async () => {
    if (!userId || eligible.length === 0) return
    setRunning(true)
    try {
      const { data, error } = await (supabase as any).rpc('bulk_resolve_reviews', {
        p_review_ids: eligible.map(i => i.id),
        p_user_id: userId,
        p_min_confidence: threshold,
      })
      if (error) throw error
      window.alert(`Risolti ${data?.resolved_count ?? 0} review.`)
      onResolved()
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded mb-4">
      <label className="text-sm">Soglia auto-resolve:</label>
      <input
        type="number"
        min={0.60}
        max={0.95}
        step={0.05}
        value={threshold}
        onChange={e => setThreshold(parseFloat(e.target.value))}
        className="w-20 px-2 py-1 border rounded"
      />
      <button
        onClick={run}
        disabled={running || eligible.length === 0 || !userId}
        className="px-3 py-1 bg-blue-600 text-white text-sm rounded disabled:opacity-50"
      >
        {running ? 'Eseguendo...' : `Auto-resolve ${eligible.length}`}
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Wire into review page**

In `src/app/dashboard/individuazioni/review/page.tsx`, add import:
```tsx
import { BulkActions } from './components/BulkActions'
```

Add the component above the items list (right after the loading check):
```tsx
{!loading && items.length > 0 && (
  <BulkActions items={items} userId={userId} onResolved={load} />
)}
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/ src/app/dashboard/individuazioni/review/components/BulkActions.tsx src/app/dashboard/individuazioni/review/page.tsx
git commit -m "feat(matching): bulk_resolve_reviews RPC and BulkActions UI"
git tag matching-phase-4
```

---

## Phase 5 — Metrics Dashboard (Week 6)

### Task 5.1: get_matching_metrics RPC

**Files:**
- Create: `supabase/migrations/<ts>_create_matching_metrics_rpc.sql`

- [ ] **Step 1: Create migration**

`supabase migration new create_matching_metrics_rpc`

- [ ] **Step 2: Write RPC**

```sql
CREATE OR REPLACE FUNCTION public.get_matching_metrics(
  p_campagna_id uuid DEFAULT NULL,
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL
)
RETURNS TABLE(
  emittente_id uuid,
  emittente_nome text,
  total_progs bigint,
  auto_matched bigint,
  review_pending bigint,
  review_resolved bigint,
  no_match bigint,
  match_rate numeric,
  avg_score numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    e.id,
    e.nome,
    COUNT(p.id)::bigint,
    COUNT(*) FILTER (WHERE i.id IS NOT NULL AND i.punteggio_matching >= 85)::bigint,
    COUNT(*) FILTER (WHERE rq.status = 'pending')::bigint,
    COUNT(*) FILTER (WHERE rq.status = 'resolved')::bigint,
    COUNT(*) FILTER (WHERE i.id IS NULL AND rq.id IS NULL)::bigint,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE i.id IS NOT NULL)::numeric / NULLIF(COUNT(p.id), 0),
      2
    ),
    ROUND(AVG(i.punteggio_matching)::numeric, 2)
  FROM public.programmazioni p
  JOIN public.emittenti e ON e.id = p.emittente_id
  LEFT JOIN public.individuazioni i ON i.programmazione_id = p.id
  LEFT JOIN public.individuazioni_review_queue rq ON rq.programmazione_id = p.id
  WHERE (p_campagna_id IS NULL OR p.campagna_programmazione_id = p_campagna_id)
    AND (p_from IS NULL OR p.data_trasmissione >= p_from)
    AND (p_to IS NULL OR p.data_trasmissione <= p_to)
  GROUP BY e.id, e.nome
  ORDER BY match_rate DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_matching_metrics TO authenticated;
```

- [ ] **Step 3: Apply + smoke test**

```sql
SELECT * FROM get_matching_metrics(NULL, NULL, NULL) LIMIT 10;
```

Expected: rows per emittente with metrics.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(matching): get_matching_metrics RPC for dashboard"
```

---

### Task 5.2: Metrics dashboard page

**Files:**
- Create: `src/app/dashboard/individuazioni/metrics/page.tsx`

- [ ] **Step 1: Create page**

```tsx
// src/app/dashboard/individuazioni/metrics/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'

interface Metric {
  emittente_id: string
  emittente_nome: string
  total_progs: number
  auto_matched: number
  review_pending: number
  review_resolved: number
  no_match: number
  match_rate: number | null
  avg_score: number | null
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any).rpc('get_matching_metrics', {
        p_campagna_id: null, p_from: null, p_to: null,
      })
      if (!error) setMetrics(data || [])
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="p-6">Caricamento...</div>

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Matching Metrics</h1>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-2">Emittente</th>
              <th className="text-right p-2">Total</th>
              <th className="text-right p-2">Auto</th>
              <th className="text-right p-2">Review</th>
              <th className="text-right p-2">No Match</th>
              <th className="text-right p-2">Match Rate</th>
              <th className="text-right p-2">Avg Score</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map(m => (
              <tr key={m.emittente_id} className="border-b hover:bg-gray-50">
                <td className="p-2 font-medium">{m.emittente_nome}</td>
                <td className="text-right p-2 font-mono">{m.total_progs.toLocaleString()}</td>
                <td className="text-right p-2 font-mono text-green-700">{m.auto_matched.toLocaleString()}</td>
                <td className="text-right p-2 font-mono text-yellow-700">{m.review_pending.toLocaleString()}</td>
                <td className="text-right p-2 font-mono text-red-700">{m.no_match.toLocaleString()}</td>
                <td className="text-right p-2 font-mono">
                  {m.match_rate != null
                    ? <span className={
                        m.match_rate >= 50 ? 'text-green-700' :
                        m.match_rate >= 20 ? 'text-yellow-700' :
                        'text-red-700'
                      }>{m.match_rate}%</span>
                    : '—'}
                </td>
                <td className="text-right p-2 font-mono">{m.avg_score ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Smoke test**

`npm run dev` → `http://localhost:3000/dashboard/individuazioni/metrics`

Expected: table with per-emittente match rates, colored by tier.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/individuazioni/metrics/
git commit -m "feat(matching): metrics dashboard for per-emittente match rates"
git tag matching-phase-5
```

---

## Phase 6 — Opera Aliases UI on Opera Detail (Week 6+)

### Task 6.1: aliases.service.ts (TDD)

**Files:**
- Create: `src/features/opere/services/aliases.service.ts`
- Create: `src/features/opere/services/aliases.service.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/features/opere/services/aliases.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '@/shared/lib/supabase'
import { listAliasesForOpera, deleteAlias } from './aliases.service'

beforeEach(() => vi.clearAllMocks())

describe('listAliasesForOpera', () => {
  it('queries opera_aliases joined with emittenti, ordered by hit_count', async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null })
    const eq = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ eq }))
    ;(supabase.from as any).mockReturnValue({ select })
    await listAliasesForOpera('opera-1')
    expect(supabase.from).toHaveBeenCalledWith('opera_aliases')
    expect(eq).toHaveBeenCalledWith('opera_id', 'opera-1')
    expect(order).toHaveBeenCalledWith('hit_count', { ascending: false })
  })
})

describe('deleteAlias', () => {
  it('deletes by id', async () => {
    const eq = vi.fn().mockResolvedValue({ data: null, error: null })
    const del = vi.fn(() => ({ eq }))
    ;(supabase.from as any).mockReturnValue({ delete: del })
    await deleteAlias('alias-1')
    expect(supabase.from).toHaveBeenCalledWith('opera_aliases')
    expect(eq).toHaveBeenCalledWith('id', 'alias-1')
  })
})
```

- [ ] **Step 2: Run, FAIL**

- [ ] **Step 3: Implement**

```typescript
// src/features/opere/services/aliases.service.ts
import { supabase } from '@/shared/lib/supabase'

export interface OperaAlias {
  id: string
  opera_id: string
  emittente_id: string | null
  alias_titolo: string
  alias_titolo_norm: string
  alias_anno: number | null
  source: 'manual' | 'auto' | 'historical' | 'api'
  confidence: number
  hit_count: number
  last_hit_at: string | null
  emittenti?: { nome: string } | null
}

export async function listAliasesForOpera(operaId: string) {
  return (supabase as any)
    .from('opera_aliases')
    .select('*, emittenti:emittente_id(nome)')
    .eq('opera_id', operaId)
    .order('hit_count', { ascending: false })
}

export async function deleteAlias(aliasId: string) {
  return (supabase as any).from('opera_aliases').delete().eq('id', aliasId)
}
```

- [ ] **Step 4: Run, PASS**

- [ ] **Step 5: Commit**

```bash
git add src/features/opere/services/aliases.service.ts src/features/opere/services/aliases.service.test.ts
git commit -m "feat(matching): aliases service for opera detail page"
```

---

### Task 6.2: AliasInspector component

**Files:**
- Create: `src/app/dashboard/opere/[id]/components/AliasInspector.tsx`

- [ ] **Step 1: Create component**

```tsx
// src/app/dashboard/opere/[id]/components/AliasInspector.tsx
'use client'

import { useEffect, useState } from 'react'
import { listAliasesForOpera, deleteAlias, type OperaAlias } from '@/features/opere/services/aliases.service'

export function AliasInspector({ operaId }: { operaId: string }) {
  const [aliases, setAliases] = useState<OperaAlias[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data, error } = await listAliasesForOpera(operaId)
    if (!error) setAliases((data as OperaAlias[]) || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [operaId])

  const handleDelete = async (id: string) => {
    if (!window.confirm('Rimuovere questo alias? Future programmazioni con questo titolo non matcheranno più automaticamente.')) return
    await deleteAlias(id)
    await load()
  }

  if (loading) return <div className="text-sm text-gray-500">Caricamento alias...</div>
  if (aliases.length === 0) return <div className="text-sm text-gray-500">Nessun alias registrato.</div>

  return (
    <div className="border rounded">
      <div className="px-3 py-2 border-b bg-gray-50 text-sm font-medium">
        Conosciuta come ({aliases.length})
      </div>
      <table className="w-full text-sm">
        <thead className="text-xs text-gray-500">
          <tr>
            <th className="text-left p-2">Titolo</th>
            <th className="text-left p-2">Anno</th>
            <th className="text-left p-2">Emittente</th>
            <th className="text-left p-2">Source</th>
            <th className="text-right p-2">Hits</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {aliases.map(a => (
            <tr key={a.id} className="border-t">
              <td className="p-2 font-mono">{a.alias_titolo}</td>
              <td className="p-2">{a.alias_anno ?? '—'}</td>
              <td className="p-2">{a.emittenti?.nome ?? '—'}</td>
              <td className="p-2 text-xs">{a.source}</td>
              <td className="text-right p-2 font-mono">{a.hit_count}</td>
              <td className="p-2 text-right">
                <button onClick={() => handleDelete(a.id)} className="text-xs text-red-600">
                  Rimuovi
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Mount on opera detail page**

Open `src/app/dashboard/opere/[id]/page.tsx`. Find a sensible location (after the main opera details section) and add:

```tsx
import { AliasInspector } from './components/AliasInspector'

// inside the JSX, after main details:
<div className="mt-6">
  <AliasInspector operaId={params.id} />
</div>
```

(Adjust the import path and the prop name to match the actual page's prop conventions for the dynamic id.)

- [ ] **Step 3: Smoke test**

`npm run dev` → open any opera detail page → verify the AliasInspector renders with historical aliases.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/opere/[id]/components/AliasInspector.tsx src/app/dashboard/opere/[id]/page.tsx
git commit -m "feat(matching): AliasInspector on opera detail page"
git tag matching-phase-6
```

---

## Phase 7 — MappingWizard transform UI (parallel, Week 2-3)

### Task 7.1: Extend MappingWizard with transform dropdown

**Files:**
- Modify: `src/app/dashboard/programmazioni/components/MappingWizard.tsx`

- [ ] **Step 1: Read the existing wizard**

Run: `cat src/app/dashboard/programmazioni/components/MappingWizard.tsx | head -100`

Identify where each source column is rendered with its target dropdown. Note the state shape.

- [ ] **Step 2: Add a transform state**

In the component, alongside the existing mapping state, add:

```tsx
import { TRANSFORMS, type TransformName } from '@/features/programmazioni/utils/transforms'

// inside component:
const [transforms, setTransforms] = useState<Record<string, TransformName | ''>>({})

const TRANSFORM_OPTIONS: { value: TransformName | ''; label: string }[] = [
  { value: '', label: '— Nessuna —' },
  { value: 'hhmmss_to_minutes', label: 'HH:MM:SS → minuti' },
  { value: 'seconds_to_minutes', label: 'Secondi → minuti' },
  { value: 'fractional_hours_to_minutes', label: 'Ore decimali → minuti (LA7)' },
  { value: 'fractional_day_to_minutes', label: 'Frazione giorno → minuti (CHILI TVOD)' },
  { value: 'milliseconds_to_minutes', label: 'Millisecondi → minuti (Apple TVOD)' },
  { value: 'iso8601_duration_to_minutes', label: 'ISO 8601 (PT0H22M0S) → minuti (Apple SVOD)' },
  { value: 'decimal_minutes_to_int', label: 'Minuti decimali → minuti interi (Viacom, Netflix)' },
  { value: 'rti_apostrophe_minutes', label: "128' → 128 (RTI)" },
  { value: 'null_if_NA', label: '"N/A" → null (Discovery)' },
  { value: 'null_if_ND', label: '"N.D." → null (TIMVision)' },
  { value: 'null_if_NULL_str', label: '"NULL" → null (Disney)' },
  { value: 'netflix_episode_nbr', label: '"--" → null (Netflix episode)' },
  { value: 'us_date_to_iso', label: 'MM/DD/YYYY → ISO (Netflix)' },
  { value: 'yyyymmdd_int_to_iso', label: '20231231 → 2023-12-31 (Apple TVOD)' },
]
```

- [ ] **Step 3: Add dropdown next to each mapping row**

In the source column rendering loop, alongside the existing target field selector, add:

```tsx
<select
  className="text-xs px-2 py-1 border rounded ml-2"
  value={transforms[sourceCol] ?? ''}
  onChange={e => setTransforms(prev => ({ ...prev, [sourceCol]: e.target.value as TransformName | '' }))}
>
  {TRANSFORM_OPTIONS.map(opt => (
    <option key={opt.value} value={opt.value}>{opt.label}</option>
  ))}
</select>
```

- [ ] **Step 4: Save transforms to parser_config when wizard completes**

In the wizard's save handler, change the saved payload to include transforms. Find the existing `saveMapping(...)` call and replace it with a save to `parser_config`:

```typescript
import { saveParserConfig } from '@/features/programmazioni/services/import-mapping.service'
// (Add this helper next — see Task 7.2)

await saveParserConfig(emittenteId, {
  version: 2,
  file_type: 'auto',
  header_row: 0,
  data_start_row: 1,
  colonne_rilevate: columns,
  ultimo_upload: new Date().toISOString(),
  fields: mapping,
  transforms: Object.fromEntries(
    Object.entries(transforms).filter(([_, t]) => t)
  ) as Record<string, TransformName>,
})
```

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/programmazioni/components/MappingWizard.tsx
git commit -m "feat(matching): transform dropdown per column in MappingWizard"
```

---

### Task 7.2: Add saveParserConfig helper

**Files:**
- Modify: `src/features/programmazioni/services/import-mapping.service.ts`

- [ ] **Step 1: Append helper**

```typescript
import type { ParserConfigV2 } from '../utils/parser-config'
import { validateParserConfig } from '../utils/parser-config'

export async function saveParserConfig(
  emittenteId: string,
  config: ParserConfigV2
): Promise<{ data: any; error: any }> {
  const v = validateParserConfig(config)
  if (!v.valid) {
    return { data: null, error: new Error(`Invalid parser_config: ${v.errors.join(', ')}`) }
  }
  const { data, error } = await (supabase as any)
    .from('emittenti')
    .update({ parser_config: config, mapping_import: null })
    .eq('id', emittenteId)
    .select()
    .single()
  return { data, error }
}

export async function getParserConfigByEmittente(
  emittenteId: string
): Promise<{ data: ParserConfigV2 | null; error: any }> {
  const { data, error } = await (supabase as any)
    .from('emittenti')
    .select('parser_config, mapping_import')
    .eq('id', emittenteId)
    .single()
  if (error) return { data: null, error }
  if (data?.parser_config) return { data: data.parser_config as ParserConfigV2, error: null }
  // Fallback: migrate legacy mapping_import on the fly
  if (data?.mapping_import) {
    const { migrateLegacyMapping } = await import('../utils/parser-config')
    return { data: migrateLegacyMapping(data.mapping_import), error: null }
  }
  return { data: null, error: null }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/programmazioni/services/import-mapping.service.ts
git commit -m "feat(matching): saveParserConfig and getParserConfigByEmittente helpers"
git tag matching-phase-7
```

---

## Self-Review

Reviewing the plan against the original spec before declaring it complete.

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| Title normalization | Task 0.1, 0.2, 0.3 |
| match_key column + index | Task 0.3, 2.1, 2.2, 2.3 |
| opera_aliases table + backfill | Task 0.4 |
| Transform registry | Task 1.1 |
| parser_config v2 + backward compat | Task 1.2, 1.3, 1.4, 7.2 |
| Hierarchical resolution RPC | Task 2.4 |
| Frontend matching service | Task 2.5 |
| Review queue schema | Task 3.1 |
| Review queue service | Task 3.2 |
| Review queue UI | Task 3.3 |
| Auto-routing to review queue | Task 3.4 |
| Alias learning trigger | Task 4.1 |
| Bulk auto-resolve | Task 4.2 |
| Metrics RPC + dashboard | Task 5.1, 5.2 |
| Opera detail alias inspector | Task 6.1, 6.2 |
| MappingWizard transform UI | Task 7.1, 7.2 |

All spec items have at least one task. No gaps.

**Placeholder check:** Scanned plan for "TBD", "implement later", "similar to", "add appropriate error handling" — none found.

**Type consistency check:**
- `Candidate.strategy` type matches between `matching.service.ts` and `SignalBadges.tsx` ✓
- `TransformName` exported from `transforms.ts` and consumed by `parser-config.ts`, `import-mapping.service.ts`, `MappingWizard.tsx` ✓
- `build_match_key` signature `(text, integer)` consistent across triggers and `find_opera_candidates` ✓
- `applyMappingWithTransforms` config shape `{ fields, transforms }` consistent across test, implementation, and wizard save ✓
- `ReviewItem.candidates` typed as `Candidate[]` in service, consumed identically in page ✓

**Risk register (for executing engineer awareness):**

| Risk | Mitigation |
|---|---|
| 4M row UPDATE in Task 2.2 takes long | Batched 50K chunks with `SKIP LOCKED`; run during low traffic |
| `CONCURRENTLY` index needs out-of-transaction | If supabase tooling wraps migrations in a transaction, run `CREATE INDEX CONCURRENTLY` via direct `psql` connection instead |
| Existing matching pipeline (`process_campagna_individuazione_optimized`) still runs old logic | This plan adds parallel infrastructure; integration with existing pipeline is intentionally deferred (separate plan) |
| RLS policies block service access | All policies use `auth.role() = 'authenticated'`; verify the service role bypass is intact for batch processing |
| `match_programmazione_to_partecipazioni` existing RPC still works | This plan does not modify it; both old and new paths coexist until cutover |
| Backfill from individuazioni produces duplicate aliases per (opera, emittente) | `ON CONFLICT DO NOTHING` handles unique constraint; verify hit_count semantics post-backfill |

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-18-matching-reliability-optimization.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best for this plan because there are 35+ atomic tasks and the long-running DB migrations (Task 2.2) benefit from isolated context.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints. Better if you want to watch each task land and decide on the fly.

Which approach?
