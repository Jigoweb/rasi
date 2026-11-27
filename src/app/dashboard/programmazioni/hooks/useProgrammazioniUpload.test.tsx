import { act, render, renderHook, screen } from '@testing-library/react'
import { useProgrammazioniUpload } from './useProgrammazioniUpload'
import UploadProgrammazioniDialog from '../components/UploadProgrammazioniDialog'
import type { CampagnaProgrammazione } from '@/features/programmazioni/services/programmazioni.service'
import { uploadProgrammazioni } from '@/features/programmazioni/services/programmazioni.service'
import type { ImportMappingConfig } from '@/features/programmazioni/services/import-mapping.service'
import { decideUploadPath, detectColumns, readAllRows } from '@/features/programmazioni/services/import-mapping.service'
import { pollUploadProgrammazioniJob, type UploadJobSnapshot } from '@/features/programmazioni/services/programmazioni-upload-worker.service'
import { notifyError } from '@/shared/lib/toast'

jest.mock('@/features/programmazioni/services/import-mapping.service', () => {
  const actual = jest.requireActual('@/features/programmazioni/services/import-mapping.service')
  return {
    ...actual,
    detectColumns: jest.fn(),
    readAllRows: jest.fn(),
    decideUploadPath: jest.fn(),
  }
})

jest.mock('@/features/programmazioni/services/programmazioni.service', () => {
  const actual = jest.requireActual('@/features/programmazioni/services/programmazioni.service')
  return {
    ...actual,
    uploadProgrammazioni: jest.fn(async () => ({ error: null })),
    updateCampagnaStatus: jest.fn(async () => ({})),
  }
})

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

  function hook() {
    return renderHook(() => useProgrammazioniUpload({
      selectedCampagna: campagna(),
      updateCampagne: jest.fn(),
      refreshCampagne: jest.fn(),
      refreshEmittenti: jest.fn(),
      closeModal: jest.fn(),
    }))
  }

  it('mostra l\'avviso sulle date testuali del template prima della conferma', async () => {
    ;(detectColumns as jest.Mock).mockResolvedValue({
      columns: ['data_trasmissione', 'titolo'],
      preview: [{ data_trasmissione: '01/02/2024', titolo: 'A' }],
    })
    ;(readAllRows as jest.Mock).mockResolvedValue([
      { data_trasmissione: '01/02/2024', titolo: 'A' },
      { data_trasmissione: '03/04/2024', titolo: 'B' },
    ])
    ;(decideUploadPath as jest.Mock).mockResolvedValue({
      kind: 'legacy_template',
      reason: 'no_config_but_template_headers',
    })

    const { result } = hook()
    await act(async () => {
      await result.current.handleFileSelected(new File(['a'], 'template.csv', { type: 'text/csv' }))
    })

    const warnings = (result.current as { dateWarnings?: string[] }).dateWarnings ?? []
    expect(result.current.isUploadReady).toBe(true)
    expect(result.current.headerError).toBeNull()
    expect(warnings.join(' ')).toMatch(/GG\/MM/)

    render(
      <UploadProgrammazioniDialog
        open
        onOpenChange={jest.fn()}
        step={2}
        isResumingUpload
        detailsForm={<div />}
        selectedCampagna={campagna()}
        selectedFile={result.current.selectedFile}
        fileInputRef={{ current: null }}
        onFileUpload={jest.fn()}
        onFileSelected={jest.fn()}
        isPreparingUpload={false}
        isUploading={false}
        parsedRowCount={result.current.parsedRowCount}
        headerError={result.current.headerError}
        uploadError={null}
        onDismissUploadError={jest.fn()}
        uploadProgress={{}}
        isUploadReady={result.current.isUploadReady}
        dateWarnings={warnings}
        onUploadDatabase={jest.fn()}
        onClose={jest.fn()}
      />
    )
    expect(screen.getByRole('status')).toHaveTextContent(/GG\/MM/)
  })

  it('blocca il caricamento client se il mapping ha una colonna data tutta ambigua', async () => {
    ;(detectColumns as jest.Mock).mockResolvedValue({
      columns: ['Data', 'Titolo'],
      preview: [{ Data: '1/1/2024', Titolo: 'A' }],
    })
    ;(readAllRows as jest.Mock).mockResolvedValue([
      { Data: '1/1/2024', Titolo: 'A' },
      { Data: '4/1/2024', Titolo: 'B' },
      { Data: '7/1/2024', Titolo: 'C' },
      { Data: '10/1/2024', Titolo: 'D' },
    ])
    ;(decideUploadPath as jest.Mock).mockResolvedValue({
      kind: 'apply_existing',
      mapping: {
        version: 1,
        colonne_rilevate: ['Data', 'Titolo'],
        ultimo_upload: null,
        mapping: { Data: 'data_inizio', Titolo: 'titolo' },
      },
    })

    const { result } = hook()
    await act(async () => {
      await result.current.handleFileSelected(new File(['a'], 'disney.csv', { type: 'text/csv' }))
    })

    expect(result.current.isUploadReady).toBe(false)
    expect(result.current.headerError).toMatch(/Data EU/)
    expect(result.current.headerError).toMatch(/Data US/)

    render(
      <UploadProgrammazioniDialog
        open
        onOpenChange={jest.fn()}
        step={2}
        isResumingUpload
        detailsForm={<div />}
        selectedCampagna={campagna()}
        selectedFile={result.current.selectedFile}
        fileInputRef={{ current: null }}
        onFileUpload={jest.fn()}
        onFileSelected={jest.fn()}
        isPreparingUpload={false}
        isUploading={false}
        parsedRowCount={result.current.parsedRowCount}
        headerError={result.current.headerError}
        uploadError={null}
        onDismissUploadError={jest.fn()}
        uploadProgress={{}}
        isUploadReady={result.current.isUploadReady}
        onUploadDatabase={jest.fn()}
        onClose={jest.fn()}
      />
    )
    expect(screen.getByText(/Data EU/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload dati database' })).toBeDisabled()

    await act(async () => {
      await result.current.handleUploadDatabase()
    })
    expect(uploadProgrammazioni).not.toHaveBeenCalled()
  })
})
