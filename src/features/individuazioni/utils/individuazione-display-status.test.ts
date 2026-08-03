import {
  canResumeCampagnaIndividuazione,
  getIndividuazioneDisplayStatus,
  matchesIndividuazioneStatusFilter,
} from './individuazione-display-status'

describe('individuazione-display-status', () => {
  const now = Date.parse('2026-08-03T12:00:00.000Z')

  it('classifies stale in_corso as interrotto', () => {
    expect(getIndividuazioneDisplayStatus(
      'in_corso',
      { last_activity_at: '2026-08-03T11:00:00.000Z', job_stato: null } as any,
      now,
    )).toBe('interrotto')
  })

  it('classifies job error as interrotto', () => {
    expect(getIndividuazioneDisplayStatus(
      'in_corso',
      { last_activity_at: '2026-08-03T11:55:00.000Z', job_stato: 'error' } as any,
      now,
    )).toBe('interrotto')
  })

  it('keeps active running as in_corso', () => {
    expect(getIndividuazioneDisplayStatus(
      'in_corso',
      { last_activity_at: '2026-08-03T11:55:00.000Z', job_stato: 'running' } as any,
      now,
    )).toBe('in_corso')
  })

  it('in_corso filter excludes interrupted campaigns', () => {
    const campagna = { stato: 'in_corso' as const }
    const interrupted = { last_activity_at: '2026-08-03T11:00:00.000Z', job_stato: null } as any
    const running = { last_activity_at: '2026-08-03T11:55:00.000Z', job_stato: 'running' } as any

    expect(matchesIndividuazioneStatusFilter(campagna, 'in_corso', interrupted, now)).toBe(false)
    expect(matchesIndividuazioneStatusFilter(campagna, 'in_corso', running, now)).toBe(true)
    expect(matchesIndividuazioneStatusFilter(campagna, 'interrotto', interrupted, now)).toBe(true)
    expect(matchesIndividuazioneStatusFilter(campagna, 'interrotto', running, now)).toBe(false)
  })

  it('canResume for interrotto and da_verificare only', () => {
    const campagna = { stato: 'in_corso' as const }
    expect(canResumeCampagnaIndividuazione(
      campagna,
      { last_activity_at: '2026-08-03T11:00:00.000Z', job_stato: null } as any,
      now,
    )).toBe(true)
    expect(canResumeCampagnaIndividuazione(
      campagna,
      { last_activity_at: null, job_stato: null } as any,
      now,
    )).toBe(true)
    expect(canResumeCampagnaIndividuazione(
      campagna,
      { last_activity_at: '2026-08-03T11:55:00.000Z', job_stato: 'running' } as any,
      now,
    )).toBe(false)
  })
})
