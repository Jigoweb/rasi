import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import * as XLSX from 'xlsx'
import {
  buildProgrammazioniPayloads,
  parseProgrammazioniFile,
  resolveDateOrders,
  type UnparsedValuesCollector,
} from './programmazioni-import-core.js'

describe('programmazioni import core episode normalization', () => {
  it('normalizes Netflix packed episode signals in worker payloads', () => {
    const payloads = buildProgrammazioniPayloads(
      [{
        show_name: 'Stranger Things 3',
        show_original_name: 'Stranger Things',
        episode_nbr: '3005',
        episode_name: 'Stranger Things 3: "chapter Five: the Flayed"',
        type: 'series',
      }],
      {
        kind: 'apply_existing',
        mapping: {
          version: 1,
          colonne_rilevate: ['show_name', 'show_original_name', 'episode_nbr', 'episode_name', 'type'],
          ultimo_upload: null,
          mapping: {
            show_name: 'titolo',
            show_original_name: 'titolo_originale',
            episode_nbr: 'numero_episodio',
            episode_name: 'titolo_episodio_originale',
            type: 'tipo',
          },
        },
      },
      { campagnaProgrammazioneId: 'campagna-1', emittenteId: 'emittente-1' }
    )

    assert.equal(payloads.length, 1)
    assert.equal(payloads[0].numero_stagione, 3)
    assert.equal(payloads[0].numero_episodio, 5)
    assert.equal(payloads[0].titolo_episodio, 'Chapter Five: The Flayed')
    assert.equal(payloads[0].titolo_episodio_originale, 'Stranger Things 3: "chapter Five: the Flayed"')

    const metadata = payloads[0].metadati_trasmissione as Record<string, unknown>
    const normalization = metadata.episode_normalization as Record<string, unknown>
    assert.equal(normalization.season, 3)
    assert.equal(normalization.episode, 5)
    assert.equal(normalization.episodeTitle, 'Chapter Five: The Flayed')
    assert.equal(normalization.confidence, 'high')
  })
})

describe('programmazioni import core absent-data normalization', () => {
  const snapshot = {
    kind: 'apply_existing' as const,
    mapping: {
      version: 1 as const,
      colonne_rilevate: ['Titolo', 'Regia'],
      ultimo_upload: null,
      mapping: { Titolo: 'titolo', Regia: 'regia' },
    },
  }
  const ctx = { campagnaProgrammazioneId: 'c1', emittenteId: 'e1' }

  it('omits absent-marker fields and skips absent-marker titles', () => {
    const payloads = buildProgrammazioniPayloads(
      [
        { Titolo: 'Real', Regia: 'N/A' },
        { Titolo: 'N.D.', Regia: 'Someone' },
      ],
      snapshot,
      ctx,
    )
    assert.equal(payloads.length, 1)
    assert.equal(payloads[0].titolo, 'Real')
    assert.equal(payloads[0].regia, undefined)
  })

  it('coalesce rule falls through when first source is an absent-marker', () => {
    const payloads = buildProgrammazioniPayloads(
      [{ A: 'null', B: 'Fallback Title' }],
      {
        kind: 'apply_existing' as const,
        mapping: {
          version: 1 as const,
          colonne_rilevate: ['A', 'B'],
          ultimo_upload: null,
          mapping: {},
          rules: { titolo: { sources: ['A', 'B'] } },
        },
      },
      ctx,
    )
    assert.equal(payloads.length, 1)
    assert.equal(payloads[0].titolo, 'Fallback Title')
  })
})

describe('programmazioni import excel time fractions', () => {
  it('non produce ora_inizio 1/0/00 dal file Cielo 2015', () => {
    const path = '/Users/matteo/Downloads/SKY/2015/Cielo 2015 File grezzo.xlsx'
    let buffer: Buffer
    try {
      buffer = readFileSync(path)
    } catch {
      // Skip se il file campione non è disponibile nell'ambiente CI
      return
    }

    const rows = parseProgrammazioniFile(buffer, 'Cielo 2015 File grezzo.xlsx')
    assert.ok(rows.length > 0)
    const first = rows[0]
    assert.equal(first['Ora Inizio'], '00:06:29')
    assert.notEqual(first['Ora Inizio'], '1/0/00')
    assert.match(String(first['Durata']), /^\d{2}:\d{2}:\d{2}$/)

    const payloads = buildProgrammazioniPayloads(
      rows.slice(0, 3),
      {
        kind: 'apply_existing',
        mapping: {
          version: 1,
          colonne_rilevate: Object.keys(first),
          ultimo_upload: null,
          mapping: {
            'Serie Programma Sistema': 'titolo',
            'Data Inizio': 'data_trasmissione',
            'Ora Inizio': 'ora_inizio',
            Durata: 'durata_minuti',
            Tipologia: 'tipo',
            Anno: 'anno',
          },
          transforms: {
            'Data Inizio': 'us_date_short',
            Durata: 'hhmmss_to_minutes',
          },
        },
      },
      { campagnaProgrammazioneId: 'campagna-cielo', emittenteId: 'emittente-sky' },
    )

    assert.equal(payloads.length, 3)
    assert.equal(payloads[0].ora_inizio, '00:06:29')
    assert.equal(payloads[0].data_trasmissione, '2015-06-01')
    assert.equal(typeof payloads[0].durata_minuti, 'number')
    assert.ok((payloads[0].durata_minuti as number) > 0)
  })
})

describe('programmazioni import — file misto PLEX (trasformazioni e date anno-mese)', () => {
  const mapping = {
    'TV/Film': 'tipo',
    DIRECTOR: 'regia',
    'Episode Name': 'titolo_episodio',
    'Release Year': 'anno',
    'Season Number': 'numero_stagione',
    'Episode Number': 'numero_episodio',
    'Duration (mins)': 'durata_minuti',
    'Timestamp Month': 'data_trasmissione',
    'Number of Streams': 'views',
    'Programme Title (Episode/Film name)': 'titolo',
  }
  const rows = [
    {
      'Timestamp Month': '2024-12', 'TV/Film': 'FILM', 'Episode Name': null, 'Season Number': null,
      'Episode Number': null, 'Programme Title (Episode/Film name)': 'SalomÃ©', 'Duration (mins)': '107.98',
      'Number of Streams': '21', 'Release Year': '1949', DIRECTOR: 'YasujirÅ\u008d Ozu',
    },
    {
      'Timestamp Month': '2024-12', 'TV/Film': 'SERIE', 'Episode Name': 'The TrÃ³caire Box', 'Season Number': '1',
      'Episode Number': '6', 'Programme Title (Episode/Film name)': '21 Jump Street', 'Duration (mins)': '45.46',
      'Number of Streams': '2', 'Release Year': '1987', DIRECTOR: null,
    },
  ]
  const build = (transforms: Record<string, string>) =>
    buildProgrammazioniPayloads(
      rows,
      {
        kind: 'apply_existing',
        mapping: { version: 1, colonne_rilevate: Object.keys(rows[0]), ultimo_upload: null, mapping, transforms },
      },
      { campagnaProgrammazioneId: 'campagna-plex', emittenteId: 'emittente-plex', emittenteName: 'PLEX' },
    )

  it('applica mojibake_repair scelto nel wizard (prima il worker lo ignorava)', () => {
    const [film, serie] = build({
      'Programme Title (Episode/Film name)': 'mojibake_repair',
      'Episode Name': 'mojibake_repair',
      DIRECTOR: 'mojibake_repair',
    })
    assert.equal(film.titolo, 'Salomé')
    assert.equal(film.regia, 'Yasujirō Ozu')
    assert.equal(serie.titolo_episodio, 'The Trócaire Box')
  })

  it('ripara i caratteri anche senza trasformazione nel mapping (automatico)', () => {
    const [film, serie] = build({})
    assert.equal(film.titolo, 'Salomé')
    assert.equal(film.regia, 'Yasujirō Ozu')
    assert.equal(serie.titolo_episodio, 'The Trócaire Box')
  })

  it('legge stagione ed episodio dalle righe serie e la data anno-mese', () => {
    const [film, serie] = build({})
    assert.equal(film.data_trasmissione, '2024-12-01')
    assert.equal(film.numero_episodio, undefined)
    assert.equal(serie.tipo, 'serie')
    assert.equal(serie.numero_stagione, 1)
    assert.equal(serie.numero_episodio, 6)
    assert.equal(serie.views, 2)
    assert.equal(serie.data_trasmissione, '2024-12-01')
  })

  it('nomi di trasformazione sconosciuti o legacy non bloccano l\'import', () => {
    const [film] = build({ DIRECTOR: 'null_if_ND', 'Duration (mins)': 'legacy_seconds_to_minutes' })
    assert.equal(film.regia, 'Yasujirō Ozu')
    assert.equal(film.durata_minuti, 108)
  })

  it('una cella Excel di tipo data formattata yyyy-mm diventa il primo del mese', () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Timestamp Month', 'Programme Title (Episode/Film name)'],
      [new Date(Date.UTC(2024, 11, 1)), 'Late Spring'],
    ], { cellDates: true })
    sheet.A2.z = 'yyyy-mm'
    delete sheet.A2.w
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'PLEX')
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    // Le celle data diventano ISO; la lettura legacy (riprocesso) resta quella di prima.
    assert.equal(parseProgrammazioniFile(buffer, 'PLEX AVOD 2024.xlsx', { legacyDates: true })[0]['Timestamp Month'], '2024-12')
    const parsed = parseProgrammazioniFile(buffer, 'PLEX AVOD 2024.xlsx')
    assert.equal(parsed[0]['Timestamp Month'], '2024-12-01')
    const payloads = buildProgrammazioniPayloads(
      parsed,
      {
        kind: 'apply_existing',
        mapping: {
          version: 1,
          colonne_rilevate: Object.keys(parsed[0]),
          ultimo_upload: null,
          mapping: { 'Timestamp Month': 'data_trasmissione', 'Programme Title (Episode/Film name)': 'titolo' },
        },
      },
      { campagnaProgrammazioneId: 'campagna-plex', emittenteId: 'emittente-plex' },
    )
    assert.equal(payloads[0].data_trasmissione, '2024-12-01')
  })
})

describe('programmazioni import — date, orari e «à» finale (PLEX e Sky, novembre 2026)', () => {
  const ctx = { campagnaProgrammazioneId: 'campagna-test', emittenteId: 'emittente-test' }
  const apply = (
    rows: Record<string, unknown>[],
    mapping: Record<string, string>,
    transforms?: Record<string, string>,
    unparsed?: UnparsedValuesCollector,
  ) =>
    buildProgrammazioniPayloads(
      rows,
      { kind: 'apply_existing', mapping: { version: 1, colonne_rilevate: Object.keys(rows[0]), ultimo_upload: null, mapping, transforms } },
      ctx,
      1,
      unparsed,
    )

  function xlsx(rows: unknown[][], formats: Record<string, string>): Buffer {
    const sheet = XLSX.utils.aoa_to_sheet(rows)
    for (const [addr, z] of Object.entries(formats)) {
      sheet[addr].z = z
      delete sheet[addr].w
    }
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Foglio1')
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  }

  it('eu_date_to_iso non svuota più la data se il valore è ISO, anno-mese o con anno a due cifre', () => {
    const mapping = { data_trasmissione: 'data_trasmissione', titolo: 'titolo' }
    const t = { data_trasmissione: 'eu_date_to_iso' }
    const date = ['2024-12-01', '2024-12', '01/12/24', '01/12/2024', '2024-12-01 00:00:00']
      .map((d) => apply([{ data_trasmissione: d, titolo: 'X' }], mapping, t)[0].data_trasmissione)
    assert.deepEqual(date, ['2024-12-01', '2024-12-01', '2024-12-01', '2024-12-01', '2024-12-01'])
  })

  it('una vera cella data Excel con formato predefinito arriva in ISO (prima "12/1/24" e data vuota)', () => {
    const buffer = xlsx([['data_trasmissione', 'titolo'], [45627, 'Late Spring']], { A2: 'm/d/yy' })
    const parsed = parseProgrammazioniFile(buffer, 'PLEX FAST 2024.xlsx')
    assert.equal(parsed[0].data_trasmissione, '2024-12-01')
    const [row] = apply(parsed, { data_trasmissione: 'data_trasmissione', titolo: 'titolo' }, { data_trasmissione: 'eu_date_to_iso' })
    assert.equal(row.data_trasmissione, '2024-12-01')
  })

  it('legge l\'orario Sky da celle data+ora, AM/PM, con il punto e HHMM', () => {
    const buffer = xlsx(
      [['Orario inizio trasmissione', 'Titolo trasmissione'], [45627.8125, 'A'], [0.25, 'B']],
      { A2: 'dd/mm/yyyy hh:mm', A3: 'h:mm:ss AM/PM' },
    )
    const parsed = parseProgrammazioniFile(buffer, 'SKY_ATLANTIC_2024.xlsx')
    const mapping = { 'Orario inizio trasmissione': 'ora_inizio', 'Titolo trasmissione': 'titolo' }
    const fromFile = apply(parsed, mapping).map((r) => r.ora_inizio)
    assert.deepEqual(fromFile, ['19:30:00', '06:00:00'])
    const fromText = ['06.30', '8:30 PM', '12:15 AM', '2030', '01/12/2024 19:30', '25:10:00']
      .map((v) => apply([{ 'Orario inizio trasmissione': v, 'Titolo trasmissione': 'X' }], mapping)[0].ora_inizio)
    assert.deepEqual(fromText, ['06:30:00', '20:30:00', '00:15:00', '20:30:00', '19:30:00', '01:10:00'])
  })

  it('excel_fraction_to_time accetta anche l\'orario già formattato come testo', () => {
    const [row] = apply(
      [{ ora: '20:30:00', titolo: 'X' }],
      { ora: 'ora_inizio', titolo: 'titolo' },
      { ora: 'excel_fraction_to_time' },
    )
    assert.equal(row.ora_inizio, '20:30:00')
  })

  it('ripara la «à» finale anche dopo il trim (cittÃ\u00a0 → città)', () => {
    const rows = [
      { titolo: 'I padroni della cittÃ\u00a0', regia: 'X' },
      { titolo: 'Allegri becchini... arriva TrinitÃ', regia: 'X' },
      { titolo: 'BÃCH', regia: 'X' },
    ]
    const titoli = apply(rows, { titolo: 'titolo', regia: 'regia' }).map((r) => r.titolo)
    assert.deepEqual(titoli, ['I padroni della città', 'Allegri becchini... arriva Trinità', 'BÃCH'])
  })

  it('segnala date e orari presenti nel file ma non riconosciuti', () => {
    const unparsed: UnparsedValuesCollector = {}
    const [row] = apply(
      [{ data: 'dic-24', ora: 'sera', titolo: 'X' }],
      { data: 'data_trasmissione', ora: 'ora_inizio', titolo: 'titolo' },
      { data: 'eu_date_to_iso' },
      unparsed,
    )
    assert.equal(row.data_trasmissione, undefined)
    assert.equal(row.ora_inizio, undefined)
    assert.deepEqual(unparsed, {
      data_trasmissione: { count: 1, esempi: ['dic-24'] },
      ora_inizio: { count: 1, esempi: ['sera'] },
    })
  })
})

describe('programmazioni import — date testuali GG/MM/AAAA', () => {
  const ctx = { campagnaProgrammazioneId: 'campagna-test', emittenteId: 'emittente-test' }

  function textWorkbook(rows: unknown[][]): Buffer {
    const sheet = XLSX.utils.aoa_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Foglio1')
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  }

  function excelDateWorkbook(): Buffer {
    const sheet = XLSX.utils.aoa_to_sheet([['data_trasmissione', 'titolo'], [45627, 'Late Spring']])
    sheet.A2.z = 'm/d/yy'
    delete sheet.A2.w
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Foglio1')
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  }

  it('converte il testo GG/MM/AAAA in ISO nel percorso legacy_template', () => {
    const buffer = textWorkbook([
      ['data_trasmissione', 'titolo'],
      ['01/01/2024', 'A'],
      ['02/01/2024', 'B'],
      ['13/01/2024', 'C'],
    ])
    const rows = parseProgrammazioniFile(buffer, '20-sintetico.xlsx')
    const resolution = resolveDateOrders(rows, { kind: 'legacy_template' })
    assert.equal(resolution.orders.data_trasmissione, 'dmy')
    assert.equal(resolution.conflicts.length, 0)
    const payloads = buildProgrammazioniPayloads(
      rows,
      { kind: 'legacy_template' },
      ctx,
      1,
      undefined,
      resolution.orders,
    )
    assert.deepEqual(payloads.map((row) => row.data_trasmissione), [
      '2024-01-01',
      '2024-01-02',
      '2024-01-13',
    ])
  })

  it('con un mapping eu_date_to_iso esplicito non cambia la conversione', () => {
    const rows = [
      { Data: '01/01/2024', Titolo: 'A' },
      { Data: '02/01/2024', Titolo: 'B' },
      { Data: '13/01/2024', Titolo: 'C' },
    ]
    const snapshot = {
      kind: 'apply_existing' as const,
      mapping: {
        version: 1 as const,
        colonne_rilevate: ['Data', 'Titolo'],
        ultimo_upload: null,
        mapping: { Data: 'data_trasmissione', Titolo: 'titolo' },
        transforms: { Data: 'eu_date_to_iso' },
      },
    }
    const resolution = resolveDateOrders(rows, snapshot)
    assert.equal(resolution.orders.Data, undefined)
    assert.equal(resolution.ambiguous.length, 0)
    const payloads = buildProgrammazioniPayloads(rows, snapshot, ctx)
    assert.deepEqual(payloads.map((row) => row.data_trasmissione), [
      '2024-01-01',
      '2024-01-02',
      '2024-01-13',
    ])
  })

  it('non modifica le date Excel vere già normalizzate in ISO', () => {
    const rows = parseProgrammazioniFile(excelDateWorkbook(), 'date-vere.xlsx')
    const resolution = resolveDateOrders(rows, { kind: 'legacy_template' })
    assert.equal(resolution.orders.data_trasmissione, undefined)
    assert.equal(resolution.ambiguous.length, 0)
    const [row] = buildProgrammazioniPayloads(rows, { kind: 'legacy_template' }, ctx, 1, undefined, resolution.orders)
    assert.equal(row.data_trasmissione, '2024-12-01')
  })

  it('usa MM/GG quando la colonna lo dimostra, anche sulle righe ambigue', () => {
    const rows = [
      { data_trasmissione: '01/13/2024', titolo: 'A' },
      { data_trasmissione: '02/01/2024', titolo: 'B' },
    ]
    const resolution = resolveDateOrders(rows, { kind: 'legacy_template' })
    assert.equal(resolution.orders.data_trasmissione, 'mdy')
    const payloads = buildProgrammazioniPayloads(
      rows,
      { kind: 'legacy_template' },
      ctx,
      1,
      undefined,
      resolution.orders,
    )
    assert.deepEqual(payloads.map((row) => row.data_trasmissione), ['2024-01-13', '2024-02-01'])
  })

  it('se la colonna è ambigua usa GG/MM e prepara un avviso', () => {
    const rows = [
      { data_trasmissione: '01/02/2024', titolo: 'A' },
      { data_trasmissione: '03/04/2024', titolo: 'B' },
    ]
    const resolution = resolveDateOrders(rows, { kind: 'legacy_template' })
    assert.equal(resolution.orders.data_trasmissione, 'dmy')
    assert.equal(resolution.ambiguous.length, 1)
    assert.match(resolution.ambiguous[0].message, /GG\/MM/)
    const payloads = buildProgrammazioniPayloads(
      rows,
      { kind: 'legacy_template' },
      ctx,
      1,
      undefined,
      resolution.orders,
    )
    assert.deepEqual(payloads.map((row) => row.data_trasmissione), ['2024-02-01', '2024-04-03'])
  })

  it('non mette nel payload una data-testo non riconosciuta', () => {
    const unparsed: UnparsedValuesCollector = {}
    const payloads = buildProgrammazioniPayloads(
      [
        { data_trasmissione: 'non-una-data', titolo: 'A' },
        { data_trasmissione: '13/01/2024', titolo: 'B' },
      ],
      { kind: 'legacy_template' },
      ctx,
      1,
      unparsed,
      { data_trasmissione: 'dmy' },
    )
    assert.equal(payloads[0].data_trasmissione, undefined)
    assert.equal(payloads[1].data_trasmissione, '2024-01-13')
    assert.equal(unparsed.data_trasmissione.count, 1)
    assert.deepEqual(unparsed.data_trasmissione.esempi, ['non-una-data'])
  })

  it('indica la riga del file (indice + 2) quando i formati sono in conflitto', () => {
    const resolution = resolveDateOrders(
      [
        { data_trasmissione: '13/01/2024', titolo: 'A' },
        { data_trasmissione: '01/13/2024', titolo: 'B' },
      ],
      { kind: 'legacy_template' },
    )
    assert.equal(resolution.conflicts.length, 1)
    assert.equal(resolution.conflicts[0].column, 'data_trasmissione')
    assert.equal(resolution.conflicts[0].fileRow, 3)
    assert.equal(resolution.conflicts[0].example, '01/13/2024')
  })

  function applyExisting(mapping: Record<string, string>, transforms?: Record<string, string>) {
    return {
      kind: 'apply_existing' as const,
      mapping: {
        version: 1 as const,
        colonne_rilevate: Object.keys(mapping),
        ultimo_upload: null,
        mapping,
        transforms,
      },
    }
  }

  it('apply_existing senza transform: un giorno > 12 fissa GG/MM (PrimaFila)', () => {
    const rows = [
      { 'Data Inizio': '02/01/2018', Titolo: 'A' },
      { 'Data Inizio': '10/02/2018', Titolo: 'B' },
      { 'Data Inizio': '13/01/2018', Titolo: 'C' },
    ]
    const snapshot = applyExisting({ 'Data Inizio': 'data_trasmissione', Titolo: 'titolo' })
    const resolution = resolveDateOrders(rows, snapshot)
    assert.equal(resolution.orders['Data Inizio'], 'dmy')
    assert.equal(resolution.ambiguous.length, 0)
    assert.equal(resolution.conflicts.length, 0)
    const payloads = buildProgrammazioniPayloads(rows, snapshot, ctx, 1, undefined, resolution.orders)
    assert.deepEqual(payloads.map((row) => row.data_trasmissione), [
      '2018-01-02',
      '2018-02-10',
      '2018-01-13',
    ])
  })

  it('apply_existing: data_inizio senza transform e data_fine in eu_date_to_iso (INFINITY)', () => {
    const rows = [
      { data_inizio: '02/01/2024', data_fine: '31/01/2024', titolo: 'A' },
      { data_inizio: '01/04/2024', data_fine: '30/04/2024', titolo: 'B' },
      { data_inizio: '13/01/2024', data_fine: '31/12/2024', titolo: 'C' },
    ]
    const snapshot = applyExisting(
      { data_inizio: 'data_inizio', data_fine: 'data_fine', titolo: 'titolo' },
      { data_fine: 'eu_date_to_iso' },
    )
    const resolution = resolveDateOrders(rows, snapshot)
    assert.equal(resolution.orders.data_inizio, 'dmy')
    assert.equal(resolution.orders.data_fine, undefined)
    assert.equal(resolution.ambiguous.length, 0)
    const payloads = buildProgrammazioniPayloads(rows, snapshot, ctx, 1, undefined, resolution.orders)
    assert.deepEqual(payloads.map((row) => row.data_inizio), ['2024-01-02', '2024-04-01', '2024-01-13'])
    assert.deepEqual(payloads.map((row) => row.data_fine), ['2024-01-31', '2024-04-30', '2024-12-31'])
  })

  it('apply_existing: una colonna tutta ambigua non viene letta come GG/MM', () => {
    const rows = [
      { Data: '1/1/2024', Titolo: 'A' },
      { Data: '4/1/2024', Titolo: 'B' },
      { Data: '7/1/2024', Titolo: 'C' },
      { Data: '10/1/2024', Titolo: 'D' },
    ]
    const snapshot = applyExisting({ Data: 'data_inizio', Titolo: 'titolo' })
    const resolution = resolveDateOrders(rows, snapshot)
    assert.equal(resolution.orders.Data, undefined)
    assert.equal(resolution.conflicts.length, 0)
    assert.equal(resolution.ambiguous.length, 1)
    assert.match(resolution.ambiguous[0].message, /Data EU/)
    assert.match(resolution.ambiguous[0].message, /Data US/)
    assert.match(resolution.ambiguous[0].message, /1\/1\/2024/)
  })
})
