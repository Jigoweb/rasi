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

const CAST_ESTERNO_SELECT = '*, episodi(numero_stagione, numero_episodio)'

type QueryMock = {
  select: jest.Mock
  eq: jest.Mock
  is: jest.Mock
  order: jest.Mock
  range: jest.Mock
  in: jest.Mock
  then?: (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) => Promise<unknown>
}

function queryBuilder(result: { data?: unknown; error?: unknown; count?: number | null }): QueryMock {
  const builder = {} as QueryMock
  for (const method of ['select', 'eq', 'is', 'order', 'range', 'in'] as const) {
    builder[method] = jest.fn(() => builder)
  }
  builder.then = (onFulfilled, onRejected) =>
    Promise.resolve({ data: [], error: null, count: 0, ...result }).then(onFulfilled, onRejected)
  return builder
}

/** Nomi di embed nella select: `episodi(...)`, `alias:episodi(...)`, `episodi!inner(...)`. */
function embeddedResources(select: string): Set<string> {
  const names = new Set<string>()
  const pattern = /(?:([A-Za-z_][\w]*)\s*:\s*)?([A-Za-z_][\w]*)(?:![A-Za-z_][\w]*)?\s*\(/g
  for (const match of select.matchAll(pattern)) {
    if (match[1]) names.add(match[1])
    names.add(match[2])
  }
  return names
}

/**
 * PGRST108: ordinare una risorsa con `referencedTable` o `risorsa(colonna)`
 * richiede che la stessa risorsa sia embedded nella select. `*` non basta.
 */
function expectReferencedOrdersEmbedded(builder: { select: jest.Mock; order: jest.Mock }) {
  const selectArg = builder.select.mock.calls[0]?.[0]
  expect(typeof selectArg).toBe('string')
  const embeds = embeddedResources(String(selectArg))
  expect(builder.order.mock.calls.length).toBeGreaterThan(0)

  for (const [column, options] of builder.order.mock.calls) {
    const referenced = options && typeof options === 'object'
      ? (options as { referencedTable?: unknown }).referencedTable
      : undefined
    if (typeof referenced === 'string') {
      expect(embeds.has(referenced)).toBe(true)
    }
    const embeddedOrder = String(column).match(/^([A-Za-z_][\w]*)\(/)
    if (embeddedOrder) {
      expect(embeds.has(embeddedOrder[1])).toBe(true)
    }
  }
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
    expect(page.select).toHaveBeenCalledWith(CAST_ESTERNO_SELECT, { count: 'exact' })
    expect(page.order).toHaveBeenNthCalledWith(1, 'episodi(numero_stagione)', {
      ascending: true,
      nullsFirst: true,
    })
    expect(page.order).toHaveBeenNthCalledWith(2, 'episodi(numero_episodio)', {
      ascending: true,
      nullsFirst: true,
    })
    expect(page.order).toHaveBeenNthCalledWith(3, 'ordine', { ascending: true })
    expect(page.order).toHaveBeenNthCalledWith(4, 'nome', { ascending: true })
    expect(page.order).toHaveBeenNthCalledWith(5, 'id', { ascending: true })
    expect(page.range).toHaveBeenCalledWith(CAST_ESTERNO_PAGE_SIZE, CAST_ESTERNO_PAGE_SIZE * 2 - 1)
    expectReferencedOrdersEmbedded(page)
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
    expectReferencedOrdersEmbedded(page)
  })

  it('ogni ordine che referenzia episodi ha l\'embed corrispondente nella select', async () => {
    const page = queryBuilder({ data: [{ id: 'c1' }], count: 1 })
    const total = queryBuilder({ count: 1 })
    ;(supabase.from as jest.Mock)
      .mockReturnValueOnce(page)
      .mockReturnValueOnce(total)

    await listCastEsternoPage('op')

    const selectArg = String(page.select.mock.calls[0]?.[0])
    expect(selectArg).not.toBe('*')
    expect(embeddedResources(selectArg).has('episodi')).toBe(true)
    expectReferencedOrdersEmbedded(page)
    expect(page.order.mock.calls.some(([column, options]) => {
      const referenced = options && typeof options === 'object'
        ? (options as { referencedTable?: string }).referencedTable
        : undefined
      return referenced === 'episodi' || String(column).startsWith('episodi(')
    })).toBe(true)
  })

  it('scarta l\'embed episodi: serve solo all\'ordine e non deve uscire dal servizio', async () => {
    const page = queryBuilder({
      data: [{ id: 'c1', nome: 'Ada', episodi: { numero_stagione: 2, numero_episodio: 4 } }],
      count: 1,
    })
    const total = queryBuilder({ count: 1 })
    ;(supabase.from as jest.Mock)
      .mockReturnValueOnce(page)
      .mockReturnValueOnce(total)

    const result = await listCastEsternoPage('op')

    expectReferencedOrdersEmbedded(page)
    expect(result.data).toEqual([{ id: 'c1', nome: 'Ada' }])
    expect(result.data[0]).not.toHaveProperty('episodi')
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
    expect(builder.select).toHaveBeenCalledWith(CAST_ESTERNO_SELECT, undefined)
    expect(builder.order).toHaveBeenNthCalledWith(1, 'episodi(numero_stagione)', {
      ascending: true,
      nullsFirst: true,
    })
    expect(builder.order).toHaveBeenNthCalledWith(2, 'episodi(numero_episodio)', {
      ascending: true,
      nullsFirst: true,
    })
    expectReferencedOrdersEmbedded(builder)
    expect(range).toHaveBeenNthCalledWith(1, 0, 999)
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999)
  })

  it('non include l\'embed episodi nelle righe usate dall\'export', async () => {
    const range = jest.fn().mockResolvedValue({
      data: [{ id: 'c1', nome: 'Ada', episodi: { numero_stagione: 1, numero_episodio: 3 } }],
      error: null,
    })
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
    expect(result.data).toEqual([{ id: 'c1', nome: 'Ada' }])
    expect(result.data?.[0]).not.toHaveProperty('episodi')
    expectReferencedOrdersEmbedded(builder)
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
