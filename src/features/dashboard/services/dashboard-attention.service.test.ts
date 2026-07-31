import {
  buildAttentionQueue,
  loadAttentionQueue,
  type DashboardAttentionDeps,
} from './dashboard-attention.service'

describe('buildAttentionQueue', () => {
  it('omits items with count === 0', () => {
    const queue = buildAttentionQueue({
      matchDaRevisionare: 3,
      uploadErrors: 0,
      campagneInCorso: 2,
      criticalOpereGaps: 0,
    })

    expect(queue.map(item => item.id)).toEqual([
      'match-da-revisionare',
      'campagne-individuazione-aperte',
    ])
  })

  it('orders review → upload errors → campagne in_corso → critical gaps', () => {
    const queue = buildAttentionQueue({
      matchDaRevisionare: 1,
      uploadErrors: 2,
      campagneInCorso: 3,
      criticalOpereGaps: 4,
    })

    expect(queue.map(item => item.id)).toEqual([
      'match-da-revisionare',
      'upload-campagne-errore',
      'campagne-individuazione-aperte',
      'gap-critici-matching-opere',
    ])
  })

  it('caps at 7 items', () => {
    const queue = buildAttentionQueue({
      matchDaRevisionare: 10,
      uploadErrors: 10,
      campagneInCorso: 10,
      criticalOpereGaps: 10,
    })

    expect(queue).toHaveLength(4)
    expect(queue.length).toBeLessThanOrEqual(7)
  })

  it('returns empty queue when all counts are zero', () => {
    expect(
      buildAttentionQueue({
        matchDaRevisionare: 0,
        uploadErrors: 0,
        campagneInCorso: 0,
        criticalOpereGaps: 0,
      })
    ).toEqual([])
  })

  it('sets severity, href and count on each item', () => {
    const queue = buildAttentionQueue({
      matchDaRevisionare: 5,
      uploadErrors: 1,
      campagneInCorso: 2,
      criticalOpereGaps: 7,
    })

    expect(queue[0]).toMatchObject({
      id: 'match-da-revisionare',
      severity: 'high',
      title: 'Match da revisionare',
      count: 5,
      href: '/dashboard/individuazioni',
    })
    expect(queue[1]).toMatchObject({
      id: 'upload-campagne-errore',
      severity: 'high',
      href: '/dashboard/programmazioni',
      count: 1,
    })
    expect(queue[2]).toMatchObject({
      id: 'campagne-individuazione-aperte',
      severity: 'medium',
      href: '/dashboard/individuazioni?stato=in_corso',
      count: 2,
    })
    expect(queue[3]).toMatchObject({
      id: 'gap-critici-matching-opere',
      severity: 'medium',
      href: '#data-health',
      count: 7,
    })
  })
})

describe('loadAttentionQueue', () => {
  const deps = (overrides: Partial<DashboardAttentionDeps> = {}): DashboardAttentionDeps => ({
    countMatchDaRevisionare: jest.fn().mockResolvedValue(4),
    countUploadErrors: jest.fn().mockResolvedValue(1),
    countCampagneIndividuazioneInCorso: jest.fn().mockResolvedValue(3),
    ...overrides,
  })

  it('loads counts via deps and builds the queue with criticalOpereGaps input', async () => {
    const mocked = deps()
    const queue = await loadAttentionQueue(mocked, { criticalOpereGaps: 9 })

    expect(mocked.countMatchDaRevisionare).toHaveBeenCalled()
    expect(mocked.countUploadErrors).toHaveBeenCalled()
    expect(mocked.countCampagneIndividuazioneInCorso).toHaveBeenCalled()
    expect(queue.map(item => item.id)).toEqual([
      'match-da-revisionare',
      'upload-campagne-errore',
      'campagne-individuazione-aperte',
      'gap-critici-matching-opere',
    ])
    expect(queue.find(item => item.id === 'gap-critici-matching-opere')?.count).toBe(9)
  })

  it('omits zero-count items from loaded deps', async () => {
    const queue = await loadAttentionQueue(
      deps({
        countMatchDaRevisionare: jest.fn().mockResolvedValue(0),
        countUploadErrors: jest.fn().mockResolvedValue(0),
        countCampagneIndividuazioneInCorso: jest.fn().mockResolvedValue(0),
      }),
      { criticalOpereGaps: 0 }
    )

    expect(queue).toEqual([])
  })
})
