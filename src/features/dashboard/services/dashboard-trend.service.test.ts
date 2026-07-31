import {
  buildMatchingTrendSeries,
  loadMatchingTrend,
  type MatchingTrendDeps,
  type MatchingTrendRow,
} from './dashboard-trend.service'

describe('buildMatchingTrendSeries', () => {
  const end = new Date('2026-07-31T15:00:00.000Z')

  it('returns 30 zero points when rows are empty', () => {
    const series = buildMatchingTrendSeries([], 30, end)

    expect(series).toHaveLength(30)
    expect(series[0].date).toBe('2026-07-02')
    expect(series[29].date).toBe('2026-07-31')
    expect(series.every(p => p.total === 0 && p.valid === 0 && p.rate === 0)).toBe(true)
  })

  it('buckets by UTC date and ignores rows outside the window', () => {
    const rows: MatchingTrendRow[] = [
      { created_at: '2026-07-01T23:00:00.000Z', stato: 'validato' }, // before window start (07-02)
      { created_at: '2026-07-02T01:00:00.000Z', stato: 'validato' },
      { created_at: '2026-07-02T22:00:00.000Z', stato: 'respinto' },
      { created_at: '2026-07-31T12:00:00.000Z', stato: 'dubbioso' },
      { created_at: '2026-08-01T00:00:00.000Z', stato: 'validato' }, // after end
    ]

    const series = buildMatchingTrendSeries(rows, 30, end)
    const first = series.find(p => p.date === '2026-07-02')!
    const last = series.find(p => p.date === '2026-07-31')!

    expect(first).toMatchObject({ total: 2, valid: 1, rate: 50 })
    expect(last).toMatchObject({ total: 1, valid: 1, rate: 100 })
  })

  it('treats all non-respinto stati as valid', () => {
    const rows: MatchingTrendRow[] = [
      { created_at: '2026-07-31T10:00:00.000Z', stato: 'individuato' },
      { created_at: '2026-07-31T11:00:00.000Z', stato: 'validato' },
      { created_at: '2026-07-31T12:00:00.000Z', stato: 'dubbioso' },
      { created_at: '2026-07-31T13:00:00.000Z', stato: 'respinto' },
    ]

    const series = buildMatchingTrendSeries(rows, 1, end)
    expect(series).toHaveLength(1)
    expect(series[0]).toMatchObject({ date: '2026-07-31', total: 4, valid: 3, rate: 75 })
  })

  it('rounds rate to one decimal place', () => {
    const rows: MatchingTrendRow[] = [
      { created_at: '2026-07-31T10:00:00.000Z', stato: 'validato' },
      { created_at: '2026-07-31T11:00:00.000Z', stato: 'respinto' },
      { created_at: '2026-07-31T12:00:00.000Z', stato: 'respinto' },
    ]

    const series = buildMatchingTrendSeries(rows, 1, end)
    // 1/3 * 100 = 33.333… → 33.3
    expect(series[0].rate).toBe(33.3)
  })

  it('fills missing days with zeros between sparse points', () => {
    const rows: MatchingTrendRow[] = [
      { created_at: '2026-07-29T10:00:00.000Z', stato: 'validato' },
      { created_at: '2026-07-31T10:00:00.000Z', stato: 'validato' },
    ]

    const series = buildMatchingTrendSeries(rows, 3, end)
    expect(series.map(p => p.date)).toEqual(['2026-07-29', '2026-07-30', '2026-07-31'])
    expect(series[1]).toMatchObject({ total: 0, valid: 0, rate: 0 })
  })

  it('respects custom days length', () => {
    expect(buildMatchingTrendSeries([], 7, end)).toHaveLength(7)
    expect(buildMatchingTrendSeries([], 7, end)[0].date).toBe('2026-07-25')
  })
})

describe('loadMatchingTrend', () => {
  it('requests since midnight UTC of the window start and builds the series', async () => {
    const loadIndividuazioniInRange = jest.fn().mockResolvedValue([
      { created_at: '2026-07-31T08:00:00.000Z', stato: 'validato' },
      { created_at: '2026-07-31T09:00:00.000Z', stato: 'respinto' },
    ])
    const deps: MatchingTrendDeps = { loadIndividuazioniInRange }
    const now = new Date('2026-07-31T15:00:00.000Z')

    const series = await loadMatchingTrend(deps, { days: 2, now })

    expect(loadIndividuazioniInRange).toHaveBeenCalledWith('2026-07-30T00:00:00.000Z')
    expect(series).toHaveLength(2)
    expect(series[1]).toMatchObject({ date: '2026-07-31', total: 2, valid: 1, rate: 50 })
  })
})
