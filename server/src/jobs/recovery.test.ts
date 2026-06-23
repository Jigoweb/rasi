import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

process.env.SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'

type QueryCall = {
  method: string
  args: unknown[]
}

type PatchCall = {
  patch: Record<string, unknown>
  calls: QueryCall[]
}

function createSelectQuery(result: unknown, calls: QueryCall[]) {
  const query = {
    select: (...args: unknown[]) => {
      calls.push({ method: 'select', args })
      return query
    },
    in: (...args: unknown[]) => {
      calls.push({ method: 'in', args })
      return query
    },
    lt: async (...args: unknown[]) => {
      calls.push({ method: 'lt', args })
      return result
    },
  }

  return query
}

function createUpdateQuery(result: unknown, patchCalls: PatchCall[]) {
  let patch: Record<string, unknown> = {}
  const calls: QueryCall[] = []

  const query = {
    update: (value: Record<string, unknown>) => {
      patch = value
      calls.push({ method: 'update', args: [value] })
      return query
    },
    eq: (...args: unknown[]) => {
      calls.push({ method: 'eq', args })
      return query
    },
    in: (...args: unknown[]) => {
      calls.push({ method: 'in', args })
      return query
    },
    lt: (...args: unknown[]) => {
      calls.push({ method: 'lt', args })
      return query
    },
    select: async (...args: unknown[]) => {
      calls.push({ method: 'select', args })
      patchCalls.push({ patch, calls })
      return result
    },
  }

  return query
}

describe('stale job recovery', () => {
  let recovery: typeof import('./recovery.js')
  let supabaseModule: typeof import('../supabase.js')
  let originalFrom: typeof supabaseModule.supabaseService.from
  const fromCalls: string[] = []

  beforeEach(async () => {
    recovery = await import('./recovery.js')
    supabaseModule = await import('../supabase.js')
    originalFrom = supabaseModule.supabaseService.from
    fromCalls.length = 0
  })

  afterEach(() => {
    ;(supabaseModule.supabaseService as any).from = originalFrom
  })

  it('returns the count of stale active jobs actually marked as error', async () => {
    const selectCalls: QueryCall[] = []
    const patchCalls: PatchCall[] = []
    const updateResults = [
      { data: [{ id: 'job-1' }], error: null },
      { data: [], error: null },
    ]
    const selectQuery = createSelectQuery(
      {
        data: [
          { id: 'job-1', stato: 'queued' },
          { id: 'job-2', stato: 'running' },
        ],
        error: null,
      },
      selectCalls
    )

    ;(supabaseModule.supabaseService as any).from = (table: string) => {
      fromCalls.push(table)
      return fromCalls.length === 1
        ? selectQuery
        : createUpdateQuery(updateResults.shift(), patchCalls)
    }

    const count = await recovery.markStaleActiveJobsAsError(
      new Date('2026-06-23T12:30:00.000Z')
    )

    assert.equal(count, 1)
    assert.deepEqual(fromCalls, ['campaign_jobs', 'campaign_jobs', 'campaign_jobs'])
    assert.deepEqual(
      selectCalls.filter((call) => call.method === 'lt').map((call) => call.args),
      [['updated_at', '2026-06-23T12:00:00.000Z']]
    )
    assert.deepEqual(
      patchCalls.map(({ calls }) => calls.find((call) => call.method === 'eq')?.args),
      [
        ['id', 'job-1'],
        ['id', 'job-2'],
      ]
    )
    assert.deepEqual(
      patchCalls.map(({ calls }) => calls.find((call) => call.method === 'in')?.args),
      [
        ['stato', ['queued', 'running']],
        ['stato', ['queued', 'running']],
      ]
    )
    assert.deepEqual(
      patchCalls.map(({ calls }) => calls.find((call) => call.method === 'lt')?.args),
      [
        ['updated_at', '2026-06-23T12:00:00.000Z'],
        ['updated_at', '2026-06-23T12:00:00.000Z'],
      ]
    )
    assert.deepEqual(
      patchCalls.map(({ patch }) => ({
        stato: patch.stato,
        fase: patch.fase,
        error: patch.error,
      })),
      [
        {
          stato: 'error',
          fase: 'error',
          error: 'Job interrotto dal riavvio del worker. Usa Riprendi per continuare.',
        },
        {
          stato: 'error',
          fase: 'error',
          error: 'Job interrotto dal riavvio del worker. Usa Riprendi per continuare.',
        },
      ]
    )
    assert.ok(patchCalls.every(({ patch }) => typeof patch.updated_at === 'string'))
  })

  it('returns zero when no stale active jobs are found', async () => {
    const selectCalls: QueryCall[] = []
    const patchCalls: PatchCall[] = []
    const selectQuery = createSelectQuery({ data: null, error: null }, selectCalls)

    ;(supabaseModule.supabaseService as any).from = (table: string) => {
      fromCalls.push(table)
      return fromCalls.length === 1
        ? selectQuery
        : createUpdateQuery({ data: [], error: null }, patchCalls)
    }

    const count = await recovery.markStaleActiveJobsAsError(
      new Date('2026-06-23T12:30:00.000Z')
    )

    assert.equal(count, 0)
    assert.deepEqual(fromCalls, ['campaign_jobs'])
    assert.deepEqual(patchCalls, [])
  })
})
