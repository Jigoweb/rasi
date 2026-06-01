import { applyMapping, applyMappingWithTransforms, isBlankValue, getRowValue, resolveFieldValue, validateImportRules, type FieldRule } from './import-mapping.service'

describe('applyMapping with title normalization', () => {
  const ctx = { campagnaProgrammazioneId: 'c1', emittenteId: 'e1' }

  it('normalizes ALL CAPS titles', () => {
    const rows = [{ TITOLO: 'BEAUTIFUL XXXIII', TIPO: 'serie' }]
    const mapping = { TITOLO: 'titolo', TIPO: 'tipo' }
    const out = applyMapping(rows, mapping, ctx)
    expect(out[0].titolo).toBe('Beautiful')
  })

  it('strips edition markers', () => {
    const rows = [{ TITOLO: '8 1/2 [ED. 2]', TIPO: 'film' }]
    const out = applyMapping(rows, { TITOLO: 'titolo', TIPO: 'tipo' }, ctx)
    expect(out[0].titolo).toBe('8 1/2')
  })

  it('normalizes titolo_originale and titolo_episodio', () => {
    // Note: Task 0.1 toTitleCase keeps English function words ("of", "the")
    // lowercase, consistent with title-normalize.test.ts. The Task 0.2 plan's
    // verbatim expectation ("House Of The Dragon") was authored before that
    // design decision; we adjust the test expectation to match the established
    // normalizeTitle behavior rather than break the existing Task 0.1 suite.
    const rows = [{
      T: 'HOUSE OF THE DRAGON S.02',
      TO: 'HOUSE OF THE DRAGON',
      TE: 'RHAENYRA LA CRUDELE',
      TIPO: 'serie',
    }]
    const mapping = {
      T: 'titolo',
      TO: 'titolo_originale',
      TE: 'titolo_episodio',
      TIPO: 'tipo',
    }
    const out = applyMapping(rows, mapping, ctx)
    expect(out[0].titolo).toBe('House of the Dragon')
    expect(out[0].titolo_originale).toBe('House of the Dragon')
    expect(out[0].titolo_episodio).toBe('Rhaenyra La Crudele')
  })

  it('drops rows without a title even after normalization', () => {
    const rows = [{ TITOLO: '', TIPO: 'film' }, { TITOLO: 'Valid', TIPO: 'film' }]
    const out = applyMapping(rows, { TITOLO: 'titolo', TIPO: 'tipo' }, ctx)
    expect(out).toHaveLength(1)
    expect(out[0].titolo).toBe('Valid')
  })
})

describe('applyMappingWithTransforms', () => {
  const ctx = { campagnaProgrammazioneId: 'c1', emittenteId: 'e1' }

  it('applies transform before coerce', () => {
    const rows = [{ DURATA: '00:21:56', TITOLO: 'Foo' }]
    const config = {
      fields: { TITOLO: 'titolo', DURATA: 'durata_minuti' },
      transforms: { DURATA: 'hhmmss_to_minutes' as const },
    }
    const out = applyMappingWithTransforms(rows, config, ctx)
    expect(out[0].durata_minuti).toBe(22)
  })

  it('applies LA7 fractional_hours_to_minutes', () => {
    const rows = [{ DURATA: 0.454, TITOLO: 'Foo' }]
    const config = {
      fields: { TITOLO: 'titolo', DURATA: 'durata_minuti' },
      transforms: { DURATA: 'fractional_hours_to_minutes' as const },
    }
    const out = applyMappingWithTransforms(rows, config, ctx)
    expect(out[0].durata_minuti).toBe(27)
  })

  it('preserves episode numbers in titolo_episodio (strict normalizer)', () => {
    // The loose normalizer would strip the trailing "26" (DIGIT_TRAIL) and
    // destroy the episode title; episode fields must use normalizeTitleStrict.
    const rows = [{ NOME_SERIE: 'CENTOVETRINE', TE: 'Episodio 26' }]
    const config = {
      fields: { NOME_SERIE: 'titolo', TE: 'titolo_episodio' },
      transforms: {},
    }
    const out = applyMappingWithTransforms(rows, config, ctx)
    expect(out[0].titolo).toBe('Centovetrine')
    expect(out[0].titolo_episodio).toBe('Episodio 26')
  })
})

describe('isBlankValue', () => {
  it('treats null/undefined/empty as blank', () => {
    expect(isBlankValue(null)).toBe(true)
    expect(isBlankValue(undefined)).toBe(true)
    expect(isBlankValue('')).toBe(true)
    expect(isBlankValue('   ')).toBe(true)
  })
  it('treats N.D. / N/A sentinels as blank (case/space insensitive)', () => {
    expect(isBlankValue('N.D.')).toBe(true)
    expect(isBlankValue(' n.d ')).toBe(true)
    expect(isBlankValue('N/A')).toBe(true)
    expect(isBlankValue('na')).toBe(true)
  })
  it('treats real values as non-blank', () => {
    expect(isBlankValue('Centovetrine')).toBe(false)
    expect(isBlankValue(0)).toBe(false)
    expect(isBlankValue('0')).toBe(false)
  })
})

describe('getRowValue', () => {
  it('reads exact, trimmed, and normalized-key variants', () => {
    expect(getRowValue({ NOME_SERIE: 'X' }, 'NOME_SERIE')).toBe('X')
    expect(getRowValue({ NOME_SERIE: 'X' }, ' NOME_SERIE ')).toBe('X')
    expect(getRowValue({ nome_serie: 'X' }, 'NOME_SERIE')).toBe('X')
  })
  it('returns undefined for a column not present in the row', () => {
    expect(getRowValue({}, 'NOME_SERIE')).toBeUndefined()
  })
})

describe('resolveFieldValue', () => {
  it('returns the first non-blank source (coalesce priority)', () => {
    const rule: FieldRule = { sources: ['NOME_SERIE', 'TITOLO'] }
    expect(resolveFieldValue({ NOME_SERIE: 'Centovetrine', TITOLO: 'Ep 1' }, rule)).toBe('Centovetrine')
    expect(resolveFieldValue({ NOME_SERIE: 'N.D.', TITOLO: 'Barbarian' }, rule)).toBe('Barbarian')
    expect(resolveFieldValue({ NOME_SERIE: '', TITOLO: '' }, rule)).toBeUndefined()
  })
  it('honors onlyIfPresent guard', () => {
    const rule: FieldRule = { sources: ['TITOLO'], onlyIfPresent: 'NOME_SERIE' }
    // guard present -> use TITOLO as episode title
    expect(resolveFieldValue({ NOME_SERIE: 'Centovetrine', TITOLO: 'Episodio 26' }, rule)).toBe('Episodio 26')
    // guard blank (film row) -> field stays empty
    expect(resolveFieldValue({ NOME_SERIE: 'N.D.', TITOLO: 'Barbarian' }, rule)).toBeUndefined()
  })
  it('returns undefined when sources is empty', () => {
    expect(resolveFieldValue({ NOME_SERIE: 'X' }, { sources: [] })).toBeUndefined()
  })
  it('returns undefined when the onlyIfPresent column is missing from the row', () => {
    const rule: FieldRule = { sources: ['TITOLO'], onlyIfPresent: 'NOME_SERIE' }
    expect(resolveFieldValue({ TITOLO: 'Barbarian' }, rule)).toBeUndefined()
  })
})

describe('applyMapping with rules (mixed film + series)', () => {
  const ctx = { campagnaProgrammazioneId: 'c1', emittenteId: 'e1' }
  const mapping = { NUMERO_STAGIONE: 'numero_stagione', NUMERO_EPISODIO: 'numero_episodio' }
  const rules = {
    titolo: { sources: ['NOME_SERIE', 'TITOLO'] },
    titolo_originale: { sources: ['NOME_SERIE', 'TITOLO_ORIGINALE'] },
    titolo_episodio: { sources: ['TITOLO'], onlyIfPresent: 'NOME_SERIE' },
    titolo_episodio_originale: { sources: ['TITOLO_ORIGINALE'], onlyIfPresent: 'NOME_SERIE' },
  }

  it('routes a series row: serie madre → titolo, episode → titolo_episodio', () => {
    const rows = [{
      NOME_SERIE: 'CENTOVETRINE', TITOLO: 'Episodio 26', TITOLO_ORIGINALE: 'Episodio 26',
      NUMERO_STAGIONE: '1', NUMERO_EPISODIO: '26',
    }]
    const out = applyMapping(rows, mapping, ctx, rules)
    expect(out[0].titolo).toBe('Centovetrine')
    expect(out[0].titolo_episodio).toBe('Episodio 26')
    expect(out[0].numero_stagione).toBe(1)
    expect(out[0].numero_episodio).toBe(26)
  })

  it('routes a film row: TITOLO → titolo, no episode title', () => {
    const rows = [{
      NOME_SERIE: 'N.D.', TITOLO: 'Barbarian', TITOLO_ORIGINALE: 'Barbarian',
      NUMERO_STAGIONE: 'N.D.', NUMERO_EPISODIO: 'N.D.',
    }]
    const out = applyMapping(rows, mapping, ctx, rules)
    expect(out[0].titolo).toBe('Barbarian')
    expect(out[0].titolo_episodio).toBeUndefined()
    expect(out[0].numero_stagione).toBeUndefined()
  })

  it('is a no-op when rules is omitted (backward compat)', () => {
    const rows = [{ TITOLO: 'BEAUTIFUL XXXIII', TIPO: 'serie' }]
    const out = applyMapping(rows, { TITOLO: 'titolo', TIPO: 'tipo' }, ctx)
    expect(out[0].titolo).toBe('Beautiful')
  })

  it('rule wins over a plain mapping entry for the same field', () => {
    const rows = [{ NOME_SERIE: 'CENTOVETRINE', TITOLO: 'Ep 1' }]
    const out = applyMapping(
      rows,
      { TITOLO: 'titolo' },                       // plain 1:1 alone would give "Ep 1"
      ctx,
      { titolo: { sources: ['NOME_SERIE'] } },    // rule must win → "Centovetrine"
    )
    expect(out[0].titolo).toBe('Centovetrine')
  })
})

describe('validateImportRules', () => {
  const columns = ['NOME_SERIE', 'TITOLO', 'TITOLO_ORIGINALE']

  it('passes a valid rule set', () => {
    const rules = {
      titolo: { sources: ['NOME_SERIE', 'TITOLO'] },
      titolo_episodio: { sources: ['TITOLO'], onlyIfPresent: 'NOME_SERIE' },
    }
    expect(validateImportRules(rules, columns)).toEqual([])
  })
  it('flags empty sources', () => {
    const errs = validateImportRules({ titolo: { sources: [] } }, columns)
    expect(errs.some(e => e.includes('titolo'))).toBe(true)
  })
  it('flags unknown source / guard columns', () => {
    const errs = validateImportRules(
      { titolo: { sources: ['NOPE'], onlyIfPresent: 'ALSO_NOPE' } },
      columns,
    )
    expect(errs.length).toBeGreaterThanOrEqual(2)
  })
})
