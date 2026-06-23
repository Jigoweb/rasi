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

describe('upload job store', () => {
  let store: typeof import('./upload-job-store.js')
  let supabaseModule: typeof import('../supabase.js')
  let originalFrom: typeof supabaseModule.supabaseService.from
  const fromCalls: string[] = []

  beforeEach(async () => {
    store = await import('./upload-job-store.js')
    supabaseModule = await import('../supabase.js')
    originalFrom = supabaseModule.supabaseService.from
    fromCalls.length = 0
  })

  afterEach(() => {
    ;(supabaseModule.supabaseService as any).from = originalFrom
  })

  it('filters getUploadJobForUser by id and created_by', async () => {
    const query = createQueryMock({
      data: {
        id: 'upload-1',
        created_by: 'user-1',
        campagna_programmazione_id: 'campagna-1',
      },
      error: null,
    })
    ;(supabaseModule.supabaseService as any).from = (table: string) => {
      fromCalls.push(table)
      return query
    }

    const job = await store.getUploadJobForUser('upload-1', 'user-1')

    assert.equal(job?.id, 'upload-1')
    assert.deepEqual(fromCalls, ['upload_jobs'])
    assert.deepEqual(
      query.calls.filter((call) => call.method === 'eq').map((call) => call.args),
      [
        ['id', 'upload-1'],
        ['created_by', 'user-1'],
      ]
    )
  })

  it('checks emittente ownership through the campaign row', async () => {
    const query = createQueryMock({
      data: { id: 'campagna-1' },
      error: null,
    })
    ;(supabaseModule.supabaseService as any).from = (table: string) => {
      fromCalls.push(table)
      return query
    }

    const ownsEmittente = await store.userOwnsCampagnaEmittente(
      'campagna-1',
      'emittente-1',
      'user-1'
    )

    assert.equal(ownsEmittente, true)
    assert.deepEqual(fromCalls, ['campagne_programmazione'])
    assert.deepEqual(
      query.calls.filter((call) => call.method === 'eq').map((call) => call.args),
      [
        ['id', 'campagna-1'],
        ['emittente_id', 'emittente-1'],
        ['created_by', 'user-1'],
      ]
    )
  })

  it('marks a stale upload as error and resets uploading campaign state', async () => {
    const cutoffIso = '2026-06-23T12:00:00.000Z'
    const now = new Date('2026-06-23T12:30:00.000Z')
    const uploadQuery = createStaleUpdateQueryMock({
      data: [{ id: 'upload-2' }],
      error: null,
    })
    const campaignQuery = {
      calls: [] as QueryCall[],
      update: (...args: unknown[]) => {
        campaignQuery.calls.push({ method: 'update', args })
        return campaignQuery
      },
      eq: (...args: unknown[]) => {
        campaignQuery.calls.push({ method: 'eq', args })
        return campaignQuery
      },
      then: (resolve: (value: { error: null }) => void) => {
        resolve({ error: null })
      },
    }

    ;(supabaseModule.supabaseService as any).from = (table: string) => {
      fromCalls.push(table)
      return table === 'upload_jobs' ? uploadQuery : campaignQuery
    }

    const marked = await store.markStaleActiveUploadJobAsError(
      {
        id: 'upload-2',
        campagna_programmazione_id: 'campagna-2',
        storage_path: 'user-1/campagna-2/file.csv',
        file_name: 'file.csv',
        file_type: 'text/csv',
        mapping_snapshot: { kind: 'legacy_template' },
        stato: 'running',
        fase: 'inserting',
        righe_totali: 10,
        righe_processate: 5,
        righe_inserite: 5,
        righe_duplicate_saltate: 0,
        current_chunk: 1,
        total_chunks: 2,
        chunk_size: 500,
        error: null,
        quality_report: null,
        created_by: 'user-1',
        created_at: '2026-06-23T11:00:00.000Z',
        updated_at: '2026-06-23T11:30:00.000Z',
      },
      cutoffIso,
      now
    )

    assert.equal(marked, true)
    assert.deepEqual(fromCalls, ['upload_jobs', 'campagne_programmazione'])
    assert.deepEqual(
      uploadQuery.calls.filter((call) => call.method === 'eq').map((call) => call.args),
      [['id', 'upload-2']]
    )
    assert.deepEqual(
      campaignQuery.calls.filter((call) => call.method === 'eq').map((call) => call.args),
      [
        ['id', 'campagna-2'],
        ['stato', 'uploading'],
      ]
    )
  })
})
