// src/features/programmazioni/utils/absent-data.test.ts
import { isAbsentMarker } from './absent-data'

describe('isAbsentMarker', () => {
  it('matches known markers, case-insensitive and trimmed', () => {
    expect(isAbsentMarker('N/A')).toBe(true)
    expect(isAbsentMarker(' n/a ')).toBe(true)
    expect(isAbsentMarker('NA')).toBe(true)
    expect(isAbsentMarker('N.D.')).toBe(true)
    expect(isAbsentMarker('n.d')).toBe(true)
    expect(isAbsentMarker('nd')).toBe(true)
    expect(isAbsentMarker('null')).toBe(true)
    expect(isAbsentMarker('-')).toBe(true)
    expect(isAbsentMarker('--')).toBe(true)
  })
  it('does not match substrings or real values', () => {
    expect(isAbsentMarker('The N/A Story')).toBe(false)
    expect(isAbsentMarker('12-34')).toBe(false)
    expect(isAbsentMarker('---')).toBe(false)
    expect(isAbsentMarker('Nashville')).toBe(false)
  })
  it('returns false for non-strings', () => {
    expect(isAbsentMarker(0)).toBe(false)
    expect(isAbsentMarker(null)).toBe(false)
    expect(isAbsentMarker(undefined)).toBe(false)
  })
})
