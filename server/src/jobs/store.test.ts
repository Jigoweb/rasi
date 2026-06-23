import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

process.env.SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'

type QueryCall = {
  method: string
  args: unknown[]
}

function createQueryMock(result: unknown) {
  const calls: QueryCall[] = []
  const query = {
    calls,
    select: (...args: unknown[]) => {
      calls.push({ method: 'select', args })
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
    order: (...args: unknown[]) => {
      calls.push({ method: 'order', args })
      return query
    },
    limit: (...args: unknown[]) => {
      calls.push({ method: 'limit', args })
      return query
    },
    maybeSingle: async () => result,
  }

  return query
}

function createStaleQueryMock(result: unknown) {
  const calls: QueryCall[] = []
  const query = {
    calls,
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

function createStaleUpdateQueryMock(result: unknown) {
  const calls: QueryCall[] = []
  const query = {
    calls,
    update: (...args: unknown[]) => {
      calls.push({ method: 'update', args })
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
      return result
    },
  }

  return query
}

describe('campaign job store', () => {
  let store: typeof import('./store.js')
  let supabaseModule: typeof import('../supabase.js')
  let originalFrom: typeof supabaseModule.supabaseService.from
  const fromCalls: string[] = []

  beforeEach(async () => {
    store = await import('./store.js')
    supabaseModule = await import('../supabase.js')
    originalFrom = supabaseModule.supabaseService.from
    fromCalls.length = 0
  })

  afterEach(() => {
    ;(supabaseModule.supabaseService as any).from = originalFrom
  })

  it('filters getJobForUser by id and created_by', async () => {
    const query = createQueryMock({
      data: {
        id: 'job-1',
        created_by: 'user-1',
        campagne_programmazione_id: 'campagna-1',
      },
      error: null,
    })
    ;(supabaseModule.supabaseService as any).from = (table: string) => {
      fromCalls.push(table)
      return query
    }

    const job = await store.getJobForUser('job-1', 'user-1')

    assert.equal(job?.id, 'job-1')
    assert.deepEqual(fromCalls, ['campaign_jobs'])
    assert.deepEqual(
      query.calls.filter((call) => call.method === 'eq').map((call) => call.args),
      [
        ['id', 'job-1'],
        ['created_by', 'user-1'],
      ]
    )
  })

  it('checks campaign ownership by campaign id and created_by', async () => {
    const query = createQueryMock({
      data: { id: 'campagna-1' },
      error: null,
    })
    ;(supabaseModule.supabaseService as any).from = (table: string) => {
      fromCalls.push(table)
      return query
    }

    const ownsCampaign = await store.userOwnsCampagnaProgrammazione('campagna-1', 'user-1')

    assert.equal(ownsCampaign, true)
    assert.deepEqual(fromCalls, ['campagne_programmazione'])
    assert.deepEqual(
      query.calls.filter((call) => call.method === 'select').map((call) => call.args),
      [['id']]
    )
    assert.deepEqual(
      query.calls.filter((call) => call.method === 'eq').map((call) => call.args),
      [
        ['id', 'campagna-1'],
        ['created_by', 'user-1'],
      ]
    )
  })

  it('keeps findActiveJob scoped to campaign and active states', async () => {
    const query = createQueryMock({
      data: {
        id: 'job-2',
        created_by: 'user-1',
        campagne_programmazione_id: 'campagna-2',
      },
      error: null,
    })
    ;(supabaseModule.supabaseService as any).from = (table: string) => {
      fromCalls.push(table)
      return query
    }

    const job = await store.findActiveJob('campagna-2')

    assert.equal(job?.id, 'job-2')
    assert.deepEqual(fromCalls, ['campaign_jobs'])
    assert.deepEqual(
      query.calls.filter((call) => call.method === 'eq').map((call) => call.args),
      [['campagne_programmazione_id', 'campagna-2']]
    )
    assert.deepEqual(
      query.calls.filter((call) => call.method === 'in').map((call) => call.args),
      [['stato', ['queued', 'running']]]
    )
  })

  it('finds stale jobs only for active states before the cutoff', async () => {
    const cutoffIso = '2026-06-23T12:00:00.000Z'
    const query = createStaleQueryMock({
      data: [
        {
          id: 'job-3',
          stato: 'running',
          updated_at: '2026-06-23T11:00:00.000Z',
        },
      ],
      error: null,
    })
    ;(supabaseModule.supabaseService as any).from = (table: string) => {
      fromCalls.push(table)
      return query
    }

    const jobs = await store.findStaleActiveJobs(cutoffIso)

    assert.equal(jobs.length, 1)
    assert.equal(jobs[0]?.id, 'job-3')
    assert.deepEqual(fromCalls, ['campaign_jobs'])
    assert.deepEqual(
      query.calls.filter((call) => call.method === 'select').map((call) => call.args),
      [['*']]
    )
    assert.deepEqual(
      query.calls.filter((call) => call.method === 'in').map((call) => call.args),
      [['stato', ['queued', 'running']]]
    )
    assert.deepEqual(
      query.calls.filter((call) => call.method === 'lt').map((call) => call.args),
      [['updated_at', cutoffIso]]
    )
  })

  it('throws a scoped error when stale job lookup fails', async () => {
    const query = createStaleQueryMock({
      data: null,
      error: { message: 'database unavailable' },
    })
    ;(supabaseModule.supabaseService as any).from = () => query

    await assert.rejects(
      () => store.findStaleActiveJobs('2026-06-23T12:00:00.000Z'),
      /findStaleActiveJobs: database unavailable/
    )
  })

  it('marks a stale active job only when id, active state, and cutoff still match', async () => {
    const cutoffIso = '2026-06-23T12:00:00.000Z'
    const now = new Date('2026-06-23T12:30:00.000Z')
    const query = createStaleUpdateQueryMock({
      data: [{ id: 'job-4' }],
      error: null,
    })
    ;(supabaseModule.supabaseService as any).from = (table: string) => {
      fromCalls.push(table)
      return query
    }

    const marked = await store.markStaleActiveJobAsError('job-4', cutoffIso, now)

    assert.equal(marked, true)
    assert.deepEqual(fromCalls, ['campaign_jobs'])
    assert.deepEqual(
      query.calls.filter((call) => call.method === 'update').map((call) => call.args),
      [
        [
          {
            stato: 'error',
            fase: 'error',
            error: 'Job interrotto dal riavvio del worker. Usa Riprendi per continuare.',
            updated_at: '2026-06-23T12:30:00.000Z',
          },
        ],
      ]
    )
    assert.deepEqual(
      query.calls.filter((call) => call.method === 'eq').map((call) => call.args),
      [['id', 'job-4']]
    )
    assert.deepEqual(
      query.calls.filter((call) => call.method === 'in').map((call) => call.args),
      [['stato', ['queued', 'running']]]
    )
    assert.deepEqual(
      query.calls.filter((call) => call.method === 'lt').map((call) => call.args),
      [['updated_at', cutoffIso]]
    )
    assert.deepEqual(
      query.calls.filter((call) => call.method === 'select').map((call) => call.args),
      [['id']]
    )
  })

  it('returns false when a stale active job is no longer eligible at update time', async () => {
    const query = createStaleUpdateQueryMock({
      data: [],
      error: null,
    })
    ;(supabaseModule.supabaseService as any).from = () => query

    const marked = await store.markStaleActiveJobAsError(
      'job-5',
      '2026-06-23T12:00:00.000Z',
      new Date('2026-06-23T12:30:00.000Z')
    )

    assert.equal(marked, false)
  })
})
