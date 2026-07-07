export interface ParsedYearValue {
  anno: number
  anno_fine: number | null
  grezzo: string
  kind: 'single' | 'range'
}

const YEAR_RANGE_RX = /(\d{4})\s*[-–—/]\s*(\d{4})/

/** Parse "2024", 2024, "2021-2024", "2021 – 2024" into structured year values. */
export function parseYearValue(value: unknown): ParsedYearValue | null {
  if (value === null || value === undefined) return null

  if (typeof value === 'number' && Number.isFinite(value)) {
    const anno = Math.round(value)
    if (anno < 1000 || anno > 9999) return null
    return { anno, anno_fine: null, grezzo: String(anno), kind: 'single' }
  }

  const raw = String(value).trim()
  if (!raw || raw.toLowerCase() === 'nan') return null

  const rangeMatch = raw.match(YEAR_RANGE_RX)
  if (rangeMatch) {
    const a = Number(rangeMatch[1])
    const b = Number(rangeMatch[2])
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null
    const anno = Math.min(a, b)
    const anno_fine = Math.max(a, b)
    return {
      anno,
      anno_fine: anno_fine === anno ? null : anno_fine,
      grezzo: raw,
      kind: anno_fine === anno ? 'single' : 'range',
    }
  }

  const singleMatch = raw.match(/(\d{4})/)
  if (!singleMatch) return null
  const anno = Number(singleMatch[1])
  if (!Number.isFinite(anno)) return null
  return { anno, anno_fine: null, grezzo: raw, kind: 'single' }
}
