import { act, renderHook } from '@testing-library/react'
import { useProgrammazioniBulkImport } from './useProgrammazioniBulkImport'
import type { ImportMappingConfig, UploadDecision } from '@/features/programmazioni/services/import-mapping.service'

jest.mock('@/features/programmazioni/services/import-mapping.service', () => ({
  detectColumns: jest.fn(),
  decideUploadPath: jest.fn(),
  getMappingByEmittente: jest.fn(),
}))

jest.mock('@/features/programmazioni/services/programmazioni.service', () => ({
  createCampagnaProgrammazione: jest.fn(),
  updateCampagnaStatus: jest.fn(),
}))

jest.mock('@/features/programmazioni/services/programmazioni-upload-worker.service', () => ({
  getUploadMappingSnapshot: jest.fn(() => ({ kind: 'legacy_template' })),
  uploadProgrammazioniFileToStorage: jest.fn(),
  startUploadProgrammazioniJob: jest.fn(),
  pollUploadProgrammazioniJob: jest.fn(),
}))

import {
  detectColumns,
  decideUploadPath,
  getMappingByEmittente,
} from '@/features/programmazioni/services/import-mapping.service'
import {
  createCampagnaProgrammazione,
  updateCampagnaStatus,
} from '@/features/programmazioni/services/programmazioni.service'
import {
  uploadProgrammazioniFileToStorage,
  startUploadProgrammazioniJob,
  pollUploadProgrammazioniJob,
} from '@/features/programmazioni/services/programmazioni-upload-worker.service'

const mockDetectColumns = detectColumns as jest.Mock
const mockDecideUploadPath = decideUploadPath as jest.Mock
const mockGetMappingByEmittente = getMappingByEmittente as jest.Mock
const mockCreateCampagna = createCampagnaProgrammazione as jest.Mock
const mockUpdateCampagnaStatus = updateCampagnaStatus as jest.Mock
const mockUploadToStorage = uploadProgrammazioniFileToStorage as jest.Mock
const mockStartUploadJob = startUploadProgrammazioniJob as jest.Mock
const mockPollUploadJob = pollUploadProgrammazioniJob as jest.Mock

const mapping: ImportMappingConfig = {
  version: 1,
  colonne_rilevate: ['Titolo', 'Numero Episodio', 'Regia'],
  ultimo_upload: null,
  mapping: {
    Titolo: 'titolo',
    'Numero Episodio': 'numero_episodio',
    Regia: 'regia',
  },
}

function makeFile(name: string): File {
  return new File(['a,b\n1,2'], name, { type: 'text/csv' })
}

describe('useProgrammazioniBulkImport - preview classification', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetMappingByEmittente.mockResolvedValue({ data: mapping, error: null })
    mockDetectColumns.mockResolvedValue({ columns: ['Titolo'], preview: [] })
  })

  it('classifica warning_safe un file con solo colonne episodio/stagione mancanti', async () => {
    const decision: UploadDecision = {
      kind: 'warn_format_changed',
      mapping,
      diff: { added: [], removed: ['Numero Episodio'], unchanged: ['Titolo', 'Regia'] },
      mappedRemoved: ['Numero Episodio'],
    }
    mockDecideUploadPath.mockResolvedValue(decision)

    const { result } = renderHook(() => useProgrammazioniBulkImport())

    act(() => {
      result.current.setEmittenteId('emittente-1')
      result.current.setAnno(2020)
    })
    act(() => {
      result.current.addFiles([makeFile('sky-uno-2020.csv')])
    })
    await act(async () => {
      await result.current.previewAll()
    })

    expect(result.current.rows).toHaveLength(1)
    expect(result.current.rows[0].columnClass).toBe('warning_safe')
    expect(result.current.rows[0].mappedRemoved).toEqual(['Numero Episodio'])
    expect(result.current.rows[0].error).toBeNull()
    expect(result.current.hasSafeWarnings).toBe(true)
  })

  it('classifica error un file a cui manca una colonna mappata obbligatoria (regia)', async () => {
    const decision: UploadDecision = {
      kind: 'warn_format_changed',
      mapping,
      diff: { added: [], removed: ['Regia'], unchanged: ['Titolo'] },
      mappedRemoved: ['Regia'],
    }
    mockDecideUploadPath.mockResolvedValue(decision)

    const { result } = renderHook(() => useProgrammazioniBulkImport())

    act(() => {
      result.current.setEmittenteId('emittente-1')
      result.current.setAnno(2020)
    })
    act(() => {
      result.current.addFiles([makeFile('sky-cinema-2020.csv')])
    })
    await act(async () => {
      await result.current.previewAll()
    })

    expect(result.current.rows[0].columnClass).toBe('error')
    expect(result.current.rows[0].error).not.toBeNull()
    expect(result.current.canStart).toBe(false)
  })

  it('classifica ok un file che applica il mapping esistente senza differenze', async () => {
    mockDecideUploadPath.mockResolvedValue({ kind: 'apply_existing', mapping })

    const { result } = renderHook(() => useProgrammazioniBulkImport())

    act(() => {
      result.current.setEmittenteId('emittente-1')
      result.current.setAnno(2020)
    })
    act(() => {
      result.current.addFiles([makeFile('SkyArte.csv')])
    })
    await act(async () => {
      await result.current.previewAll()
    })

    expect(result.current.rows[0].columnClass).toBe('ok')
    expect(result.current.rows[0].nome).toBe('SkyArte')
    expect(result.current.canStart).toBe(true)
    expect(result.current.hasSafeWarnings).toBe(false)
  })
})

describe('useProgrammazioniBulkImport - execution error handling & confirm+start', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetMappingByEmittente.mockResolvedValue({ data: mapping, error: null })
    mockDetectColumns.mockResolvedValue({ columns: ['Titolo'], preview: [] })
    mockDecideUploadPath.mockResolvedValue({ kind: 'apply_existing', mapping })
    mockCreateCampagna.mockResolvedValue({ data: { id: 'campagna-1' }, error: null })
    mockUpdateCampagnaStatus.mockResolvedValue({ data: null, error: null })
  })

  it('marca la campagna come error se lo storage upload fallisce dopo la creazione', async () => {
    mockUploadToStorage.mockResolvedValue({ storagePath: '', error: new Error('storage boom') })

    const { result } = renderHook(() => useProgrammazioniBulkImport())

    act(() => {
      result.current.setEmittenteId('emittente-1')
      result.current.setAnno(2020)
    })
    act(() => {
      result.current.addFiles([makeFile('SkyArte.csv')])
    })
    await act(async () => {
      await result.current.previewAll()
    })
    await act(async () => {
      await result.current.startImport()
    })

    expect(result.current.rows[0].runStatus).toBe('failed')
    expect(result.current.rows[0].error).toBe('storage boom')
    expect(mockUpdateCampagnaStatus).toHaveBeenCalledWith('campagna-1', 'uploading')
    expect(mockUpdateCampagnaStatus).toHaveBeenCalledWith('campagna-1', 'error')
  })

  it('confirmSafeWarningsAndStart conferma ed esegue in una sola chiamata, senza stale closure', async () => {
    const warningDecision: UploadDecision = {
      kind: 'warn_format_changed',
      mapping,
      diff: { added: [], removed: ['Numero Episodio'], unchanged: ['Titolo', 'Regia'] },
      mappedRemoved: ['Numero Episodio'],
    }
    mockDecideUploadPath.mockResolvedValue(warningDecision)
    mockUploadToStorage.mockResolvedValue({ storagePath: 'path/to/file', error: null })
    mockStartUploadJob.mockResolvedValue({ success: true, jobId: 'job-1' })
    mockPollUploadJob.mockImplementation(async (_jobId: string, onProgress: (job: { righe_totali: number; righe_processate: number }) => void) => {
      onProgress({ righe_totali: 10, righe_processate: 10 })
      return { success: true, job: { righe_totali: 10, righe_processate: 10 } }
    })

    const { result } = renderHook(() => useProgrammazioniBulkImport())

    act(() => {
      result.current.setEmittenteId('emittente-1')
      result.current.setAnno(2020)
    })
    act(() => {
      result.current.addFiles([makeFile('SkyUno.csv')])
    })
    await act(async () => {
      await result.current.previewAll()
    })

    expect(result.current.rows[0].columnClass).toBe('warning_safe')
    expect(result.current.confirmedSafeWarnings).toBe(false)

    // No prior call to confirmSafeWarnings(): confirm+start must not no-op due to
    // stale React state read inside the same tick.
    await act(async () => {
      await result.current.confirmSafeWarningsAndStart()
    })

    expect(result.current.confirmedSafeWarnings).toBe(true)
    expect(mockCreateCampagna).toHaveBeenCalledTimes(1)
    expect(result.current.rows[0].runStatus).toBe('completed')
  })
})
