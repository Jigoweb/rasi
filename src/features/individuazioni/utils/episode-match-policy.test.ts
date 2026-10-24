import {
  detectCollapsedWorksByTitleYear,
  matchEpisodeCurrent,
  matchEpisodeProposed,
  normalizeWorkTitleForCollapse,
  type CatalogEpisode,
} from './episode-match-policy'

const FRINGE: CatalogEpisode[] = [
  { id: 'fringe-s2e2', numeroStagione: 2, numeroEpisodio: 2, artistaIds: ['cast-s2e2'] },
]

const HAWAII: CatalogEpisode[] = [
  { id: 'h50-s2e3', numeroStagione: 2, numeroEpisodio: 3, artistaIds: ['cast-s2e3'] },
  { id: 'h50-s2e4', numeroStagione: 2, numeroEpisodio: 4, artistaIds: ['cast-s2e4'] },
  { id: 'h50-s2e5', numeroStagione: 2, numeroEpisodio: 5, artistaIds: ['cast-s2e5'] },
  { id: 'h50-s2e23', numeroStagione: 2, numeroEpisodio: 23, artistaIds: ['cast-s2e23'] },
  { id: 'h50-s1e1', numeroStagione: 1, numeroEpisodio: 1, artistaIds: ['cast-s1e1'] },
  { id: 'h50-s1e10', numeroStagione: 1, numeroEpisodio: 10, artistaIds: ['cast-s1e10'] },
]

const YELLOWSTONE: CatalogEpisode[] = [
  { id: 'ys-s3e1', numeroStagione: 3, numeroEpisodio: 1, artistaIds: ['nouri'] },
  { id: 'ys-s3e2', numeroStagione: 3, numeroEpisodio: 2, artistaIds: ['nouri'] },
  { id: 'ys-s3e4', numeroStagione: 3, numeroEpisodio: 4, artistaIds: ['nouri'] },
  { id: 'ys-s2e3', numeroStagione: 2, numeroEpisodio: 3, artistaIds: ['thermes'] },
  { id: 'ys-s1e5', numeroStagione: 1, numeroEpisodio: 5, artistaIds: ['thermes'] },
]

describe('FRINGE — solo S2E2 in catalogo', () => {
  it('policy attuale attribuisce E2 di altre stagioni all’unico episodio catalogo', () => {
    const s1e2 = matchEpisodeCurrent(
      { numeroStagione: 1, numeroEpisodio: 2 },
      FRINGE,
    )
    expect(s1e2.kind).toBe('ep_only')
    expect(s1e2.episodioId).toBe('fringe-s2e2')
    expect(s1e2.artistaIds).toEqual(['cast-s2e2'])
    expect(s1e2.catalogStagione).toBe(2)
  })

  it('policy proposta non individua E2 se la stagione palinsesto non è in catalogo', () => {
    const s1e2 = matchEpisodeProposed(
      { numeroStagione: 1, numeroEpisodio: 2 },
      FRINGE,
    )
    expect(s1e2.kind).toBe('missing')
    expect(s1e2.artistaIds).toEqual([])
  })

  it('entrambe le policy matchano S2E2 esatto', () => {
    const prog = { numeroStagione: 2, numeroEpisodio: 2 }
    expect(matchEpisodeCurrent(prog, FRINGE).kind).toBe('exact_se')
    expect(matchEpisodeProposed(prog, FRINGE).kind).toBe('exact_se')
  })
})

describe('HAWAII FIVE-0 — S2 solo E3/4/5/23', () => {
  it('policy attuale individua S2E1 e S2E10 via ep-only su altre stagioni', () => {
    const e1 = matchEpisodeCurrent({ numeroStagione: 2, numeroEpisodio: 1 }, HAWAII)
    const e10 = matchEpisodeCurrent({ numeroStagione: 2, numeroEpisodio: 10 }, HAWAII)
    expect(e1.kind).toBe('ep_only')
    expect(e1.episodioId).toBe('h50-s1e1')
    expect(e10.kind).toBe('ep_only')
    expect(e10.episodioId).toBe('h50-s1e10')
  })

  it('policy proposta lascia S2E1 e S2E10 come episodio mancante', () => {
    const e1 = matchEpisodeProposed({ numeroStagione: 2, numeroEpisodio: 1 }, HAWAII)
    const e10 = matchEpisodeProposed({ numeroStagione: 2, numeroEpisodio: 10 }, HAWAII)
    expect(e1.kind).toBe('missing')
    expect(e1.artistaIds).toEqual([])
    expect(e10.kind).toBe('missing')
  })

  it('entrambe le policy confermano S2E3/4/5', () => {
    for (const ep of [3, 4, 5]) {
      const prog = { numeroStagione: 2, numeroEpisodio: ep }
      expect(matchEpisodeCurrent(prog, HAWAII).kind).toBe('exact_se')
      expect(matchEpisodeProposed(prog, HAWAII).kind).toBe('exact_se')
    }
  })
})

describe('YELLOWSTONE — S3 solo E1/2/4 con Nouri', () => {
  it('policy attuale attribuisce Thermes a S3E3 via ep-only su altra stagione', () => {
    const result = matchEpisodeCurrent(
      { numeroStagione: 3, numeroEpisodio: 3 },
      YELLOWSTONE,
      ['thermes', 'nouri'],
    )
    expect(result.kind).toBe('ep_only')
    expect(result.artistaIds).toContain('thermes')
  })

  it('policy attuale, senza E3 in nessuna stagione, attribuisce il cast distinto di serie', () => {
    const catalogSenzaE3 = YELLOWSTONE.filter(ep => ep.numeroEpisodio !== 3)
    const result = matchEpisodeCurrent(
      { numeroStagione: 3, numeroEpisodio: 3 },
      catalogSenzaE3,
      ['thermes', 'nouri'],
    )
    expect(result.kind).toBe('missing')
    expect(result.artistaIds).toEqual(['thermes', 'nouri'])
  })

  it('policy proposta non attribuisce Thermes a episodi S3 non censiti', () => {
    for (const ep of [3, 5, 6, 7, 8, 9, 10]) {
      const result = matchEpisodeProposed(
        { numeroStagione: 3, numeroEpisodio: ep },
        YELLOWSTONE,
        ['thermes', 'nouri'],
      )
      expect(result.kind).toBe('missing')
      expect(result.artistaIds).toEqual([])
    }
  })

  it('policy proposta conferma Nouri solo su S3E1/2/4', () => {
    for (const ep of [1, 2, 4]) {
      const result = matchEpisodeProposed(
        { numeroStagione: 3, numeroEpisodio: ep },
        YELLOWSTONE,
      )
      expect(result.kind).toBe('exact_se')
      expect(result.artistaIds).toEqual(['nouri'])
    }
  })
})

describe('Manuale D’Amore / D’Am3re — accorpamento catalogo', () => {
  it('normalizza Amore e Am3re sulla stessa chiave', () => {
    expect(normalizeWorkTitleForCollapse("Manuale D'Amore")).toBe(
      normalizeWorkTitleForCollapse("Manuale D'Am3re"),
    )
  })

  it('rileva il collasso 2005+2011 su un solo record attuale', () => {
    const hits = detectCollapsedWorksByTitleYear(
      [
        { codice: 'noco-2005', titolo: "Manuale D'Amore", anno: 2005 },
        { codice: 'noco-2011', titolo: "Manuale D'Am3re", anno: 2011 },
      ],
      [{ id: 'opera-merged', titolo: "Manuale D'Amore", anno: 2005 }],
    )
    expect(hits).toHaveLength(1)
    expect(hits[0].anniNoco).toEqual([2005, 2011])
    expect(hits[0].currentOperaIds).toEqual(['opera-merged'])
  })

  it('non segnala se entrambi gli anni sono presenti nel catalogo attuale', () => {
    const hits = detectCollapsedWorksByTitleYear(
      [
        { codice: 'noco-2005', titolo: "Manuale D'Amore", anno: 2005 },
        { codice: 'noco-2011', titolo: "Manuale D'Am3re", anno: 2011 },
      ],
      [
        { id: 'opera-2005', titolo: "Manuale D'Amore", anno: 2005 },
        { id: 'opera-2011', titolo: "Manuale D'Am3re", anno: 2011 },
      ],
    )
    expect(hits).toHaveLength(0)
  })
})
