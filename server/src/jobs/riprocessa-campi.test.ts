import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import * as XLSX from 'xlsx'

process.env.SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'

const { buildProgrammazioniPayloads, parseProgrammazioniFile } = await import('./programmazioni-import-core.js')
const { buildRiprocessoRighe } = await import('./riprocessa-campi.js')

function skyFile(): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Data inizio trasmissione', 'Orario inizio trasmissione', 'Titolo trasmissione'],
    [45627, 45627.8125, 'I padroni della cittÃ '],
    [45628, 0.875, 'Gomorra'],
    [45629, null, ''],
  ])
  sheet.A2.z = 'm/d/yy'
  sheet.A3.z = 'm/d/yy'
  sheet.A4.z = 'm/d/yy'
  sheet.B2.z = 'dd/mm/yyyy hh:mm'
  for (const addr of ['A2', 'A3', 'A4', 'B2']) delete sheet[addr].w
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Foglio1')
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

const snapshot = {
  kind: 'apply_existing' as const,
  mapping: {
    version: 1 as const,
    colonne_rilevate: [],
    ultimo_upload: null,
    mapping: {
      'Data inizio trasmissione': 'data_trasmissione',
      'Orario inizio trasmissione': 'ora_inizio',
      'Titolo trasmissione': 'titolo',
    },
  },
}

describe('riprocesso campi: correzione dei dati già caricati dallo stesso file', () => {
  it('ritrova le righe caricate con la lettura precedente e prende i valori dalla lettura nuova', () => {
    const buffer = skyFile()
    const precedenti = parseProgrammazioniFile(buffer, 'SKY.xlsx', { legacyDates: true })
    const nuove = parseProgrammazioniFile(buffer, 'SKY.xlsx')

    // Come era stato caricato: lettura precedente, uid sulla riga letta così.
    const caricate = buildProgrammazioniPayloads(precedenti, snapshot, { campagnaProgrammazioneId: 'cp-1', emittenteId: 'e-1' })

    const righe = buildRiprocessoRighe(nuove, precedenti, snapshot, 'cp-1', 'e-1')
    // La riga senza titolo non era stata caricata e non viene inviata.
    assert.equal(righe.length, 2)
    assert.deepEqual(righe.map((r) => r.import_row_uid), caricate.map((p) => p.import_row_uid))
    assert.deepEqual(righe[0], {
      import_row_uid: caricate[0].import_row_uid,
      data_trasmissione: '2024-12-01',
      ora_inizio: '19:30:00',
      titolo: 'I padroni della città',
    })
    assert.equal(righe[1].ora_inizio, '21:00:00')
  })

  it('non invia date o orari non validi, così non svuota i valori attuali', () => {
    const rows = [{ data: 'dic-24', ora: 'sera', titolo: 'X' }]
    const snap = {
      kind: 'apply_existing' as const,
      mapping: { version: 1 as const, colonne_rilevate: [], ultimo_upload: null, mapping: { data: 'data_trasmissione', ora: 'ora_inizio', titolo: 'titolo' } },
    }
    const [riga] = buildRiprocessoRighe(rows, rows, snap, 'cp-1', 'e-1')
    assert.equal(riga.data_trasmissione, undefined)
    assert.equal(riga.ora_inizio, undefined)
    assert.equal(riga.titolo, 'X')
  })

  it('decide MM/GG sull\'intero file, anche sul blocco che da solo sarebbe ambiguo', () => {
    const rows = [
      { Data: '01/13/2024', Titolo: 'A' },
      { Data: '02/01/2024', Titolo: 'B' },
    ]
    const snap = {
      kind: 'apply_existing' as const,
      mapping: {
        version: 1 as const,
        colonne_rilevate: ['Data', 'Titolo'],
        ultimo_upload: null,
        mapping: { Data: 'data_trasmissione', Titolo: 'titolo' },
      },
    }
    const righe = buildRiprocessoRighe(rows, rows, snap, 'cp-1', 'e-1')
    assert.deepEqual(righe.map((riga) => riga.data_trasmissione), ['2024-01-13', '2024-02-01'])

    const soloAmbigua = buildRiprocessoRighe(
      [rows[1]],
      [rows[1]],
      snap,
      'cp-1',
      'e-1',
      undefined,
      { Data: 'mdy' },
    )
    assert.equal(soloAmbigua[0].data_trasmissione, '2024-02-01')
  })

  it('blocca un file apply_existing con formati in conflitto o date tutte ambigue', () => {
    const snap = {
      kind: 'apply_existing' as const,
      mapping: {
        version: 1 as const,
        colonne_rilevate: ['Data', 'Titolo'],
        ultimo_upload: null,
        mapping: { Data: 'data_trasmissione', Titolo: 'titolo' },
      },
    }
    assert.throws(
      () => buildRiprocessoRighe(
        [
          { Data: '13/01/2024', Titolo: 'A' },
          { Data: '01/13/2024', Titolo: 'B' },
        ],
        [
          { Data: '13/01/2024', Titolo: 'A' },
          { Data: '01/13/2024', Titolo: 'B' },
        ],
        snap,
        'cp-1',
        'e-1',
      ),
      /GG\/MM\/AAAA e MM\/GG\/AAAA/,
    )
    assert.throws(
      () => buildRiprocessoRighe(
        [
          { Data: '1/1/2024', Titolo: 'A' },
          { Data: '4/1/2024', Titolo: 'B' },
          { Data: '7/1/2024', Titolo: 'C' },
          { Data: '10/1/2024', Titolo: 'D' },
        ],
        [
          { Data: '1/1/2024', Titolo: 'A' },
          { Data: '4/1/2024', Titolo: 'B' },
          { Data: '7/1/2024', Titolo: 'C' },
          { Data: '10/1/2024', Titolo: 'D' },
        ],
        snap,
        'cp-1',
        'e-1',
      ),
      /Data EU/,
    )
  })
})
