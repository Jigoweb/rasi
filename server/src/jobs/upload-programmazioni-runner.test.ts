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

function createUpsertQuery(calls: QueryCall[]) {
  const query = {
    upsert: (...args: unknown[]) => {
      calls.push({ method: 'upsert', args })
      return query
    },
    select: async (...args: unknown[]) => {
      calls.push({ method: 'select', args })
      return { data: [{ id: 'row-1' }], error: null }
    },
  }
  return query
}

describe('upload programmazioni runner', () => {
  let runner: typeof import('./upload-programmazioni-runner.js')
  let supabaseModule: typeof import('../supabase.js')
  let originalFrom: typeof supabaseModule.supabaseService.from
  let originalRpc: typeof supabaseModule.supabaseService.rpc
  let originalStorage: typeof supabaseModule.supabaseService.storage

  beforeEach(async () => {
    runner = await import('./upload-programmazioni-runner.js')
    supabaseModule = await import('../supabase.js')
    originalFrom = supabaseModule.supabaseService.from
    originalRpc = supabaseModule.supabaseService.rpc
    originalStorage = supabaseModule.supabaseService.storage
  })

  afterEach(() => {
    ;(supabaseModule.supabaseService as any).from = originalFrom
    ;(supabaseModule.supabaseService as any).rpc = originalRpc
    ;(supabaseModule.supabaseService as any).storage = originalStorage
  })

  it('removes the uploaded file after a completed job', async () => {
    const patchCalls: QueryCall[] = []
    const removedPaths: string[] = []
    const csv = 'titolo,emittente\nFilm A,Netflix\n'

    ;(supabaseModule.supabaseService as any).rpc = async () => ({
      data: { success: true },
      error: null,
    })
    ;(supabaseModule.supabaseService as any).from = (table: string) => {
      if (table === 'upload_jobs') return createPatchQuery(patchCalls)
      if (table === 'programmazioni') return createUpsertQuery([])
      throw new Error(`Unexpected table ${table}`)
    }
    ;(supabaseModule.supabaseService as any).storage = {
      from: () => ({
        download: async () => ({
          data: {
            arrayBuffer: async () => {
              const encoded = new TextEncoder().encode(csv)
              return encoded.buffer.slice(
                encoded.byteOffset,
                encoded.byteOffset + encoded.byteLength
              )
            },
          },
          error: null,
        }),
        remove: async (paths: string[]) => {
          removedPaths.push(...paths)
          return { error: null }
        },
      }),
    }

    await runner.runUploadProgrammazioniJob({
      jobId: 'job-1',
      campagneProgrammazioneId: 'campagna-1',
      userId: 'user-1',
      emittenteId: 'emittente-1',
      storagePath: 'user-1/campagna-1/file.csv',
      fileName: 'file.csv',
      mappingSnapshot: { kind: 'legacy_template' },
      chunkSize: 500,
    })

    assert.deepEqual(removedPaths, ['user-1/campagna-1/file.csv'])
  })

  it('removes the uploaded file after a terminal error', async () => {
    const patchCalls: QueryCall[] = []
    const removedPaths: string[] = []

    ;(supabaseModule.supabaseService as any).rpc = async () => ({
      data: { success: true },
      error: null,
    })
    ;(supabaseModule.supabaseService as any).from = () => createPatchQuery(patchCalls)
    ;(supabaseModule.supabaseService as any).storage = {
      from: () => ({
        download: async () => ({
          data: null,
          error: { message: 'file missing' },
        }),
        remove: async (paths: string[]) => {
          removedPaths.push(...paths)
          return { error: null }
        },
      }),
    }

    await runner.runUploadProgrammazioniJob({
      jobId: 'job-2',
      campagneProgrammazioneId: 'campagna-1',
      userId: 'user-1',
      emittenteId: 'emittente-1',
      storagePath: 'user-1/campagna-1/missing.csv',
      fileName: 'missing.csv',
      mappingSnapshot: { kind: 'legacy_template' },
      chunkSize: 500,
    })

    assert.deepEqual(removedPaths, ['user-1/campagna-1/missing.csv'])
    assert.equal(
      patchCalls.some((call) =>
        call.method === 'update' &&
        (call.args[0] as { stato?: unknown }).stato === 'error'
      ),
      true
    )
  })

  it('does not select inserted row ids for every uploaded chunk', async () => {
    const upsertCalls: QueryCall[] = []
    let selectedInsertedIds = false

    ;(supabaseModule.supabaseService as any).from = (table: string) => {
      if (table === 'programmazioni') {
        return {
          upsert: (...args: unknown[]) => {
            upsertCalls.push({ method: 'upsert', args })
            return {
              data: null,
              error: null,
              select: async () => {
                selectedInsertedIds = true
                return { data: [{ id: 'row-1' }], error: null }
              },
            }
          },
        }
      }
      throw new Error(`Unexpected table ${table}`)
    }

    const result = await (runner as any).upsertProgrammazioniChunk([
      {
        campagna_programmazione_id: 'campagna-1',
        emittente_id: 'emittente-1',
        import_row_uid: 'row-1',
        titolo: 'Film A',
      },
    ])

    assert.equal(upsertCalls.length, 1)
    assert.equal(selectedInsertedIds, false)
    assert.deepEqual(result, {
      attempted: 1,
      insertedExact: null,
      duplicateSkippedExact: null,
    })
  })

  it('patches a quality report after mapping uploaded rows', async () => {
    const patchCalls: QueryCall[] = []
    const csv = 'titolo,emittente,anno,durata_minuti\nX-Men: The Last Stand,Disney,3000,1\nHacks,Amazon,2022,34\n'

    ;(supabaseModule.supabaseService as any).rpc = async () => ({
      data: { success: true },
      error: null,
    })
    ;(supabaseModule.supabaseService as any).from = (table: string) => {
      if (table === 'upload_jobs') return createPatchQuery(patchCalls)
      if (table === 'programmazioni') return createUpsertQuery([])
      throw new Error(`Unexpected table ${table}`)
    }
    ;(supabaseModule.supabaseService as any).storage = {
      from: () => ({
        download: async () => ({
          data: {
            arrayBuffer: async () => {
              const encoded = new TextEncoder().encode(csv)
              return encoded.buffer.slice(
                encoded.byteOffset,
                encoded.byteOffset + encoded.byteLength
              )
            },
          },
          error: null,
        }),
        remove: async () => ({ error: null }),
      }),
    }

    await runner.runUploadProgrammazioniJob({
      jobId: 'job-quality',
      campagneProgrammazioneId: 'campagna-1',
      userId: 'user-1',
      emittenteId: 'emittente-1',
      storagePath: 'user-1/campagna-1/file.csv',
      fileName: 'file.csv',
      mappingSnapshot: { kind: 'legacy_template' },
      chunkSize: 500,
    })

    const qualityPatch = patchCalls.find((call) =>
      call.method === 'update' &&
      Boolean((call.args[0] as { quality_report?: unknown }).quality_report)
    )
    assert.ok(qualityPatch)
    assert.deepEqual((qualityPatch.args[0] as any).quality_report.warningCounts, {
      year_out_of_range: 1,
      duration_placeholder: 1,
    })
  })
})
