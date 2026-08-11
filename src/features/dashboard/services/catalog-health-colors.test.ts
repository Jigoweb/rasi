import {
  completenessBarClass,
  completenessBadgeClass,
} from '../services/catalog-health-colors'

describe('data health completeness colors', () => {
  it('uses emerald for full completeness instead of impact-alarm red', () => {
    expect(completenessBarClass(100)).toBe('bg-emerald-600')
    expect(completenessBadgeClass(100)).toContain('emerald')
  })

  it('escalates bar color only as completeness drops', () => {
    expect(completenessBarClass(90)).toBe('bg-sky-600')
    expect(completenessBarClass(60)).toBe('bg-amber-500')
    expect(completenessBarClass(20)).toBe('bg-rose-600')
  })
})
