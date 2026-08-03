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

  it('classifies selected campaigns into exportable, deletable and resumable', () => {
    const empty = campagna({ id: 'empty', statistiche: { individuazioni_create: 0 } })
    const ready = campagna({ id: 'ready' })
    const processing = campagna({ id: 'proc', stato: 'in_corso', campagne_programmazione_id: 'busy' })
    const interrupted = campagna({
      id: 'int',
      stato: 'in_corso',
      campagne_programmazione_id: 'prog-int',
      statistiche: { individuazioni_create: 0 },
    })
    const now = Date.parse('2026-08-03T12:00:00.000Z')

    const result = classifyIndividuazioniBulkSelection(
      [empty, ready, processing, interrupted],
      new Set(['empty', 'ready', 'proc', 'int']),
      id => id === 'busy',
      {
        int: { last_activity_at: '2026-08-03T11:00:00.000Z', job_stato: 'error' } as any,
        proc: { last_activity_at: '2026-08-03T11:55:00.000Z', job_stato: 'running' } as any,
      },
      id => id !== 'busy',
      now,
    )

    expect(result.exportable.map(c => c.id)).toEqual(['ready', 'proc'])
    expect(result.deletable.map(c => c.id)).toEqual(['empty', 'ready', 'int'])
    expect(result.resumable.map(c => c.id)).toEqual(['int'])
    expect(result.skippedExportCount).toBe(2)
    expect(result.skippedDeleteCount).toBe(1)
    expect(result.skippedResumeCount).toBe(3)
  })
})
