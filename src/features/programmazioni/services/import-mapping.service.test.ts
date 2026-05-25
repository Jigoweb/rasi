import { applyMapping } from './import-mapping.service'

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
