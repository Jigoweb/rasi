import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { activeRuoloNames, buildCastTemplateCsv, buildCastTemplateRows, buildCastTemplateXlsx, castTemplateFileName, splitExternalCastName } from './cast-template'
import { CAST_TEMPLATE_COLUMNS } from './cast-import'

describe('buildCastTemplateRows', () => {
  it('emits one row per partecipazione with the exact columns', () => {
    const rows = buildCastTemplateRows([
      {
        nome: 'Mario',
        cognome: 'Rossi',
        codice_ipn: 'IPN1',
        ruolo: 'Protagonista Primario',
        numero_stagione: 1,
        numero_episodio: 2,
      },
      {
        nome: 'Anna',
        cognome: 'Verdi',
        codice_ipn: null,
        ruolo: 'Comprimario',
        numero_stagione: null,
        numero_episodio: null,
      },
    ])

    expect(rows).toHaveLength(2)
    expect(Object.keys(rows[0])).toEqual([...CAST_TEMPLATE_COLUMNS])
    expect(rows[0]).toEqual({
      Nome: 'Anna',
      Cognome: 'Verdi',
      IPN: '',
      Ruolo: 'Comprimario',
      Stagione: '',
      Episodio: '',
    })
    expect(rows[1]).toMatchObject({ Nome: 'Mario', Cognome: 'Rossi', IPN: 'IPN1', Stagione: 1, Episodio: 2 })
    expect(rows[0]).not.toHaveProperty('Personaggio')
    expect(rows[0]).not.toHaveProperty('Note')
  })
})

describe('splitExternalCastName', () => {
  it('splits a single stored name on the first space', () => {
    expect(splitExternalCastName('  Maria De Filippi ')).toEqual({ nome: 'Maria', cognome: 'De Filippi' })
    expect(splitExternalCastName('Cher')).toEqual({ nome: 'Cher', cognome: '' })
  })
})

describe('activeRuoloNames', () => {
  it('lists active role names once, sorted', () => {
    expect(
      activeRuoloNames([
        { nome: 'Doppiatore Primario', attivo: true },
        { nome: 'Protagonista', attivo: false },
        { nome: 'Comprimario', attivo: true },
        { nome: ' comprimario ', attivo: true },
      ]),
    ).toEqual(['Comprimario', 'Doppiatore Primario'])
  })
})

describe('buildCastTemplateCsv', () => {
  it('uses a semicolon delimiter and a BOM', () => {
    const csv = buildCastTemplateCsv([
      { Nome: 'Mario', Cognome: 'Rossi', IPN: 'A1', Ruolo: 'Protagonista', Stagione: '', Episodio: '' },
    ])
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('Nome;Cognome;IPN;Ruolo;Stagione;Episodio')
    expect(csv).toContain('Mario;Rossi;A1;Protagonista;;')
  })
})

describe('castTemplateFileName', () => {
  it('builds a dated file name', () => {
    expect(castTemplateFileName('La città è mia!', 'xlsx', new Date('2026-10-23T00:00:00Z'))).toBe(
      'template_cast_La_citta_e_mia_2026-10-23.xlsx',
    )
  })
})

describe('buildCastTemplateXlsx', () => {
  it('writes the cast rows and a ruolo dropdown backed by the active names', async () => {
    const buffer = await buildCastTemplateXlsx(
      [{ Nome: 'Mario', Cognome: 'Rossi', IPN: 'IPN1', Ruolo: 'Protagonista', Stagione: 1, Episodio: 2 }],
      ['Comprimario', 'Protagonista'],
    )
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const matrix = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets.Cast, { header: 1, defval: '' })
    expect(matrix[0]).toEqual([...CAST_TEMPLATE_COLUMNS])
    expect(matrix[1]).toEqual(['Mario', 'Rossi', 'IPN1', 'Protagonista', 1, 2])

    const zip = await JSZip.loadAsync(buffer)
    const sheet = await zip.file('xl/worksheets/sheet1.xml')!.async('string')
    const book = await zip.file('xl/workbook.xml')!.async('string')
    expect(sheet).toContain('dataValidation')
    expect(sheet).toContain('sqref="D2:D5001"')
    expect(sheet).toContain('<formula1>RuoliCast</formula1>')
    expect(book).toContain('name="RuoliCast"')
    expect(book).toContain('Ruoli!$A$1:$A$2')
    expect(book).toContain('name="Ruoli"')
    expect(book).toContain('state="hidden"')
  })
})
