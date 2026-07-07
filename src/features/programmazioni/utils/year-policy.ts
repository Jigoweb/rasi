import { type TransformName } from './transforms'
import { parseYearValue } from './year-parse'

export type { ParsedYearValue } from './year-parse'
export { parseYearValue } from './year-parse'

export type YearSemantics = 'rilascio' | 'produzione'

export interface YearSlotPolicy {
  sources: string[]
  onlyIfPresent?: string
  transform?: TransformName
}

export interface YearFieldsPolicy {
  rilascio?: YearSlotPolicy
  produzione?: YearSlotPolicy
}

export interface ResolvedYearSlot {
  semantics: YearSemantics
  anno: number
  anno_fine: number | null
  grezzo: string
  kind: 'single' | 'range'
  source: string | null
}

export interface YearImportMetadata {
  rilascio?: Omit<ResolvedYearSlot, 'semantics'>
  produzione?: Omit<ResolvedYearSlot, 'semantics'>
}

const BLANK_SENTINELS = new Set(['', 'n.d.', 'n.d', 'nd', 'na', 'n/a'])

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[\s-]+/g, '_')
}

function isBlankValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  return BLANK_SENTINELS.has(String(value).trim().toLowerCase())
}

function getRowValue(row: Record<string, unknown>, col: string): unknown {
  return row[col] ?? row[col.trim()] ?? row[normalizeKey(col)]
}

function resolveSlotValue(
  row: Record<string, unknown>,
  slot: YearSlotPolicy,
): { value: unknown; source: string | null } {
  if (slot.onlyIfPresent !== undefined && isBlankValue(getRowValue(row, slot.onlyIfPresent))) {
    return { value: undefined, source: null }
  }
  for (const source of slot.sources) {
    const value = getRowValue(row, source)
    if (!isBlankValue(value)) return { value, source }
  }
  return { value: undefined, source: null }
}

function resolveYearSlot(
  row: Record<string, unknown>,
  semantics: YearSemantics,
  slot?: YearSlotPolicy,
): ResolvedYearSlot | null {
  if (!slot?.sources?.length) return null

  const { value, source } = resolveSlotValue(row, slot)
  if (isBlankValue(value)) return null

  const parsed = parseYearValue(value)
  if (!parsed) return null

  return {
    semantics,
    anno: parsed.anno,
    anno_fine: parsed.anno_fine,
    grezzo: parsed.grezzo,
    kind: parsed.kind,
    source,
  }
}

export interface ApplyYearFieldsResult {
  anno?: number
  anno_fine?: number
  anno_rilascio?: number
  anno_rilascio_fine?: number
  anno_produzione?: number
  anno_produzione_fine?: number
  anno_grezzo?: string
  anno_semantica?: YearSemantics
  year_import?: YearImportMetadata
}

/**
 * Popola gli slot anno semantici e l'anno canonico (rilascio > produzione).
 */
export function applyYearFieldsToPayload(
  row: Record<string, unknown>,
  policy?: YearFieldsPolicy | null,
  legacyAnno?: number,
): ApplyYearFieldsResult {
  const rilascio = resolveYearSlot(row, 'rilascio', policy?.rilascio)
  const produzione = resolveYearSlot(row, 'produzione', policy?.produzione)

  const result: ApplyYearFieldsResult = {}

  if (rilascio) {
    result.anno_rilascio = rilascio.anno
    if (rilascio.anno_fine != null) result.anno_rilascio_fine = rilascio.anno_fine
  }
  if (produzione) {
    result.anno_produzione = produzione.anno
    if (produzione.anno_fine != null) result.anno_produzione_fine = produzione.anno_fine
  }

  const canonical = rilascio ?? produzione
  if (canonical) {
    result.anno = canonical.anno
    if (canonical.anno_fine != null) result.anno_fine = canonical.anno_fine
    result.anno_grezzo = canonical.grezzo
    result.anno_semantica = canonical.semantics
  } else if (legacyAnno != null && Number.isFinite(legacyAnno)) {
    const parsed = parseYearValue(legacyAnno)
    if (parsed) {
      result.anno = parsed.anno
      if (parsed.anno_fine != null) result.anno_fine = parsed.anno_fine
      result.anno_grezzo = parsed.grezzo
      result.anno_semantica = 'rilascio'
      result.anno_rilascio = parsed.anno
      if (parsed.anno_fine != null) result.anno_rilascio_fine = parsed.anno_fine
    }
  }

  const year_import: YearImportMetadata = {}
  if (rilascio) {
    year_import.rilascio = {
      anno: rilascio.anno,
      anno_fine: rilascio.anno_fine,
      grezzo: rilascio.grezzo,
      kind: rilascio.kind,
      source: rilascio.source,
    }
  }
  if (produzione) {
    year_import.produzione = {
      anno: produzione.anno,
      anno_fine: produzione.anno_fine,
      grezzo: produzione.grezzo,
      kind: produzione.kind,
      source: produzione.source,
    }
  }
  if (rilascio || produzione) {
    result.year_import = year_import
  }

  return result
}

/** Merge year fields into a programmazione payload (mutates payload). */
export function mergeYearFieldsIntoPayload(
  payload: Record<string, unknown>,
  row: Record<string, unknown>,
  policy?: YearFieldsPolicy | null,
): void {
  const legacyAnno = typeof payload.anno === 'number' ? payload.anno : undefined
  const applied = applyYearFieldsToPayload(row, policy, legacyAnno)

  if (applied.anno != null) payload.anno = applied.anno
  else if (legacyAnno == null) delete payload.anno

  for (const key of [
    'anno_fine',
    'anno_rilascio',
    'anno_rilascio_fine',
    'anno_produzione',
    'anno_produzione_fine',
    'anno_grezzo',
    'anno_semantica',
  ] as const) {
    const value = applied[key]
    if (value != null) payload[key] = value
  }

  if (applied.year_import) {
    const meta = (payload.metadati_trasmissione ?? {}) as Record<string, unknown>
    payload.metadati_trasmissione = { ...meta, year_import: applied.year_import }
  }
}
