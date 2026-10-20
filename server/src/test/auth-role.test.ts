import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readAppMetadataRole } from '../auth-role.js'

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
