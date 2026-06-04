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
  | 'eu_date_to_iso'
  | 'iso_date'
  | 'eu_date_short'
  | 'us_date_short'
  | 'excel_serial_to_iso'

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
    // cutoff: 00–50 → 2000–2050; 51–99 → 1951–1999
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
    // cutoff: 00–50 → 2000–2050; 51–99 → 1951–1999
    const yyyy = yy > 50 ? `19${match[3]}` : `20${match[3]}`
    return `${yyyy}-${mm}-${dd}`
  },

  excel_serial_to_iso: (value) => {
    const n = parseNumber(value)
    if (n === null) return null
    const days = Math.trunc(n)
    if (days < 1) return null
    // Base 1899-12-30 compensa il bug dell'anno bisestile 1900 di Excel.
    // Seriali 1–59: restituisce la data astronomicamente corretta (un giorno prima
    // di quanto Excel mostra, perché Excel inventa il 1900-02-29 inesistente).
    // Seriali ≥ 61: coincide esattamente con la visualizzazione di Excel.
    const ms = Date.UTC(1899, 11, 30) + days * 86400000
    const d = new Date(ms)
    if (Number.isNaN(d.getTime())) return null
    const yyyy = d.getUTCFullYear()
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(d.getUTCDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
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

/**
 * Type guard: returns true when `name` is a known TransformName present in
 * the TRANSFORMS registry. Use this at call sites that receive transform
 * names from untrusted sources (e.g. JSON DB columns) to avoid throwing.
 */
export function isKnownTransform(name: unknown): name is TransformName {
  return typeof name === 'string' && name in TRANSFORMS
}

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
