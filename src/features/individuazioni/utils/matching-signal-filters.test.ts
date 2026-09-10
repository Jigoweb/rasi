import {
  applyMatchingSignalFilters,
  buildMatchingSignalOrFilter,
  matchingSignalPredicate,
} from './matching-signal-filters'

describe('matchingSignalPredicate', () => {
  it('builds stable PostgREST fragments per code', () => {
    expect(matchingSignalPredicate('titolo_debole')).toContain('score.lt.70')
    expect(matchingSignalPredicate('regia_incoerente')).toContain('penalita.eq.true')
    expect(matchingSignalPredicate('episodio_mancante')).toContain('episodio_mancante.eq.true')
  })
})

describe('applyMatchingSignalFilters', () => {
  function createQuery() {
    const calls: Array<{ method: string; args: unknown[] }> = []
    const query = {
      or(filters: string) {
        calls.push({ method: 'or', args: [filters] })
        return query
      },
      filter(column: string, operator: string, value: unknown) {
        calls.push({ method: 'filter', args: [column, operator, value] })
        return query
      },
    }
    return { query, calls }
  }

  it('is a no-op for empty selection', () => {
    const { query, calls } = createQuery()
    applyMatchingSignalFilters(query, [], 'or')
    applyMatchingSignalFilters(query, undefined, 'and')
    expect(calls).toEqual([])
  })

  it('ORs selected predicates in one call', () => {
    const { query, calls } = createQuery()
    applyMatchingSignalFilters(query, ['titolo_debole', 'regia_incoerente'], 'or')
    expect(calls).toHaveLength(1)
    expect(calls[0].method).toBe('or')
    expect(String(calls[0].args[0])).toContain(matchingSignalPredicate('titolo_debole'))
    expect(String(calls[0].args[0])).toContain(matchingSignalPredicate('regia_incoerente'))
    expect(buildMatchingSignalOrFilter(['titolo_debole'])).toBe(matchingSignalPredicate('titolo_debole'))
  })

  it('ANDs by chaining one or() per predicate', () => {
    const { query, calls } = createQuery()
    applyMatchingSignalFilters(query, ['anno_fuori_tolleranza', 'episodio_mancante'], 'and')
    expect(calls).toHaveLength(2)
    expect(calls[0]).toEqual({
      method: 'or',
      args: [matchingSignalPredicate('anno_fuori_tolleranza')],
    })
    expect(calls[1]).toEqual({
      method: 'or',
      args: [matchingSignalPredicate('episodio_mancante')],
    })
  })
})
