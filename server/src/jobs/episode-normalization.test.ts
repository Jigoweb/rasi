import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  applyEpisodeNormalizationToPayload,
  normalizeEpisodeSignals,
} from './episode-normalization.js'

describe('worker episode normalization', () => {
  it('extracts Netflix packed season/episode and quoted episode title', () => {
    const result = normalizeEpisodeSignals({
      titolo: 'Stranger Things 3',
      titolo_originale: 'Stranger Things',
      numero_episodio: 3005,
      titolo_episodio_originale: 'Stranger Things 3: "chapter Five: the Flayed"',
    })

    assert.equal(result.season, 3)
    assert.equal(result.episode, 5)
    assert.equal(result.episodeTitle, 'Chapter Five: The Flayed')
    assert.equal(result.confidence, 'high')
    assert.ok(result.strategies.includes('packed_episode_number'))
    assert.ok(result.strategies.includes('quoted_episode_title'))
  })

  for (const value of ['S03E05', 'S3 E5', '3x05', 'Season 3 Episode 5', 'Stagione 3 Episodio 5']) {
    it(`extracts season and episode from ${value}`, () => {
      const result = normalizeEpisodeSignals({ titolo_episodio_originale: value })
      assert.equal(result.season, 3)
      assert.equal(result.episode, 5)
      assert.equal(result.confidence, 'high')
    })
  }

  it('keeps absolute episode numbers as medium-confidence when season is absent', () => {
    const result = normalizeEpisodeSignals({ titolo_episodio_originale: 'Episode 57' })
    assert.equal(result.season, null)
    assert.equal(result.episode, 57)
    assert.equal(result.confidence, 'medium')
    assert.ok(result.strategies.includes('absolute_episode_number'))
  })

  it('marks ranges as review-required without auto-normalizing episode values', () => {
    const result = normalizeEpisodeSignals({ titolo_episodio_originale: 'Episodes 1-2' })
    assert.equal(result.season, null)
    assert.equal(result.episode, null)
    assert.equal(result.confidence, 'review_required')
    assert.ok(result.warnings.includes('episode_range_requires_review'))
  })

  it('does not degrade values that are already correctly formatted', () => {
    const result = normalizeEpisodeSignals({
      numero_stagione: 3,
      numero_episodio: 5,
      titolo_episodio: 'Chapter Five: The Flayed',
    })

    assert.equal(result.season, 3)
    assert.equal(result.episode, 5)
    assert.equal(result.episodeTitle, 'Chapter Five: The Flayed')
    assert.equal(result.confidence, 'high')
    assert.ok(result.strategies.includes('existing_season'))
    assert.ok(result.strategies.includes('existing_episode'))
  })

  for (const code of [16366, 13259, 1226]) {
    it(`marks non-canonical broadcaster episode code ${code} as review-required`, () => {
      const result = normalizeEpisodeSignals({
        titolo: 'Bleach: The Lost Agent',
        titolo_originale: 'Bleach',
        numero_episodio: code,
        titolo_episodio_originale: 'Bleach: The Lost Agent: "Changing History, Unchanging Heart"',
      })

      assert.equal(result.season, null)
      assert.equal(result.episode, null)
      assert.equal(result.episodeTitle, 'Changing History, Unchanging Heart')
      assert.equal(result.confidence, 'review_required')
      assert.ok(result.warnings.includes('episode_compound_number_requires_review'))
      assert.equal(result.strategies.includes('existing_episode'), false)
    })
  }

  it('fills canonical fields and stores provenance metadata for high-confidence signals', () => {
    const payload = applyEpisodeNormalizationToPayload({
      titolo: 'Stranger Things 3',
      titolo_originale: 'Stranger Things',
      numero_episodio: 3005,
      titolo_episodio_originale: 'Stranger Things 3: "chapter Five: the Flayed"',
    })

    assert.equal(payload.numero_stagione, 3)
    assert.equal(payload.numero_episodio, 5)
    assert.equal(payload.titolo_episodio, 'Chapter Five: The Flayed')
    assert.deepEqual(
      (payload.metadati_trasmissione as Record<string, unknown>).episode_normalization,
      {
        season: 3,
        episode: 5,
        episodeTitle: 'Chapter Five: The Flayed',
        confidence: 'high',
        strategies: ['packed_episode_number', 'quoted_episode_title'],
        warnings: ['episode_packed_number_detected', 'episode_title_embedded_detected'],
        sourceFields: ['numero_episodio', 'titolo_episodio_originale'],
        original: {
          numero_stagione: undefined,
          numero_episodio: 3005,
          titolo_episodio: undefined,
          titolo_episodio_originale: 'Stranger Things 3: "chapter Five: the Flayed"',
          titolo: 'Stranger Things 3',
          titolo_originale: 'Stranger Things',
        },
      }
    )
  })

  it('does not apply non-canonical broadcaster episode codes to canonical fields', () => {
    const payload = applyEpisodeNormalizationToPayload({
      titolo: 'Bleach: The Lost Agent',
      titolo_originale: 'Bleach',
      numero_episodio: 16366,
      titolo_episodio_originale: 'Bleach: The Lost Agent: "Changing History, Unchanging Heart"',
    })

    assert.equal(payload.numero_stagione, undefined)
    assert.equal(payload.numero_episodio, 16366)
    assert.equal(payload.titolo_episodio, undefined)
    const normalization = (payload.metadati_trasmissione as Record<string, unknown>).episode_normalization as Record<string, unknown>
    assert.equal(normalization.confidence, 'review_required')
    assert.deepEqual(normalization.warnings, [
      'episode_compound_number_requires_review',
      'episode_title_embedded_detected',
    ])
  })
})
