import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import * as XLSX from 'xlsx'
import {
  buildProgrammazioniPayloads,
  parseProgrammazioniFile,
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
    assert.equal(film.regia, 'YasujirÅ\u008d Ozu')
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
    const parsed = parseProgrammazioniFile(buffer, 'PLEX AVOD 2024.xlsx')
    assert.equal(parsed[0]['Timestamp Month'], '2024-12')
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
