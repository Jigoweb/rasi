/** Shared year parsing for the upload worker (mirrors src/features/programmazioni/utils/year-parse.ts). */

export interface ParsedYearValue {
  anno: number
  anno_fine: number | null
  grezzo: string
  kind: 'single' | 'range'
}

const YEAR_RANGE_RX = /(\d{4})\s*[-–—/]\s*(\d{4})/

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

export type YearSemantics = 'rilascio' | 'produzione'

export interface YearSlotPolicy {
  sources: string[]
  onlyIfPresent?: string
}

export interface YearFieldsPolicy {
  rilascio?: YearSlotPolicy
  produzione?: YearSlotPolicy
}

const BLANK = new Set(['', 'n.d.', 'n.d', 'nd', 'na', 'n/a'])

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[\s-]+/g, '_')
}

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true
  return BLANK.has(String(value).trim().toLowerCase())
}

function getRowValue(row: Record<string, unknown>, col: string): unknown {
  return row[col] ?? row[col.trim()] ?? row[normalizeKey(col)]
}

function resolveSlot(row: Record<string, unknown>, slot: YearSlotPolicy) {
  if (slot.onlyIfPresent !== undefined && isBlank(getRowValue(row, slot.onlyIfPresent))) {
    return { value: undefined, source: null as string | null }
  }
  for (const source of slot.sources) {
    const value = getRowValue(row, source)
    if (!isBlank(value)) return { value, source }
  }
  return { value: undefined, source: null }
}

export function mergeYearFieldsIntoPayload(
  payload: Record<string, unknown>,
  row: Record<string, unknown>,
  policy?: YearFieldsPolicy | null,
): void {
  const legacyAnno = typeof payload.anno === 'number' ? payload.anno : undefined

  const rilascioSlot = policy?.rilascio
  const produzioneSlot = policy?.produzione

  let rilascio: ParsedYearValue | null = null
  let produzione: ParsedYearValue | null = null
  let rilascioSource: string | null = null
  let produzioneSource: string | null = null

  if (rilascioSlot) {
    const resolved = resolveSlot(row, rilascioSlot)
    if (!isBlank(resolved.value)) {
      rilascio = parseYearValue(resolved.value)
      rilascioSource = resolved.source
    }
  }
  if (produzioneSlot) {
    const resolved = resolveSlot(row, produzioneSlot)
    if (!isBlank(resolved.value)) {
      produzione = parseYearValue(resolved.value)
      produzioneSource = resolved.source
    }
  }

  if (rilascio) {
    payload.anno_rilascio = rilascio.anno
    if (rilascio.anno_fine != null) payload.anno_rilascio_fine = rilascio.anno_fine
  }
  if (produzione) {
    payload.anno_produzione = produzione.anno
    if (produzione.anno_fine != null) payload.anno_produzione_fine = produzione.anno_fine
  }

  const canonical = rilascio ?? produzione
  if (canonical) {
    payload.anno = canonical.anno
    if (canonical.anno_fine != null) payload.anno_fine = canonical.anno_fine
    payload.anno_grezzo = canonical.grezzo
    payload.anno_semantica = rilascio ? 'rilascio' : 'produzione'
  } else if (legacyAnno != null) {
    const parsed = parseYearValue(legacyAnno)
    if (parsed) {
      payload.anno = parsed.anno
      if (parsed.anno_fine != null) payload.anno_fine = parsed.anno_fine
      payload.anno_grezzo = parsed.grezzo
      payload.anno_semantica = 'rilascio'
      payload.anno_rilascio = parsed.anno
      if (parsed.anno_fine != null) payload.anno_rilascio_fine = parsed.anno_fine
    }
  }

  if (rilascio || produzione) {
    const meta = (payload.metadati_trasmissione ?? {}) as Record<string, unknown>
    payload.metadati_trasmissione = {
      ...meta,
      year_import: {
        ...(rilascio
          ? {
              rilascio: {
                anno: rilascio.anno,
                anno_fine: rilascio.anno_fine,
                grezzo: rilascio.grezzo,
                kind: rilascio.kind,
                source: rilascioSource,
              },
            }
          : {}),
        ...(produzione
          ? {
              produzione: {
                anno: produzione.anno,
                anno_fine: produzione.anno_fine,
                grezzo: produzione.grezzo,
                kind: produzione.kind,
                source: produzioneSource,
              },
            }
          : {}),
      },
    }
  }
}

export const EMITTENTE_YEAR_PRESETS: Record<string, YearFieldsPolicy> = {
  NETFLIX: { rilascio: { sources: ['release_year'] } },
  'TIM VISION SVOD': {
    rilascio: { sources: ['ANNO_RILASCIO_ITALIA', 'ANNO_RILASCIO'] },
    produzione: { sources: ['ANNO_DI_RIFERIMENTO'] },
  },
  'TIM VISION TVOD': {
    rilascio: { sources: ['ANNO_RILASCIO_ITALIA', 'ANNO_RILASCIO'] },
    produzione: { sources: ['ANNO_DI_RIFERIMENTO'] },
  },
}

export function resolveYearPolicy(
  mapping: Record<string, string>,
  emittenteName?: string | null,
  explicit?: YearFieldsPolicy | null,
): YearFieldsPolicy | null {
  if (explicit) return explicit
  if (emittenteName && EMITTENTE_YEAR_PRESETS[emittenteName]) {
    return EMITTENTE_YEAR_PRESETS[emittenteName]
  }
  const annoSource = Object.entries(mapping).find(([, target]) => target === 'anno')?.[0]
  if (!annoSource) return null
  return { rilascio: { sources: [annoSource] } }
}
