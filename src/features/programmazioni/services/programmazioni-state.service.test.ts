import { getProgrammazioneRowState } from './programmazioni-state.service'

describe('getProgrammazioneRowState', () => {
  const now = Date.parse('2026-06-23T12:00:00.000Z')
  const minutesAgo = (minutes: number) => new Date(now - minutes * 60 * 1000).toISOString()

  it('allows upload and individuazione when dataset is in review with data', () => {
    expect(
      getProgrammazioneRowState({
        datasetStatus: 'in_review',
        hasLocalRuntimeProcess: false,
        hasData: true,
        now,
      })
    ).toMatchObject({
      badge: 'in_review',
      canUpload: true,
      canCreateIndividuazione: true,
      canResumeIndividuazione: false,
    })
  })

  it('shows upload running and blocks individuazione while upload job is active', () => {
    expect(
      getProgrammazioneRowState({
        datasetStatus: 'in_review',
        uploadJob: { stato: 'running', righe_processate: 10, righe_totali: 100 },
        hasLocalRuntimeProcess: false,
        hasData: true,
        now,
      })
    ).toMatchObject({
      badge: 'uploading',
      canUpload: false,
      canCreateIndividuazione: false,
      blockingReason: 'Upload programmazione in corso',
    })
  })

  it('labels active campaign jobs as individuazione, not generic processing', () => {
    expect(
      getProgrammazioneRowState({
        datasetStatus: 'in_review',
        campaignJob: { stato: 'running', updated_at: minutesAgo(1) },
        progress: { last_activity_at: minutesAgo(1), job_stato: 'running' },
        hasLocalRuntimeProcess: false,
        hasData: true,
        now,
      })
    ).toMatchObject({
      badge: 'individuazione_running',
      canUpload: false,
      canCreateIndividuazione: false,
      blockingReason: 'Individuazione in corso',
    })
  })

  it('surfaces campaign job errors as resumable individuazione interruptions', () => {
    expect(
      getProgrammazioneRowState({
        datasetStatus: 'in_corso',
        campaignJob: { stato: 'error', error: 'statement timeout', updated_at: minutesAgo(20) },
        progress: { last_activity_at: null, job_stato: 'error' },
        hasLocalRuntimeProcess: false,
        hasData: true,
        now,
      })
    ).toMatchObject({
      badge: 'individuazione_stale',
      canUpload: false,
      canCreateIndividuazione: false,
      canResumeIndividuazione: true,
      blockingReason: 'statement timeout',
    })
  })

  it('treats in_corso without activity as recoverable instead of running forever', () => {
    expect(
      getProgrammazioneRowState({
        datasetStatus: 'in_corso',
        progress: { last_activity_at: null, job_stato: null },
        hasLocalRuntimeProcess: false,
        hasData: true,
        now,
      })
    ).toMatchObject({
      badge: 'individuazione_stale',
      canResumeIndividuazione: true,
    })
  })
})
