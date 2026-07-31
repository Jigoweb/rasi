import type { CampagnaIndividuazione } from './individuazioni.service'
import {
  canDeleteCampagnaIndividuazione,
  canExportCampagnaIndividuazione,
  classifyIndividuazioniBulkSelection,
  getCampagnaIndividuazioniCount,
} from './individuazioni-bulk-actions.service'

describe('individuazioni-bulk-actions.service', () => {
  const campagna = (overrides: Partial<CampagnaIndividuazione> = {}): CampagnaIndividuazione => ({
    id: 'c1',
    nome: 'Test',
    emittente_id: 'e1',
    campagne_programmazione_id: 'p1',
    anno: 2026,
    stato: 'completata',
    created_at: '2026-06-23T10:00:00.000Z',
    statistiche: { individuazioni_create: 10 },
    ...overrides,
  })

  it('counts individuazioni from stats or fallback field', () => {
    expect(getCampagnaIndividuazioniCount(campagna())).toBe(10)
    expect(getCampagnaIndividuazioniCount(campagna({
      statistiche: undefined,
      individuazioni_count: 4,
    }))).toBe(4)
  })

  it('marks empty campaigns as non-exportable', () => {
    expect(canExportCampagnaIndividuazione(campagna({
      statistiche: { individuazioni_create: 0 },
    }))).toBe(false)
  })

  it('blocks delete while campagna is actively processing', () => {
    const running = campagna({ stato: 'in_corso' })
    expect(canDeleteCampagnaIndividuazione(running, () => true)).toBe(false)
    expect(canDeleteCampagnaIndividuazione(running, () => false)).toBe(true)
  })

  it('classifies selected campaigns into exportable and deletable', () => {
    const empty = campagna({ id: 'empty', statistiche: { individuazioni_create: 0 } })
    const ready = campagna({ id: 'ready' })
    const processing = campagna({ id: 'proc', stato: 'in_corso', campagne_programmazione_id: 'busy' })

    const result = classifyIndividuazioniBulkSelection(
      [empty, ready, processing],
      new Set(['empty', 'ready', 'proc']),
      id => id === 'busy',
    )

    expect(result.exportable.map(c => c.id)).toEqual(['ready', 'proc'])
    expect(result.deletable.map(c => c.id)).toEqual(['empty', 'ready'])
    expect(result.skippedExportCount).toBe(1)
    expect(result.skippedDeleteCount).toBe(1)
  })
})
