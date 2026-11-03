import { formatReleaseDateForDb } from './release-date'

describe('formatReleaseDateForDb', () => {
  it('formats a complete date and rejects partials without inventing 01-01', () => {
    expect(formatReleaseDateForDb({ year: 2008, month: 1, day: 20 })).toBe('2008-01-20')
    expect(formatReleaseDateForDb({ year: 2008, month: null, day: null })).toBeNull()
    expect(formatReleaseDateForDb({ year: 2008, month: 3, day: null })).toBeNull()
    expect(formatReleaseDateForDb(null)).toBeNull()
  })
})
