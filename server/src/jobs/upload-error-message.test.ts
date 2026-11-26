import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { humanizeUploadError } from './upload-error-message.js'

const range = { fileRowStart: 2502, fileRowEnd: 3001 }

describe('humanizeUploadError', () => {
  it('traduce i codici Postgres delle date e dei vincoli, con le righe e il testo originale', () => {
    const cases: Array<[string, string]> = [
      ['22008', 'Data o orario fuori intervallo'],
      ['22007', 'Formato di data o orario non valido'],
      ['22P02', 'Valore non valido per il tipo della colonna'],
      ['23502', 'Manca un valore obbligatorio'],
      ['57014', 'Tempo massimo di caricamento superato'],
    ]
    for (const [code, italian] of cases) {
      const message = humanizeUploadError(
        { code, message: `original ${code}` },
        range,
      )
      assert.match(message, new RegExp(italian))
      assert.match(message, /righe 2502–3001 del file/)
      assert.match(message, new RegExp(`\\(original ${code}\\)`))
    }
  })

  it('lascia invariato un errore senza codice noto', () => {
    assert.equal(humanizeUploadError(new Error('download file: file missing'), range), 'download file: file missing')
  })
})
