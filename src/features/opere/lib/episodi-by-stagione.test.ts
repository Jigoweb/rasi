import {
  groupEpisodiByStagione,
  formatStagioneHeader,
  stagioneKey,
} from './episodi-by-stagione'

describe('stagioneKey', () => {
  it('mappa null/undefined a none', () => {
    expect(stagioneKey(null)).toBe('none')
    expect(stagioneKey(undefined)).toBe('none')
    expect(stagioneKey(2)).toBe(2)
  })
})

describe('groupEpisodiByStagione', () => {
  it('raggruppa, ordina stagioni e episodi, mette null in coda', () => {
    const groups = groupEpisodiByStagione([
      { id: 'c', numero_stagione: 2, numero_episodio: 1 },
      { id: 'a', numero_stagione: 1, numero_episodio: 2 },
      { id: 'z', numero_stagione: null, numero_episodio: 1 },
      { id: 'b', numero_stagione: 1, numero_episodio: 1 },
    ])
    expect(groups.map((g) => g.key)).toEqual([1, 2, 'none'])
    expect(groups[0]).toMatchObject({ stagione: 1, count: 2 })
    expect(groups[0].episodi.map((e) => e.id)).toEqual(['b', 'a'])
    expect(groups[2]).toMatchObject({ key: 'none', stagione: null, count: 1 })
  })

  it('lista vuota → []', () => {
    expect(groupEpisodiByStagione([])).toEqual([])
  })
})

describe('formatStagioneHeader', () => {
  it('plurale italiano e senza stagione', () => {
    expect(formatStagioneHeader(1, 1)).toBe('Stagione 1 · 1 episodio')
    expect(formatStagioneHeader(1, 12)).toBe('Stagione 1 · 12 episodi')
    expect(formatStagioneHeader(null, 3)).toBe('Senza stagione · 3 episodi')
  })
})
