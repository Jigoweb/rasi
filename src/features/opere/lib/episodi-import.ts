import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { canEditOpereSection, readAuthoritativeUserRole } from '@/shared/lib/auth-permissions'
import { operaHaEpisodi } from '@/shared/lib/opere-utils'
import { readTabularMatrix, type TabularMatrixErrorCode } from '@/shared/lib/tabular-file'

export const EPISODI_IMPORT_HEADERS = [
  'Stagione',
  'Episodio',
  'Titolo italiano',
  'Titolo originale',
  'Titoli alternativi',
  'IMDb tconst',
  'Durata (minuti)',
  'Data prima messa in onda',
] as const

const LEGACY_TITOLO = 'Titolo'
const OPTIONAL_HEADERS = ['Titoli alternativi', 'IMDb tconst'] as const
const BASE_HEADERS = ['Stagione', 'Episodio', 'Durata (minuti)', 'Data prima messa in onda'] as const

type TitleColumns = {
  italiano: 'Titolo italiano' | 'Titolo'
  originale: 'Titolo originale' | null
}

export const EPISODI_IMPORT_MAX_BYTES = 5 * 1024 * 1024

const STAGIONE = 'Stagione non valida: inserire un numero intero maggiore di 0'
const EPISODIO = 'Episodio non valido: inserire un numero intero maggiore di 0'
const DURATA = 'Durata non valida: inserire i minuti come numero intero maggiore di 0, oppure lasciare vuoto'
const DATA = 'Data prima messa in onda non valida: usare gg/mm/aaaa oppure una data Excel'
const RIGA_VUOTA = 'Riga vuota'

const DRAFT_FIELDS = [
  'stagione', 'episodio', 'titolo', 'titoloOriginale',
  'titoliAlternativi', 'imdbTconst', 'durataMinuti', 'dataPrimaMessaInOnda',
] as const

export type EpisodioTemplateSource = {
  numero_stagione: number
  numero_episodio: number
  titolo_episodio: string | null
  titolo_episodio_originale?: string | null
  alias_titoli?: string[] | null
  imdb_tconst?: string | null
  durata_minuti: number | null
  data_prima_messa_in_onda: string | null
}

function formatAliasTitoli(aliases: string[] | null | undefined): string {
  if (!Array.isArray(aliases) || aliases.length === 0) return ''
  return aliases.map((a) => a.trim()).filter(Boolean).join(', ')
}

export type EpisodeDraft = {
  stagione: string
  episodio: string
  titolo: string
  titoloOriginale: string
  titoliAlternativi: string
  imdbTconst: string
  durataMinuti: string
  dataPrimaMessaInOnda: string
}

export type ClassifiedEpisodeRow = {
  rowNumber: number
  status: 'valid' | 'skipped'
  action: 'insert' | 'update' | null
  message: string | null
  stagione: number | null
  episodio: number | null
  titolo: string | null
  titoloOriginale: string | null
  aliasTitoli: string[] | null
  imdbTconst: string | null
  durataMinuti: number | null
  dataPrimaMessaInOnda: string | null
  draft: EpisodeDraft
}

export type ReviewedEpisodeRow = ClassifiedEpisodeRow & {
  included: boolean
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
  titolo_episodio_originale: string | null
  alias_titoli: string[] | null
  imdb_tconst: string | null
  durata_minuti: number | null
  data_prima_messa_in_onda: string | null
}

export type EpisodeUpdatePatch = {
  titolo_episodio?: string | null
  titolo_episodio_originale?: string | null
  alias_titoli?: string[] | null
  imdb_tconst?: string | null
  durata_minuti?: number | null
  data_prima_messa_in_onda?: string | null
}

export type EpisodiImportStore = {
  getOpera(operaId: string): Promise<{
    id: string
    tipo?: string | null
    has_episodes?: boolean | null
  } | null>
  listEpisodeKeys(operaId: string): Promise<Array<{ numero_stagione: number; numero_episodio: number }>>
  insertEpisode(row: EpisodeInsert): Promise<{ ok: true } | { ok: false; code?: string; message: string }>
  updateEpisode(input: {
    opera_id: string
    numero_stagione: number
    numero_episodio: number
    patch: EpisodeUpdatePatch
  }): Promise<{ ok: true } | { ok: false; code?: string; message: string }>
}

export type EpisodiImportMode = 'preview' | 'confirm'

export type EpisodiImportSummary = {
  total: number
  valid: number
  skipped: number
  excluded: number
  imported: number
  updated: number
}

export type EpisodeKey = { numero_stagione: number; numero_episodio: number }

export const EPISODI_CONFIRM_MAX_ROWS = 5000

export type EpisodiImportResponse =
  | {
      ok: true
      mode: EpisodiImportMode
      summary: EpisodiImportSummary
      rows: ReviewedEpisodeRow[]
      alerts: EpisodiImportAlert[]
      existingKeys: EpisodeKey[]
    }
  | { ok: false; status: number; error: string }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function canImportEpisodi(
  user: { app_metadata?: unknown; user_metadata?: unknown } | null | undefined,
): boolean {
  // Per Operatore base e Tirocinante la route controlla anche che l'opera non sia validata.
  return canEditOpereSection(readAuthoritativeUserRole(user))
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
    episode.titolo_episodio_originale ?? '',
    formatAliasTitoli(episode.alias_titoli),
    episode.imdb_tconst ?? '',
    episode.durata_minuti ?? '',
    episode.data_prima_messa_in_onda ? isoToItalian(episode.data_prima_messa_in_onda) : '',
  ])
  const sheet = XLSX.utils.aoa_to_sheet([[...EPISODI_IMPORT_HEADERS], ...rows])
  const dateColumn = EPISODI_IMPORT_HEADERS.indexOf('Data prima messa in onda')
  sorted.forEach((episode, index) => {
    if (!episode.data_prima_messa_in_onda) return
    const ref = XLSX.utils.encode_cell({ r: index + 1, c: dateColumn })
    sheet[ref] = {
      t: 'n',
      v: isoToExcelSerial(episode.data_prima_messa_in_onda),
      z: 'dd/mm/yyyy',
    }
  })
  sheet['!cols'] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 36 },
    { wch: 36 },
    { wch: 28 },
    { wch: 14 },
    { wch: 18 },
    { wch: 28 },
  ]
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
      'Titolo italiano': episode.titolo_episodio ?? '',
      'Titolo originale': episode.titolo_episodio_originale ?? '',
      'Titoli alternativi': formatAliasTitoli(episode.alias_titoli),
      'IMDb tconst': episode.imdb_tconst ?? '',
      'Durata (minuti)': episode.durata_minuti ?? '',
      'Data prima messa in onda': episode.data_prima_messa_in_onda
        ? isoToItalian(episode.data_prima_messa_in_onda)
        : '',
    })),
    { columns: [...EPISODI_IMPORT_HEADERS] },
  )
  return `\uFEFF${csv}`
}

const EPISODI_MATRIX_ERRORS: Record<TabularMatrixErrorCode, string> = {
  unsupported: 'Formato non supportato. Usa un file .xlsx o .csv.',
  csv: 'CSV non leggibile.',
  excel: 'Impossibile leggere il file Excel.',
  'empty-workbook': 'Il file Excel non contiene fogli.',
}

export function parseEpisodiFile(
  filename: string,
  bytes: Uint8Array,
): { ok: true; matrix: unknown[][] } | { ok: false; error: string } {
  const matrix = readTabularMatrix(filename, bytes)
  if (!matrix.ok) return { ok: false, error: EPISODI_MATRIX_ERRORS[matrix.code] }
  return { ok: true, matrix: matrix.matrix }
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
  const originaleIndex = headerCheck.titles.originale
    ? column.get(headerCheck.titles.originale) ?? -1
    : -1
  const cells: EpisodeCell[] = []
  for (let index = 1; index < matrix.length; index += 1) {
    const source = matrix[index] ?? []
    const cell = {
      rowNumber: index + 1,
      stagione: source[column.get('Stagione') ?? -1],
      episodio: source[column.get('Episodio') ?? -1],
      titolo: source[column.get(headerCheck.titles.italiano) ?? -1],
      titoloOriginale: originaleIndex >= 0 ? source[originaleIndex] : null,
      titoliAlternativi: optionalCell(source, column, 'Titoli alternativi'),
      imdbTconst: optionalCell(source, column, 'IMDb tconst'),
      durata: source[column.get('Durata (minuti)') ?? -1],
      data: source[column.get('Data prima messa in onda') ?? -1],
    }
    if ([
      cell.stagione,
      cell.episodio,
      cell.titolo,
      cell.titoloOriginale,
      cell.titoliAlternativi,
      cell.imdbTconst,
      cell.durata,
      cell.data,
    ].every(cellIsEmpty)) continue
    cells.push(cell)
  }
  return classifyEpisodeCells(cells, existing, false)
}

export function revalidateEpisodeDrafts(
  rows: Array<{ rowNumber: number; included: boolean; draft: EpisodeDraft }>,
  existing: EpisodeKey[],
): ReviewedEpisodeRow[] {
  const ordered = [...rows].sort((left, right) => left.rowNumber - right.rowNumber)
  const includedByRow = new Map(ordered.map((row) => [row.rowNumber, row.included === true]))
  const classified = classifyEpisodeCells(
    ordered.map((row) => ({
      rowNumber: row.rowNumber,
      stagione: row.draft.stagione,
      episodio: row.draft.episodio,
      titolo: row.draft.titolo,
      titoloOriginale: row.draft.titoloOriginale,
      titoliAlternativi: row.draft.titoliAlternativi,
      imdbTconst: row.draft.imdbTconst,
      durata: row.draft.durataMinuti,
      data: row.draft.dataPrimaMessaInOnda,
      draft: row.draft,
      included: row.included,
    })),
    existing,
    true,
  )
  if (!classified.ok) return []
  return classified.rows.map((row) => ({
    ...row,
    included: row.status === 'valid' && includedByRow.get(row.rowNumber) === true,
  }))
}

export function parseConfirmEpisodeDrafts(
  value: unknown,
): { ok: true; rows: Array<{ rowNumber: number; included: boolean; draft: EpisodeDraft }> } | { ok: false; error: string } {
  if (!Array.isArray(value)) return { ok: false, error: 'Elenco righe non valido.' }
  if (value.length > EPISODI_CONFIRM_MAX_ROWS) {
    return { ok: false, error: `Puoi confermare al massimo ${EPISODI_CONFIRM_MAX_ROWS} righe.` }
  }
  const seen = new Set<number>()
  const rows: Array<{ rowNumber: number; included: boolean; draft: EpisodeDraft }> = []
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { ok: false, error: 'Elenco righe non valido.' }
    }
    const record = item as Record<string, unknown>
    if (typeof record.rowNumber !== 'number' || !Number.isInteger(record.rowNumber) || record.rowNumber <= 0) {
      return { ok: false, error: 'Numero di riga non valido.' }
    }
    if (seen.has(record.rowNumber)) {
      return { ok: false, error: `Numero di riga duplicato: ${record.rowNumber}.` }
    }
    seen.add(record.rowNumber)
    if ('included' in record && typeof record.included !== 'boolean') {
      return { ok: false, error: `Inclusione non valida alla riga ${record.rowNumber}.` }
    }
    const draft = record.draft
    if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
      return { ok: false, error: `Valori non validi alla riga ${record.rowNumber}.` }
    }
    const fields = draft as Record<string, unknown>
    const parsed = emptyDraft()
    for (const name of DRAFT_FIELDS) {
      if (typeof fields[name] !== 'string') {
        return { ok: false, error: `Valori non validi alla riga ${record.rowNumber}.` }
      }
      parsed[name] = fields[name]
    }
    rows.push({
      rowNumber: record.rowNumber,
      included: record.included === true,
      draft: parsed,
    })
  }
  return { ok: true, rows }
}

export async function confirmEpisodiDrafts(input: {
  store: EpisodiImportStore
  operaId: string
  rows: unknown
}): Promise<EpisodiImportResponse> {
  const parsed = parseConfirmEpisodeDrafts(input.rows)
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error }
  const ready = await prepareOpera(input.store, input.operaId)
  if (!ready.ok) return ready
  const rows = revalidateEpisodeDrafts(parsed.rows, ready.existing)
  const applied = await applyReviewedRows(input.store, input.operaId, rows)
  if (!applied.ok) return applied
  return successResponse('confirm', rows, applied.imported, applied.updated, ready.existing)
}

export async function runEpisodiImport(input: {
  store: EpisodiImportStore
  operaId: string
  filename: string
  bytes: Uint8Array
  mode: EpisodiImportMode
}): Promise<EpisodiImportResponse> {
  if (input.bytes.byteLength > EPISODI_IMPORT_MAX_BYTES) {
    return { ok: false, status: 400, error: 'Il file supera la dimensione massima di 5 MB.' }
  }
  const ready = await prepareOpera(input.store, input.operaId)
  if (!ready.ok) return ready

  const parsed = parseEpisodiFile(input.filename, input.bytes)
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error }

  const classified = classifyEpisodiMatrix(parsed.matrix, ready.existing)
  if (!classified.ok) return { ok: false, status: 400, error: classified.error }

  const rows = withDefaultInclusion(classified.rows)
  if (input.mode !== 'confirm') {
    return successResponse('preview', rows, 0, 0, ready.existing)
  }
  const applied = await applyReviewedRows(input.store, input.operaId, rows)
  if (!applied.ok) return applied
  return successResponse('confirm', rows, applied.imported, applied.updated, ready.existing)
}

type EpisodeCell = {
  rowNumber: number
  stagione: unknown
  episodio: unknown
  titolo: unknown
  titoloOriginale: unknown
  titoliAlternativi?: unknown
  imdbTconst?: unknown
  durata: unknown
  data: unknown
  draft?: EpisodeDraft
  included?: boolean
}

function classifyEpisodeCells(
  cells: EpisodeCell[],
  existing: EpisodeKey[],
  keepEmpty: boolean,
): ClassifyEpisodiResult {
  const existingKeys = new Set(existing.map((episode) => episodeKey(episode.numero_stagione, episode.numero_episodio)))
  const seen = new Map<string, number>()
  const rows: ClassifiedEpisodeRow[] = []

  for (const raw of cells) {
    const empty = [
      raw.stagione,
      raw.episodio,
      raw.titolo,
      raw.titoloOriginale,
      raw.titoliAlternativi,
      raw.imdbTconst,
      raw.durata,
      raw.data,
    ].every(cellIsEmpty)
    if (empty && !keepEmpty) continue

    const stagione = empty ? null : readPositiveInt(raw.stagione)
    const episodio = empty ? null : readPositiveInt(raw.episodio)
    const titolo = empty ? null : readTitle(raw.titolo)
    const titoloOriginale = empty ? null : readTitle(raw.titoloOriginale)
    const aliasTitoli = empty ? null : parseAliasTitoli(raw.titoliAlternativi)
    const imdbTconst = empty ? null : readTconst(raw.imdbTconst)
    const durata = empty ? null : readDuration(raw.durata)
    const data = empty ? null : readDate(raw.data)
    const draft = raw.draft
      ? {
          ...emptyDraft(),
          ...raw.draft,
          titoloOriginale: raw.draft.titoloOriginale ?? '',
          titoliAlternativi: raw.draft.titoliAlternativi ?? '',
          imdbTconst: raw.draft.imdbTconst ?? '',
        }
      : {
          stagione: displayInt(raw.stagione, stagione),
          episodio: displayInt(raw.episodio, episodio),
          titolo: titolo ?? rawCellText(raw.titolo),
          titoloOriginale: titoloOriginale ?? rawCellText(raw.titoloOriginale),
          titoliAlternativi: rawCellText(raw.titoliAlternativi),
          imdbTconst: rawCellText(raw.imdbTconst),
          durataMinuti: displayInt(raw.durata, durata),
          dataPrimaMessaInOnda: displayDate(raw.data, data),
        }

    if (empty) {
      rows.push({
        rowNumber: raw.rowNumber,
        status: 'skipped',
        action: null,
        message: RIGA_VUOTA,
        stagione: null,
        episodio: null,
        titolo: null,
        titoloOriginale: null,
        aliasTitoli: null,
        imdbTconst: null,
        durataMinuti: null,
        dataPrimaMessaInOnda: null,
        draft,
      })
      continue
    }

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
    let action: ClassifiedEpisodeRow['action'] = 'insert'
    let message: string | null = null

    if (key && seen.has(key)) {
      status = 'skipped'
      action = null
      message = `Duplicato nel file: stagione ${parsedSeason}, episodio ${parsedEpisode} è già alla riga ${seen.get(key)}`
    } else if (fieldErrors.length > 0) {
      status = 'skipped'
      action = null
      message = fieldErrors.join('; ')
      if (key) seen.set(key, raw.rowNumber)
    } else if (key && existingKeys.has(key)) {
      action = 'update'
      seen.set(key, raw.rowNumber)
    } else if (key && raw.included !== false) {
      seen.set(key, raw.rowNumber)
    }

    rows.push({
      rowNumber: raw.rowNumber,
      status,
      action,
      message,
      stagione: parsedSeason,
      episodio: parsedEpisode,
      titolo,
      titoloOriginale,
      aliasTitoli,
      imdbTconst,
      durataMinuti: typeof durata === 'number' ? durata : null,
      dataPrimaMessaInOnda: typeof data === 'string' ? data : null,
      draft,
    })
  }

  return {
    ok: true,
    rows,
    alerts: alertsFrom(rows),
  }
}

function withDefaultInclusion(rows: ClassifiedEpisodeRow[]): ReviewedEpisodeRow[] {
  return rows.map((row) => ({ ...row, included: row.status === 'valid' }))
}

function emptyDraft(): EpisodeDraft {
  return {
    stagione: '',
    episodio: '',
    titolo: '',
    titoloOriginale: '',
    titoliAlternativi: '',
    imdbTconst: '',
    durataMinuti: '',
    dataPrimaMessaInOnda: '',
  }
}

async function prepareOpera(
  store: EpisodiImportStore,
  operaId: string,
): Promise<{ ok: true; existing: EpisodeKey[] } | { ok: false; status: number; error: string }> {
  if (!UUID_RE.test(operaId)) {
    return { ok: false, status: 400, error: 'Identificativo opera non valido.' }
  }
  const opera = await store.getOpera(operaId)
  if (!opera) return { ok: false, status: 404, error: 'Opera non trovata.' }
  if (!operaHaEpisodi({
    tipo: opera.tipo,
    has_episodes: typeof opera.has_episodes === 'boolean' ? opera.has_episodes : undefined,
  })) {
    return { ok: false, status: 400, error: 'Questa opera non ha episodi: importazione non disponibile.' }
  }
  return { ok: true, existing: await store.listEpisodeKeys(operaId) }
}

export function buildEpisodePatch(row: ClassifiedEpisodeRow): EpisodeUpdatePatch | null {
  const patch: EpisodeUpdatePatch = {}
  if (row.draft.titolo.trim()) patch.titolo_episodio = row.titolo
  if (row.draft.titoloOriginale.trim()) patch.titolo_episodio_originale = row.titoloOriginale
  if (row.aliasTitoli && row.aliasTitoli.length > 0) patch.alias_titoli = row.aliasTitoli
  if (row.draft.imdbTconst.trim()) patch.imdb_tconst = row.imdbTconst
  if (row.draft.durataMinuti.trim()) patch.durata_minuti = row.durataMinuti
  if (row.draft.dataPrimaMessaInOnda.trim()) patch.data_prima_messa_in_onda = row.dataPrimaMessaInOnda
  return Object.keys(patch).length > 0 ? patch : null
}

async function applyReviewedRows(
  store: EpisodiImportStore,
  operaId: string,
  rows: ReviewedEpisodeRow[],
): Promise<{ ok: true; imported: number; updated: number } | { ok: false; status: number; error: string }> {
  let imported = 0
  let updated = 0
  for (const row of rows) {
    if (!row.included || row.status !== 'valid' || row.stagione == null || row.episodio == null) continue
    if (row.action === 'insert') {
      const outcome = await store.insertEpisode({
        opera_id: operaId,
        numero_stagione: row.stagione,
        numero_episodio: row.episodio,
        titolo_episodio: row.titolo,
        titolo_episodio_originale: row.titoloOriginale,
        alias_titoli: row.aliasTitoli,
        imdb_tconst: row.imdbTconst,
        durata_minuti: row.durataMinuti,
        data_prima_messa_in_onda: row.dataPrimaMessaInOnda,
      })
      if (outcome.ok) {
        imported += 1
        continue
      }
      const denied = markRowFailed(row, outcome)
      if (denied) return denied
      continue
    }
    if (row.action !== 'update') continue
    const patch = buildEpisodePatch(row)
    if (!patch) continue
    const outcome = await store.updateEpisode({
      opera_id: operaId,
      numero_stagione: row.stagione,
      numero_episodio: row.episodio,
      patch,
    })
    if (outcome.ok) {
      updated += 1
      continue
    }
    const denied = markRowFailed(row, outcome)
    if (denied) return denied
  }
  return { ok: true, imported, updated }
}

function markRowFailed(
  row: ReviewedEpisodeRow,
  outcome: { ok: false; code?: string; message: string },
): { ok: false; status: number; error: string } | null {
  if (outcome.code === '42501' || /permission denied/i.test(outcome.message)) {
    return { ok: false, status: 403, error: 'Accesso negato: non puoi inserire episodi su questa opera.' }
  }
  row.status = 'skipped'
  row.action = null
  row.included = false
  row.message = outcome.code === '23505'
    ? `Episodio già presente sull'opera (stagione ${row.stagione}, episodio ${row.episodio}): riga ignorata, nessun aggiornamento`
    : `Importazione non riuscita: ${outcome.message}`
  return null
}

function successResponse(
  mode: EpisodiImportMode,
  rows: ReviewedEpisodeRow[],
  imported: number,
  updated: number,
  existing: EpisodeKey[],
): EpisodiImportResponse {
  return {
    ok: true,
    mode,
    summary: {
      total: rows.length,
      valid: rows.filter((row) => row.status === 'valid').length,
      skipped: rows.filter((row) => row.status === 'skipped').length,
      excluded: rows.filter((row) => row.status === 'valid' && !row.included).length,
      imported,
      updated,
    },
    rows,
    alerts: alertsFrom(rows),
    existingKeys: existing,
  }
}

function alertsFrom(rows: Array<{ rowNumber: number; status: string; message: string | null }>): EpisodiImportAlert[] {
  return rows
    .filter((row) => row.status === 'skipped' && row.message)
    .map((row) => ({ rowNumber: row.rowNumber, message: row.message as string }))
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

function optionalCell(source: unknown[], column: Map<string, number>, header: string): unknown {
  const index = column.get(header)
  if (index === undefined) return null
  return source[index]
}

function headerCells(row: unknown[]): string[] {
  const cells = row.map((cell) => String(cell ?? '').replace(/^\uFEFF/, '').trim())
  while (cells.length > 0 && cells[cells.length - 1] === '') cells.pop()
  return cells
}

function validateHeaders(headers: string[]): { ok: true; titles: TitleColumns } | { ok: false; error: string } {
  const titles = resolveTitleColumns(headers)
  if (!titles.ok) return titles
  const allowed = new Set<string>([
    ...BASE_HEADERS,
    ...OPTIONAL_HEADERS,
    titles.titles.italiano,
    ...(titles.titles.originale ? [titles.titles.originale] : []),
  ])
  const missing = BASE_HEADERS.filter((header) => !headers.includes(header))
  const unexpected = headers.filter((header) => header && !allowed.has(header))
  const duplicates = headers.filter((header, index) => header && headers.indexOf(header) !== index)
  if (missing.length === 0 && unexpected.length === 0 && duplicates.length === 0) return titles
  return { ok: false, error: headerError(headers) }
}

function resolveTitleColumns(headers: string[]): { ok: true; titles: TitleColumns } | { ok: false; error: string } {
  const hasItalian = headers.includes('Titolo italiano')
  const hasLegacy = headers.includes(LEGACY_TITOLO)
  const hasOriginal = headers.includes('Titolo originale')
  if (hasItalian && hasLegacy) return { ok: false, error: headerError(headers) }
  if (hasItalian) {
    if (!hasOriginal) return { ok: false, error: headerError(headers) }
    return { ok: true, titles: { italiano: 'Titolo italiano', originale: 'Titolo originale' } }
  }
  if (hasLegacy) {
    return {
      ok: true,
      titles: { italiano: LEGACY_TITOLO, originale: hasOriginal ? 'Titolo originale' : null },
    }
  }
  return { ok: false, error: headerError(headers) }
}

function headerError(headers: string[]): string {
  const expected = [...EPISODI_IMPORT_HEADERS]
  const allowed = new Set<string>([...expected, LEGACY_TITOLO, ...OPTIONAL_HEADERS])
  const missingBase = BASE_HEADERS.filter((header) => !headers.includes(header))
  const missingTitles = headers.includes('Titolo italiano') || headers.includes(LEGACY_TITOLO)
    ? headers.includes('Titolo italiano') && !headers.includes('Titolo originale')
      ? ['Titolo originale']
      : []
    : ['Titolo italiano', 'Titolo originale']
  const missing = [...missingBase, ...missingTitles]
  const unexpected = headers.filter((header) => header && !allowed.has(header) && header !== 'Titolo originale')
  const parts = [`Il file non ha le colonne attese. Colonne richieste: ${expected.join(', ')}.`]
  if (missing.length > 0) parts.push(`Mancano: ${missing.join(', ')}.`)
  if (unexpected.length > 0) parts.push(`Non previste: ${unexpected.join(', ')}.`)
  return parts.join(' ')
}

function displayInt(value: unknown, parsed: number | null | 'invalid'): string {
  if (typeof parsed === 'number') return String(parsed)
  return rawCellText(value)
}

function displayDate(value: unknown, parsed: string | null | 'invalid'): string {
  if (parsed && parsed !== 'invalid') return isoToItalian(parsed)
  return rawCellText(value)
}

function rawCellText(value: unknown): string {
  if (value == null) return ''
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    const iso = calendarIso(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate())
    return iso === 'invalid' ? '' : isoToItalian(iso)
  }
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  return String(value).trim()
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

function parseAliasTitoli(value: unknown): string[] | null {
  if (cellIsEmpty(value)) return null
  const parts = String(value).split(',').map((part) => part.trim()).filter(Boolean)
  return parts.length > 0 ? parts : null
}

function readTconst(value: unknown): string | null {
  if (cellIsEmpty(value)) return null
  const text = String(value).trim()
  return text || null
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
