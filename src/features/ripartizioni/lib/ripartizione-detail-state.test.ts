import { classifyRipartizioneLoadError } from './ripartizione-detail-state'

describe('classifyRipartizioneLoadError', () => {
  it('treats a missing row as not found', () => {
    expect(classifyRipartizioneLoadError(null)).toBe('ok')
    expect(classifyRipartizioneLoadError({ code: 'PGRST116', message: 'Cannot coerce the result to a single JSON object' })).toBe('missing')
    expect(classifyRipartizioneLoadError({
      message: 'JSON object requested, multiple (or no) rows returned',
    })).toBe('missing')
  })

  it('keeps permission and network failures visible', () => {
    expect(classifyRipartizioneLoadError({ code: '42501', message: 'permission denied for table campagne_ripartizione' })).toBe('failed')
    expect(classifyRipartizioneLoadError({ message: 'Failed to fetch' })).toBe('failed')
  })
})
