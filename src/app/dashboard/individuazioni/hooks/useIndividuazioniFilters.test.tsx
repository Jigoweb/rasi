import { renderHook, act } from '@testing-library/react'
import { useIndividuazioniFilters } from './useIndividuazioniFilters'
import type { CampagnaIndividuazione } from '@/features/individuazioni/services/individuazioni.service'

const campagna = (overrides: Partial<CampagnaIndividuazione>): CampagnaIndividuazione => ({
  id: 'campagna-1',
  nome: 'Estate Rai',
  emittente_id: 'rai',
  campagne_programmazione_id: 'programmazione-1',
  anno: 2026,
  stato: 'completata',
  created_at: '2026-06-23T10:00:00.000Z',
  emittenti: { nome: 'RAI' },
  ...overrides,
})

describe('useIndividuazioniFilters', () => {
  it('filters campagne by search, status, emittente and anno', () => {
    const campagne = [
      campagna({ id: 'rai-2026', nome: 'Estate Rai' }),
      campagna({ id: 'sky-2025', nome: 'Archivio Sky', emittente_id: 'sky', emittenti: { nome: 'Sky' }, anno: 2025, stato: 'bozza' }),
    ]
    const { result } = renderHook(() => useIndividuazioniFilters(campagne))

    act(() => {
      result.current.setSearchTerm('rai')
      result.current.setStatusFilter('completata')
      result.current.setEmittenteFilter('rai')
      result.current.setAnnoFilter('2026')
    })

    expect(result.current.filteredCampagne.map(c => c.id)).toEqual(['rai-2026'])
    expect(result.current.uniqueAnni).toEqual([2026, 2025])
    expect(result.current.uniqueEmittenti).toEqual([
      { id: 'rai', nome: 'RAI' },
      { id: 'sky', nome: 'Sky' },
    ])
  })

  it('resets all filters', () => {
    const { result } = renderHook(() => useIndividuazioniFilters([campagna({})]))

    act(() => {
      result.current.setSearchTerm('rai')
      result.current.setStatusFilter('completata')
      result.current.resetFilters()
    })

    expect(result.current.searchTerm).toBe('')
    expect(result.current.statusFilter).toBe('all')
    expect(result.current.emittenteFilter).toBe('all')
    expect(result.current.annoFilter).toBe('all')
  })
})
