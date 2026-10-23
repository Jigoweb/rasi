import JSZip from 'jszip'
import * as XLSX from 'xlsx'
import { CAST_TEMPLATE_COLUMNS, cleanCell, type CastTemplateColumn } from './cast-import'

export type CastTemplateSource = {
  nome: string | null
  cognome: string | null
  codice_ipn: string | null
  ruolo: string | null
  numero_stagione: number | null
  numero_episodio: number | null
}

export type CastTemplateRow = Record<CastTemplateColumn, string | number>

/**
 * Il cast esterno ha un solo campo nome. Spezzatura provvisoria sul primo spazio:
 * Nome = prima parola, Cognome = il resto. Senza spazi il cognome resta vuoto.
 */
export function splitExternalCastName(value: string | null | undefined): { nome: string; cognome: string } {
  const cleaned = cleanCell(value)
  const space = cleaned.indexOf(' ')
  if (space === -1) return { nome: cleaned, cognome: '' }
  return { nome: cleaned.slice(0, space), cognome: cleanCell(cleaned.slice(space + 1)) }
}

/** Una riga per partecipazione RASI e per persona del cast esterno, anche inserita a mano. */
export function buildCastTemplateRows(partecipazioni: CastTemplateSource[]): CastTemplateRow[] {
  const rows = partecipazioni.map((row) => ({
    Nome: cleanCell(row.nome),
    Cognome: cleanCell(row.cognome),
    IPN: cleanCell(row.codice_ipn),
    Ruolo: cleanCell(row.ruolo),
    Stagione: row.numero_stagione ?? '',
    Episodio: row.numero_episodio ?? '',
  }))
  const num = (value: string | number) => (value === '' ? -1 : Number(value))
  return rows.sort(
    (a, b) =>
      num(a.Stagione) - num(b.Stagione) ||
      num(a.Episodio) - num(b.Episodio) ||
      String(a.Cognome).localeCompare(String(b.Cognome), 'it') ||
      String(a.Nome).localeCompare(String(b.Nome), 'it'),
  )
}

export function activeRuoloNames(ruoli: { nome: string; attivo: boolean | null }[]): string[] {
  const seen = new Set<string>()
  const names: string[] = []
  for (const ruolo of ruoli) {
    if (ruolo.attivo === false) continue
    const nome = cleanCell(ruolo.nome)
    if (!nome) continue
    const key = nome.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    names.push(nome)
  }
  return names.sort((a, b) => a.localeCompare(b, 'it'))
}

function csvEscape(value: string): string {
  if (/[";\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function buildCastTemplateCsv(rows: CastTemplateRow[]): string {
  const lines = [CAST_TEMPLATE_COLUMNS.join(';')]
  for (const row of rows) {
    lines.push(CAST_TEMPLATE_COLUMNS.map((column) => csvEscape(String(row[column] ?? ''))).join(';'))
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`
}

export function castTemplateFileName(
  titolo: string | null | undefined,
  format: 'xlsx' | 'csv',
  today = new Date(),
): string {
  const slug = (titolo || 'opera')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return `template_cast_${slug || 'opera'}_${today.toISOString().slice(0, 10)}.${format}`
}

function insertBefore(xml: string, marker: string, snippet: string): string {
  const index = xml.indexOf(marker)
  if (index === -1) return xml
  return `${xml.slice(0, index)}${snippet}${xml.slice(index)}`
}

/** Dropdown Excel sul ruolo, con i nomi attivi su un foglio nascosto. */
export async function buildCastTemplateXlsx(rows: CastTemplateRow[], roleNames: string[]): Promise<Buffer> {
  const aoa: (string | number)[][] = [
    [...CAST_TEMPLATE_COLUMNS],
    ...rows.map((row) => CAST_TEMPLATE_COLUMNS.map((column) => row[column])),
  ]
  const castSheet = XLSX.utils.aoa_to_sheet(aoa)
  castSheet['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 16 }, { wch: 28 }, { wch: 12 }, { wch: 12 }]
  const ruoliSheet = XLSX.utils.aoa_to_sheet(roleNames.map((nome) => [nome]))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, castSheet, 'Cast')
  XLSX.utils.book_append_sheet(workbook, ruoliSheet, 'Ruoli')
  const raw = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  if (roleNames.length === 0) return Buffer.from(raw)

  const zip = await JSZip.loadAsync(Buffer.from(raw))
  const sheetFile = zip.file('xl/worksheets/sheet1.xml')
  const workbookFile = zip.file('xl/workbook.xml')
  if (!sheetFile || !workbookFile) {
    throw new Error('Workbook del template non valido')
  }
  let sheet = await sheetFile.async('string')
  let book = await workbookFile.async('string')
  const validation =
    '<dataValidations count="1"><dataValidation type="list" allowBlank="1" showErrorMessage="1" showInputMessage="0" errorTitle="Ruolo" error="Seleziona un ruolo dell\'elenco" sqref="D2:D5001"><formula1>RuoliCast</formula1></dataValidation></dataValidations>'
  if (sheet.includes('<pageMargins')) {
    sheet = insertBefore(sheet, '<pageMargins', validation)
  } else {
    sheet = sheet.replace('</worksheet>', `${validation}</worksheet>`)
  }
  const defined = `<definedNames><definedName name="RuoliCast">Ruoli!$A$1:$A$${roleNames.length}</definedName></definedNames>`
  if (book.includes('<calcPr')) book = insertBefore(book, '<calcPr', defined)
  else book = book.replace('</workbook>', `${defined}</workbook>`)
  book = book.replace(/<sheet([^>]*name="Ruoli"[^>]*)\/>/, (match, attrs: string) =>
    attrs.includes('state=') ? match : `<sheet${attrs} state="hidden"/>`,
  )
  zip.file('xl/worksheets/sheet1.xml', sheet)
  zip.file('xl/workbook.xml', book)
  const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  return Buffer.from(out)
}
