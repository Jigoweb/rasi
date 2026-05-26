/**
 * Transform registry for broadcaster import pipelines.
 *
 * Each transform maps a raw input value (from CSV/Excel cells) to a
 * normalized target value (typically minutes, ISO dates, or null
 * sentinels). All transforms are pure and side-effect free.
 *
 * Use `applyTransform(name, value)` to invoke. Passing `null` as the
 * name returns the value unchanged; passing an unknown name throws.
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
  | 'mojibake_repair'
  | 'nbsp_to_space'
  | 'null_if_dashes'
  | 'year_range_first'

export type TransformFn = (value: unknown) => unknown

/**
 * Known cp1252-as-utf8 mojibake bigrams → repaired Unicode character.
 *
 * When a UTF-8 byte sequence is mis-decoded as cp1252 (Windows-1252), each
 * multibyte UTF-8 sequence becomes a sequence of cp1252 chars. The most
 * common case is two-byte UTF-8 (e.g. è = c3 a8) → `Ã¨` (Ã = c3, ¨ = a8).
 * Three-byte sequences (em/en dashes, smart quotes) start with `â€` (e2 80).
 *
 * We use direct substitution rather than byte round-trip (Buffer.from(s,
 * 'binary').toString('utf-8')) because:
 *   1. cp1252 bytes 0x80-0x9F map to non-Latin1 codepoints (e.g. 0x80 = €),
 *      so latin1/binary encoding mangles them.
 *   2. Real-world data sometimes mixes faithful mojibake with ASCII
 *      approximations (e.g. â€" where " is plain U+0022, not U+201C).
 *      Substitution handles both.
 */
const MOJIBAKE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  // Three-byte UTF-8 lead `â€` (e2 80 ..): em/en dashes, smart quotes, ellipsis
  ['â€"', '–'],   // approx mojibake (ASCII " trailing) — en-dash
  ['â€“', '–'],   // faithful — en-dash
  ['â€”', '—'],   // em-dash
  ['â€œ', '“'],   // left double quote
  ['â€', '”'], // right double quote (U+009D trailing — rare, kept defensive)
  ['â€', '“'], // left double quote (U+009C trailing — rare)
  ['â€™', '’'],   // right single quote / apostrophe
  ['â€˜', '‘'],   // left single quote
  ['â€¦', '…'],   // ellipsis
  ['â€¢', '•'],   // bullet
  // Two-byte UTF-8 lead `Ã` (c3 ..): Latin-1 accented letters
  ['Ã€', 'À'], ['Ã', 'Á'], ['Ã‚', 'Â'], ['Ãƒ', 'Ã'], ['Ã„', 'Ä'], ['Ã…', 'Å'],
  ['Ã†', 'Æ'], ['Ã‡', 'Ç'], ['Ãˆ', 'È'], ['Ã‰', 'É'], ['Ãš', 'Ú'],
  ['Ã', 'Ê'], ['Ã‹', 'Ë'], ['ÃŒ', 'Ì'], ['Ã', 'Í'], ['ÃŽ', 'Î'],
  ['Ã', 'Ï'], ['Ã', 'Ð'], ['Ã‘', 'Ñ'], ['Ã’', 'Ò'], ['Ã“', 'Ó'],
  ['Ã”', 'Ô'], ['Ã•', 'Õ'], ['Ã–', 'Ö'], ['Ã—', '×'], ['Ã˜', 'Ø'], ['Ã™', 'Ù'],
  ['Ã›', 'Û'], ['Ãœ', 'Ü'], ['Ã', 'Ý'], ['Ãž', 'Þ'], ['ÃŸ', 'ß'],
  ['Ã ', 'à'], ['Ã¡', 'á'], ['Ã¢', 'â'], ['Ã£', 'ã'], ['Ã¤', 'ä'], ['Ã¥', 'å'],
  ['Ã¦', 'æ'], ['Ã§', 'ç'], ['Ã¨', 'è'], ['Ã©', 'é'], ['Ãª', 'ê'], ['Ã«', 'ë'],
  ['Ã¬', 'ì'], ['Ã­', 'í'], ['Ã®', 'î'], ['Ã¯', 'ï'], ['Ã°', 'ð'], ['Ã±', 'ñ'],
  ['Ã²', 'ò'], ['Ã³', 'ó'], ['Ã´', 'ô'], ['Ãµ', 'õ'], ['Ã¶', 'ö'], ['Ã·', '÷'],
  ['Ã¸', 'ø'], ['Ã¹', 'ù'], ['Ãº', 'ú'], ['Ã»', 'û'], ['Ã¼', 'ü'], ['Ã½', 'ý'],
  ['Ã¾', 'þ'], ['Ã¿', 'ÿ'],
]

/**
 * Cheap pre-check: any mojibake-lead char present? `Ã` (U+00C3) and `â`
 * (U+00E2) start the two- and three-byte UTF-8 sequences whose cp1252-
 * misread produces mojibake. Substitution is a strict bigram/trigram match,
 * so a literal `Ã` followed by a non-mojibake char (e.g. Vietnamese `BÃCH`)
 * stays unchanged.
 */
const MOJIBAKE_SENTINEL_RX = /Ã|â€/

/** Parse a value as a finite number; returns null if not coercible. */
function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') return null
    const n = Number(trimmed)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export const TRANSFORMS: Record<TransformName, TransformFn> = {
  hhmmss_to_minutes: (value) => {
    if (value === null || value === undefined) return null
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    if (trimmed === '') return null
    const match = trimmed.match(/^(\d{1,2}):(\d{2}):(\d{2})$/)
    if (!match) return null
    const h = Number(match[1])
    const m = Number(match[2])
    const s = Number(match[3])
    if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(s)) return null
    return Math.round(h * 60 + m + s / 60)
  },

  seconds_to_minutes: (value) => {
    const n = parseNumber(value)
    if (n === null) return null
    return Math.round(n / 60)
  },

  fractional_hours_to_minutes: (value) => {
    const n = parseNumber(value)
    if (n === null) return null
    return Math.round(n * 60)
  },

  fractional_day_to_minutes: (value) => {
    const n = parseNumber(value)
    if (n === null) return null
    return Math.round(n * 24 * 60)
  },

  milliseconds_to_minutes: (value) => {
    const n = parseNumber(value)
    if (n === null) return null
    return Math.round(n / 1000 / 60)
  },

  iso8601_duration_to_minutes: (value) => {
    if (value === null || value === undefined) return null
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    if (trimmed === '') return null
    // PT[nH][nM][nS]
    const match = trimmed.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/)
    if (!match) return null
    const h = match[1] ? Number(match[1]) : 0
    const m = match[2] ? Number(match[2]) : 0
    const s = match[3] ? Number(match[3]) : 0
    if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(s)) return null
    return Math.round(h * 60 + m + s / 60)
  },

  decimal_minutes_to_int: (value) => {
    const n = parseNumber(value)
    if (n === null) return null
    return Math.round(n)
  },

  rti_apostrophe_minutes: (value) => {
    if (value === null || value === undefined) return null
    const str = String(value).trim()
    if (str === '') return null
    const stripped = str.replace(/['’′]\s*$/, '')
    const n = parseNumber(stripped)
    if (n === null) return null
    return Math.round(n)
  },

  null_if_NA: (value) => {
    if (value === null || value === undefined) return null
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (/^n\/?a$/i.test(trimmed)) return null
    }
    return value
  },

  null_if_ND: (value) => {
    if (value === null || value === undefined) return null
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (/^n\.?d\.?$/i.test(trimmed)) return null
    }
    return value
  },

  null_if_NULL_str: (value) => {
    if (value === null || value === undefined) return null
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (/^null$/i.test(trimmed)) return null
    }
    return value
  },

  netflix_episode_nbr: (value) => {
    if (value === null || value === undefined) return null
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed === '' || trimmed === '--') return null
      const n = Number(trimmed)
      if (!Number.isFinite(n)) return null
      return Math.trunc(n)
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? Math.trunc(value) : null
    }
    return null
  },

  us_date_to_iso: (value) => {
    if (value === null || value === undefined) return null
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    if (trimmed === '') return null
    const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (!match) return null
    const mm = match[1].padStart(2, '0')
    const dd = match[2].padStart(2, '0')
    const yyyy = match[3]
    return `${yyyy}-${mm}-${dd}`
  },

  yyyymmdd_int_to_iso: (value) => {
    if (value === null || value === undefined) return null
    const n = parseNumber(value)
    if (n === null) return null
    const intVal = Math.trunc(n)
    const str = String(intVal)
    if (!/^\d{8}$/.test(str)) return null
    return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`
  },

  mojibake_repair: (value) => {
    if (value === null || value === undefined) return value
    if (typeof value !== 'string') return value
    if (!MOJIBAKE_SENTINEL_RX.test(value)) return value
    let out = value
    for (const [from, to] of MOJIBAKE_PAIRS) {
      if (out.includes(from)) out = out.split(from).join(to)
    }
    return out
  },

  nbsp_to_space: (value) => {
    if (value === null || value === undefined) return value
    if (typeof value !== 'string') return value
    return value.replace(/\xa0/g, ' ')
  },

  null_if_dashes: (value) => {
    if (value === null || value === undefined) return value
    if (typeof value !== 'string') return value
    const trimmed = value.trim()
    if (trimmed === '--' || trimmed === '-') return null
    return value
  },

  year_range_first: (value) => {
    if (value === null || value === undefined) return null
    if (typeof value === 'number') return Number.isFinite(value) ? value : null
    const s = String(value).trim()
    if (!s || s.toLowerCase() === 'nan') return null
    const m = s.match(/(\d{4})/)
    if (!m) return null
    const y = Number(m[1])
    return Number.isFinite(y) ? y : null
  },
}

/**
 * Apply a named transform to a value.
 * - When `name` is `null`, returns the value unchanged (identity).
 * - When `name` is unknown, throws an Error.
 */
export function applyTransform(
  name: TransformName | null,
  value: unknown,
): unknown {
  if (name === null) return value
  const fn = TRANSFORMS[name]
  if (!fn) {
    throw new Error(`Unknown transform: ${String(name)}`)
  }
  return fn(value)
}
