import { createHash } from 'node:crypto'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { applyEpisodeNormalizationToPayload } from './episode-normalization.js'
import { mergeYearFieldsIntoPayload, resolveYearPolicy, type YearFieldsPolicy } from '../lib/year-import.js'
import { isAbsentMarker, isBlankValue } from '../lib/absent-data.js'
import { normalizeExcelDateCells, normalizeExcelTimeFractionCells } from '../lib/excel-time.js'
import {
  applyTransform as applySharedTransform,
  detectSlashDateOrder,
  findSlashDateConflict,
  isKnownTransform,
  isSlashDateText,
  parseIsoLikeDate,
  parseSlashDate,
  parseTimeValue,
  repairMojibake,
  rescueDateTimeTransform,
  TEXT_REPAIR_FIELDS,
  type SlashDateOrder,
} from '../lib/transforms.js'

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

export interface ParseProgrammazioniOptions {
  /**
   * Lettura come prima del 16/11/2026, senza riscrivere le celle data in ISO.
   * Serve solo al riprocesso: import_row_uid è l'hash della riga letta, quindi
   * per ritrovare le righe caricate prima di quella data va letta allo stesso modo.
   */
  legacyDates?: boolean
}

export function parseProgrammazioniFile(
  buffer: Buffer,
  fileName: string,
  options: ParseProgrammazioniOptions = {}
): Record<string, unknown>[] {
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
    const workbook = XLSX.read(buffer, { cellNF: true })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    // Evita "1/0/00" da SheetJS su celle orario senza number-format (frazioni Excel).
    normalizeExcelTimeFractionCells(worksheet)
    // Date e data+ora in ISO: con il formato del file arrivavano come "12/1/24"
    // o "01/12/2024 19:30" e date/orari andavano persi o fraintesi.
    if (!options.legacyDates) normalizeExcelDateCells(worksheet)
    // defval: evita che celle vuote sulla prima riga facciano sparire colonne header
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      raw: false,
      defval: null,
    })
  }

  throw new Error('Formato file non supportato. Usa CSV o Excel.')
}

/**
 * Valori presenti nel file ma non riconosciuti come data o orario: il campo
 * resta vuoto. Il conteggio e qualche esempio finiscono nel report qualità
 * dell'upload, così un formato nuovo non passa inosservato (orari Sky di
 * novembre 2026, date PLEX).
 */
export interface UnparsedValuesCollector {
  [field: string]: { count: number; esempi: string[] }
}

const UNPARSED_TRACKED_FIELDS = new Set(['data_trasmissione', 'data_inizio', 'data_fine', 'ora_inizio', 'ora_fine'])
const UNPARSED_MAX_ESEMPI = 5

function recordUnparsed(collector: UnparsedValuesCollector | undefined, field: string, raw: unknown) {
  if (!collector || !UNPARSED_TRACKED_FIELDS.has(field)) return
  const entry = (collector[field] ??= { count: 0, esempi: [] })
  entry.count += 1
  const sample = String(raw).slice(0, 60)
  if (entry.esempi.length < UNPARSED_MAX_ESEMPI && !entry.esempi.includes(sample)) entry.esempi.push(sample)
}

export function buildProgrammazioniPayloads(
  rows: Record<string, unknown>[],
  snapshot: UploadMappingSnapshot,
  context: ProgrammazioneImportContext,
  startRowIndex = 1,
  unparsed?: UnparsedValuesCollector,
  dateOrders?: Record<string, SlashDateOrder>,
): ProgrammazioneImportPayload[] {
  return rows
    .map((row, index) => buildProgrammazionePayload(row, snapshot, context, startRowIndex + index, unparsed, dateOrders))
    .filter((row): row is ProgrammazioneImportPayload => row !== null)
}

function buildProgrammazionePayload(
  row: Record<string, unknown>,
  snapshot: UploadMappingSnapshot,
  context: ProgrammazioneImportContext,
  rowIndex: number,
  unparsed?: UnparsedValuesCollector,
  dateOrders?: Record<string, SlashDateOrder>,
): ProgrammazioneImportPayload | null {
  const payload: Record<string, unknown> = {
    campagna_programmazione_id: context.campagnaProgrammazioneId,
    emittente_id: context.emittenteId,
    import_row_uid: computeImportRowUid(context.campagnaProgrammazioneId, rowIndex, row),
  }

  if (snapshot.kind === 'apply_existing') {
    applyConfiguredMapping(row, payload, snapshot.mapping, unparsed, dateOrders)
  } else {
    applyLegacyTemplate(row, payload, unparsed, dateOrders)
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
  config: ImportMappingConfig,
  unparsed?: UnparsedValuesCollector,
  dateOrders?: Record<string, SlashDateOrder>,
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
    const transformed = rescueDateTimeTransform(
      field,
      applyTransform(sourceCol ? config.transforms?.[sourceCol] : undefined, cleaned),
      cleaned
    )
    const coerced = coerce(field, transformed, dateOrderFor(sourceCol, config.transforms, dateOrders))
    if (coerced !== undefined) payload[field] = coerced
    else if (!isBlankValue(cleaned)) recordUnparsed(unparsed, field, cleaned)
  }
}

function applyLegacyTemplate(
  row: Record<string, unknown>,
  payload: Record<string, unknown>,
  unparsed?: UnparsedValuesCollector,
  dateOrders?: Record<string, SlashDateOrder>,
) {
  for (const key of Object.keys(row)) {
    const normalizedKey = normalizeKey(key)
    if (TEMPLATE_FIELDS_SET.has(normalizedKey)) {
      const order = DATE_FIELDS.has(normalizedKey) ? dateOrders?.[normalizedKey] : undefined
      const coerced = coerce(normalizedKey, row[key], order)
      if (coerced !== undefined) payload[normalizedKey] = coerced
      else if (!isBlankValue(row[key])) recordUnparsed(unparsed, normalizedKey, row[key])
    }
  }
}

function dateOrderFor(
  sourceCol: string | null,
  transforms: Record<string, string> | undefined,
  dateOrders: Record<string, SlashDateOrder> | undefined,
): SlashDateOrder | undefined {
  if (!sourceCol || !dateOrders) return undefined
  const explicit = transforms?.[sourceCol]
  if (typeof explicit === 'string' && explicit.trim() !== '') return undefined
  return dateOrders[sourceCol]
}

export function computeImportRowUid(
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

const DATE_FIELDS = new Set(['data_trasmissione', 'data_inizio', 'data_fine'])

export interface DateOrderConflict {
  field: string
  column: string
  /** Riga del file, intestazione inclusa: indice della riga dati + 2. */
  fileRow: number
  example: string
}

export interface AmbiguousDateNotice {
  field: string
  column: string
  message: string
}

export interface DateOrderResolution {
  /** Chiave di lookup: campo normalizzato (legacy) o colonna sorgente (mapping). */
  orders: Record<string, SlashDateOrder>
  ambiguous: AmbiguousDateNotice[]
  conflicts: DateOrderConflict[]
}

export function formatDateOrderConflict(conflict: DateOrderConflict): string {
  return `Formato date in conflitto nella colonna «${conflict.column}» (riga ${conflict.fileRow} del file, esempio «${conflict.example}»). Il file mescola date in GG/MM/AAAA e MM/GG/AAAA.`
}

export function formatAmbiguousDateBlock(column: string, example: string): string {
  const sample = example ? ` (es. «${example}»)` : ''
  return `Le date nella colonna «${column}» possono essere sia GG/MM che MM/GG${sample}. Imposta nel mapping la trasformazione "Data EU" o "Data US" e ricarica.`
}

/**
 * Messaggio che impedisce l'inserimento. Il template RASI resta GG/MM:
 * l'ambiguità lì è un avviso, non un blocco.
 */
export function dateOrderBlockMessage(
  resolution: DateOrderResolution,
  kind: 'legacy_template' | 'apply_existing',
): string | null {
  if (resolution.conflicts.length > 0) return formatDateOrderConflict(resolution.conflicts[0])
  if (kind === 'apply_existing' && resolution.ambiguous.length > 0) return resolution.ambiguous[0].message
  return null
}

/**
 * Per ogni colonna sorgente mappata su una data, senza transform esplicito,
 * decide l'ordine giorno/mese sull'intero file. Nel template RASI `ambiguous`
 * diventa GG/MM con un avviso. In un mapping salvato una colonna tutta ambigua
 * non viene indovinata: va scelto "Data EU" o "Data US". `conflict` blocca sempre.
 */
export function resolveDateOrders(
  rows: Record<string, unknown>[],
  snapshot: UploadMappingSnapshot,
): DateOrderResolution {
  const resolution: DateOrderResolution = { orders: {}, ambiguous: [], conflicts: [] }
  if (snapshot.kind === 'legacy_template') {
    const columns = new Map<string, string>()
    for (const row of rows) {
      for (const column of Object.keys(row)) {
        const field = normalizeKey(column)
        if (DATE_FIELDS.has(field) && !columns.has(field)) columns.set(field, column)
      }
    }
    for (const [field, column] of columns) {
      decideSlashColumn(valuesForLegacyField(rows, field), field, column, field, resolution, false)
    }
    return resolution
  }

  const transforms = snapshot.mapping.transforms ?? {}
  const columns = new Map<string, string>()
  const consider = (source: string, field: string) => {
    if (!DATE_FIELDS.has(field) || columns.has(source)) return
    const explicit = transforms[source]
    if (typeof explicit === 'string' && explicit.trim() !== '') return
    columns.set(source, field)
  }
  for (const [source, target] of Object.entries(snapshot.mapping.mapping ?? {})) consider(source, target)
  for (const [field, rule] of Object.entries(snapshot.mapping.rules ?? {})) {
    for (const source of rule.sources ?? []) consider(source, field)
  }
  for (const [source, field] of columns) {
    decideSlashColumn(rows.map((row) => getRowValue(row, source)), source, source, field, resolution, true)
  }
  return resolution
}

function valuesForLegacyField(rows: Record<string, unknown>[], field: string): unknown[] {
  return rows.map((row) => {
    for (const column of Object.keys(row)) {
      if (normalizeKey(column) === field) return row[column]
    }
    return undefined
  })
}

function firstSlashExample(values: unknown[]): string {
  for (const value of values) {
    if (isSlashDateText(value)) return String(value).trim()
  }
  return ''
}

function decideSlashColumn(
  values: unknown[],
  key: string,
  column: string,
  field: string,
  resolution: DateOrderResolution,
  blockIfAmbiguous: boolean,
) {
  const order = detectSlashDateOrder(values)
  if (order === 'conflict') {
    const found = findSlashDateConflict(values)
    resolution.conflicts.push({
      field,
      column,
      fileRow: (found?.index ?? 0) + 2,
      example: found?.example ?? '',
    })
    return
  }
  if (order === 'dmy' || order === 'mdy') {
    resolution.orders[key] = order
    return
  }
  if (!values.some((value) => isSlashDateText(value))) return
  if (blockIfAmbiguous) {
    resolution.ambiguous.push({
      field,
      column,
      message: formatAmbiguousDateBlock(column, firstSlashExample(values)),
    })
    return
  }
  resolution.orders[key] = 'dmy'
  resolution.ambiguous.push({
    field,
    column,
    message: `Date ambigue nella colonna «${column}» (${field}): interpretate come GG/MM/AAAA.`,
  })
}

/**
 * Anno-mese (`2024-12`, `2024/12`) → primo giorno del mese. I report mensili
 * delle piattaforme (es. PLEX «Timestamp Month») indicano il periodo: prima il
 * valore arrivava così com'era e la data restava vuota.
 * Copia di yearMonthToFirstDay in src/features/programmazioni/utils/coercion.ts.
 */
export function yearMonthToFirstDay(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const match = value.trim().match(/^(\d{4})[-/](\d{1,2})$/)
  if (!match) return null
  const month = Number(match[2])
  if (month < 1 || month > 12) return null
  return `${match[1]}-${String(month).padStart(2, '0')}-01`
}

function coerce(field: string, value: unknown, dateOrder?: SlashDateOrder): unknown {
  if (value === null || value === undefined || value === '') return undefined
  if (field === 'ora_inizio' || field === 'ora_fine') {
    return coerceTime(value)
  }
  if (DATE_FIELDS.has(field)) {
    // ISO (anche con l'ora) e anno-mese restano come sono. Le date testuali
    // GG/MM o MM/GG diventano ISO; un testo non riconosciuto non va nel payload.
    const isoLike = parseIsoLikeDate(value) ?? yearMonthToFirstDay(value)
    if (isoLike) return isoLike
    return parseSlashDate(value, dateOrder ?? 'dmy') ?? undefined
  }
  if (INTEGER_FIELDS.has(field)) {
    const numberValue = Number(String(value).replace(',', '.'))
    return Number.isFinite(numberValue) ? Math.round(numberValue) : undefined
  }
  if (NUMERIC_FIELDS.has(field)) {
    const numberValue = Number(String(value).replace(',', '.'))
    return Number.isFinite(numberValue) ? numberValue : undefined
  }
  // Riparazione automatica dei caratteri rotti sui campi di testo (stessa
  // funzione del wizard), prima del trim: il trim toglie lo spazio non
  // separabile che forma la «à» (C3 A0) e «città» restava «cittÃ».
  const text = String(value)
  return (TEXT_REPAIR_FIELDS.has(field) ? repairMojibake(text) : text).trim()
}

function coerceTime(value: unknown): string | undefined {
  // Stessa logica dell'app (validateTime): frazione Excel, HH:MM(:SS), HH.MM,
  // AM/PM, data e ora insieme, HHMM. Prima solo HH:MM(:SS): gli orari Sky
  // caricati a novembre 2026 sono andati persi.
  return parseTimeValue(value) ?? undefined
}

/**
 * Trasformazione configurata nel mapping. Usa la stessa implementazione del
 * wizard (`../lib/transforms.ts`, copia di src/features/programmazioni/utils/transforms.ts):
 * prima il worker ne gestiva solo una parte e le altre (es. mojibake_repair)
 * restavano senza effetto.
 * Nomi sconosciuti o legacy (es. `null_if_ND`): comportamento precedente,
 * nessuna eccezione.
 */
function applyTransform(name: string | undefined, value: unknown): unknown {
  if (!name) return value
  if (isKnownTransform(name)) return applySharedTransform(name, value)
  // Fallback legacy: nomi che contengono minutes/seconds → durata
  if (name.includes('minutes') || name.includes('seconds') || name.includes('duration')) {
    return coerce('durata_minuti', value)
  }
  return value
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
