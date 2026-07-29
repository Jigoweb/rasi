import {
  validateRoleChange,
  mergeUserMetadataWithRole,
} from './role-update'

describe('validateRoleChange', () => {
  const base = {
    actorUserId: 'actor-1',
    targetUserId: 'target-1',
  }

  it('allows admin to assign any valid role', () => {
    const result = validateRoleChange({
      ...base,
      actorIsAdmin: true,
      targetCurrentRole: 'operatore',
      newRole: 'admin',
    })
    expect(result).toEqual({ ok: true, ruolo: 'admin', actorRole: 'admin' })
  })

  it('allows operatore to assign non-admin roles on non-admin targets', () => {
    const result = validateRoleChange({
      ...base,
      actorIsAdmin: false,
      targetCurrentRole: 'artista',
      newRole: 'operatore',
    })
    expect(result).toEqual({
      ok: true,
      ruolo: 'operatore',
      actorRole: 'operatore',
    })
  })

  it('blocks operatore from assigning admin', () => {
    const result = validateRoleChange({
      ...base,
      actorIsAdmin: false,
      targetCurrentRole: 'artista',
      newRole: 'admin',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(403)
    }
  })

  it('blocks operatore from changing an admin user', () => {
    const result = validateRoleChange({
      ...base,
      actorIsAdmin: false,
      targetCurrentRole: 'admin',
      newRole: 'operatore',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(403)
    }
  })

  it('blocks admin self-demotion', () => {
    const result = validateRoleChange({
      actorIsAdmin: true,
      actorUserId: 'same',
      targetUserId: 'same',
      targetCurrentRole: 'admin',
      newRole: 'operatore',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(400)
    }
  })

  it('rejects invalid roles with 400', () => {
    const result = validateRoleChange({
      ...base,
      actorIsAdmin: true,
      targetCurrentRole: 'operatore',
      newRole: 'superuser',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(400)
    }
  })
})

describe('mergeUserMetadataWithRole in role-update', () => {
  it('preserves artista_id when changing role', () => {
    expect(
      mergeUserMetadataWithRole(
        { ruolo: 'artista', artista_id: 'art-99' },
        'operatore'
      )
    ).toEqual({ ruolo: 'operatore', artista_id: 'art-99' })
  })
})
