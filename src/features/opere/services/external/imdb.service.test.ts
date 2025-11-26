import { searchTitles, getTitleById, mapImdbToOpera } from './imdb.service'

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
    expect(patch.codici_esterni).toEqual({ imdb: 'tt0133093' })
  })
})
