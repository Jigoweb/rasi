import JSZip from 'jszip'
import { activeRuoloNames, buildCastTemplateCsv, buildCastTemplateRows, buildCastTemplateXlsx, castTemplateFileName, splitExternalCastName } from './cast-template'
import { CAST_TEMPLATE_COLUMNS } from './cast-import'
import { RUOLO_PRIMARIETA_OPTIONS } from './cast-esterno'
import { parseTabularFile } from '@/shared/lib/tabular-file'

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
      Personaggio: '',
      Ruolo: 'Comprimario',
      Stagione: '',
      Episodio: '',
    })
    expect(rows[1]).toMatchObject({ Nome: 'Mario', Cognome: 'Rossi', Personaggio: '', Stagione: 1, Episodio: 2 })
    expect(rows[0]).not.toHaveProperty('IPN')
    expect(rows[0]).not.toHaveProperty('Note')
  })
})

describe('splitExternalCastName', () => {
  it('uses the last word as surname', () => {
    expect(splitExternalCastName('  Maria Grazia Rossi ')).toEqual({ nome: 'Maria Grazia', cognome: 'Rossi' })
    expect(splitExternalCastName('Maria De Filippi')).toEqual({ nome: 'Maria De', cognome: 'Filippi' })
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
      { Nome: 'Mario', Cognome: 'Rossi', Personaggio: 'Il medico', Ruolo: 'Attore primario', Stagione: '', Episodio: '' },
    ])
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('Nome;Cognome;Personaggio;Ruolo;Stagione;Episodio')
    expect(csv).toContain('Mario;Rossi;Il medico;Attore primario;;')
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
  it('writes a header-only sheet Excel can open, with the form role list', async () => {
    const labels = RUOLO_PRIMARIETA_OPTIONS.map((option) => option.label)
    const buffer = await buildCastTemplateXlsx([], labels)
    const parsed = parseTabularFile('template_cast.xlsx', buffer)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.table.headers).toEqual([...CAST_TEMPLATE_COLUMNS])
    expect(parsed.table.rows).toEqual([])

    const zip = await JSZip.loadAsync(buffer)
    const sheet = await zip.file('xl/worksheets/sheet1.xml')!.async('string')
    const book = await zip.file('xl/workbook.xml')!.async('string')
    const types = await zip.file('[Content_Types].xml')!.async('string')
    const rels = await zip.file('xl/_rels/workbook.xml.rels')!.async('string')
    const roles = await zip.file('xl/worksheets/sheet2.xml')!.async('string')
    expect(sheet).not.toMatch(/t="str"/)
    expect(roles).not.toMatch(/t="str"/)
    expect(sheet).toContain('t="inlineStr"')
    expect(sheet.indexOf('<dataValidations')).toBeGreaterThan(sheet.indexOf('</sheetData>'))
    expect(sheet.indexOf('<dataValidations')).toBeLessThan(sheet.indexOf('<ignoredErrors'))
    expect(sheet).toContain('sqref="D2:D5001"')
    expect(sheet).toContain('prompt="Come nel form: Attore primario, Attore comprimario, Doppiatore primario, Doppiatore comprimario"')
    expect(sheet).toContain('<formula1>RuoliCast</formula1>')
    expect(book).toContain('name="RuoliCast"')
    expect(book).toContain('Ruoli!$A$1:$A$4')
    expect(book).toContain('state="hidden"')
    expect(zip.file('xl/metadata.xml')).toBeNull()
    expect(types).not.toContain('metadata.xml')
    expect(rels).not.toContain('metadata.xml')
    expect(roles).toContain('Attore primario')
    expect(roles).toContain('Doppiatore comprimario')
    expect(Object.keys(zip.files)[0]).toBe('[Content_Types].xml')
  })

  it('round-trips a compiled row, including characters Excel used to repair', async () => {
    const buffer = await buildCastTemplateXlsx(
      [{ Nome: 'A & B', Cognome: "O'Brien", Personaggio: 'Il medico', Ruolo: 'Attore primario', Stagione: 1, Episodio: 2 }],
      ['Attore primario'],
    )
    const parsed = parseTabularFile('template_cast.xlsx', buffer)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.table.rows).toEqual([
      {
        Nome: 'A & B',
        Cognome: "O'Brien",
        Personaggio: 'Il medico',
        Ruolo: 'Attore primario',
        Stagione: '1',
        Episodio: '2',
      },
    ])
    const sheet = await (await JSZip.loadAsync(buffer)).file('xl/worksheets/sheet1.xml')!.async('string')
    expect(sheet).not.toMatch(/t="str"/)
    expect(sheet).toContain('A &amp; B')
  })
})
