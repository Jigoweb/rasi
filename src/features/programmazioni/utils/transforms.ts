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

export type TransformFn = (value: unknown) => unknown

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
