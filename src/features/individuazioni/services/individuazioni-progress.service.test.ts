import { calculateProcessingPercent } from './individuazioni-progress.service'

describe('calculateProcessingPercent', () => {
  it('returns rounded processing percent and handles zero totals', () => {
    expect(calculateProcessingPercent(25, 100)).toBe(25)
    expect(calculateProcessingPercent(1, 3)).toBe(33)
    expect(calculateProcessingPercent(10, 0)).toBe(0)
  })
})
