import {
  MATCHING_SIGNAL_CATALOG,
  extractMatchingSignalFlags,
  formatSignalFlag,
  getActiveMatchingSignalCodes,
  type MatchingSignalCode,
} from './matching-signal-codes'

describe('extractMatchingSignalFlags', () => {
  it('returns all false for empty / null payload', () => {
    expect(extractMatchingSignalFlags(null)).toEqual({
      titolo_debole: false,
      titolo_originale_debole: false,
      anno_scostamento: false,
      anno_fuori_tolleranza: false,
      regia_incoerente: false,
      episodio_mancante: false,
      episodio_da_verificare: false,
    })
    expect(extractMatchingSignalFlags({})).toEqual(extractMatchingSignalFlags(null))
  })

  it('flags weak title and original title by similarity thresholds', () => {
    const flags = extractMatchingSignalFlags({
      titolo: { score: 65 },
      titolo_originale: { score: 55 },
    })
    expect(flags.titolo_debole).toBe(true)
    expect(flags.titolo_originale_debole).toBe(true)
  })

  it('does not flag strong title scores', () => {
    const flags = extractMatchingSignalFlags({
      titolo: { score: 90 },
      titolo_originale: { score: 80 },
    })
    expect(flags.titolo_debole).toBe(false)
    expect(flags.titolo_originale_debole).toBe(false)
  })

  it('distinguishes year drift vs hard scarto', () => {
    expect(extractMatchingSignalFlags({
      anno: { differenza: 2, hard_scarto: false },
    })).toMatchObject({
      anno_scostamento: true,
      anno_fuori_tolleranza: false,
    })
    expect(extractMatchingSignalFlags({
      anno: { differenza: 10, hard_scarto: true },
    })).toMatchObject({
      anno_scostamento: false,
      anno_fuori_tolleranza: true,
    })
  })

  it('flags incoherent directing', () => {
    expect(extractMatchingSignalFlags({
      regia: { penalita: true, score: -5 },
    }).regia_incoerente).toBe(true)
    expect(extractMatchingSignalFlags({
      regia: { score: -1 },
    }).regia_incoerente).toBe(true)
    expect(extractMatchingSignalFlags({
      regia: { score: 8, best_match: 'Nolan' },
    }).regia_incoerente).toBe(false)
  })

  it('flags missing episode from top-level or totale', () => {
    expect(extractMatchingSignalFlags({
      episodio_mancante: true,
    }).episodio_mancante).toBe(true)
    expect(extractMatchingSignalFlags({
      totale: { episodio_mancante: true },
    }).episodio_mancante).toBe(true)
  })

  it('flags episode review from fallback, and broadcaster code from row', () => {
    expect(extractMatchingSignalFlags({
      episode_normalization_fallback: { confidence: 'review_required' },
    }).episodio_da_verificare).toBe(true)

    expect(extractMatchingSignalFlags(
      {},
      { numero_episodio: 301, numero_stagione: null },
    ).episodio_da_verificare).toBe(true)
  })

  it('does not flag broadcaster episode code when already normalized with high confidence', () => {
    expect(extractMatchingSignalFlags({
      episode_normalization_fallback: {
        confidence: 'high',
        numero_stagione: 2,
        numero_episodio: 8,
      },
    }, { numero_episodio: 2008, numero_stagione: null }).episodio_da_verificare).toBe(false)
  })

  it('does not set episodio_da_verificare when episodio_mancante is true', () => {
    const flags = extractMatchingSignalFlags({
      episodio_mancante: true,
      episode_normalization_fallback: { confidence: 'review_required' },
    }, { numero_episodio: 301, numero_stagione: null })
    expect(flags.episodio_mancante).toBe(true)
    expect(flags.episodio_da_verificare).toBe(false)
  })
})

describe('catalog helpers', () => {
  it('exposes stable codes and Italian labels', () => {
    const codes = MATCHING_SIGNAL_CATALOG.map(item => item.code)
    expect(codes).toEqual([
      'titolo_debole',
      'titolo_originale_debole',
      'anno_scostamento',
      'anno_fuori_tolleranza',
      'regia_incoerente',
      'episodio_mancante',
      'episodio_da_verificare',
    ] satisfies MatchingSignalCode[])
    expect(MATCHING_SIGNAL_CATALOG.every(item => item.label.length > 0)).toBe(true)
  })

  it('formats SI/NO and lists active codes', () => {
    expect(formatSignalFlag(true)).toBe('SI')
    expect(formatSignalFlag(false)).toBe('NO')
    expect(getActiveMatchingSignalCodes({
      titolo: { score: 40 },
      regia: { penalita: true },
    })).toEqual(['titolo_debole', 'regia_incoerente'])
  })
})
