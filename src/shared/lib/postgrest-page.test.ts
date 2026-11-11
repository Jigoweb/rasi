import { chunkIds, fetchAllPages, POSTGREST_MAX_ROWS } from './postgrest-page'

describe('fetchAllPages', () => {
  it('concatena le pagine finché il blocco è più corto del tetto PostgREST', async () => {
    const load = jest.fn()
      .mockResolvedValueOnce({ data: [{ id: 'a' }, { id: 'b' }], error: null })
      .mockResolvedValueOnce({ data: [{ id: 'c' }], error: null })

    const result = await fetchAllPages(load, 2)

    expect(result).toEqual({ data: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], error: null })
    expect(load).toHaveBeenNthCalledWith(1, 0, 1)
    expect(load).toHaveBeenNthCalledWith(2, 2, 3)
  })

  it('si ferma sulla prima pagina corta, anche se è vuota', async () => {
    const load = jest.fn().mockResolvedValue({ data: [], error: null })

    const result = await fetchAllPages(load, POSTGREST_MAX_ROWS)

    expect(result).toEqual({ data: [], error: null })
    expect(load).toHaveBeenCalledTimes(1)
    expect(load).toHaveBeenCalledWith(0, POSTGREST_MAX_ROWS - 1)
  })

  it('restituisce l\'errore senza proseguire', async () => {
    const load = jest.fn()
      .mockResolvedValueOnce({ data: [{ id: 'a' }], error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'timeout' } })

    const result = await fetchAllPages(load, 1)

    expect(result.error?.message).toBe('timeout')
    expect(result.data).toEqual([{ id: 'a' }])
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('rifiuta un pageSize sopra max_rows, che PostgREST troncherebbe in silenzio', async () => {
    const load = jest.fn()

    const result = await fetchAllPages(load, POSTGREST_MAX_ROWS + 1)

    expect(result.data).toEqual([])
    expect(result.error?.message).toMatch(/pageSize/)
    expect(load).not.toHaveBeenCalled()
  })

  it('interrompe un risultato più grande del tetto di pagine', async () => {
    const load = jest.fn(async () => ({ data: [{ id: 'a' }, { id: 'b' }], error: null }))

    const result = await fetchAllPages(load, 2)

    expect(load).toHaveBeenCalledTimes(200)
    expect(result.data).toHaveLength(400)
    expect(result.error?.message).toMatch(/troppo grande/)
  })
})

describe('chunkIds', () => {
  it('spezza gli id e tiene l\'avanzo', () => {
    expect(chunkIds(['a', 'b', 'c', 'd'], 3)).toEqual([['a', 'b', 'c'], ['d']])
  })

  it('restituisce un array vuoto senza id', () => {
    expect(chunkIds([])).toEqual([])
  })
})
