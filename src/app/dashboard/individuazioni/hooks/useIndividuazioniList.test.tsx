import { renderHook, act, waitFor } from '@testing-library/react'
import { useIndividuazioniList } from './useIndividuazioniList'

jest.mock('@/features/individuazioni/services/individuazioni.service', () => ({
  getCampagneIndividuazione: jest.fn(),
  getIndividuazioneProcessingProgress: jest.fn(),
}))

const {
  getCampagneIndividuazione,
  getIndividuazioneProcessingProgress,
} = jest.requireMock('@/features/individuazioni/services/individuazioni.service')

describe('useIndividuazioniList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('loads campagne and wires resume to the global process context', async () => {
    getCampagneIndividuazione.mockResolvedValue({
      data: [{
        id: 'individuazione-1',
        nome: 'Campagna Individuazione',
        campagne_programmazione_id: 'programmazione-1',
        stato: 'in_corso',
        created_at: '2026-06-23T10:00:00.000Z',
        campagne_programmazione: { nome: 'Programmazione Rai' },
      }],
      error: null,
    })
    getIndividuazioneProcessingProgress.mockResolvedValue({
      data: { job_stato: 'error', last_activity_at: null },
      error: null,
    })
    const resumeById = jest.fn().mockResolvedValue({ success: true })

    const { result } = renderHook(() => useIndividuazioniList({
      resumeById,
      canStartProcess: () => true,
    }))

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.handleResume(result.current.campagne[0])
    })

    expect(resumeById).toHaveBeenCalledWith('programmazione-1', 'Programmazione Rai', 'individuazione-1')
    expect(getCampagneIndividuazione).toHaveBeenCalledTimes(2)
  })
})
