import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readAppMetadataArtistaId, readAppMetadataRole } from '../auth-role.js'

describe('readAppMetadataRole', () => {
  it('reads the role from app_metadata', () => {
    assert.equal(readAppMetadataRole({ ruolo: 'operatore' }), 'operatore')
  })

  it('does not escalate when only user_metadata.ruolo is raised', () => {
    const user = {
      app_metadata: { ruolo: 'artista', provider: 'email' },
      user_metadata: { ruolo: 'operatore', artista_id: 'art-1' },
    }
    assert.equal(readAppMetadataRole(user.app_metadata), 'artista')
  })

  it('fail-closes when app_metadata.ruolo is missing', () => {
    assert.equal(readAppMetadataRole(undefined), null)
    assert.equal(readAppMetadataRole({ provider: 'email' }), null)
    assert.equal(readAppMetadataRole({ ruolo: '' }), null)
  })
})

describe('readAppMetadataArtistaId', () => {
  it('reads artista_id from app_metadata only', () => {
    const user = {
      app_metadata: {
        ruolo: 'artista',
        artista_id: '11111111-1111-4111-8111-111111111111',
      },
      user_metadata: { artista_id: '22222222-2222-4222-8222-222222222222' },
    }
    assert.equal(
      readAppMetadataArtistaId(user.app_metadata),
      '11111111-1111-4111-8111-111111111111'
    )
  })

  it('returns null when app_metadata.artista_id is missing', () => {
    assert.equal(readAppMetadataArtistaId({ ruolo: 'artista' }), null)
    assert.equal(readAppMetadataArtistaId(undefined), null)
  })
})
