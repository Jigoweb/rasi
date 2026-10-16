import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

process.env.SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'

type QueryCall = {
  method: string
  args: unknown[]
}

type Query = {
  calls: QueryCall[]
}

/** Query builder finto: concatenabile e awaitable come quello di supabase-js. */
function createThenableQuery(resolveResult: (calls: QueryCall[]) => unknown, queries: Query[]) {
  const calls: QueryCall[] = []
  queries.push({ calls })
  const query: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'in', 'not', 'lt', 'update']) {
    query[method] = (...args: unknown[]) => {
      calls.push({ method, args })
      return query
    }
  }
  query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(resolveResult(calls)).then(resolve, reject)
  return query
}

function updatePayload(query: Query): Record<string, unknown> | undefined {
  return query.calls.find((call) => call.method === 'update')?.args[0] as
    | Record<string, unknown>
    | undefined
}

function eqValue(query: Query, column: string): unknown {
  return query.calls.find((call) => call.method === 'eq' && call.args[0] === column)?.args[1]
}

describe('job interrotti dal deploy del worker', () => {
  let autoResume: typeof import('./auto-resume.js')
  let activeJobs: typeof import('./active-jobs.js')
  let store: typeof import('./store.js')
  let supabaseModule: typeof import('../supabase.js')
  let originalFrom: typeof supabaseModule.supabaseService.from

  beforeEach(async () => {
    autoResume = await import('./auto-resume.js')
    activeJobs = await import('./active-jobs.js')
    store = await import('./store.js')
    supabaseModule = await import('../supabase.js')
    originalFrom = supabaseModule.supabaseService.from
  })

  afterEach(() => {
    ;(supabaseModule.supabaseService as any).from = originalFrom
    activeJobs.resetActiveJobsForTests()
  })

  it('rimette in coda i job con run creato e chiude gli altri', async () => {
    const queries: Query[] = []
    ;(supabaseModule.supabaseService as any).from = (table: string) => {
      assert.equal(table, 'campaign_jobs')
      return createThenableQuery(() => ({ data: null, error: null }), queries)
    }

    activeJobs.registerActiveJob('job-a')
    activeJobs.setActiveJobCampagnaIndividuazione('job-a', 'ci-a')
    activeJobs.registerActiveJob('job-b')

    const now = new Date('2026-10-13T08:54:11.000Z')
    const marked = await autoResume.interruptActiveJobs(now)

    assert.equal(marked, 2)
    assert.equal(activeJobs.isShutdownRequested(), true)

    const queued = queries.find((query) => eqValue(query, 'id') === 'job-a')!
    assert.deepEqual(updatePayload(queued), {
      stato: 'queued',
      interrotto_at: now.toISOString(),
      updated_at: now.toISOString(),
    })

    const failed = queries.find((query) => eqValue(query, 'id') === 'job-b')!
    assert.equal(updatePayload(failed)?.stato, 'error')
    assert.equal(updatePayload(failed)?.error, store.INTERRUPTED_DURING_INIT_ERROR)
  })

  it('riprende sulla stessa riga i job interrotti con le opzioni del run', async () => {
    const queries: Query[] = []
    const interrupted = [
      {
        id: 'job-1',
        campagne_programmazione_id: 'cp-1',
        campagne_individuazione_id: 'ci-1',
        created_by: 'user-1',
        opzioni: { soglia_titolo: 0.8, artista_ids: ['art-1'], mandato_override_artist_ids: null },
      },
      {
        id: 'job-2',
        campagne_programmazione_id: 'cp-2',
        campagne_individuazione_id: null,
        created_by: 'user-1',
        opzioni: null,
      },
    ]

    ;(supabaseModule.supabaseService as any).from = () =>
      createThenableQuery((calls) => {
        const update = calls.find((call) => call.method === 'update')?.args[0] as
          | Record<string, unknown>
          | undefined
        if (!update) return { data: interrupted, error: null }
        if (update.stato === 'running') return { data: [{ id: 'job-1' }], error: null }
        return { data: null, error: null }
      }, queries)

    const started: Array<Record<string, unknown>> = []
    const now = new Date('2026-10-13T09:00:00.000Z')
    const resumed = await autoResume.resumeInterruptedJobs(now, async (opts) => {
      started.push(opts as unknown as Record<string, unknown>)
    })

    assert.equal(resumed, 1)
    assert.deepEqual(started, [
      {
        jobId: 'job-1',
        campagneProgrammazioneId: 'cp-1',
        campagneIndividuazioneId: 'ci-1',
        userId: 'user-1',
        resume: true,
        sogliaItolo: 0.8,
        artistaIds: ['art-1'],
        mandatoOverrideArtistIds: null,
      },
    ])

    const lookup = queries[0]
    const cutoff = lookup.calls.find((call) => call.method === 'lt')?.args
    assert.deepEqual(cutoff, ['interrotto_at', '2026-10-13T08:59:00.000Z'])

    const failed = queries.find((query) => eqValue(query, 'id') === 'job-2')!
    assert.equal(updatePayload(failed)?.error, store.INTERRUPTED_DURING_INIT_ERROR)
  })

  it('non riavvia un job già preso in carico da un altro worker', async () => {
    const queries: Query[] = []
    ;(supabaseModule.supabaseService as any).from = () =>
      createThenableQuery((calls) => {
        const isUpdate = calls.some((call) => call.method === 'update')
        if (!isUpdate) {
          return {
            data: [
              {
                id: 'job-1',
                campagne_programmazione_id: 'cp-1',
                campagne_individuazione_id: 'ci-1',
                created_by: 'user-1',
                opzioni: null,
              },
            ],
            error: null,
          }
        }
        return { data: [], error: null }
      }, queries)

    let started = 0
    const resumed = await autoResume.resumeInterruptedJobs(new Date(), async () => {
      started += 1
    })

    assert.equal(resumed, 0)
    assert.equal(started, 0)
  })

  it('non riprende nulla mentre il worker si sta spegnendo', async () => {
    ;(supabaseModule.supabaseService as any).from = () => {
      throw new Error('nessuna query attesa')
    }
    activeJobs.requestShutdown()

    assert.equal(await autoResume.resumeInterruptedJobs(new Date(), async () => {}), 0)
  })
})
