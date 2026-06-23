import { renderHook, act, waitFor } from '@testing-library/react'
import { useIndividuazioniDelete } from './useIndividuazioniDelete'
import type { CampagnaIndividuazione } from '@/features/individuazioni/services/individuazioni.service'

jest.mock('@/features/individuazioni/services/individuazioni.service', () => ({
  getDeleteCampagnaIndividuazioneInfo: jest.fn(),
  deleteCampagnaIndividuazione: jest.fn(),
}))

const {
  getDeleteCampagnaIndividuazioneInfo,
  deleteCampagnaIndividuazione,
} = jest.requireMock('@/features/individuazioni/services/individuazioni.service')

const campagna = (overrides: Partial<CampagnaIndividuazione> = {}): CampagnaIndividuazione => ({
  id: 'campagna-1',
  nome: 'Individuazione Rai',
  emittente_id: 'rai',
  campagne_programmazione_id: 'programmazione-1',
  anno: 2026,
  stato: 'completata',
  created_at: '2026-06-23T10:00:00.000Z',
  ...overrides,
})

describe('useIndividuazioniDelete', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.alert = jest.fn()
  })

  it('loads delete info and removes the campaign after confirmed delete', async () => {
    let campagne = [campagna()]
    const updateCampagne = jest.fn(next => {
      campagne = typeof next === 'function' ? next(campagne) : next
    })
    getDeleteCampagnaIndividuazioneInfo.mockResolvedValue({
      data: {
        individuazioni_count: 3,
        campagne_programmazione_nome: 'Programmazione Rai',
      },
      error: null,
    })
    deleteCampagnaIndividuazione.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useIndividuazioniDelete({ updateCampagne }))

    await act(async () => {
      await result.current.openDeleteDialog(campagna())
    })

    expect(result.current.isDeleteDialogOpen).toBe(true)
    expect(result.current.deleteInfo?.individuazioni_count).toBe(3)

    await act(async () => {
      await result.current.confirmDelete()
    })

    await waitFor(() => expect(campagne).toEqual([]))
    expect(result.current.isDeleteDialogOpen).toBe(false)
  })
})
