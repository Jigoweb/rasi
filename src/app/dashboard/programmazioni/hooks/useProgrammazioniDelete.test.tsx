import { act, renderHook } from '@testing-library/react'
import type { Dispatch, SetStateAction } from 'react'
import { useProgrammazioniDelete } from './useProgrammazioniDelete'
import {
  deleteCampagnaProgrammazione,
  getDeleteCampagnaProgrammazioneInfo,
  type CampagnaProgrammazione,
} from '@/features/programmazioni/services/programmazioni.service'

jest.mock('@/features/programmazioni/services/programmazioni.service', () => ({
  deleteCampagnaProgrammazione: jest.fn(),
  getDeleteCampagnaProgrammazioneInfo: jest.fn(),
}))

const campagna = (overrides: Partial<CampagnaProgrammazione> = {}): CampagnaProgrammazione => ({
  id: 'campagna-1',
  emittente_id: 'emittente-1',
  anno: 2026,
  nome: 'Campagna Test',
  descrizione: null,
  stato: 'in_review',
  created_at: '2026-06-23T10:00:00.000Z',
  created_by: 'user-1',
  programmazioni_count: 42,
  ...overrides,
})

describe('useProgrammazioniDelete', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(window, 'alert').mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('loads delete info when opening the dialog', async () => {
    ;(getDeleteCampagnaProgrammazioneInfo as jest.Mock).mockResolvedValue({
      data: { canDelete: true, programmazioniCount: 42 },
      error: null,
    })
    const updateCampagne = jest.fn()
    const { result } = renderHook(() => useProgrammazioniDelete({ updateCampagne }))

    await act(async () => {
      await result.current.openDeleteDialog(campagna())
    })

    expect(result.current.isDeleteDialogOpen).toBe(true)
    expect(result.current.campagnaToDelete?.id).toBe('campagna-1')
    expect(result.current.deleteInfo).toEqual({ canDelete: true, programmazioniCount: 42 })
    expect(getDeleteCampagnaProgrammazioneInfo).toHaveBeenCalledWith('campagna-1')
  })

  it('removes the campaign locally after a confirmed delete', async () => {
    let campagne = [campagna()]
    const updateCampagne: Dispatch<SetStateAction<CampagnaProgrammazione[]>> = jest.fn((next) => {
      campagne = typeof next === 'function' ? next(campagne) : next
    }) as Dispatch<SetStateAction<CampagnaProgrammazione[]>>
    const onDeleted = jest.fn()
    ;(getDeleteCampagnaProgrammazioneInfo as jest.Mock).mockResolvedValue({ data: null, error: null })
    ;(deleteCampagnaProgrammazione as jest.Mock).mockResolvedValue({
      error: null,
      blocked: false,
      blockReason: null,
    })
    const { result } = renderHook(() => useProgrammazioniDelete({ updateCampagne, onDeleted }))

    await act(async () => {
      await result.current.openDeleteDialog(campagna())
    })
    await act(async () => {
      await result.current.confirmDelete()
    })

    expect(deleteCampagnaProgrammazione).toHaveBeenCalledWith('campagna-1')
    expect(campagne).toEqual([])
    expect(onDeleted).toHaveBeenCalledWith(['campagna-1'])
    expect(result.current.isDeleteDialogOpen).toBe(false)
  })

  it('loads bulk delete info and deletes only non-blocked campaigns', async () => {
    let campagne = [campagna({ id: 'ok' }), campagna({ id: 'blocked', nome: 'Bloccata' })]
    const updateCampagne: Dispatch<SetStateAction<CampagnaProgrammazione[]>> = jest.fn((next) => {
      campagne = typeof next === 'function' ? next(campagne) : next
    }) as Dispatch<SetStateAction<CampagnaProgrammazione[]>>
    const onDeleted = jest.fn()

    ;(getDeleteCampagnaProgrammazioneInfo as jest.Mock).mockImplementation(async (id: string) => ({
      data: id === 'blocked'
        ? { scenario: 'has_individuazione', programmazioni_count: 1, campagna_individuazione_nome: 'Run 1' }
        : { scenario: 'has_data', programmazioni_count: 10 },
      error: null,
    }))
    ;(deleteCampagnaProgrammazione as jest.Mock).mockResolvedValue({
      error: null,
      blocked: false,
      blockReason: null,
    })

    const { result } = renderHook(() => useProgrammazioniDelete({ updateCampagne, onDeleted }))

    await act(async () => {
      await result.current.openBulkDeleteDialog(campagne)
    })

    expect(result.current.isBulkDeleteDialogOpen).toBe(true)
    expect(result.current.bulkDeleteItems).toHaveLength(2)

    await act(async () => {
      await result.current.confirmBulkDelete()
    })

    expect(deleteCampagnaProgrammazione).toHaveBeenCalledTimes(1)
    expect(deleteCampagnaProgrammazione).toHaveBeenCalledWith('ok')
    expect(campagne.map(c => c.id)).toEqual(['blocked'])
    expect(onDeleted).toHaveBeenCalledWith(['ok'])
    expect(result.current.isBulkDeleteDialogOpen).toBe(false)
  })
})
