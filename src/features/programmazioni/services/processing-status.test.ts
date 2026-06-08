import {
  PROCESSING_STALE_THRESHOLD_MIN,
  minutesSinceProcessingActivity,
  isProcessingStale,
} from './programmazioni.service'

describe('minutesSinceProcessingActivity', () => {
  const now = Date.parse('2026-06-08T12:00:00.000Z')

  it('returns null when there is no progress', () => {
    expect(minutesSinceProcessingActivity(null, now)).toBeNull()
    expect(minutesSinceProcessingActivity(undefined, now)).toBeNull()
  })

  it('returns null when last_activity_at is missing', () => {
    expect(minutesSinceProcessingActivity({ last_activity_at: null }, now)).toBeNull()
  })

  it('computes whole minutes elapsed since last activity', () => {
    const ts = new Date(now - 7 * 60 * 1000).toISOString() // 7 minutes ago
    expect(minutesSinceProcessingActivity({ last_activity_at: ts }, now)).toBe(7)
  })
})

describe('isProcessingStale', () => {
  const now = Date.parse('2026-06-08T12:00:00.000Z')
  const minsAgo = (m: number) => new Date(now - m * 60 * 1000).toISOString()

  it('is not stale when activity is recent', () => {
    expect(isProcessingStale({ last_activity_at: minsAgo(3) }, now)).toBe(false)
  })

  it('is not stale exactly at the threshold (strictly greater)', () => {
    expect(isProcessingStale({ last_activity_at: minsAgo(PROCESSING_STALE_THRESHOLD_MIN) }, now)).toBe(false)
  })

  it('is stale past the threshold', () => {
    expect(isProcessingStale({ last_activity_at: minsAgo(PROCESSING_STALE_THRESHOLD_MIN + 1) }, now)).toBe(true)
  })

  it('treats unknown activity as NOT stale', () => {
    expect(isProcessingStale(null, now)).toBe(false)
    expect(isProcessingStale({ last_activity_at: null }, now)).toBe(false)
  })
})
