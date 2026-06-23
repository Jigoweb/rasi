import { act, renderHook, waitFor } from '@testing-library/react'
import { useProgrammazioniEmittenti } from './useProgrammazioniEmittenti'
import { supabase } from '@/shared/lib/supabase'

jest.mock('@/shared/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

describe('useProgrammazioniEmittenti', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [
            { id: '1', codice: 'EMT_1', nome: 'Rai 1', tipo: 'tv_generalista', paese: 'IT', attiva: true },
            { id: '2', codice: 'EMT_7', nome: 'Netflix', tipo: 'streaming', paese: 'US', attiva: true },
          ],
          error: null,
        }),
      }),
    })
  })

  it('fetches emittenti and filters them by debounced search', async () => {
    const { result } = renderHook(() => useProgrammazioniEmittenti())

    await act(async () => {
      await result.current.fetchEmittenti()
    })
    act(() => {
      result.current.setSearchEmittentiQuery('net')
    })

    await waitFor(() => {
      expect(result.current.filteredEmittenti.map(emittente => emittente.nome)).toEqual(['Netflix'])
    })
  })

  it('opens create form with the next EMT code', async () => {
    const { result } = renderHook(() => useProgrammazioniEmittenti())

    await act(async () => {
      await result.current.fetchEmittenti()
    })
    act(() => {
      result.current.openCreateEmittente()
    })

    expect(result.current.showEmittenteForm).toBe(true)
    expect(result.current.emittenteFormMode).toBe('create')
    expect(result.current.emittenteFormData.codice).toBe('EMT_8')
  })
})
