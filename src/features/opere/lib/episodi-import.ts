import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { readAuthoritativeUserRole } from '@/shared/lib/auth-permissions'
import { operaHaEpisodi } from '@/shared/lib/opere-utils'

export const EPISODI_IMPORT_HEADERS = [
  'Stagione',
  'Episodio',
  'Titolo',
  'Durata (minuti)',
  'Data prima messa in onda',
] as const

export const EPISODI_IMPORT_MAX_BYTES = 5 * 1024 * 1024

const STAGIONE = 'Stagione non valida: inserire un numero intero maggiore di 0'
const EPISODIO = 'Episodio non valido: inserire un numero intero maggiore di 0'
const DURATA = 'Durata non valida: inserire i minuti come numero intero maggiore di 0, oppure lasciare vuoto'
const DATA = 'Data prima messa in onda non valida: usare gg/mm/aaaa oppure una data Excel'

export type EpisodioTemplateSource = {
  numero_stagione: number
  numero_episodio: number
  titolo_episodio: string | null
  durata_minuti: number | null
  data_prima_messa_in_onda: string | null
}

export type ClassifiedEpisodeRow = {
  rowNumber: number
  status: 'valid' | 'skipped'
  message: string | null
  stagione: number | null
  episodio: number | null
  titolo: string | null
  durataMinuti: number | null
  dataPrimaMessaInOnda: string | null
}

export type EpisodiImportAlert = {
  rowNumber: number
  message: string
}

export type ClassifyEpisodiResult =
  | { ok: true; rows: ClassifiedEpisodeRow[]; alerts: EpisodiImportAlert[] }
  | { ok: false; error: string }

export type EpisodeInsert = {
  opera_id: string
  numero_stagione: number
  numero_episodio: number
  titolo_episodio: string | null
  durata_minuti: number | null
  data_prima_messa_in_onda: string | null
}

export type EpisodiImportStore = {
  getOpera(operaId: string): Promise<{
    id: string
    tipo?: string | null
    has_episodes?: boolean | null
  } | null>
  listEpisodeKeys(operaId: string): Promise<Array<{ numero_stagione: number; numero_episodio: number }>>
  insertEpisode(row: EpisodeInsert): Promise<{ ok: true } | { ok: false; code?: string; message: string }>
}

export type EpisodiImportMode = 'preview' | 'confirm'

export type EpisodiImportResponse =
  | {
      ok: true
      mode: EpisodiImportMode
      summary: { total: number; valid: number; skipped: number; imported: number }
      rows: ClassifiedEpisodeRow[]
      alerts: EpisodiImportAlert[]
    }
  | { ok: false; status: number; error: string }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function canImportEpisodi(
  user: { app_metadata?: unknown; user_metadata?: unknown } | null | undefined,
): boolean {
  const role = readAuthoritativeUserRole(user)
  return role === 'admin' || role === 'operatore'
}

export function episodiTemplateFileName(
  titolo: string | null | undefined,
  ext: 'xlsx' | 'csv',
  today = new Date(),
): string {
  const slug = (titolo || 'opera')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return `episodi_${slug || 'opera'}_${today.toISOString().slice(0, 10)}.${ext}`
}

export function buildEpisodiTemplateXlsx(episodes: EpisodioTemplateSource[]): Uint8Array {
  const sorted = sortEpisodes(episodes)
  const rows = sorted.map((episode) => [
    episode.numero_stagione,
    episode.numero_episodio,
    episode.titolo_episodio ?? '',
    episode.durata_minuti ?? '',
    episode.data_prima_messa_in_onda ? isoToItalian(episode.data_prima_messa_in_onda) : '',
  ])
  const sheet = XLSX.utils.aoa_to_sheet([[...EPISODI_IMPORT_HEADERS], ...rows])
  sorted.forEach((episode, index) => {
    if (!episode.data_prima_messa_in_onda) return
    const ref = XLSX.utils.encode_cell({ r: index + 1, c: 4 })
    sheet[ref] = {
      t: 'n',
      v: isoToExcelSerial(episode.data_prima_messa_in_onda),
      z: 'dd/mm/yyyy',
    }
  })
  sheet['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 40 }, { wch: 18 }, { wch: 28 }]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Episodi')
  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  return new Uint8Array(bytes)
}

export function buildEpisodiTemplateCsv(episodes: EpisodioTemplateSource[]): string {
  const sorted = sortEpisodes(episodes)
  if (sorted.length === 0) {
    return `\uFEFF${EPISODI_IMPORT_HEADERS.join(',')}\n`
  }
  const csv = Papa.unparse(
    sorted.map((episode) => ({
      Stagione: episode.numero_stagione,
      Episodio: episode.numero_episodio,
      Titolo: episode.titolo_episodio ?? '',
      'Durata (minuti)': episode.durata_minuti ?? '',
      'Data prima messa in onda': episode.data_prima_messa_in_onda
        ? isoToItalian(episode.data_prima_messa_in_onda)
        : '',
    })),
    { columns: [...EPISODI_IMPORT_HEADERS] },
  )
  return `\uFEFF${csv}`
}

export function parseEpisodiFile(
  filename: string,
  bytes: Uint8Array,
): { ok: true; matrix: unknown[][] } | { ok: false; error: string } {
  const extension = fileExtension(filename)
  if (extension === 'csv') {
    const text = new TextDecoder('utf-8').decode(bytes).replace(/^\uFEFF/, '')
    return { ok: true, matrix: parseCsvMatrix(text) }
  }
  if (extension === 'xlsx') {
    try {
      const workbook = XLSX.read(bytes, { type: 'array', cellDates: false })
      const sheetName = workbook.SheetNames[0]
      if (!sheetName) return { ok: false, error: 'Il file Excel non contiene fogli.' }
      const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 1,
        raw: true,
        defval: null,
        blankrows: true,
      }) as unknown[][]
      return { ok: true, matrix }
    } catch {
      return { ok: false, error: 'Impossibile leggere il file Excel.' }
    }
  }
  return { ok: false, error: 'Formato non supportato. Usa un file .xlsx o .csv.' }
}

export function classifyEpisodiMatrix(
  matrix: unknown[][],
  existing: Array<{ numero_stagione: number; numero_episodio: number }>,
): ClassifyEpisodiResult {
  if (matrix.length === 0) {
    return { ok: false, error: headerError([]) }
  }
  const headers = headerCells(matrix[0] ?? [])
  const headerCheck = validateHeaders(headers)
  if (!headerCheck.ok) return headerCheck

  const column = new Map(headers.map((header, index) => [header, index]))
  const existingKeys = new Set(existing.map((episode) => episodeKey(episode.numero_stagione, episode.numero_episodio)))
  const seen = new Map<string, number>()
  const rows: ClassifiedEpisodeRow[] = []

  for (let index = 1; index < matrix.length; index += 1) {
    const source = matrix[index] ?? []
    const raw = {
      stagione: source[column.get('Stagione') ?? -1],
      episodio: source[column.get('Episodio') ?? -1],
      titolo: source[column.get('Titolo') ?? -1],
      durata: source[column.get('Durata (minuti)') ?? -1],
      data: source[column.get('Data prima messa in onda') ?? -1],
    }
    if ([raw.stagione, raw.episodio, raw.titolo, raw.durata, raw.data].every(cellIsEmpty)) continue

    const rowNumber = index + 1
    const stagione = readPositiveInt(raw.stagione)
    const episodio = readPositiveInt(raw.episodio)
    const titolo = readTitle(raw.titolo)
    const durata = readDuration(raw.durata)
    const data = readDate(raw.data)
    const fieldErrors = [
      stagione === 'invalid' || stagione === null ? STAGIONE : null,
      episodio === 'invalid' || episodio === null ? EPISODIO : null,
      durata === 'invalid' ? DURATA : null,
      data === 'invalid' ? DATA : null,
    ].filter((reason): reason is string => Boolean(reason))

    const parsedSeason = typeof stagione === 'number' ? stagione : null
    const parsedEpisode = typeof episodio === 'number' ? episodio : null
    const key = parsedSeason != null && parsedEpisode != null ? episodeKey(parsedSeason, parsedEpisode) : null

    let status: ClassifiedEpisodeRow['status'] = 'valid'
    let message: string | null = null

    if (key && seen.has(key)) {
      status = 'skipped'
      message = `Duplicato nel file: stagione ${parsedSeason}, episodio ${parsedEpisode} è già alla riga ${seen.get(key)}`
    } else if (key && existingKeys.has(key)) {
      status = 'skipped'
      message = `Episodio già presente sull'opera (stagione ${parsedSeason}, episodio ${parsedEpisode}): riga ignorata, nessun aggiornamento`
      seen.set(key, rowNumber)
    } else if (fieldErrors.length > 0) {
      status = 'skipped'
      message = fieldErrors.join('; ')
      if (key) seen.set(key, rowNumber)
    } else if (key) {
      seen.set(key, rowNumber)
    }

    rows.push({
      rowNumber,
      status,
      message,
      stagione: parsedSeason,
      episodio: parsedEpisode,
      titolo,
      durataMinuti: typeof durata === 'number' ? durata : null,
      dataPrimaMessaInOnda: typeof data === 'string' ? data : null,
    })
  }

  return {
    ok: true,
    rows,
    alerts: rows
      .filter((row) => row.status === 'skipped' && row.message)
      .map((row) => ({ rowNumber: row.rowNumber, message: row.message as string })),
  }
}

export async function runEpisodiImport(input: {
  store: EpisodiImportStore
  operaId: string
  filename: string
  bytes: Uint8Array
  mode: EpisodiImportMode
}): Promise<EpisodiImportResponse> {
  if (!UUID_RE.test(input.operaId)) {
    return { ok: false, status: 400, error: 'Identificativo opera non valido.' }
  }
  const opera = await input.store.getOpera(input.operaId)
  if (!opera) return { ok: false, status: 404, error: 'Opera non trovata.' }
  if (!operaHaEpisodi({
    tipo: opera.tipo,
    has_episodes: typeof opera.has_episodes === 'boolean' ? opera.has_episodes : undefined,
  })) {
    return { ok: false, status: 400, error: 'Questa opera non ha episodi: importazione non disponibile.' }
  }
  if (input.bytes.byteLength > EPISODI_IMPORT_MAX_BYTES) {
    return { ok: false, status: 400, error: 'Il file supera la dimensione massima di 5 MB.' }
  }

  const parsed = parseEpisodiFile(input.filename, input.bytes)
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error }

  const existing = await input.store.listEpisodeKeys(input.operaId)
  const classified = classifyEpisodiMatrix(parsed.matrix, existing)
  if (!classified.ok) return { ok: false, status: 400, error: classified.error }

  const rows = classified.rows.map((row) => ({ ...row }))
  let imported = 0

  if (input.mode === 'confirm') {
    for (const row of rows) {
      if (row.status !== 'valid' || row.stagione == null || row.episodio == null) continue
      const outcome = await input.store.insertEpisode({
        opera_id: input.operaId,
        numero_stagione: row.stagione,
        numero_episodio: row.episodio,
        titolo_episodio: row.titolo,
        durata_minuti: row.durataMinuti,
        data_prima_messa_in_onda: row.dataPrimaMessaInOnda,
      })
      if (outcome.ok) {
        imported += 1
        continue
      }
      if (outcome.code === '42501' || /permission denied/i.test(outcome.message)) {
        return { ok: false, status: 403, error: 'Accesso negato: non puoi inserire episodi su questa opera.' }
      }
      row.status = 'skipped'
      row.message = outcome.code === '23505'
        ? `Episodio già presente sull'opera (stagione ${row.stagione}, episodio ${row.episodio}): riga ignorata, nessun aggiornamento`
        : `Importazione non riuscita: ${outcome.message}`
    }
  }

  const alerts = rows
    .filter((row) => row.status === 'skipped' && row.message)
    .map((row) => ({ rowNumber: row.rowNumber, message: row.message as string }))

  return {
    ok: true,
    mode: input.mode,
    summary: {
      total: rows.length,
      valid: rows.filter((row) => row.status === 'valid').length,
      skipped: rows.filter((row) => row.status === 'skipped').length,
      imported: input.mode === 'preview' ? 0 : imported,
    },
    rows,
    alerts,
  }
}

function sortEpisodes(episodes: EpisodioTemplateSource[]): EpisodioTemplateSource[] {
  return [...episodes].sort(
    (a, b) => a.numero_stagione - b.numero_stagione || a.numero_episodio - b.numero_episodio,
  )
}

function isoToItalian(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

function isoToExcelSerial(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number)
  const utc = Date.UTC(year, month - 1, day)
  const epoch = Date.UTC(1899, 11, 30)
  return Math.round((utc - epoch) / 86400000)
}

function fileExtension(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename
  const match = base.toLowerCase().match(/\.([a-z0-9]+)$/)
  return match?.[1] ?? ''
}

function parseCsvMatrix(text: string): unknown[][] {
  const delimiter = chooseDelimiter(text)
  const parsed = Papa.parse<unknown[]>(text, {
    header: false,
    skipEmptyLines: false,
    delimiter,
  })
  return parsed.data
}

function chooseDelimiter(text: string): ',' | ';' | '\t' {
  const candidates = [',', ';', '\t'] as const
  for (const delimiter of candidates) {
    const headers = headerCells(firstCsvRow(text, delimiter))
    if (validateHeaders(headers).ok) return delimiter
  }
  let best: ',' | ';' | '\t' = ','
  let bestCount = -1
  for (const delimiter of candidates) {
    const count = headerCells(firstCsvRow(text, delimiter)).length
    if (count > bestCount) {
      best = delimiter
      bestCount = count
    }
  }
  return best
}

function firstCsvRow(text: string, delimiter: string): unknown[] {
  const parsed = Papa.parse<unknown[]>(text, { header: false, preview: 1, delimiter })
  return parsed.data[0] ?? []
}

function headerCells(row: unknown[]): string[] {
  const cells = row.map((cell) => String(cell ?? '').replace(/^\uFEFF/, '').trim())
  while (cells.length > 0 && cells[cells.length - 1] === '') cells.pop()
  return cells
}

function validateHeaders(headers: string[]): { ok: true } | { ok: false; error: string } {
  const expected = [...EPISODI_IMPORT_HEADERS]
  const missing = expected.filter((header) => !headers.includes(header))
  const unexpected = headers.filter((header) => !expected.includes(header as (typeof expected)[number]))
  const duplicates = headers.filter((header, index) => header && headers.indexOf(header) !== index)
  if (missing.length === 0 && unexpected.length === 0 && duplicates.length === 0) return { ok: true }
  return { ok: false, error: headerError(headers) }
}

function headerError(headers: string[]): string {
  const expected = [...EPISODI_IMPORT_HEADERS]
  const missing = expected.filter((header) => !headers.includes(header))
  const unexpected = headers.filter((header) => header && !expected.includes(header as (typeof expected)[number]))
  const parts = [`Il file non ha le colonne attese. Colonne richieste: ${expected.join(', ')}.`]
  if (missing.length > 0) parts.push(`Mancano: ${missing.join(', ')}.`)
  if (unexpected.length > 0) parts.push(`Non previste: ${unexpected.join(', ')}.`)
  return parts.join(' ')
}

function cellIsEmpty(value: unknown): boolean {
  if (value == null) return true
  if (typeof value === 'string' && value.trim() === '') return true
  return false
}

function readPositiveInt(value: unknown): number | null | 'invalid' {
  if (cellIsEmpty(value)) return null
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Math.abs(value - Math.round(value)) > 1e-6) return 'invalid'
    const rounded = Math.round(value)
    return rounded > 0 ? rounded : 'invalid'
  }
  const text = String(value).trim()
  if (!/^\d+$/.test(text)) return 'invalid'
  const parsed = Number(text)
  return parsed > 0 ? parsed : 'invalid'
}

function readDuration(value: unknown): number | null | 'invalid' {
  return readPositiveInt(value)
}

function readTitle(value: unknown): string | null {
  if (cellIsEmpty(value)) return null
  const text = String(value).trim()
  return text ? text : null
}

function readDate(value: unknown): string | null | 'invalid' {
  if (cellIsEmpty(value)) return null
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return 'invalid'
    return calendarIso(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate())
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return 'invalid'
    const parsed = XLSX.SSF.parse_date_code(value)
    if (!parsed) return 'invalid'
    return calendarIso(parsed.y, parsed.m, parsed.d)
  }
  const text = String(value).trim()
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return calendarIso(Number(iso[1]), Number(iso[2]), Number(iso[3]))
  const italian = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/)
  if (italian) return calendarIso(Number(italian[3]), Number(italian[2]), Number(italian[1]))
  return 'invalid'
}

function calendarIso(year: number, month: number, day: number): string | 'invalid' {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return 'invalid'
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return 'invalid'
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function episodeKey(stagione: number, episodio: number): string {
  return `${stagione}:${episodio}`
}
