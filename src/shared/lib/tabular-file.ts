import Papa from 'papaparse'
import * as XLSX from 'xlsx'

/** Lettura CSV/XLSX riutilizzabile (cast oggi, episodi in un import separato). */

export const TABULAR_MAX_ROWS = 5000

export type TabularTable = {
  headers: string[]
  rows: Record<string, string>[]
}

export type TabularParseResult =
  | { ok: true; table: TabularTable }
  | { ok: false; error: string }

/** Errori della lettura grezza, prima dell'interpretazione delle celle. */
export type TabularMatrixErrorCode = 'unsupported' | 'csv' | 'excel' | 'empty-workbook'

export type TabularMatrixResult =
  | { ok: true; matrix: unknown[][] }
  | { ok: false; code: TabularMatrixErrorCode }

function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value
}

export function cellToText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return ''
    if (Number.isInteger(value)) return String(value)
    return String(value)
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (value instanceof Date) return value.toISOString()
  return String(value).trim()
}

function recordsFromMatrix(matrix: unknown[][]): TabularParseResult {
  if (matrix.length === 0) {
    return { ok: false, error: 'Il file non contiene intestazioni' }
  }
  const headers = (matrix[0] ?? []).map((cell, index) => {
    const text = stripBom(cellToText(cell)).trim()
    return index === 0 ? stripBom(text).trim() : text
  })
  while (headers.length > 0 && headers[headers.length - 1] === '') headers.pop()
  if (headers.length === 0 || headers.every((header) => header === '')) {
    return { ok: false, error: 'Il file non contiene intestazioni' }
  }
  if (headers.some((header) => header === '')) {
    return { ok: false, error: 'Intestazione vuota: controlla le colonne del template' }
  }

  const body = matrix.slice(1)
  while (body.length > 0 && body[body.length - 1].every((cell) => cellToText(cell) === '')) body.pop()
  if (body.length > TABULAR_MAX_ROWS) {
    return { ok: false, error: `Troppe righe (massimo ${TABULAR_MAX_ROWS})` }
  }

  const rows = body.map((line) => {
    const record: Record<string, string> = {}
    headers.forEach((header, index) => {
      record[header] = cellToText(line?.[index])
    })
    return record
  })
  return { ok: true, table: { headers, rows } }
}

function countDelimiters(line: string): { comma: number; semi: number; tab: number } {
  let comma = 0
  let semi = 0
  let tab = 0
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        index += 1
        continue
      }
      quoted = !quoted
      continue
    }
    if (quoted) continue
    if (char === ',') comma += 1
    else if (char === ';') semi += 1
    else if (char === '\t') tab += 1
  }
  return { comma, semi, tab }
}

/** Virgola, punto e virgola (Excel italiano) o tab. */
export function detectCsvDelimiter(text: string): ',' | ';' | '\t' {
  const line = stripBom(text).split(/\r?\n/, 1)[0] ?? ''
  const counts = countDelimiters(line)
  if (counts.semi >= counts.comma && counts.semi >= counts.tab && counts.semi > 0) return ';'
  if (counts.tab >= counts.comma && counts.tab > 0) return '\t'
  return ','
}

function asUint8Array(data: Buffer | Uint8Array): Uint8Array {
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  }
  return data
}

/**
 * Matrice grezza di CSV/XLSX. Le celle Excel restano numeri (seriali data compresi):
 * ogni import decide da solo come leggerle.
 */
export function readTabularMatrix(filename: string, data: Buffer | Uint8Array): TabularMatrixResult {
  const lower = filename.trim().toLowerCase()
  if (lower.endsWith('.csv')) return readCsvMatrix(Buffer.from(asUint8Array(data)).toString('utf8'))
  if (lower.endsWith('.xlsx')) return readXlsxMatrix(asUint8Array(data))
  return { ok: false, code: 'unsupported' }
}

function readCsvMatrix(text: string): TabularMatrixResult {
  const source = stripBom(text)
  const parsed = Papa.parse<unknown[]>(source, {
    header: false,
    skipEmptyLines: false,
    delimiter: detectCsvDelimiter(source),
  })
  const fatal = parsed.errors.filter((error) => error.code !== 'UndetectableDelimiter')
  if (fatal.length > 0) return { ok: false, code: 'csv' }
  return { ok: true, matrix: parsed.data }
}

function readXlsxMatrix(data: Uint8Array): TabularMatrixResult {
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(data, { type: 'array', cellDates: false })
  } catch {
    return { ok: false, code: 'excel' }
  }
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return { ok: false, code: 'empty-workbook' }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true,
  })
  return { ok: true, matrix }
}

const CAST_MATRIX_ERRORS: Record<TabularMatrixErrorCode, string> = {
  unsupported: 'Formato non supportato. Usa .xlsx o .csv',
  csv: 'CSV non leggibile',
  excel: 'File Excel non leggibile',
  'empty-workbook': 'Il file Excel non contiene fogli',
}

export function parseTabularFile(filename: string, data: Buffer | Uint8Array): TabularParseResult {
  const matrix = readTabularMatrix(filename, data)
  if (!matrix.ok) return { ok: false, error: CAST_MATRIX_ERRORS[matrix.code] }
  return recordsFromMatrix(matrix.matrix)
}
