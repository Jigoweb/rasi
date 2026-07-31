import { createHash } from 'node:crypto'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { applyEpisodeNormalizationToPayload } from './episode-normalization.js'
import { mergeYearFieldsIntoPayload, resolveYearPolicy, type YearFieldsPolicy } from '../lib/year-import.js'
import { isAbsentMarker, isBlankValue } from '../lib/absent-data.js'
import { excelFractionToHHMMSS, normalizeExcelTimeFractionCells } from '../lib/excel-time.js'

export interface FieldRule {
  sources: string[]
  onlyIfPresent?: string
}

export interface ImportMappingConfig {
  version: 1
  colonne_rilevate: string[]
  ultimo_upload: string | null
  mapping: Record<string, string>
  rules?: Record<string, FieldRule>
  transforms?: Record<string, string>
  year_fields?: YearFieldsPolicy
}

export type UploadMappingSnapshot =
  | { kind: 'legacy_template' }
  | { kind: 'apply_existing'; mapping: ImportMappingConfig }

export interface ProgrammazioneImportContext {
  campagnaProgrammazioneId: string
  emittenteId: string
  emittenteName?: string | null
}

export interface ProgrammazioneImportPayload {
  campagna_programmazione_id: string
  emittente_id: string
  import_row_uid: string
  titolo: string
  tipo?: string
  [key: string]: unknown
}

const TEMPLATE_FIELDS = [
  'titolo',
  'tipo',
  'data_trasmissione',
  'ora_inizio',
  'ora_fine',
  'durata_minuti',
  'titolo_originale',
  'numero_episodio',
  'titolo_episodio',
  'titolo_episodio_originale',
  'numero_stagione',
  'anno',
  'production',
  'regia',
  'data_inizio',
  'data_fine',
  'retail_price',
  'sales_month',
  'track_price_local_currency',
  'views',
  'total_net_ad_revenue',
  'total_revenue',
  'canale',
  'emittente',
] as const

const TEMPLATE_FIELDS_SET = new Set<string>(TEMPLATE_FIELDS)
const INTEGER_FIELDS = new Set([
  'durata_minuti',
  'numero_episodio',
  'numero_stagione',
  'anno',
  'sales_month',
  'views',
])

const NUMERIC_FIELDS = new Set([
  'retail_price',
  'track_price_local_currency',
  'total_net_ad_revenue',
  'total_revenue',
])

export function parseProgrammazioniFile(buffer: Buffer, fileName: string): Record<string, unknown>[] {
  const lower = fileName.toLowerCase()

  if (lower.endsWith('.csv')) {
    const parsed = Papa.parse<Record<string, unknown>>(buffer.toString('utf8'), {
      header: true,
      skipEmptyLines: true,
    })
    if (parsed.errors.length > 0) {
      throw new Error(parsed.errors[0]?.message ?? 'Errore parsing CSV')
    }
    return parsed.data
  }

  if (lower.match(/\.xlsx?$/)) {
    const workbook = XLSX.read(buffer)
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    // Evita "1/0/00" da SheetJS su celle orario senza number-format (frazioni Excel).
    normalizeExcelTimeFractionCells(worksheet)
    // defval: evita che celle vuote sulla prima riga facciano sparire colonne header
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      raw: false,
      defval: null,
    })
  }

  throw new Error('Formato file non supportato. Usa CSV o Excel.')
}

export function buildProgrammazioniPayloads(
  rows: Record<string, unknown>[],
  snapshot: UploadMappingSnapshot,
  context: ProgrammazioneImportContext,
  startRowIndex = 1
): ProgrammazioneImportPayload[] {
  return rows
    .map((row, index) => buildProgrammazionePayload(row, snapshot, context, startRowIndex + index))
    .filter((row): row is ProgrammazioneImportPayload => row !== null)
}

function buildProgrammazionePayload(
  row: Record<string, unknown>,
  snapshot: UploadMappingSnapshot,
  context: ProgrammazioneImportContext,
  rowIndex: number
): ProgrammazioneImportPayload | null {
  const payload: Record<string, unknown> = {
    campagna_programmazione_id: context.campagnaProgrammazioneId,
    emittente_id: context.emittenteId,
    import_row_uid: computeImportRowUid(context.campagnaProgrammazioneId, rowIndex, row),
  }

  if (snapshot.kind === 'apply_existing') {
    applyConfiguredMapping(row, payload, snapshot.mapping)
  } else {
    applyLegacyTemplate(row, payload)
  }

  payload.titolo = normalizeTitle(String(payload.titolo ?? ''))
  if (!payload.titolo) return null
  payload.tipo = normalizeTipo(String(payload.tipo ?? ''))

  for (const field of ['titolo_originale', 'titolo_episodio', 'titolo_episodio_originale']) {
    if (typeof payload[field] === 'string') {
      const normalized = normalizeTitle(payload[field] as string)
      if (normalized) payload[field] = normalized
      else delete payload[field]
    }
  }

  applyEpisodeNormalizationToPayload(payload)

  const yearPolicy = resolveYearPolicy(
    snapshot.kind === 'apply_existing' ? snapshot.mapping.mapping ?? {} : {},
    context.emittenteName,
    snapshot.kind === 'apply_existing' ? snapshot.mapping.year_fields : null,
  )
  mergeYearFieldsIntoPayload(payload, row, yearPolicy)

  return payload as ProgrammazioneImportPayload
}

function applyConfiguredMapping(
  row: Record<string, unknown>,
  payload: Record<string, unknown>,
  config: ImportMappingConfig
) {
  const reverseMap: Record<string, string> = {}
  for (const [source, target] of Object.entries(config.mapping ?? {})) {
    if (target && TEMPLATE_FIELDS_SET.has(target)) reverseMap[target] = source
  }

  for (const field of TEMPLATE_FIELDS) {
    const rule = config.rules?.[field]
    let rawValue: unknown
    let sourceCol: string | null

    if (rule) {
      const resolved = resolveFieldValueWithSource(row, rule)
      rawValue = resolved.value
      sourceCol = resolved.source
    } else {
      sourceCol = reverseMap[field] ?? null
      if (!sourceCol) continue
      rawValue = getRowValue(row, sourceCol)
    }

    const cleaned = isAbsentMarker(rawValue) ? null : rawValue
    const transformed = applyTransform(sourceCol ? config.transforms?.[sourceCol] : undefined, cleaned)
    const coerced = coerce(field, transformed)
    if (coerced !== undefined) payload[field] = coerced
  }
}

function applyLegacyTemplate(row: Record<string, unknown>, payload: Record<string, unknown>) {
  for (const key of Object.keys(row)) {
    const normalizedKey = normalizeKey(key)
    if (TEMPLATE_FIELDS_SET.has(normalizedKey)) {
      const coerced = coerce(normalizedKey, row[key])
      if (coerced !== undefined) payload[normalizedKey] = coerced
    }
  }
}

function computeImportRowUid(
  campagnaProgrammazioneId: string,
  rowIndex: number,
  row: Record<string, unknown>
): string {
  const sortedRow = Object.keys(row)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = row[key]
      return acc
    }, {})

  return createHash('sha256')
    .update(`${campagnaProgrammazioneId}:${rowIndex}:${JSON.stringify(sortedRow)}`)
    .digest('hex')
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[\s-]+/g, '_')
}

function getRowValue(row: Record<string, unknown>, col: string): unknown {
  return row[col] ?? row[col.trim()] ?? row[normalizeKey(col)]
}

function resolveFieldValueWithSource(
  row: Record<string, unknown>,
  rule: FieldRule
): { value: unknown; source: string | null } {
  if (rule.onlyIfPresent !== undefined && isBlankValue(getRowValue(row, rule.onlyIfPresent))) {
    return { value: undefined, source: null }
  }

  for (const source of rule.sources) {
    const value = getRowValue(row, source)
    if (!isBlankValue(value)) return { value, source }
  }

  return { value: undefined, source: null }
}

function coerce(field: string, value: unknown): unknown {
  if (value === null || value === undefined || value === '') return undefined
  if (field === 'ora_inizio' || field === 'ora_fine') {
    return coerceTime(value)
  }
  if (INTEGER_FIELDS.has(field)) {
    const numberValue = Number(String(value).replace(',', '.'))
    return Number.isFinite(numberValue) ? Math.round(numberValue) : undefined
  }
  if (NUMERIC_FIELDS.has(field)) {
    const numberValue = Number(String(value).replace(',', '.'))
    return Number.isFinite(numberValue) ? numberValue : undefined
  }
  return String(value).trim()
}

function coerceTime(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return excelFractionToHHMMSS(value) ?? undefined
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const h = value.getUTCHours()
    const m = value.getUTCMinutes()
    const s = value.getUTCSeconds()
    return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
  }
  const str = String(value).trim()
  const match = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return undefined
  let hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const seconds = match[3] ? parseInt(match[3], 10) : 0
  if (minutes > 59 || seconds > 59) return undefined
  if (hours >= 24) hours = hours % 24
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function hhmmssToMinutes(value: unknown): number | null {
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
}

function usDateShortToIso(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed === '') return null
  const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/)
  if (!match) return null
  const mm = match[1].padStart(2, '0')
  const dd = match[2].padStart(2, '0')
  const yy = parseInt(match[3], 10)
  const yyyy = yy > 50 ? `19${match[3]}` : `20${match[3]}`
  return `${yyyy}-${mm}-${dd}`
}

function euDateShortToIso(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed === '') return null
  const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/)
  if (!match) return null
  const dd = match[1].padStart(2, '0')
  const mm = match[2].padStart(2, '0')
  const yy = parseInt(match[3], 10)
  const yyyy = yy > 50 ? `19${match[3]}` : `20${match[3]}`
  return `${yyyy}-${mm}-${dd}`
}

function applyTransform(name: string | undefined, value: unknown): unknown {
  if (!name) return value
  switch (name) {
    case 'hhmmss_to_minutes':
      return hhmmssToMinutes(value)
    case 'fractional_day_to_minutes': {
      const n = Number(value)
      return Number.isFinite(n) ? Math.round(n * 24 * 60) : null
    }
    case 'excel_fraction_to_time': {
      const n = Number(value)
      return Number.isFinite(n) ? excelFractionToHHMMSS(n) : null
    }
    case 'us_date_short':
      return usDateShortToIso(value)
    case 'eu_date_short':
      return euDateShortToIso(value)
    case 'us_date_to_iso': {
      if (typeof value !== 'string') return null
      const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
      if (!match) return null
      return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`
    }
    case 'eu_date_to_iso': {
      if (typeof value !== 'string') return null
      const match = value.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
      if (!match) return null
      return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
    }
    case 'iso_date': {
      if (typeof value !== 'string') return null
      const match = value.trim().match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/)
      if (!match) return null
      return `${match[1]}-${match[2]}-${match[3]}`
    }
    case 'excel_serial_to_iso': {
      const n = Number(value)
      if (!Number.isFinite(n)) return null
      const days = Math.trunc(n)
      if (days < 1) return null
      const ms = Date.UTC(1899, 11, 30) + days * 86400000
      const d = new Date(ms)
      if (Number.isNaN(d.getTime())) return null
      const yyyy = d.getUTCFullYear()
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
      const dd = String(d.getUTCDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }
    default:
      // Fallback legacy: nomi che contengono minutes/seconds → durata
      if (name.includes('minutes') || name.includes('seconds') || name.includes('duration')) {
        return coerce('durata_minuti', value)
      }
      return value
  }
}

function normalizeTitle(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeTipo(value: string): string {
  const normalized = value.trim().toLowerCase()
  const mapping: Record<string, string> = {
    tv: 'serie',
    series: 'serie',
    episode: 'serie',
    episodio: 'serie',
    movie: 'film',
    feature: 'film',
  }
  return mapping[normalized] ?? normalized
}
