import {
  applyEpisodeNormalizationToPayload,
  normalizeEpisodeSignals,
} from './episode-normalization'

describe('normalizeEpisodeSignals', () => {
  it('extracts Netflix packed season/episode and quoted episode title', () => {
    const result = normalizeEpisodeSignals({
      titolo: 'Stranger Things 3',
      titolo_originale: 'Stranger Things',
      numero_episodio: 3005,
      titolo_episodio_originale: 'Stranger Things 3: "chapter Five: the Flayed"',
    })

    expect(result).toMatchObject({
      season: 3,
      episode: 5,
      episodeTitle: 'Chapter Five: The Flayed',
      confidence: 'high',
    })
    expect(result.strategies).toEqual(expect.arrayContaining([
      'packed_episode_number',
      'quoted_episode_title',
    ]))
  })

  it.each([
    ['S03E05'],
    ['S3 E5'],
    ['3x05'],
    ['Season 3 Episode 5'],
    ['Stagione 3 Episodio 5'],
  ])('extracts season and episode from %s', value => {
    expect(normalizeEpisodeSignals({ titolo_episodio_originale: value })).toMatchObject({
      season: 3,
      episode: 5,
      confidence: 'high',
    })
  })

  it('keeps absolute episode numbers as medium-confidence when season is absent', () => {
    const result = normalizeEpisodeSignals({ titolo_episodio_originale: 'Episode 57' })

    expect(result).toMatchObject({
      season: null,
      episode: 57,
      confidence: 'medium',
    })
    expect(result.strategies).toContain('absolute_episode_number')
  })

  it('marks ranges as review-required without auto-normalizing episode values', () => {
    const result = normalizeEpisodeSignals({ titolo_episodio_originale: 'Episodes 1-2' })

    expect(result).toMatchObject({
      season: null,
      episode: null,
      confidence: 'review_required',
    })
    expect(result.warnings).toContain('episode_range_requires_review')
  })

  it('does not degrade values that are already correctly formatted', () => {
    const result = normalizeEpisodeSignals({
      numero_stagione: 3,
      numero_episodio: 5,
      titolo_episodio: 'Chapter Five: The Flayed',
    })

    expect(result).toMatchObject({
      season: 3,
      episode: 5,
      episodeTitle: 'Chapter Five: The Flayed',
      confidence: 'high',
    })
    expect(result.strategies).toEqual(expect.arrayContaining([
      'existing_season',
      'existing_episode',
      'existing_episode_title',
    ]))
  })

  it('marks season mismatches as review-required', () => {
    const result = normalizeEpisodeSignals({
      titolo: 'Stranger Things 2',
      titolo_originale: 'Stranger Things',
      numero_episodio: 3005,
    })

    expect(result).toMatchObject({
      season: 3,
      episode: 5,
      confidence: 'review_required',
    })
    expect(result.warnings).toContain('episode_season_mismatch')
  })
})

describe('applyEpisodeNormalizationToPayload', () => {
  it('fills canonical fields and stores provenance metadata for high-confidence signals', () => {
    const payload = applyEpisodeNormalizationToPayload({
      titolo: 'Stranger Things 3',
      titolo_originale: 'Stranger Things',
      numero_episodio: 3005,
      titolo_episodio_originale: 'Stranger Things 3: "chapter Five: the Flayed"',
    })

    expect(payload).toMatchObject({
      numero_stagione: 3,
      numero_episodio: 5,
      titolo_episodio: 'Chapter Five: The Flayed',
      titolo_episodio_originale: 'Stranger Things 3: "chapter Five: the Flayed"',
      metadati_trasmissione: {
        episode_normalization: expect.objectContaining({
          season: 3,
          episode: 5,
          episodeTitle: 'Chapter Five: The Flayed',
          confidence: 'high',
        }),
      },
    })
  })
})
