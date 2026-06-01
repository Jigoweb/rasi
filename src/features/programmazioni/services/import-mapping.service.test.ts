import { applyMapping, applyMappingWithTransforms, isBlankValue, getRowValue } from './import-mapping.service'

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
