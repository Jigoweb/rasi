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
      return lower.replace(/(?:^|[-–(])\S/g, c => c.toUpperCase())
    })
    .join(' ')
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
       .replace(/[‘’]/g, "'")
       .replace(/[“”]/g, '"')
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
