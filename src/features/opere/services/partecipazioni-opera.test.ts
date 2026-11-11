import { supabase } from '@/shared/lib/supabase-client'
import { POSTGREST_MAX_ROWS } from '@/shared/lib/postgrest-page'
import {
  getEpisodiByOperaId,
  listAllPartecipazioniByOpera,
  listPartecipazioniByOpera,
} from './opere.service'

jest.mock('@/shared/lib/supabase-client', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
  },
}))

describe('listPartecipazioniByOpera', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('chiede una pagina e legge totale filtrato e totale opera', async () => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({
      data: {
        total: 42,
        total_opera: 1551,
        rows: [{ id: 'p1' }],
      },
      error: null,
    })

    const result = await listPartecipazioniByOpera({
      operaId: 'op',
      page: 2,
      search: 'Meredith',
      ruoloId: 'ruolo',
      episodio: '__serie__',
    })

    expect(supabase.rpc).toHaveBeenCalledWith('list_partecipazioni_opera', expect.objectContaining({
      p_opera_id: 'op',
      p_offset: 50,
      p_limit: 50,
      p_search: 'Meredith',
      p_ruolo_id: 'ruolo',
      p_episodio_id: null,
      p_senza_episodio: true,
    }))
    expect(result).toMatchObject({
      total: 42,
      totalOpera: 1551,
      error: null,
    })
    expect(result.data).toEqual([{ id: 'p1' }])
  })

  it('scarica l\'export a blocchi da max_rows e si ferma sulla pagina corta', async () => {
    const full = Array.from({ length: POSTGREST_MAX_ROWS }, (_, index) => ({ id: `p${index}` }))
    ;(supabase.rpc as jest.Mock)
      .mockResolvedValueOnce({ data: { total: 1001, total_opera: 1001, rows: full }, error: null })
      .mockResolvedValueOnce({ data: { total: 1001, total_opera: 1001, rows: [{ id: 'tail' }] }, error: null })

    const result = await listAllPartecipazioniByOpera('op')

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1001)
    expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'list_partecipazioni_opera', expect.objectContaining({
      p_offset: 0,
      p_limit: POSTGREST_MAX_ROWS,
    }))
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'list_partecipazioni_opera', expect.objectContaining({
      p_offset: POSTGREST_MAX_ROWS,
      p_limit: POSTGREST_MAX_ROWS,
    }))
  })
})

describe('getEpisodiByOperaId', () => {
  it('legge gli episodi a pagine da 1000 con ordine stabile', async () => {
    const range = jest.fn()
      .mockResolvedValueOnce({
        data: Array.from({ length: POSTGREST_MAX_ROWS }, (_, index) => ({ id: `e${index}` })),
        error: null,
      })
      .mockResolvedValueOnce({ data: [{ id: 'e-last' }], error: null })
    const builder = {
      select: jest.fn(),
      eq: jest.fn(),
      order: jest.fn(),
      range,
    }
    builder.select.mockReturnValue(builder)
    builder.eq.mockReturnValue(builder)
    builder.order.mockReturnValue(builder)
    ;(supabase.from as jest.Mock).mockReturnValue(builder)

    const result = await getEpisodiByOperaId('op')

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1001)
    expect(builder.order).toHaveBeenCalledWith('id', { ascending: true })
    expect(range).toHaveBeenNthCalledWith(1, 0, 999)
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999)
  })
})
