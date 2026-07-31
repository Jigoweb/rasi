import {
  buildIndividuazioneName,
  canBulkDelete,
  classifyBulkSelection,
  getSharedAnno,
} from './programmazioni-bulk-actions.service'
import type { CampagnaProgrammazione } from './programmazioni.service'
import type { ProgrammazioneRowState } from './programmazioni-state.service'

function campagna(overrides: Partial<CampagnaProgrammazione> = {}): CampagnaProgrammazione {
  return {
    id: 'c1',
    emittente_id: 'e1',
    anno: 2026,
    nome: 'Rai 1 2026',
    descrizione: null,
    stato: 'in_review',
    created_at: '2026-06-23T10:00:00.000Z',
    created_by: 'user-1',
    programmazioni_count: 10,
    ...overrides,
  }
}

const idleContext = {
  uploadProgress: {},
  processingProgressMap: {},
  processingJobMap: {},
  isCampagnaProcessing: () => false,
}

describe('programmazioni-bulk-actions.service', () => {
  it('builds default individuazione names', () => {
    expect(buildIndividuazioneName('Rai 1 2026')).toBe('Individuazione - Rai 1 2026')
    expect(buildIndividuazioneName('  ')).toBe('Individuazione')
  })

  it('returns shared year only when all match', () => {
    expect(getSharedAnno([campagna(), campagna({ id: 'c2' })])).toBe(2026)
    expect(getSharedAnno([campagna(), campagna({ id: 'c2', anno: 2025 })])).toBeNull()
  })

  it('classifies creatable and deletable rows from selection', () => {
    const ready = campagna({ id: 'ready' })
    const draft = campagna({ id: 'draft', stato: 'bozza', programmazioni_count: 0 })
    const result = classifyBulkSelection(
      [ready, draft],
      new Set(['ready', 'draft']),
      idleContext,
      () => true,
    )

    expect(result.selected).toHaveLength(2)
    expect(result.creatable.map(c => c.id)).toEqual(['ready'])
    expect(result.deletable.map(c => c.id)).toEqual(['ready', 'draft'])
    expect(result.skippedCreateCount).toBe(1)
  })

  it('excludes uploading rows from bulk delete', () => {
    const uploading: ProgrammazioneRowState = {
      badge: 'uploading',
      canUpload: false,
      canCreateIndividuazione: false,
      canResumeIndividuazione: false,
    }
    expect(canBulkDelete(uploading)).toBe(false)
  })
})
