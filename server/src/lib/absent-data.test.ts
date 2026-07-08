// server/src/lib/absent-data.test.ts
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isAbsentMarker } from './absent-data.js'

describe('isAbsentMarker (server)', () => {
  it('matches known markers', () => {
    assert.equal(isAbsentMarker('N/A'), true)
    assert.equal(isAbsentMarker(' n.d. '), true)
    assert.equal(isAbsentMarker('null'), true)
    assert.equal(isAbsentMarker('--'), true)
  })
  it('ignores substrings and non-strings', () => {
    assert.equal(isAbsentMarker('The N/A Story'), false)
    assert.equal(isAbsentMarker('---'), false)
    assert.equal(isAbsentMarker(0), false)
    assert.equal(isAbsentMarker(null), false)
  })
})
