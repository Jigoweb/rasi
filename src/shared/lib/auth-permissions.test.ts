import {
  resolveUserRole,
  getRolePermissions,
  rolesAssignableBy,
  rolesInvitableBy,
  canActorChangeTargetRole,
  mergeAppMetadataWithRole,
  mergeAppMetadataWithArtistaLink,
  readAppMetadataArtistaId,
  readAuthoritativeUserRole,
  canManageOperaCast,
  canManageArtistiContatti,
  canEditOpera,
} from './auth-permissions'

describe('auth-permissions', () => {
  describe('resolveUserRole', () => {
    it('returns valid roles as-is', () => {
      expect(resolveUserRole('admin')).toBe('admin')
      expect(resolveUserRole('operatore')).toBe('operatore')
      expect(resolveUserRole('operatore_base')).toBe('operatore_base')
      expect(resolveUserRole('tirocinante')).toBe('tirocinante')
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
    const NONE = {
      isAdmin: false,
      isOperatore: false,
      isOperatoreBase: false,
      isTirocinante: false,
      isArtista: false,
      isStaff: false,
      canReadBancaDati: false,
      canEditOpereSection: false,
      canValidateOpere: false,
      canWriteOutsideOpere: false,
      canManageUsers: false,
      canEditRoles: false,
    }
    const STAFF = {
      isStaff: true,
      canReadBancaDati: true,
      canEditOpereSection: true,
      canValidateOpere: true,
      canWriteOutsideOpere: true,
      canManageUsers: true,
      canEditRoles: true,
    }

    it('admin has full privileges', () => {
      expect(getRolePermissions('admin')).toEqual({ ...NONE, ...STAFF, isAdmin: true })
    })

    it('operatore (Operatore pro) has full data privileges and manages users', () => {
      expect(getRolePermissions('operatore')).toEqual({ ...NONE, ...STAFF, isOperatore: true })
    })

    it('operatore_base reads everything and writes only the Opere section, without validating', () => {
      expect(getRolePermissions('operatore_base')).toEqual({
        ...NONE,
        isOperatoreBase: true,
        canReadBancaDati: true,
        canEditOpereSection: true,
      })
    })

    it('tirocinante works only in the Opere section', () => {
      expect(getRolePermissions('tirocinante')).toEqual({
        ...NONE,
        isTirocinante: true,
        canEditOpereSection: true,
      })
    })

    it('artista is walled to own area flags', () => {
      expect(getRolePermissions('artista')).toEqual({ ...NONE, isArtista: true })
    })

    it('collecting has zero privileges', () => {
      expect(getRolePermissions('collecting')).toEqual(NONE)
    })
  })

  describe('canEditOpera', () => {
    it('lets staff edit validated and non-validated opere', () => {
      for (const role of ['admin', 'operatore']) {
        expect(canEditOpera(role, 'validato')).toBe(true)
        expect(canEditOpera(role, 'da_validare')).toBe(true)
      }
    })

    it('lets operatore_base and tirocinante edit only non-validated opere', () => {
      for (const role of ['operatore_base', 'tirocinante']) {
        expect(canEditOpera(role, 'validato')).toBe(false)
        expect(canEditOpera(role, 'da_validare')).toBe(true)
        expect(canEditOpera(role, null)).toBe(true)
      }
    })

    it('denies everyone else', () => {
      for (const role of ['artista', 'collecting', 'readonly', null, undefined]) {
        expect(canEditOpera(role, 'da_validare')).toBe(false)
      }
    })
  })

  describe('rolesAssignableBy', () => {
    it('admin can assign all roles', () => {
      expect(rolesAssignableBy('admin')).toEqual([
        'admin',
        'operatore',
        'operatore_base',
        'tirocinante',
        'collecting',
        'artista',
      ])
    })

    it('operatore cannot assign admin', () => {
      expect(rolesAssignableBy('operatore')).toEqual([
        'operatore',
        'operatore_base',
        'tirocinante',
        'collecting',
        'artista',
      ])
    })

    it('non-managers assign nothing', () => {
      expect(rolesAssignableBy('artista')).toEqual([])
      expect(rolesAssignableBy('collecting')).toEqual([])
      expect(rolesAssignableBy('operatore_base')).toEqual([])
      expect(rolesAssignableBy('tirocinante')).toEqual([])
    })
  })

  describe('rolesInvitableBy', () => {
    it('admin can invite admin, the three operator levels and artista', () => {
      expect(rolesInvitableBy('admin')).toEqual([
        'admin',
        'operatore',
        'operatore_base',
        'tirocinante',
        'artista',
      ])
    })

    it('operatore can invite operator levels and artisti', () => {
      expect(rolesInvitableBy('operatore')).toEqual([
        'operatore',
        'operatore_base',
        'tirocinante',
        'artista',
      ])
    })

    it('non-managers invite nothing', () => {
      expect(rolesInvitableBy('artista')).toEqual([])
      expect(rolesInvitableBy('collecting')).toEqual([])
      expect(rolesInvitableBy('operatore_base')).toEqual([])
      expect(rolesInvitableBy('tirocinante')).toEqual([])
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

  describe('mergeAppMetadataWithRole', () => {
    it('preserves provider keys and sets ruolo', () => {
      expect(
        mergeAppMetadataWithRole(
          { ruolo: 'artista', provider: 'email', providers: ['email'] },
          'operatore'
        )
      ).toEqual({
        ruolo: 'operatore',
        provider: 'email',
        providers: ['email'],
      })
    })

    it('handles null/undefined existing metadata', () => {
      expect(mergeAppMetadataWithRole(null, 'artista')).toEqual({
        ruolo: 'artista',
      })
      expect(mergeAppMetadataWithRole(undefined, 'admin')).toEqual({
        ruolo: 'admin',
      })
    })
  })

  describe('readAppMetadataArtistaId', () => {
    it('reads app_metadata and ignores a client-written user_metadata artista_id', () => {
      expect(
        readAppMetadataArtistaId({
          ruolo: 'artista',
          artista_id: '11111111-1111-4111-8111-111111111111',
        })
      ).toBe('11111111-1111-4111-8111-111111111111')
    })

    it('returns null when artista_id is missing or not a uuid', () => {
      expect(readAppMetadataArtistaId(undefined)).toBeNull()
      expect(readAppMetadataArtistaId({ ruolo: 'artista' })).toBeNull()
      expect(readAppMetadataArtistaId({ artista_id: 'not-a-uuid' })).toBeNull()
      expect(readAppMetadataArtistaId({ artista_id: '' })).toBeNull()
    })
  })

  describe('mergeAppMetadataWithArtistaLink', () => {
    it('sets artista_id without dropping ruolo or provider', () => {
      expect(
        mergeAppMetadataWithArtistaLink(
          { ruolo: 'collecting', provider: 'email' },
          'artista',
          '11111111-1111-4111-8111-111111111111'
        )
      ).toEqual({
        ruolo: 'artista',
        provider: 'email',
        artista_id: '11111111-1111-4111-8111-111111111111',
      })
    })

    it('drops artista_id when the role leaves artista', () => {
      expect(
        mergeAppMetadataWithArtistaLink(
          {
            ruolo: 'artista',
            provider: 'email',
            artista_id: '11111111-1111-4111-8111-111111111111',
          },
          'operatore',
          null
        )
      ).toEqual({
        ruolo: 'operatore',
        provider: 'email',
      })
    })

    it('keeps an existing link when the role stays artista and no new id is passed', () => {
      expect(
        mergeAppMetadataWithArtistaLink(
          {
            ruolo: 'artista',
            provider: 'email',
            artista_id: '11111111-1111-4111-8111-111111111111',
          },
          'artista',
          null
        )
      ).toEqual({
        ruolo: 'artista',
        provider: 'email',
        artista_id: '11111111-1111-4111-8111-111111111111',
      })
    })
  })

  describe('canManageOperaCast', () => {
    it('is limited to the Opere section roles', () => {
      expect(canManageOperaCast('admin')).toBe(true)
      expect(canManageOperaCast('operatore')).toBe(true)
      expect(canManageOperaCast('operatore_base')).toBe(true)
      expect(canManageOperaCast('tirocinante')).toBe(true)
      expect(canManageOperaCast('artista')).toBe(false)
      expect(canManageOperaCast('collecting')).toBe(false)
      expect(canManageOperaCast('readonly')).toBe(false)
      expect(canManageOperaCast(null)).toBe(false)
    })
  })

  describe('canManageArtistiContatti', () => {
    it('is limited to admin and operatore', () => {
      expect(canManageArtistiContatti('admin')).toBe(true)
      expect(canManageArtistiContatti('operatore')).toBe(true)
      expect(canManageArtistiContatti('operatore_base')).toBe(false)
      expect(canManageArtistiContatti('tirocinante')).toBe(false)
      expect(canManageArtistiContatti('artista')).toBe(false)
      expect(canManageArtistiContatti('collecting')).toBe(false)
      expect(canManageArtistiContatti('readonly')).toBe(false)
      expect(canManageArtistiContatti(null)).toBe(false)
    })
  })

  describe('readAuthoritativeUserRole', () => {
    it('reads app_metadata and ignores a client-written user_metadata role', () => {
      expect(
        readAuthoritativeUserRole({
          app_metadata: { ruolo: 'artista', provider: 'email' },
          user_metadata: { ruolo: 'operatore', artista_id: 'uuid-1' },
        })
      ).toBe('artista')
    })

    it('does not escalate to admin when user_metadata is rewritten and app_metadata has no role', () => {
      expect(
        readAuthoritativeUserRole({
          app_metadata: { provider: 'email' },
          user_metadata: { ruolo: 'admin' },
        })
      ).toBeNull()
    })

    it('fail-closes for a missing user', () => {
      expect(readAuthoritativeUserRole(null)).toBeNull()
      expect(readAuthoritativeUserRole(undefined)).toBeNull()
    })
  })
})
