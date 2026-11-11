import { supabase } from '@/shared/lib/supabase-client'
import { POSTGREST_MAX_ROWS } from '@/shared/lib/postgrest-page'
import {
  CAST_ESTERNO_PAGE_SIZE,
  listCastEsterno,
  listCastEsternoArtistiCorrispondenti,
  listCastEsternoPage,
} from './cast-esterno.service'

jest.mock('@/shared/lib/supabase-client', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}))

function queryBuilder(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const builder: Record<string, jest.Mock> & { then?: unknown } = {}
  for (const method of ['select', 'eq', 'is', 'order', 'range', 'in']) {
    builder[method] = jest.fn(() => builder)
  }
  builder.then = (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
    Promise.resolve({ data: [], error: null, count: 0, ...result }).then(onFulfilled, onRejected)
  return builder
}

describe('listCastEsternoPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('filtra la serie e pagina sotto max_rows, con il totale dell\'opera a parte', async () => {
    const page = queryBuilder({ data: [{ id: 'c1' }], count: 80 })
    const total = queryBuilder({ count: 1551 })
    ;(supabase.from as jest.Mock)
      .mockReturnValueOnce(page)
      .mockReturnValueOnce(total)

    const result = await listCastEsternoPage('op', { page: 2, soloSerie: true })

    expect(page.is).toHaveBeenCalledWith('episodio_id', null)
    expect(page.order).toHaveBeenCalledWith('numero_stagione', {
      referencedTable: 'episodi',
      ascending: true,
      nullsFirst: true,
    })
    expect(page.order).toHaveBeenCalledWith('id', { ascending: true })
    expect(page.range).toHaveBeenCalledWith(CAST_ESTERNO_PAGE_SIZE, CAST_ESTERNO_PAGE_SIZE * 2 - 1)
    expect(result).toMatchObject({ count: 80, total: 1551, error: null })
    expect(result.data).toEqual([{ id: 'c1' }])
  })

  it('filtra un episodio', async () => {
    const page = queryBuilder({ data: [], count: 3 })
    const total = queryBuilder({ count: 3 })
    ;(supabase.from as jest.Mock)
      .mockReturnValueOnce(page)
      .mockReturnValueOnce(total)

    await listCastEsternoPage('op', { episodioId: 'ep-1' })

    expect(page.eq).toHaveBeenCalledWith('episodio_id', 'ep-1')
  })
})

describe('listCastEsterno', () => {
  it('concatena le pagine oltre max_rows', async () => {
    const range = jest.fn()
      .mockResolvedValueOnce({
        data: Array.from({ length: POSTGREST_MAX_ROWS }, (_, index) => ({ id: `c${index}` })),
        error: null,
      })
      .mockResolvedValueOnce({ data: [{ id: 'tail' }], error: null })
    const builder = {
      select: jest.fn(),
      eq: jest.fn(),
      is: jest.fn(),
      order: jest.fn(),
      range,
    }
    builder.select.mockReturnValue(builder)
    builder.eq.mockReturnValue(builder)
    builder.is.mockReturnValue(builder)
    builder.order.mockReturnValue(builder)
    ;(supabase.from as jest.Mock).mockReturnValue(builder)

    const result = await listCastEsterno('op')

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1001)
    expect(range).toHaveBeenNthCalledWith(1, 0, 999)
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999)
  })
})

describe('listCastEsternoArtistiCorrispondenti', () => {
  it('non interroga il database se la pagina non ha righe', async () => {
    const result = await listCastEsternoArtistiCorrispondenti('op', [])

    expect(result).toEqual({ data: [], error: null })
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('limita i match agli id della pagina visibile', async () => {
    const range = jest.fn().mockResolvedValue({
      data: [{ cast_id: 'c1', artista_id: 'a1', artista_nome: 'Anna Neri' }],
      error: null,
    })
    ;(supabase.rpc as jest.Mock).mockReturnValue({ range })

    const result = await listCastEsternoArtistiCorrispondenti('op', ['c1'])

    expect(supabase.rpc).toHaveBeenCalledWith('cast_esterno_artisti_corrispondenti', {
      p_opera_id: 'op',
      p_cast_ids: ['c1'],
    })
    expect(range).toHaveBeenCalledWith(0, 999)
    expect(result.data).toEqual([{ cast_id: 'c1', artista_id: 'a1', artista_nome: 'Anna Neri' }])
  })
})
