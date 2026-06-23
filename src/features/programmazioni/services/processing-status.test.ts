import {
  PROCESSING_STALE_THRESHOLD_MIN,
  minutesSinceProcessingActivity,
  isProcessingStale,
  isProcessingActivityJobEligible,
  resolveProcessingActivity,
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

describe('resolveProcessingActivity', () => {
  const now = Date.parse('2026-06-08T12:00:00.000Z')
  const minsAgo = (m: number) => new Date(now - m * 60 * 1000).toISOString()
  const individuazioniActivity = '2026-06-08T11:30:00.000Z'
  const jobActivity = '2026-06-08T11:55:00.000Z'

  it('prefers campaign_jobs updated_at over individuazioni last_activity_at', () => {
    expect(
      resolveProcessingActivity(
        { last_activity_at: individuazioniActivity },
        { id: 'job-1', stato: 'running', updated_at: jobActivity },
        now,
      )
    ).toEqual({
      last_activity_at: jobActivity,
      activity_source: 'campaign_jobs',
    })
  })

  it('falls back to individuazioni last_activity_at when no job exists', () => {
    expect(
      resolveProcessingActivity(
        { last_activity_at: individuazioniActivity },
        null,
        now,
      )
    ).toEqual({
      last_activity_at: individuazioniActivity,
      activity_source: 'individuazioni',
    })
  })

  it('keeps unknown activity not stale', () => {
    const resolved = resolveProcessingActivity(
      { last_activity_at: null },
      null,
      now,
    )

    expect(resolved).toEqual({
      last_activity_at: null,
      activity_source: 'unknown',
    })
    expect(isProcessingStale(resolved, Date.parse('2026-06-08T12:00:00.000Z'))).toBe(false)
  })

  it('prefers recent error jobs over individuazioni activity', () => {
    expect(
      resolveProcessingActivity(
        { last_activity_at: individuazioniActivity },
        { id: 'job-2', stato: 'error', updated_at: minsAgo(PROCESSING_STALE_THRESHOLD_MIN) },
        now,
      )
    ).toEqual({
      last_activity_at: minsAgo(PROCESSING_STALE_THRESHOLD_MIN),
      activity_source: 'campaign_jobs',
    })
  })

  it('ignores old error jobs and falls back to individuazioni activity', () => {
    expect(
      resolveProcessingActivity(
        { last_activity_at: individuazioniActivity },
        { id: 'job-3', stato: 'error', updated_at: minsAgo(PROCESSING_STALE_THRESHOLD_MIN + 1) },
        now,
      )
    ).toEqual({
      last_activity_at: individuazioniActivity,
      activity_source: 'individuazioni',
    })
  })

  it.each(['queued', 'running'] as const)(
    'prefers %s jobs regardless of stale timestamp',
    (stato) => {
      expect(
        resolveProcessingActivity(
          { last_activity_at: individuazioniActivity },
          { id: `job-${stato}`, stato, updated_at: minsAgo(PROCESSING_STALE_THRESHOLD_MIN + 30) },
          now,
        )
      ).toEqual({
        last_activity_at: minsAgo(PROCESSING_STALE_THRESHOLD_MIN + 30),
        activity_source: 'campaign_jobs',
      })
    }
  )
})

describe('isProcessingActivityJobEligible', () => {
  const now = Date.parse('2026-06-08T12:00:00.000Z')
  const minsAgo = (m: number) => new Date(now - m * 60 * 1000).toISOString()

  it.each(['queued', 'running'] as const)('treats %s jobs as eligible', (stato) => {
    expect(
      isProcessingActivityJobEligible(
        { id: `job-${stato}`, stato, updated_at: null },
        now,
      )
    ).toBe(true)
  })

  it('treats recent error jobs as eligible', () => {
    expect(
      isProcessingActivityJobEligible(
        { id: 'job-error', stato: 'error', updated_at: minsAgo(PROCESSING_STALE_THRESHOLD_MIN) },
        now,
      )
    ).toBe(true)
  })

  it('treats old error jobs as ineligible', () => {
    expect(
      isProcessingActivityJobEligible(
        { id: 'job-error', stato: 'error', updated_at: minsAgo(PROCESSING_STALE_THRESHOLD_MIN + 1) },
        now,
      )
    ).toBe(false)
  })

  it.each(['completed', 'cancelled'] as const)('treats %s jobs as ineligible', (stato) => {
    expect(
      isProcessingActivityJobEligible(
        { id: `job-${stato}`, stato, updated_at: minsAgo(1) },
        now,
      )
    ).toBe(false)
  })
})
