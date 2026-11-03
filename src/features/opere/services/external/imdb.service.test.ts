import { searchTitles, getTitleById, mapImdbToOpera, mapImdbTypeToOperaTipo } from './imdb.service'

const mockResponse = (body: any, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
} as any)

global.fetch = jest.fn(async (input: RequestInfo | URL) => {
  const url = String(input)
  if (url.includes('/api/imdb/search')) {
    return mockResponse({ results: [{ title: 'Matrix', year: 1999, type: 'film', id: 'tt0133093' }] })
  }
  if (url.includes('/api/imdb/title/tt0133093')) {
    return mockResponse({ result: { title: 'The Matrix', originalTitle: null, year: 1999, type: 'film', id: 'tt0133093' } })
  }
  return mockResponse({}, 404)
}) as any

describe('IMDB client service', () => {
  it('searchTitles returns results', async () => {
    const { ok, results } = await searchTitles('matrix')
    expect(ok).toBeTruthy()
    expect(results[0].title).toBe('Matrix')
  })

  it('getTitleById returns detail', async () => {
    const { ok, result } = await getTitleById('tt0133093')
    expect(ok).toBeTruthy()
    expect(result?.title).toBe('The Matrix')
  })

  it('mapImdbToOpera creates patch', () => {
    const patch = mapImdbToOpera({ title: 'The Matrix', originalTitle: null, year: 1999, type: 'film', id: 'tt0133093' })
    expect(patch.titolo).toBe('The Matrix')
    expect(patch.anno_produzione).toBe(1999)
    expect(patch.tipo).toBe('film')
    expect(patch.titolo_originale).toBeNull()
    expect(patch.codici_esterni).toEqual({ imdb: 'tt0133093' })
  })

  it('mapImdbToOpera does not invent tipo or titolo_originale when absent', () => {
    const patch = mapImdbToOpera({ title: 'Un sogno rubato', originalTitle: null, year: 2008, type: 'tvEpisode', id: 'tt1194794' })
    expect(patch.tipo).toBeNull()
    expect(patch.titolo_originale).toBeNull()
  })

  it('mapImdbTypeToOperaTipo maps known types and leaves episode/unknown unset', () => {
    expect(mapImdbTypeToOperaTipo('movie')).toBe('film')
    expect(mapImdbTypeToOperaTipo('tvSeries')).toBe('serie_tv')
    expect(mapImdbTypeToOperaTipo('tvMiniSeries')).toBe('serie_tv')
    expect(mapImdbTypeToOperaTipo('film')).toBe('film')
    expect(mapImdbTypeToOperaTipo('tvEpisode')).toBeNull()
    expect(mapImdbTypeToOperaTipo('episode')).toBeNull()
    expect(mapImdbTypeToOperaTipo(null)).toBeNull()
    expect(mapImdbTypeToOperaTipo('N/A')).toBeNull()
  })
})
