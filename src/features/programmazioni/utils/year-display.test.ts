import { formatProgrammazioneYears, formatYearRange } from './year-display'

describe('formatYearRange', () => {
  it('formats single year', () => {
    expect(formatYearRange(2024, null)).toBe('2024')
  })

  it('formats range', () => {
    expect(formatYearRange(2021, 2024)).toBe('2021–2024')
  })
})

describe('formatProgrammazioneYears', () => {
  it('uses rilascio slots with fallback to anno', () => {
    expect(
      formatProgrammazioneYears({
        anno: 2019,
        anno_rilascio: 2015,
        anno_rilascio_fine: 2016,
      }),
    ).toEqual({ rilascio: '2015–2016', produzione: null })
  })

  it('shows produzione only when distinct from rilascio', () => {
    expect(
      formatProgrammazioneYears({
        anno_rilascio: 2015,
        anno_produzione: 2014,
      }),
    ).toEqual({ rilascio: '2015', produzione: '2014' })
  })
})
