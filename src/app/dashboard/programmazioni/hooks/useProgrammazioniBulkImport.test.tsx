import { act, renderHook } from '@testing-library/react'
import { useProgrammazioniBulkImport } from './useProgrammazioniBulkImport'
import type { ImportMappingConfig, UploadDecision } from '@/features/programmazioni/services/import-mapping.service'

jest.mock('@/features/programmazioni/services/import-mapping.service', () => ({
  detectColumns: jest.fn(),
  decideUploadPath: jest.fn(),
  getMappingByEmittente: jest.fn(),
}))

import {
  detectColumns,
  decideUploadPath,
  getMappingByEmittente,
} from '@/features/programmazioni/services/import-mapping.service'

const mockDetectColumns = detectColumns as jest.Mock
const mockDecideUploadPath = decideUploadPath as jest.Mock
const mockGetMappingByEmittente = getMappingByEmittente as jest.Mock

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
