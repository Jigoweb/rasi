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

  it('flags and aggregates non-blocking episode normalization signals', () => {
    const summary = summarizeImportQuality([
      {
        titolo: 'Stranger Things 3',
        titolo_originale: 'Stranger Things',
        numero_episodio: 3005,
        titolo_episodio_originale: 'Stranger Things 3: "chapter Five: the Flayed"',
      },
      { titolo_episodio_originale: 'Episodes 1-2' },
      {
        titolo: 'Stranger Things 2',
        titolo_originale: 'Stranger Things',
        numero_episodio: 3005,
      },
      {
        titolo: 'Bleach: The Lost Agent',
        titolo_originale: 'Bleach',
        numero_episodio: 16366,
        titolo_episodio_originale: 'Bleach: The Lost Agent: "Changing History, Unchanging Heart"',
      },
    ])

    assert.equal(summary.rowsWithWarnings, 4)
    assert.equal(summary.warningCounts.episode_packed_number_detected, 2)
    assert.equal(summary.warningCounts.episode_title_embedded_detected, 2)
    assert.equal(summary.warningCounts.episode_range_requires_review, 1)
    assert.equal(summary.warningCounts.episode_season_mismatch, 1)
    assert.equal(summary.warningCounts.episode_compound_number_requires_review, 1)
  })
})
