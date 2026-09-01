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

describe('individuazione runner', () => {
  let runner: typeof import('./individuazione-runner.js')
  let supabaseModule: typeof import('../supabase.js')
  let originalFrom: typeof supabaseModule.supabaseService.from
  let originalRpc: typeof supabaseModule.supabaseService.rpc

  beforeEach(async () => {
    runner = await import('./individuazione-runner.js')
    supabaseModule = await import('../supabase.js')
    originalFrom = supabaseModule.supabaseService.from
    originalRpc = supabaseModule.supabaseService.rpc
  })

  afterEach(() => {
    ;(supabaseModule.supabaseService as any).from = originalFrom
    ;(supabaseModule.supabaseService as any).rpc = originalRpc
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

  it('throws when resume count fails and snapshot is missing', async () => {
    ;(supabaseModule.supabaseService as any).from = (table: string) => {
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
      if (table === 'campaign_jobs') return createPatchQuery(patchCalls)
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
      if (name === 'get_campagna_unprocessed_programmazione_ids') {
        return { data: [], error: null }
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
})
