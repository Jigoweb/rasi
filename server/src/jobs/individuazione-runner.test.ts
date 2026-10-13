import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

process.env.SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'

type QueryCall = {
  method: string
  args: unknown[]
}

function createPatchQuery(calls: QueryCall[]) {
  const query = {
    update: (...args: unknown[]) => {
      calls.push({ method: 'update', args })
      return query
    },
    eq: async (...args: unknown[]) => {
      calls.push({ method: 'eq', args })
      return { error: null }
    },
  }
  return query
}

function createCampagnaStatusQuery(stato: string, calls: QueryCall[]) {
  const query = {
    select: (...args: unknown[]) => {
      calls.push({ method: 'select', args })
      return query
    },
    eq: (...args: unknown[]) => {
      calls.push({ method: 'eq', args })
      return query
    },
    maybeSingle: async () => ({ data: { stato }, error: null }),
  }
  return query
}

type QueryResultResolver = (calls: QueryCall[]) => unknown

/** Query builder finto: concatenabile e awaitable come quello di supabase-js. */
function createThenableQuery(resolveResult: QueryResultResolver, log?: QueryCall[]) {
  const calls: QueryCall[] = []
  const query: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'in', 'not', 'lt', 'order', 'limit', 'update', 'insert']) {
    query[method] = (...args: unknown[]) => {
      calls.push({ method, args })
      log?.push({ method, args })
      return query
    }
  }
  query.maybeSingle = async () => resolveResult(calls)
  query.single = async () => resolveResult(calls)
  query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(resolveResult(calls)).then(resolve, reject)
  return query
}

function updatesOf(log: QueryCall[]): Array<Record<string, unknown>> {
  return log
    .filter((call) => call.method === 'update')
    .map((call) => call.args[0] as Record<string, unknown>)
}

describe('individuazione runner', () => {
  let runner: typeof import('./individuazione-runner.js')
  let activeJobs: typeof import('./active-jobs.js')
  let supabaseModule: typeof import('../supabase.js')
  let originalFrom: typeof supabaseModule.supabaseService.from
  let originalRpc: typeof supabaseModule.supabaseService.rpc

  beforeEach(async () => {
    runner = await import('./individuazione-runner.js')
    activeJobs = await import('./active-jobs.js')
    supabaseModule = await import('../supabase.js')
    originalFrom = supabaseModule.supabaseService.from
    originalRpc = supabaseModule.supabaseService.rpc
  })

  afterEach(() => {
    ;(supabaseModule.supabaseService as any).from = originalFrom
    ;(supabaseModule.supabaseService as any).rpc = originalRpc
    activeJobs.resetActiveJobsForTests()
  })

  it('preserves an individuata campaign state when fresh init fails', async () => {
    const patchCalls: QueryCall[] = []
    const statusCalls: QueryCall[] = []
    const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = []

    ;(supabaseModule.supabaseService as any).from = (table: string) => {
      if (table === 'campaign_jobs') return createPatchQuery(patchCalls)
      if (table === 'campagne_programmazione') {
        return createCampagnaStatusQuery('individuata', statusCalls)
      }
      throw new Error(`Unexpected table ${table}`)
    }

    ;(supabaseModule.supabaseService as any).rpc = async (
      name: string,
      args: Record<string, unknown>
    ) => {
      rpcCalls.push({ name, args })
      if (name === 'acquire_campagna_processing_lock') {
        return { data: { success: true }, error: null }
      }
      if (name === 'init_campagna_individuazione') {
        return { data: null, error: { message: 'canceling statement due to statement timeout' } }
      }
      if (name === 'release_campagna_processing_lock') {
        return { data: { success: true }, error: null }
      }
      throw new Error(`Unexpected rpc ${name}`)
    }

    await runner.runIndividuazioneJob({
      jobId: 'job-1',
      campagneProgrammazioneId: 'campagna-1',
      userId: 'user-1',
    })

    const releaseCall = rpcCalls.find((call) => call.name === 'release_campagna_processing_lock')
    assert.equal(releaseCall?.args.p_new_stato, 'individuata')
    assert.equal(
      patchCalls.some((call) =>
        call.method === 'update' &&
        (call.args[0] as { stato?: unknown; error?: unknown }).stato === 'error' &&
        (call.args[0] as { error?: unknown }).error === 'canceling statement due to statement timeout'
      ),
      true
    )
  })

  it('reads programmazioni_totali from campagne_individuazione.statistiche', () => {
    assert.equal(
      runner.programmazioniTotaliFromStatistiche({ programmazioni_totali: 52923 }),
      52923
    )
    assert.equal(
      runner.programmazioniTotaliFromStatistiche({ programmazioni_totali: '6473' }),
      6473
    )
    assert.equal(runner.programmazioniTotaliFromStatistiche({ programmazioni_totali: 0 }), null)
    assert.equal(runner.programmazioniTotaliFromStatistiche(null), null)
    assert.equal(runner.programmazioniTotaliFromStatistiche({}), null)
  })

  it('prefers snapshot stats on resume and does not count programmazioni', async () => {
    const totali = await runner.resolveResumeProgrammazioniTotali(
      'campagna-1',
      { programmazioni_totali: 6473 }
    )
    assert.equal(totali, 6473)
  })

  it('uses the campaign counter on resume when the snapshot is missing', async () => {
    let countedProgrammazioni = false
    ;(supabaseModule.supabaseService as any).from = (table: string) => {
      if (table === 'campagne_programmazione') {
        return createThenableQuery(() => ({ data: { programmazioni_count: 89126 }, error: null }))
      }
      countedProgrammazioni = true
      throw new Error(`Unexpected table ${table}`)
    }

    assert.equal(await runner.resolveResumeProgrammazioniTotali('campagna-1', null), 89126)
    assert.equal(countedProgrammazioni, false)
  })

  it('throws when resume count fails and snapshot is missing', async () => {
    ;(supabaseModule.supabaseService as any).from = (table: string) => {
      if (table === 'campagne_programmazione') {
        return createThenableQuery(() => ({ data: { programmazioni_count: null }, error: null }))
      }
      if (table !== 'programmazioni') throw new Error(`Unexpected table ${table}`)
      const query: Record<string, unknown> = {}
      query.select = () => query
      query.eq = async () => ({
        count: null,
        error: { message: 'canceling statement due to statement timeout' },
      })
      return query
    }

    await assert.rejects(
      () => runner.resolveResumeProgrammazioniTotali('campagna-1', null),
      /count programmazioni on resume: canceling statement due to statement timeout/
    )
  })

  it('patches resume job with snapshot totali instead of silent zero', async () => {
    const patchCalls: QueryCall[] = []
    let countedProgrammazioni = false

    const ciQuery: Record<string, unknown> = {}
    ciQuery.select = (...args: unknown[]) => {
      patchCalls.push({ method: 'ci.select', args })
      return ciQuery
    }
    ciQuery.eq = (...args: unknown[]) => {
      patchCalls.push({ method: 'ci.eq', args })
      return ciQuery
    }
    ciQuery.maybeSingle = async () => ({
      data: { id: 'ci-1', statistiche: { programmazioni_totali: 6473 } },
      error: null,
    })

    ;(supabaseModule.supabaseService as any).from = (table: string) => {
      if (table === 'campaign_jobs') {
        return createThenableQuery(() => ({ data: null, error: null }), patchCalls)
      }
      if (table === 'campagne_programmazione') {
        return createCampagnaStatusQuery('in_review', [])
      }
      if (table === 'campagne_individuazione') return ciQuery
      if (table === 'programmazioni') {
        countedProgrammazioni = true
        const query: Record<string, unknown> = {}
        query.select = () => query
        query.eq = async () => ({ count: null, error: { message: 'timeout' } })
        return query
      }
      throw new Error(`Unexpected table ${table}`)
    }

    ;(supabaseModule.supabaseService as any).rpc = async (name: string) => {
      if (name === 'acquire_campagna_processing_lock') {
        return { data: { success: true }, error: null }
      }
      if (name === 'get_campagna_programmazioni_batch') {
        return { data: { ids: [], next_after_id: null, scanned: 0 }, error: null }
      }
      if (name === 'finalize_campagna_individuazione') {
        return { data: { success: true }, error: null }
      }
      if (name === 'release_campagna_processing_lock') {
        return { data: { success: true }, error: null }
      }
      throw new Error(`Unexpected rpc ${name}`)
    }

    await runner.runIndividuazioneJob({
      jobId: 'job-resume',
      campagneProgrammazioneId: 'campagna-1',
      userId: 'user-1',
      resume: true,
      campagneIndividuazioneId: 'ci-1',
    })

    assert.equal(countedProgrammazioni, false)
    const processingPatch = patchCalls.find((call) =>
      call.method === 'update' &&
      (call.args[0] as { fase?: unknown; programmazioni_totali?: unknown }).fase === 'processing'
    )
    assert.equal(
      (processingPatch?.args[0] as { programmazioni_totali?: unknown }).programmazioni_totali,
      6473
    )
    assert.equal(
      ((processingPatch?.args[0] as { total_chunks?: number }).total_chunks ?? 0) > 0,
      true
    )
  })

  it('advances the batch cursor and skips windows with only processed rows', async () => {
    const jobLog: QueryCall[] = []
    const batchCalls: Array<Record<string, unknown>> = []
    const chunkCalls: string[][] = []
    const windows = [
      { ids: ['a', 'b'], next_after_id: 'b' },
      { ids: [], next_after_id: 'x' },
      { ids: ['c'], next_after_id: 'c' },
      { ids: [], next_after_id: null },
    ]

    ;(supabaseModule.supabaseService as any).from = (table: string) => {
      if (table === 'campaign_jobs') return createThenableQuery(() => ({ data: null, error: null }), jobLog)
      if (table === 'campagne_programmazione') return createCampagnaStatusQuery('in_review', [])
      throw new Error(`Unexpected table ${table}`)
    }

    ;(supabaseModule.supabaseService as any).rpc = async (name: string, args: Record<string, unknown>) => {
      if (name === 'acquire_campagna_processing_lock') return { data: { success: true }, error: null }
      if (name === 'init_campagna_individuazione') {
        return {
          data: { success: true, campagne_individuazione_id: 'ci-1', programmazioni_totali: 3 },
          error: null,
        }
      }
      if (name === 'get_campagna_programmazioni_batch') {
        batchCalls.push(args)
        return { data: windows.shift(), error: null }
      }
      if (name === 'process_programmazioni_chunk') {
        const ids = args.p_programmazione_ids as string[]
        chunkCalls.push(ids)
        return {
          data: { success: true, programmazioni_processate: ids.length, individuazioni_create: 1 },
          error: null,
        }
      }
      if (name === 'finalize_campagna_individuazione') return { data: { success: true }, error: null }
      if (name === 'release_campagna_processing_lock') return { data: { success: true }, error: null }
      throw new Error(`Unexpected rpc ${name}`)
    }

    await runner.runIndividuazioneJob({
      jobId: 'job-1',
      campagneProgrammazioneId: 'campagna-1',
      userId: 'user-1',
      artistaIds: ['art-1'],
    })

    assert.deepEqual(batchCalls.map((call) => call.p_after_id), [null, 'b', 'x', 'c'])
    assert.deepEqual(chunkCalls, [['a', 'b'], ['c']])

    const updates = updatesOf(jobLog)
    assert.deepEqual(updates.find((u) => u.fase === 'processing')?.opzioni, {
      soglia_titolo: 0.7,
      artista_ids: ['art-1'],
      mandato_override_artist_ids: null,
    })
    assert.equal(updates.find((u) => u.stato === 'completed')?.programmazioni_processate, 3)
  })

  it('resumes with the original run options and counters', async () => {
    const jobLog: QueryCall[] = []
    const chunkArgs: Array<Record<string, unknown>> = []
    const windows = [
      { ids: ['z'], next_after_id: 'z' },
      { ids: [], next_after_id: null },
    ]

    const ciQuery = createThenableQuery(() => ({
      data: { id: 'ci-1', statistiche: { programmazioni_totali: 89126 } },
      error: null,
    }))

    ;(supabaseModule.supabaseService as any).from = (table: string) => {
      if (table === 'campaign_jobs') {
        return createThenableQuery((calls) => {
          const readsPreviousRun = calls.some(
            (call) => call.method === 'eq' && call.args[0] === 'campagne_individuazione_id'
          )
          if (!readsPreviousRun) return { data: null, error: null }
          return {
            data: {
              opzioni: {
                soglia_titolo: 0.8,
                artista_ids: ['art-9'],
                mandato_override_artist_ids: ['art-7'],
              },
              programmazioni_processate: 84000,
              individuazioni_create: 8729,
            },
            error: null,
          }
        }, jobLog)
      }
      if (table === 'campagne_programmazione') return createCampagnaStatusQuery('in_review', [])
      if (table === 'campagne_individuazione') return ciQuery
      throw new Error(`Unexpected table ${table}`)
    }

    ;(supabaseModule.supabaseService as any).rpc = async (name: string, args: Record<string, unknown>) => {
      if (name === 'acquire_campagna_processing_lock') return { data: { success: true }, error: null }
      if (name === 'get_campagna_programmazioni_batch') return { data: windows.shift(), error: null }
      if (name === 'process_programmazioni_chunk') {
        chunkArgs.push(args)
        return { data: { success: true, programmazioni_processate: 1, individuazioni_create: 2 }, error: null }
      }
      if (name === 'finalize_campagna_individuazione') return { data: { success: true }, error: null }
      if (name === 'release_campagna_processing_lock') return { data: { success: true }, error: null }
      throw new Error(`Unexpected rpc ${name}`)
    }

    // Come "Riprendi" dalla UI: nessuna opzione passata.
    await runner.runIndividuazioneJob({
      jobId: 'job-resume',
      campagneProgrammazioneId: 'campagna-1',
      userId: 'user-1',
      resume: true,
      campagneIndividuazioneId: 'ci-1',
    })

    assert.equal(chunkArgs.length, 1)
    assert.equal(chunkArgs[0].p_soglia_titolo, 0.8)
    assert.deepEqual(chunkArgs[0].p_artista_ids, ['art-9'])
    assert.deepEqual(chunkArgs[0].p_mandato_override_artist_ids, ['art-7'])

    const updates = updatesOf(jobLog)
    const processing = updates.find((u) => u.fase === 'processing')
    assert.equal(processing?.programmazioni_processate, 84000)
    assert.equal(processing?.current_chunk, 1680)
    const completed = updates.find((u) => u.stato === 'completed')
    assert.equal(completed?.programmazioni_processate, 84001)
    assert.equal(completed?.individuazioni_create, 8731)
  })

  it('stops without touching the job when the worker is shutting down', async () => {
    const jobLog: QueryCall[] = []
    const rpcNames: string[] = []

    ;(supabaseModule.supabaseService as any).from = (table: string) => {
      if (table === 'campaign_jobs') return createThenableQuery(() => ({ data: null, error: null }), jobLog)
      if (table === 'campagne_programmazione') return createCampagnaStatusQuery('in_review', [])
      throw new Error(`Unexpected table ${table}`)
    }

    ;(supabaseModule.supabaseService as any).rpc = async (name: string) => {
      rpcNames.push(name)
      if (name === 'acquire_campagna_processing_lock') return { data: { success: true }, error: null }
      if (name === 'init_campagna_individuazione') {
        return {
          data: { success: true, campagne_individuazione_id: 'ci-1', programmazioni_totali: 2 },
          error: null,
        }
      }
      if (name === 'get_campagna_programmazioni_batch') {
        // SIGTERM arriva mentre il lotto è in lavorazione.
        activeJobs.requestShutdown()
        return { data: { ids: ['a'], next_after_id: 'a' }, error: null }
      }
      if (name === 'process_programmazioni_chunk') {
        return { data: { success: true, programmazioni_processate: 1, individuazioni_create: 0 }, error: null }
      }
      throw new Error(`Unexpected rpc ${name}`)
    }

    await runner.runIndividuazioneJob({
      jobId: 'job-1',
      campagneProgrammazioneId: 'campagna-1',
      userId: 'user-1',
    })

    assert.equal(rpcNames.includes('finalize_campagna_individuazione'), false)
    assert.equal(rpcNames.includes('release_campagna_processing_lock'), false)
    const updates = updatesOf(jobLog)
    assert.equal(updates.some((u) => u.stato === 'error' || u.stato === 'completed'), false)
  })
})
