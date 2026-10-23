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

function parseCsv(text: string): TabularParseResult {
  const source = stripBom(text)
  const parsed = Papa.parse<unknown[]>(source, {
    header: false,
    skipEmptyLines: false,
    delimiter: detectCsvDelimiter(source),
  })
  const fatal = parsed.errors.filter((error) => error.code !== 'UndetectableDelimiter')
  if (fatal.length > 0) return { ok: false, error: 'CSV non leggibile' }
  return recordsFromMatrix(parsed.data)
}

function parseXlsx(data: Buffer): TabularParseResult {
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(data, { type: 'buffer', cellDates: false })
  } catch {
    return { ok: false, error: 'File Excel non leggibile' }
  }
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return { ok: false, error: 'Il file Excel non contiene fogli' }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    raw: true,
    defval: '',
    blankrows: true,
  })
  return recordsFromMatrix(matrix)
}

export function parseTabularFile(filename: string, data: Buffer): TabularParseResult {
  const lower = filename.trim().toLowerCase()
  if (lower.endsWith('.csv')) return parseCsv(data.toString('utf8'))
  if (lower.endsWith('.xlsx')) return parseXlsx(data)
  return { ok: false, error: 'Formato non supportato. Usa .xlsx o .csv' }
}
