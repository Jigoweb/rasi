import { act, renderHook } from '@testing-library/react'
import { useProgrammazioniUpload } from './useProgrammazioniUpload'
import type { CampagnaProgrammazione } from '@/features/programmazioni/services/programmazioni.service'
import type { ImportMappingConfig } from '@/features/programmazioni/services/import-mapping.service'

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
})
