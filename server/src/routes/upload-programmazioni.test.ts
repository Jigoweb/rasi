import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

process.env.SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'

const route = await import('./upload-programmazioni.js')

describe('upload programmazioni route validation', () => {
  it('accepts only storage paths scoped to the user and campaign', () => {
    assert.equal(
      route.isValidUploadStoragePath(
        'user-1/campagna-1/file.csv',
        'user-1',
        'campagna-1'
      ),
      true
    )
    assert.equal(
      route.isValidUploadStoragePath(
        'user-1/other-campaign/file.csv',
        'user-1',
        'campagna-1'
      ),
      false
    )
    assert.equal(
      route.isValidUploadStoragePath(
        'other-user/campagna-1/file.csv',
        'user-1',
        'campagna-1'
      ),
      false
    )
  })

  it('rejects unsafe file names and paths with traversal segments', () => {
    assert.equal(
      route.isValidUploadStoragePath(
        'user-1/campagna-1/../file.csv',
        'user-1',
        'campagna-1'
      ),
      false
    )
    assert.equal(
      route.isValidUploadStoragePath(
        'user-1/campagna-1/',
        'user-1',
        'campagna-1'
      ),
      false
    )
  })

  it('validates mapping snapshots with known targets and source columns', () => {
    assert.equal(
      route.isValidMappingSnapshot({
        kind: 'apply_existing',
        mapping: {
          version: 1,
          colonne_rilevate: ['Title', 'Episode'],
          ultimo_upload: null,
          mapping: { Title: 'titolo' },
          rules: { titolo_episodio: { sources: ['Episode'] } },
        },
      }),
      true
    )
    assert.equal(
      route.isValidMappingSnapshot({
        kind: 'apply_existing',
        mapping: {
          version: 1,
          colonne_rilevate: ['Title'],
          ultimo_upload: null,
          mapping: { Title: 'campo_inventato' },
        },
      }),
      false
    )
    assert.equal(
      route.isValidMappingSnapshot({
        kind: 'apply_existing',
        mapping: {
          version: 1,
          colonne_rilevate: ['Title'],
          ultimo_upload: null,
          mapping: { Title: 'titolo' },
          rules: { titolo: { sources: [] } },
        },
      }),
      false
    )
  })

  it('clamps chunk size inside the supported worker range', () => {
    assert.equal(route.normalizeUploadChunkSize(10), 100)
    assert.equal(route.normalizeUploadChunkSize(750), 750)
    assert.equal(route.normalizeUploadChunkSize(10_000), 1000)
    assert.equal(route.normalizeUploadChunkSize('bad'), 500)
  })
})
