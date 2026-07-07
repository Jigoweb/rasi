import { getNextIndividuazioneId, getReviewStatusSuccessMessage } from './review-queue'

describe('getNextIndividuazioneId', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

  it('returns the next id in the list', () => {
    expect(getNextIndividuazioneId(items, 'a')).toBe('b')
    expect(getNextIndividuazioneId(items, 'b')).toBe('c')
  })

  it('returns null for the last item or unknown id', () => {
    expect(getNextIndividuazioneId(items, 'c')).toBeNull()
    expect(getNextIndividuazioneId(items, 'missing')).toBeNull()
  })
})

describe('getReviewStatusSuccessMessage', () => {
  it('maps review states to operator-facing messages', () => {
    expect(getReviewStatusSuccessMessage('validato')).toBe('Individuazione validata')
    expect(getReviewStatusSuccessMessage('respinto')).toBe('Individuazione respinta')
    expect(getReviewStatusSuccessMessage('dubbioso')).toBe('Individuazione messa in revisione')
  })
})
