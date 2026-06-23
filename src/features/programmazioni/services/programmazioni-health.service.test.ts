import { getProgrammazioniHealth } from './programmazioni.service'
import { supabase } from '@/shared/lib/supabase'

interface MockResponse {
  data?: unknown
  count?: number | null
  error?: unknown
}

const queuedResponses: MockResponse[] = []

class QueryMock implements PromiseLike<MockResponse> {
  select = jest.fn(() => this)
  eq = jest.fn(() => this)
  not = jest.fn(() => this)
  order = jest.fn(() => this)
  limit = jest.fn(() => this)
  single = jest.fn(() => this)
  or = jest.fn(() => this)
  is = jest.fn(() => this)

  then<TResult1 = MockResponse, TResult2 = never>(
    onfulfilled?: ((value: MockResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    const response = queuedResponses.shift() ?? { data: null, count: 0, error: null }
    return Promise.resolve(response).then(onfulfilled, onrejected)
  }
}

jest.mock('@/shared/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => new QueryMock()),
  },
}))

describe('getProgrammazioniHealth', () => {
  let warnSpy: jest.SpyInstance

  beforeEach(() => {
    queuedResponses.length = 0
    jest.clearAllMocks()
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('returns counts when date range queries fail', async () => {
    queuedResponses.push(
      {
        data: {
          emittenti: {
            nome: 'Netflix',
            tipo: 'streaming',
            configurazione: {},
          },
        },
        error: null,
      },
      { count: 10, error: null }, // total
      { count: 3, error: null }, // processed
      { count: 7, error: null }, // unprocessed
      { count: 1, error: null }, // errors_count
      { count: 0, error: null }, // titolo
      { count: 2, error: null }, // tipo
      { count: 4, error: null }, // durata_minuti
      { count: 0, error: null }, // titolo_episodio_originale
      { count: 8, error: null }, // numero_episodio
      { count: 1, error: null }, // anno
      { count: 5, error: null }, // views
      { count: 6, error: null }, // total_net_ad_revenue
      { data: null, error: { code: '57014', message: 'statement timeout' } },
      { data: null, error: { code: '57014', message: 'statement timeout' } }
    )

    const { data, error } = await getProgrammazioniHealth('campagna-1')

    expect(error).toBeNull()
    expect(data).toMatchObject({
      total: 10,
      processed: 3,
      unprocessed: 7,
      errors_count: 1,
      date_range_error: 'statement timeout',
    })
    expect(data?.policy.preset).toBe('svod')
    expect(data?.field_metrics.map(metric => metric.key)).not.toContain('data_trasmissione')
    expect(data?.field_metrics.find(metric => metric.key === 'durata_minuti')).toMatchObject({
      missing: 4,
      percent: 40,
    })
    expect(data?.field_metrics.find(metric => metric.key === 'numero_episodio')).toMatchObject({
      missing: 8,
      percent: 80,
    })
  })

  it('uses blank-aware title filter for missing title metric', async () => {
    queuedResponses.push(
      {
        data: {
          emittenti: {
            nome: 'RAI',
            tipo: 'tv_generalista',
            configurazione: {},
          },
        },
        error: null,
      },
      { count: 1, error: null },
      { count: 0, error: null },
      { count: 1, error: null },
      { count: 0, error: null },
      { count: 0, error: null },
      { count: 0, error: null },
      { count: 0, error: null },
      { count: 0, error: null },
      { count: 0, error: null },
      { count: 0, error: null },
      { data: [], error: null },
      { data: [], error: null }
    )

    await getProgrammazioniHealth('campagna-1')

    const queryMocks = (supabase.from as jest.Mock).mock.results.map(result => result.value as QueryMock)
    expect(queryMocks.some(query => {
      const calls = query.or.mock.calls as unknown as Array<[string]>
      return calls.some(call => call[0] === 'titolo.is.null,titolo.eq.')
    })).toBe(true)
  })
})
