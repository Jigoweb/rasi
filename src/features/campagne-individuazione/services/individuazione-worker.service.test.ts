import {
  findActiveWorkerJob,
  getIndividuazioneRuntimeMode,
  getWorkerUrl,
  mapCompletedWorkerJob,
  mapTerminalWorkerJobError,
  mapWorkerJobToProgress,
} from './campagne-individuazione.service'
import type { WorkerJobSnapshot } from './individuazione-contract'

const mockFrom = jest.fn()
const mockGetSession = jest.fn()

jest.mock('@/shared/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}))

const baseWorkerJob = (overrides: Partial<WorkerJobSnapshot> = {}): WorkerJobSnapshot => ({
  id: 'job-1',
  stato: 'running',
  fase: 'processing',
  campagne_programmazione_id: 'campagna-programmazione-1',
  campagne_individuazione_id: null,
  programmazioni_totali: 100,
  programmazioni_processate: 25,
  individuazioni_create: 10,
  current_chunk: 1,
  total_chunks: 4,
  error: null,
  ...overrides,
})

describe('individuazione worker service helpers', () => {
  const originalWorkerUrl = process.env.NEXT_PUBLIC_WORKER_URL

  afterEach(() => {
    if (originalWorkerUrl === undefined) {
      delete process.env.NEXT_PUBLIC_WORKER_URL
    } else {
      process.env.NEXT_PUBLIC_WORKER_URL = originalWorkerUrl
    }
    mockFrom.mockReset()
    mockGetSession.mockReset()
  })

  it('trims trailing slashes from worker URL', () => {
    process.env.NEXT_PUBLIC_WORKER_URL = 'https://worker.example.com///'

    expect(getWorkerUrl()).toBe('https://worker.example.com')
  })

  it('returns null when worker URL is missing', () => {
    delete process.env.NEXT_PUBLIC_WORKER_URL

    expect(getWorkerUrl()).toBeNull()
  })

  it('uses worker runtime mode when worker URL is configured', () => {
    process.env.NEXT_PUBLIC_WORKER_URL = 'https://worker.example.com'

    expect(getIndividuazioneRuntimeMode()).toBe('worker')
  })

  it('uses legacy serverless runtime mode when worker URL is missing', () => {
    delete process.env.NEXT_PUBLIC_WORKER_URL

    expect(getIndividuazioneRuntimeMode()).toBe('legacy-serverless')
  })

  it('maps a completed worker snapshot to a successful finalize response', () => {
    const startTime = Date.now() - 100
    const result = mapCompletedWorkerJob(
      baseWorkerJob({
        stato: 'completed',
        fase: 'completed',
        campagne_individuazione_id: 'campagna-individuazione-1',
        programmazioni_processate: 100,
        individuazioni_create: 42,
        current_chunk: 4,
      }),
      startTime
    )

    expect(result.success).toBe(true)
    expect((result.data?.statistiche as any).campagne_individuazione_id).toBe('campagna-individuazione-1')
    expect((result.data?.statistiche as any).tempo_processamento_ms).toBeGreaterThanOrEqual(0)
  })

  it('maps terminal error and cancelled worker snapshots to failed responses', () => {
    expect(mapTerminalWorkerJobError(baseWorkerJob({ stato: 'error', error: 'Worker failed' }))).toEqual({
      success: false,
      error: 'Worker failed',
    })
    expect(mapTerminalWorkerJobError(baseWorkerJob({ stato: 'cancelled', error: null }))).toEqual({
      success: false,
      error: 'Job terminato con errore',
    })
    expect(mapTerminalWorkerJobError(baseWorkerJob({ stato: 'running' }))).toBeNull()
  })

  it('maps nullable worker progress numbers to zero and null error to undefined', () => {
    const progress = mapWorkerJobToProgress(
      baseWorkerJob({
        fase: null,
        programmazioni_totali: null,
        programmazioni_processate: null,
        individuazioni_create: null,
        current_chunk: null,
        total_chunks: null,
        error: null,
      })
    )

    expect(progress).toEqual({
      phase: 'processing',
      programmazioni_totali: 0,
      programmazioni_processate: 0,
      individuazioni_create: 0,
      current_chunk: 0,
      total_chunks: 0,
      error: undefined,
    })
  })

  it('finds active worker jobs scoped to the requested campaign', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    })
    const query = {
      select: jest.fn(),
      eq: jest.fn(),
      in: jest.fn(),
      order: jest.fn(),
      limit: jest.fn(),
      maybeSingle: jest.fn(),
    }
    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.in.mockReturnValue(query)
    query.order.mockReturnValue(query)
    query.limit.mockReturnValue(query)
    query.maybeSingle.mockResolvedValue({
      data: {
        id: 'job-1',
        campagne_programmazione_id: 'campagna-programmazione-1',
      },
      error: null,
    })
    mockFrom.mockReturnValue(query)

    await expect(findActiveWorkerJob('campagna-programmazione-1')).resolves.toEqual({
      jobId: 'job-1',
      campagneProgrammazioneId: 'campagna-programmazione-1',
    })

    expect(mockFrom).toHaveBeenCalledWith('campaign_jobs')
    expect(query.eq).toHaveBeenCalledWith('campagne_programmazione_id', 'campagna-programmazione-1')
    expect(query.eq).toHaveBeenCalledWith('created_by', 'user-1')
    expect(query.in).toHaveBeenCalledWith('stato', ['queued', 'running'])
  })

  it('does not run a global active worker job lookup without a campaign id', async () => {
    await expect(findActiveWorkerJob()).resolves.toBeNull()

    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('does not query active worker jobs without an authenticated user', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    await expect(findActiveWorkerJob('campagna-programmazione-1')).resolves.toBeNull()

    expect(mockFrom).not.toHaveBeenCalled()
  })
})
