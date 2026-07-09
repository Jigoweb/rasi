import { applyYearFieldsToPayload } from './year-policy'
import { parseYearValue } from './year-parse'

describe('parseYearValue', () => {
  it('parses single year', () => {
    expect(parseYearValue('2024')).toEqual({
      anno: 2024,
      anno_fine: null,
      grezzo: '2024',
      kind: 'single',
    })
    expect(parseYearValue(2019)).toEqual({
      anno: 2019,
      anno_fine: null,
      grezzo: '2019',
      kind: 'single',
    })
  })

  it('parses year ranges in one cell', () => {
    expect(parseYearValue('2021-2024')).toEqual({
      anno: 2021,
      anno_fine: 2024,
      grezzo: '2021-2024',
      kind: 'range',
    })
    expect(parseYearValue('2021 – 2024')).toEqual({
      anno: 2021,
      anno_fine: 2024,
      grezzo: '2021 – 2024',
      kind: 'range',
    })
    expect(parseYearValue('2024/2021')).toEqual({
      anno: 2021,
      anno_fine: 2024,
      grezzo: '2024/2021',
      kind: 'range',
    })
  })

  it('returns null for invalid values', () => {
    expect(parseYearValue('')).toBeNull()
    expect(parseYearValue('nan')).toBeNull()
    expect(parseYearValue(null)).toBeNull()
  })
})

describe('applyYearFieldsToPayload', () => {
  it('prefers rilascio as canonical year', () => {
    const row = {
      ANNO_RILASCIO_ITALIA: '2015',
      ANNO_DI_RIFERIMENTO: '2014',
    }
    const applied = applyYearFieldsToPayload(row, {
      rilascio: { sources: ['ANNO_RILASCIO_ITALIA'] },
      produzione: { sources: ['ANNO_DI_RIFERIMENTO'] },
    })

    expect(applied.anno).toBe(2015)
    expect(applied.anno_semantica).toBe('rilascio')
    expect(applied.anno_rilascio).toBe(2015)
    expect(applied.anno_produzione).toBe(2014)
  })

  it('expands range on rilascio slot', () => {
    const applied = applyYearFieldsToPayload(
      { release_year: '2021-2024' },
      { rilascio: { sources: ['release_year'] } },
    )

    expect(applied.anno).toBe(2021)
    expect(applied.anno_fine).toBe(2024)
    expect(applied.anno_rilascio_fine).toBe(2024)
    expect(applied.anno_grezzo).toBe('2021-2024')
  })

  it('falls back to legacy anno when no policy', () => {
    const applied = applyYearFieldsToPayload({}, null, 2018)
    expect(applied.anno).toBe(2018)
    expect(applied.anno_semantica).toBe('rilascio')
    expect(applied.anno_rilascio).toBe(2018)
  })

  it('skips an absent-marker first source and uses the next (coalesce)', () => {
    const applied = applyYearFieldsToPayload(
      { ANNO_RILASCIO_ITALIA: '-', ANNO_RILASCIO: '2020' },
      { rilascio: { sources: ['ANNO_RILASCIO_ITALIA', 'ANNO_RILASCIO'] } },
    )
    expect(applied.anno_rilascio).toBe(2020)
    expect(applied.anno).toBe(2020)
  })
})
