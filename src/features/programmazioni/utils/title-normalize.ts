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
// Extended to handle both S.NN and ST.NN prefixes (e.g. "ST.1", "S.02", "S 3").
const SEASON_TRAIL = /\s+(?:S|ST)\.?\s*\d+\s*$/i
// Extended to handle "(SEASON 1R)" variant in addition to "(SEASON 4)".
const SEASON_PAREN = /\s*\(\s*SEASON\s+\d+R?\s*\)/gi
const ROMAN_TRAIL = /\s+[IVX]{2,}\s*$/i
const EPISODE_TRAIL = /\s+EP\.?\s*\d+.*$/i
const EPISODIO_IT = /\s+EPISODIO\s+\d+.*$/i

// New audit-derived patterns ---------------------------------------------------
// Trailing plain digit (only stripped by the "loose" normalizeTitle, not Strict).
const DIGIT_TRAIL = /\s+\d{1,3}\s*$/
// Trailing "PARTE N" with optional separating dash (loose-only).
const PARTE_TRAIL = /\s*-?\s*PARTE\s+\d+\s*$/i
// Trailing puntata marker: " - p.NN" (strict-safe).
const PUNTATA_TRAIL = /\s+-\s*p\.\s*\d+\s*$/i
// Trailing suffix tags like " - LA SERIE", " - PILOTA", " - SPECIALE" etc.
const SUFFIX_TAG_TRAIL =
  /\s+-\s+(LA\s+SERIE|STAGIONE\s+FINALE|PILOTA|PILLOLE|SPECIALE)\s*$/i
// Special parenthetical markers anywhere in the title.
const SPECIAL_PAREN =
  /\s*\(\s*(MOVIE|REPEAT\s+VERSION|ONE\s+HOUR\s+REPACK|CHRISTMAS\s+SPECIAL)\s*\)/gi
// Leading category prefix: "FILM ", "DOCUMENTARIO " (uppercase only — broadcaster
// tags are always ALL CAPS; preserves legitimate titles like "Film X").
const CATEGORY_PREFIX = /^(FILM|DOCUMENTARIO)\s+/
// Leading "(Channel) " prefix, e.g. "(Tv8) Foo".
const CHANNEL_PREFIX = /^\(\s*[A-Za-z0-9]+\s*\)\s+/
// Trailing "(ARTICLE)" reorder: "MADAMA (LA)" -> "LA MADAMA".
const ARTICLE_TRAIL_PAREN =
  /^(.+?)\s+\((LA|IL|LE|LO|GLI|UN|UNO|UNA|I|THE)\)\s*$/i

// Diverges from plan: function-word list instead of <40% lowercase heuristic, which
// mis-handled mixed-case titles like "L'ordine del tempo" and "Astrid et Raphaelle".
// The plan's verbatim test corpus required title-casing to apply to mostly-lowercase
// strings — incompatible with a percentage threshold. SQL mirror in Phase 2 only needs
// to mirror buildMatchKey() (downstream of toLowerCase), so this divergence is safe.
//
// TODO(Task 0.2): consolidate with `toTitleCase` in services/programmazioni.service.ts
// — same name, different semantics — to avoid import ambiguity.
const TITLE_CASE_LOWERCASE = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor',
  'of', 'on', 'or', 'the', 'to', 'up', 'with',
])

/**
 * Title-case a string applying English title-case rules.
 * - ALL CAPS → Title Case
 * - All lowercase / mixed-case with lowercase non-function words → Title Case
 * - Already in English Title Case (function words lowercase) → preserved as-is
 * Function words (of, the, and, …) stay lowercase except when first.
 */
export function toTitleCase(str: string | null | undefined): string {
  if (!str || typeof str !== 'string') return ''
  const totalLetters = (str.match(/[a-zA-Z]/g) || []).length
  if (totalLetters === 0) return str

  // ALL CAPS → always retitle (no lowercase letters means nothing to preserve).
  const hasLowercase = /[a-z]/.test(str)

  const words = str.split(/\s+/).filter(Boolean)
  const isEnglishTitleCase =
    hasLowercase &&
    words.length > 0 &&
    words.every((w, i) => {
      const lower = w.toLowerCase()
      if (i > 0 && TITLE_CASE_LOWERCASE.has(lower)) return w === lower
      return /^[^a-zA-Z]*[A-Z]/.test(w)
    })
  if (isEnglishTitleCase) return str

  return words
    .map((w, i) => {
      const lower = w.toLowerCase()
      if (i > 0 && TITLE_CASE_LOWERCASE.has(lower)) return lower
      return lower.replace(/(?:^|(?<=[-–(]))\S/g, c => c.toUpperCase())
    })
    .join(' ')
}

/**
 * Strict normalization: strips broadcaster cruft but PRESERVES tokens that
 * could be part of the canonical work title — trailing Roman numerals, plain
 * digits, and "PARTE N" markers. Use this when an exact-key match is needed
 * for series like "SAW VI" or "IP MAN 2".
 *
 * Idempotent: normalizeTitleStrict(normalizeTitleStrict(x)) === normalizeTitleStrict(x).
 */
export function normalizeTitleStrict(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return ''
  // Normalize non-breaking spaces to regular spaces before trimming.
  let s = raw.replace(/\xa0/g, ' ').trim()
  if (!s) return ''
  s = s.replace(EDITION_SQUARE, '')
       .replace(EDITION_PAREN, '')
       .replace(REPLICA_PAREN, '')
       .replace(SEASON_PAREN, '')
       .replace(SEASON_TRAIL, '')
       .replace(EPISODE_TRAIL, '')
       .replace(EPISODIO_IT, '')
       .replace(PUNTATA_TRAIL, '')
       .replace(SUFFIX_TAG_TRAIL, '')
       .replace(SPECIAL_PAREN, '')
       .replace(CATEGORY_PREFIX, '')
       .replace(CHANNEL_PREFIX, '')
       .replace(/[‘’]/g, "'")
       .replace(/[“”]/g, '"')
       .replace(/\s+/g, ' ')
       .trim()
  // Reorder "MADAMA (LA)" -> "LA MADAMA" so downstream article-stripping works.
  s = s.replace(ARTICLE_TRAIL_PAREN, (_m, w, art) => `${art} ${w}`).trim()
  return toTitleCase(s)
}

/**
 * Loose normalization: applies strict cleanup AND additionally strips
 * trailing Roman numerals, plain digits, and "PARTE N" markers. Use this
 * for fuzzy matching where "Beautiful XXXIII" should match "Beautiful".
 *
 * Idempotent: normalizeTitle(normalizeTitle(x)) === normalizeTitle(x).
 */
export function normalizeTitle(raw: string | null | undefined): string {
  let s = normalizeTitleStrict(raw)
  if (!s) return ''
  // Order matters: PARTE_TRAIL strips " - Parte 2" before DIGIT_TRAIL would
  // strip the lone " 2", leaving an orphan " - Parte".
  s = s.replace(ROMAN_TRAIL, '')
       .replace(PARTE_TRAIL, '')
       .replace(DIGIT_TRAIL, '')
       .trim()
  return s
}

/**
 * Build a deterministic match key for joining programmazioni and opere.
 * Lowercase, strip leading articles, append ::year when present.
 * Uses the LOOSE normalizer (strips trailing numerals).
 */
export function buildMatchKey(
  title: string | null | undefined,
  year?: number | null
): string {
  const norm = normalizeTitle(title).toLowerCase().replace(ARTICLES_RX, '').trim()
  return year ? `${norm}::${year}` : norm
}

/**
 * Strict variant of buildMatchKey: preserves trailing Roman/digit/PARTE
 * tokens so series like "SAW VI" and "IP MAN 2" produce distinct keys.
 */
export function buildMatchKeyStrict(
  title: string | null | undefined,
  year?: number | null
): string {
  const norm = normalizeTitleStrict(title).toLowerCase().replace(ARTICLES_RX, '').trim()
  return year ? `${norm}::${year}` : norm
}
