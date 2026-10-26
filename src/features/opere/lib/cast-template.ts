import JSZip from 'jszip'
import * as XLSX from 'xlsx'
import { CAST_TEMPLATE_COLUMNS, cleanCell, type CastTemplateColumn } from './cast-import'

export type CastTemplateSource = {
  nome: string | null
  cognome: string | null
  codice_ipn: string | null
  personaggio?: string | null
  ruolo: string | null
  numero_stagione: number | null
  numero_episodio: number | null
}

export type CastTemplateRow = Record<CastTemplateColumn, string | number>

/**
 * Il cast esterno ha un solo campo nome. Cognome = ultima parola, nome = tutto ciò che precede.
 * Senza spazi il cognome resta vuoto e l'anteprima chiede di compilarlo.
 */
export function splitExternalCastName(value: string | null | undefined): { nome: string; cognome: string } {
  const cleaned = cleanCell(value)
  const space = cleaned.lastIndexOf(' ')
  if (space === -1) return { nome: cleaned, cognome: '' }
  return { nome: cleaned.slice(0, space), cognome: cleaned.slice(space + 1) }
}

/**
 * Mappa partecipazioni o cast esterno in righe del template.
 * Il download per gli operatori non la usa: quel file resta solo con le intestazioni.
 */
export function buildCastTemplateRows(partecipazioni: CastTemplateSource[]): CastTemplateRow[] {
  const rows = partecipazioni.map((row) => ({
    Nome: cleanCell(row.nome),
    Cognome: cleanCell(row.cognome),
    Personaggio: cleanCell(row.personaggio),
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

/**
 * SheetJS community scrive `t="str"` senza formula: per Excel è un risultato di formula,
 * e il file viene riparato all'apertura. `inlineStr` è testo vero.
 */
function inlineStrings(xml: string): string {
  return xml.replace(/<c\b([^>]*?)\st="str"([^>]*)><v>([\s\S]*?)<\/v><\/c>/g, (match, before: string, after: string, text: string) => {
    const attrs = `${before} ${after}`.replace(/\s+/g, ' ').trim()
    const ref = /\br="([^"]+)"/.exec(attrs)
    if (!ref) return match
    const rest = attrs.replace(/\br="[^"]+"/, '').replace(/\s+/g, ' ').trim()
    return `<c r="${ref[1]}"${rest ? ` ${rest}` : ''} t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`
  })
}

/** Ordine CT_Worksheet: dataValidations sta prima di ignoredErrors, non in coda. */
function insertDataValidations(xml: string, validation: string): string {
  if (xml.includes('<dataValidations')) return xml
  if (xml.includes('<ignoredErrors')) return insertBefore(xml, '<ignoredErrors', validation)
  if (xml.includes('</sheetData>')) return xml.replace('</sheetData>', `</sheetData>${validation}`)
  return xml.replace('</worksheet>', `${validation}</worksheet>`)
}

async function writeOfficeWorkbook(zip: JSZip): Promise<Buffer> {
  const ordered = new JSZip()
  const names = Object.keys(zip.files).filter((name) => !zip.files[name].dir && !name.endsWith('/'))
  const sequence = ['[Content_Types].xml', ...names.filter((name) => name !== '[Content_Types].xml')]
  for (const name of sequence) {
    const file = zip.file(name)
    if (!file) continue
    ordered.file(name, await file.async('nodebuffer'))
  }
  const out = await ordered.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  return Buffer.from(out)
}

/**
 * Excel ripara i xlsx di SheetJS che contengono xl/metadata.xml (dynamic array)
 * anche quando nessuna cella lo usa.
 */
async function dropSheetMetadata(zip: JSZip): Promise<void> {
  zip.remove('xl/metadata.xml')
  const contentTypes = zip.file('[Content_Types].xml')
  const rels = zip.file('xl/_rels/workbook.xml.rels')
  if (contentTypes) {
    const xml = (await contentTypes.async('string')).replace(/<Override PartName="\/xl\/metadata\.xml"[^>]*\/>/g, '')
    zip.file('[Content_Types].xml', xml)
  }
  if (rels) {
    const xml = (await rels.async('string')).replace(/<Relationship\b[^>]*Target="metadata\.xml"[^>]*\/>/g, '')
    zip.file('xl/_rels/workbook.xml.rels', xml)
  }
}

/** Dropdown Excel sul ruolo, con le voci su un foglio nascosto. Workbook apribile senza riparazione. */
export async function buildCastTemplateXlsx(rows: CastTemplateRow[], roleNames: string[]): Promise<Buffer> {
  const aoa: (string | number)[][] = [
    [...CAST_TEMPLATE_COLUMNS],
    ...rows.map((row) => CAST_TEMPLATE_COLUMNS.map((column) => row[column])),
  ]
  const castSheet = XLSX.utils.aoa_to_sheet(aoa)
  castSheet['!cols'] = CAST_TEMPLATE_COLUMNS.map((column) => ({
    wch: column === 'Personaggio' || column === 'Ruolo' ? 28 : column === 'Stagione' || column === 'Episodio' ? 12 : 22,
  }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, castSheet, 'Cast')
  if (roleNames.length > 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(roleNames.map((nome) => [nome])), 'Ruoli')
  }
  const raw = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  const zip = await JSZip.loadAsync(Buffer.from(raw))
  await dropSheetMetadata(zip)

  const sheetNames = Object.keys(zip.files).filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
  for (const name of sheetNames) {
    const file = zip.file(name)
    if (!file) continue
    zip.file(name, inlineStrings(await file.async('string')))
  }

  const sheetFile = zip.file('xl/worksheets/sheet1.xml')
  const workbookFile = zip.file('xl/workbook.xml')
  if (!sheetFile || !workbookFile) throw new Error('Workbook del template non valido')

  if (roleNames.length > 0) {
    const ruoloIndex = CAST_TEMPLATE_COLUMNS.indexOf('Ruolo')
    const column = XLSX.utils.encode_col(ruoloIndex < 0 ? 3 : ruoloIndex)
    const validation =
      `<dataValidations count="1"><dataValidation type="list" allowBlank="1" showErrorMessage="1" showInputMessage="1" promptTitle="Ruolo" prompt="Come nel form: Attore primario, Attore comprimario, Doppiatore primario, Doppiatore comprimario" errorTitle="Ruolo" error="Seleziona un ruolo dalla lista" sqref="${column}2:${column}5001"><formula1>RuoliCast</formula1></dataValidation></dataValidations>`
    const currentSheet = await zip.file('xl/worksheets/sheet1.xml')!.async('string')
    zip.file('xl/worksheets/sheet1.xml', insertDataValidations(currentSheet, validation))

    let book = await zip.file('xl/workbook.xml')!.async('string')
    const defined = `<definedNames><definedName name="RuoliCast">Ruoli!$A$1:$A$${roleNames.length}</definedName></definedNames>`
    if (!book.includes('<definedNames>')) {
      if (book.includes('<calcPr')) book = insertBefore(book, '<calcPr', defined)
      else book = book.replace('</workbook>', `${defined}</workbook>`)
    }
    book = book.replace(/<sheet([^>]*name="Ruoli"[^>]*)\/>/g, (match, attrs: string) =>
      attrs.includes('state=') ? match : `<sheet${attrs} state="hidden"/>`,
    )
    zip.file('xl/workbook.xml', book)
  }

  return writeOfficeWorkbook(zip)
}
