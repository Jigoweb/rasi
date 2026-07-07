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
})
