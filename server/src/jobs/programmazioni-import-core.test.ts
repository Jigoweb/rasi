import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildProgrammazioniPayloads } from './programmazioni-import-core.js'

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
