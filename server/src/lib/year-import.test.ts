import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mergeYearFieldsIntoPayload } from './year-import.js'

describe('mergeYearFieldsIntoPayload absent-marker coalesce', () => {
  it('skips an absent-marker first source and uses the next', () => {
    const payload: Record<string, unknown> = {}
    mergeYearFieldsIntoPayload(
      payload,
      { ANNO_RILASCIO_ITALIA: 'null', ANNO_RILASCIO: '2020' },
      { rilascio: { sources: ['ANNO_RILASCIO_ITALIA', 'ANNO_RILASCIO'] } },
    )
    assert.equal(payload.anno_rilascio, 2020)
    assert.equal(payload.anno, 2020)
  })
})
