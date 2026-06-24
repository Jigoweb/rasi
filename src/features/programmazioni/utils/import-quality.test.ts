import {
  assessProgrammazioneImportQuality,
  summarizeImportQuality,
  type ImportQualityWarningCode,
} from './import-quality'

describe('assessProgrammazioneImportQuality', () => {
  function codes(row: Record<string, unknown>): ImportQualityWarningCode[] {
    return assessProgrammazioneImportQuality(row).warnings.map(warning => warning.code)
  }

  it('flags out-of-range years without treating valid years as suspicious', () => {
    expect(codes({ titolo: 'X-Men: The Last Stand', anno: 3000 }))
      .toContain('year_out_of_range')
    expect(codes({ titolo: 'L odore della notte', anno: 1998 }))
      .not.toContain('year_out_of_range')
  })

  it('flags placeholder and out-of-scale durations from real broadcaster samples', () => {
    expect(codes({ titolo: 'PETER PAN', durata_minuti: 1 }))
      .toContain('duration_placeholder')
    expect(codes({ titolo: 'Yellowstone', durata_minuti: 2804 }))
      .toContain('duration_out_of_scale')
    expect(codes({ titolo: 'The final destination', durata_minuti: 38828 }))
      .toContain('duration_out_of_scale')
    expect(codes({ titolo: 'Hacks', durata_minuti: 34 }))
      .not.toContain('duration_out_of_scale')
  })

  it('flags mojibake in title-like fields and regia', () => {
    expect(codes({ titolo: 'Hacks', regia: 'Trent Oâ€™Donnell' }))
      .toContain('mojibake_suspected')
    expect(codes({ titolo: 'Shark Tank', regia: 'Jorge RÃ­os' }))
      .toContain('mojibake_suspected')
    expect(codes({ titolo: 'Hacks', regia: 'Trent O’Donnell' }))
      .not.toContain('mojibake_suspected')
  })

  it('flags non-canonical content types but accepts common canonical aliases', () => {
    expect(codes({ titolo: 'I Puffi', tipo: 'CAR' }))
      .toContain('type_non_canonical')
    expect(codes({ titolo: 'The Art of Skiing', tipo: 'short-form' }))
      .toContain('type_non_canonical')
    expect(codes({ titolo: 'Him', tipo: 'film' }))
      .not.toContain('type_non_canonical')
    expect(codes({ titolo: 'Hacks', tipo: 'series' }))
      .not.toContain('type_non_canonical')
  })

  it('flags administrative or non-work rows before matching', () => {
    expect(codes({ titolo: 'Anica Luglio', tipo: 'Film' }))
      .toContain('non_work_row_suspected')
    expect(codes({ titolo: '101ST STREET ENTERTAINMENT - DAVIS ENTERTAINMENT - PERFECT STORM ENTERTAINMENT' }))
      .toContain('non_work_row_suspected')
    expect(codes({ titolo: 'Una Bionda In Carriera', tipo: 'Film' }))
      .not.toContain('non_work_row_suspected')
  })

  it('returns stable warning details for UI and worker parity', () => {
    const assessment = assessProgrammazioneImportQuality({
      titolo: 'Anica Luglio',
      tipo: 'short-form',
      anno: 3000,
      durata_minuti: 1,
      regia: 'Jorge RÃ­os',
    })

    expect(assessment.warnings).toEqual([
      expect.objectContaining({ code: 'year_out_of_range', field: 'anno' }),
      expect.objectContaining({ code: 'duration_placeholder', field: 'durata_minuti' }),
      expect.objectContaining({ code: 'mojibake_suspected', field: 'regia' }),
      expect.objectContaining({ code: 'type_non_canonical', field: 'tipo' }),
      expect.objectContaining({ code: 'non_work_row_suspected', field: 'titolo' }),
    ])
  })

  it('flags non-blocking episode normalization signals', () => {
    expect(codes({
      titolo: 'Stranger Things 3',
      titolo_originale: 'Stranger Things',
      numero_episodio: 3005,
      titolo_episodio_originale: 'Stranger Things 3: "chapter Five: the Flayed"',
    })).toEqual(expect.arrayContaining([
      'episode_packed_number_detected',
      'episode_title_embedded_detected',
    ]))

    expect(codes({ titolo_episodio_originale: 'Episodes 1-2' }))
      .toContain('episode_range_requires_review')

    expect(codes({
      titolo: 'Stranger Things 2',
      titolo_originale: 'Stranger Things',
      numero_episodio: 3005,
    })).toContain('episode_season_mismatch')
  })
})

describe('summarizeImportQuality', () => {
  it('aggregates warning counts and row totals', () => {
    const summary = summarizeImportQuality([
      { titolo: 'X-Men: The Last Stand', anno: 3000 },
      { titolo: 'PETER PAN', durata_minuti: 1 },
      { titolo: 'Hacks', durata_minuti: 34 },
    ])

    expect(summary.totalRows).toBe(3)
    expect(summary.version).toBe(1)
    expect(summary.rowsWithWarnings).toBe(2)
    expect(summary.warningCounts).toEqual({
      year_out_of_range: 1,
      duration_placeholder: 1,
    })
  })

  it('aggregates episode warning counts', () => {
    const summary = summarizeImportQuality([
      {
        titolo: 'Stranger Things 3',
        titolo_originale: 'Stranger Things',
        numero_episodio: 3005,
        titolo_episodio_originale: 'Stranger Things 3: "chapter Five: the Flayed"',
      },
      { titolo_episodio_originale: 'Episodes 1-2' },
    ])

    expect(summary.rowsWithWarnings).toBe(2)
    expect(summary.warningCounts).toMatchObject({
      episode_packed_number_detected: 1,
      episode_title_embedded_detected: 1,
      episode_range_requires_review: 1,
    })
  })
})
