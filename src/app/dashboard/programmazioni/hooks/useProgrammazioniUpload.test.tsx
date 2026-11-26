import { act, renderHook } from '@testing-library/react'
import { useProgrammazioniUpload } from './useProgrammazioniUpload'
import type { CampagnaProgrammazione } from '@/features/programmazioni/services/programmazioni.service'
import type { ImportMappingConfig } from '@/features/programmazioni/services/import-mapping.service'
import { pollUploadProgrammazioniJob, type UploadJobSnapshot } from '@/features/programmazioni/services/programmazioni-upload-worker.service'
import { notifyError } from '@/shared/lib/toast'

jest.mock('@/features/programmazioni/services/programmazioni-upload-worker.service', () => {
  const actual = jest.requireActual('@/features/programmazioni/services/programmazioni-upload-worker.service')
  return {
    ...actual,
    pollUploadProgrammazioniJob: jest.fn(),
  }
})

jest.mock('@/shared/lib/toast', () => {
  const actual = jest.requireActual('@/shared/lib/toast')
  return {
    ...actual,
    notifyError: jest.fn(),
  }
})

const campagna = (): CampagnaProgrammazione => ({
  id: 'campagna-1',
  emittente_id: 'emittente-1',
  anno: 2026,
  nome: 'Campagna Test',
  descrizione: null,
  stato: 'in_review',
  created_at: '2026-06-23T10:00:00.000Z',
  created_by: 'user-1',
  programmazioni_count: 10,
})

const mapping: ImportMappingConfig = {
  version: 1,
  colonne_rilevate: ['Title'],
  ultimo_upload: null,
  mapping: { Title: 'titolo' },
}

describe('useProgrammazioniUpload', () => {
  it('promotes a format warning to an apply_existing upload decision', () => {
    const { result } = renderHook(() => useProgrammazioniUpload({
      selectedCampagna: campagna(),
      updateCampagne: jest.fn(),
      refreshCampagne: jest.fn(),
      refreshEmittenti: jest.fn(),
      closeModal: jest.fn(),
    }))

    act(() => {
      result.current.setFormatWarning({
        mapping,
        diff: { added: ['Year'], removed: [], unchanged: ['Title'] },
        mappedRemoved: [],
      })
    })
    act(() => {
      result.current.proceedDespiteFormatChange()
    })

    expect(result.current.uploadDecision).toEqual({ kind: 'apply_existing', mapping })
    expect(result.current.isUploadReady).toBe(true)
    expect(result.current.formatWarning).toBeNull()
  })

  it('resets upload state without clearing active upload progress', () => {
    const { result } = renderHook(() => useProgrammazioniUpload({
      selectedCampagna: campagna(),
      updateCampagne: jest.fn(),
      refreshCampagne: jest.fn(),
      refreshEmittenti: jest.fn(),
      closeModal: jest.fn(),
    }))

    act(() => {
      result.current.setUploadError('boom')
      result.current.setFormatWarning({
        mapping,
        diff: { added: [], removed: ['Old'], unchanged: ['Title'] },
        mappedRemoved: ['Old'],
      })
    })
    act(() => {
      result.current.resetUploadState()
    })

    expect(result.current.uploadError).toBeNull()
    expect(result.current.formatWarning).toBeNull()
    expect(result.current.selectedFile).toBeNull()
    expect(result.current.isUploadReady).toBe(false)
  })

  it('avvisa quando il job di caricamento finisce in errore', async () => {
    const failed: UploadJobSnapshot = {
      id: 'job-1',
      campagna_programmazione_id: 'campagna-1',
      stato: 'error',
      fase: 'error',
      righe_totali: 3000,
      righe_processate: 2500,
      righe_inserite: 2500,
      righe_duplicate_saltate: 0,
      current_chunk: 5,
      total_chunks: 6,
      error: 'Data o orario fuori intervallo (righe 2502–3001 del file)',
      quality_report: null,
      updated_at: '2026-06-23T11:59:00.000Z',
    }
    ;(pollUploadProgrammazioniJob as jest.Mock).mockResolvedValue({
      success: false,
      job: failed,
      error: failed.error,
    })

    const { result } = renderHook(() => useProgrammazioniUpload({
      selectedCampagna: campagna(),
      updateCampagne: jest.fn(),
      refreshCampagne: jest.fn(),
      refreshEmittenti: jest.fn(),
      closeModal: jest.fn(),
    }))

    await act(async () => {
      result.current.attachUploadJobPolling({ ...failed, stato: 'running', fase: 'inserting', error: null })
    })

    expect(notifyError).toHaveBeenCalledWith(
      'Caricamento non riuscito',
      'Data o orario fuori intervallo (righe 2502–3001 del file)',
    )
  })
})
