import {
  resolveUserRole,
  getRolePermissions,
  rolesAssignableBy,
  canActorChangeTargetRole,
  mergeUserMetadataWithRole,
} from './auth-permissions'

describe('auth-permissions', () => {
  describe('resolveUserRole', () => {
    it('returns valid roles as-is', () => {
      expect(resolveUserRole('admin')).toBe('admin')
      expect(resolveUserRole('operatore')).toBe('operatore')
      expect(resolveUserRole('collecting')).toBe('collecting')
      expect(resolveUserRole('artista')).toBe('artista')
    })

    it('fail-closed to collecting for null/invalid', () => {
      expect(resolveUserRole(null)).toBe('collecting')
      expect(resolveUserRole(undefined)).toBe('collecting')
      expect(resolveUserRole('')).toBe('collecting')
      expect(resolveUserRole('superuser')).toBe('collecting')
    })
  })

  describe('getRolePermissions', () => {
    it('admin has full user-management privileges', () => {
      expect(getRolePermissions('admin')).toEqual({
        isAdmin: true,
        isOperatore: false,
        isArtista: false,
        canManageUsers: true,
        canEditRoles: true,
      })
    })

    it('operatore can manage users and edit roles', () => {
      expect(getRolePermissions('operatore')).toEqual({
        isAdmin: false,
        isOperatore: true,
        isArtista: false,
        canManageUsers: true,
        canEditRoles: true,
      })
    })

    it('artista is walled to own area flags', () => {
      expect(getRolePermissions('artista')).toEqual({
        isAdmin: false,
        isOperatore: false,
        isArtista: true,
        canManageUsers: false,
        canEditRoles: false,
      })
    })

    it('collecting has zero management privileges', () => {
      expect(getRolePermissions('collecting')).toEqual({
        isAdmin: false,
        isOperatore: false,
        isArtista: false,
        canManageUsers: false,
        canEditRoles: false,
      })
    })
  })

  describe('rolesAssignableBy', () => {
    it('admin can assign all roles', () => {
      expect(rolesAssignableBy('admin')).toEqual([
        'admin',
        'operatore',
        'collecting',
        'artista',
      ])
    })

    it('operatore cannot assign admin', () => {
      expect(rolesAssignableBy('operatore')).toEqual([
        'operatore',
        'collecting',
        'artista',
      ])
    })

    it('non-managers assign nothing', () => {
      expect(rolesAssignableBy('artista')).toEqual([])
      expect(rolesAssignableBy('collecting')).toEqual([])
    })
  })

  describe('canActorChangeTargetRole', () => {
    it('allows admin to set any valid role', () => {
      expect(
        canActorChangeTargetRole('admin', 'operatore', 'admin')
      ).toEqual({ ok: true })
    })

    it('allows operatore to set non-admin roles on non-admin targets', () => {
      expect(
        canActorChangeTargetRole('operatore', 'artista', 'operatore')
      ).toEqual({ ok: true })
    })

    it('blocks operatore from assigning admin', () => {
      const result = canActorChangeTargetRole('operatore', 'artista', 'admin')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toMatch(/admin/i)
      }
    })

    it('blocks operatore from changing an admin user', () => {
      const result = canActorChangeTargetRole('operatore', 'admin', 'operatore')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toMatch(/amministrator/i)
      }
    })

    it('blocks artista from changing roles', () => {
      const result = canActorChangeTargetRole('artista', 'collecting', 'artista')
      expect(result.ok).toBe(false)
    })
  })

  describe('mergeUserMetadataWithRole', () => {
    it('preserves existing metadata including artista_id', () => {
      expect(
        mergeUserMetadataWithRole(
          { ruolo: 'artista', artista_id: 'uuid-1', extra: 'keep' },
          'operatore'
        )
      ).toEqual({
        ruolo: 'operatore',
        artista_id: 'uuid-1',
        extra: 'keep',
      })
    })

    it('handles null/undefined existing metadata', () => {
      expect(mergeUserMetadataWithRole(null, 'artista')).toEqual({
        ruolo: 'artista',
      })
      expect(mergeUserMetadataWithRole(undefined, 'admin')).toEqual({
        ruolo: 'admin',
      })
    })
  })
})
