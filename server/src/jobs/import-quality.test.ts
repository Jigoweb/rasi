import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  assessProgrammazioneImportQuality,
  summarizeImportQuality,
} from './import-quality.js'

describe('worker import quality report', () => {
  it('flags real audit samples', () => {
    const summary = summarizeImportQuality([
      { titolo: 'X-Men: The Last Stand', anno: 3000 },
      { titolo: 'PETER PAN', durata_minuti: 1 },
      { titolo: 'Yellowstone', durata_minuti: 2804 },
      { titolo: 'Hacks', regia: 'Trent Oâ€™Donnell' },
      { titolo: 'Anica Luglio', tipo: 'Film' },
    ])

    assert.equal(summary.version, 1)
    assert.equal(summary.totalRows, 5)
    assert.equal(summary.rowsWithWarnings, 5)
    assert.deepEqual(summary.warningCounts, {
      year_out_of_range: 1,
      duration_placeholder: 1,
      duration_out_of_scale: 1,
      mojibake_suspected: 1,
      non_work_row_suspected: 1,
    })
  })

  it('keeps clean rows warning-free', () => {
    const assessment = assessProgrammazioneImportQuality({
      titolo: 'Hacks',
      tipo: 'series',
      anno: 2022,
      durata_minuti: 34,
      regia: 'Trent O’Donnell',
    })

    assert.deepEqual(assessment.warnings, [])
  })
})
