import { hasMultiValueFilter, matchesMultiValueFilter } from './multi-value-filter'

describe('multi-value-filter', () => {
  it('matches all when selection is empty', () => {
    expect(matchesMultiValueFilter([], 'e1')).toBe(true)
    expect(matchesMultiValueFilter([], null)).toBe(true)
  })

  it('matches any selected value', () => {
    expect(matchesMultiValueFilter(['e1', 'e2'], 'e1')).toBe(true)
    expect(matchesMultiValueFilter(['2025', '2026'], 2026)).toBe(true)
    expect(matchesMultiValueFilter(['e1'], 'e3')).toBe(false)
  })

  it('rejects null/empty when a filter is active', () => {
    expect(matchesMultiValueFilter(['e1'], null)).toBe(false)
    expect(matchesMultiValueFilter(['e1'], '')).toBe(false)
  })

  it('detects active multi filters', () => {
    expect(hasMultiValueFilter([])).toBe(false)
    expect(hasMultiValueFilter(['a'])).toBe(true)
  })
})
