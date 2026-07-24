export type UserRole = 'admin' | 'operatore' | 'collecting' | 'artista'

export const VALID_USER_ROLES: UserRole[] = [
  'admin',
  'operatore',
  'collecting',
  'artista',
]

export type RolePermissions = {
  isAdmin: boolean
  isOperatore: boolean
  isArtista: boolean
  canManageUsers: boolean
  canEditRoles: boolean
}

export type RoleChangeResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Fail-closed: ruolo assente/invalido → collecting (zero privilegi nella matrice).
 */
export function resolveUserRole(ruolo: unknown): UserRole {
  if (typeof ruolo === 'string' && VALID_USER_ROLES.includes(ruolo as UserRole)) {
    return ruolo as UserRole
  }
  return 'collecting'
}

export function getRolePermissions(role: UserRole): RolePermissions {
  return {
    isAdmin: role === 'admin',
    isOperatore: role === 'operatore',
    isArtista: role === 'artista',
    canManageUsers: role === 'admin' || role === 'operatore',
    canEditRoles: role === 'admin' || role === 'operatore',
  }
}

export function rolesAssignableBy(actorRole: UserRole): UserRole[] {
  if (actorRole === 'admin') {
    return [...VALID_USER_ROLES]
  }
  if (actorRole === 'operatore') {
    return ['operatore', 'collecting', 'artista']
  }
  return []
}

export function canActorChangeTargetRole(
  actorRole: UserRole,
  targetCurrentRole: UserRole,
  newRole: UserRole
): RoleChangeResult {
  const assignable = rolesAssignableBy(actorRole)
  if (assignable.length === 0) {
    return { ok: false, error: 'Non hai i permessi per modificare i ruoli' }
  }

  if (actorRole === 'operatore' && targetCurrentRole === 'admin') {
    return {
      ok: false,
      error: 'Gli operatori non possono modificare utenti amministratori',
    }
  }

  if (!assignable.includes(newRole)) {
    if (actorRole === 'operatore' && newRole === 'admin') {
      return {
        ok: false,
        error: 'Gli operatori non possono assegnare il ruolo admin',
      }
    }
    return { ok: false, error: 'Ruolo non assegnabile' }
  }

  return { ok: true }
}

export function mergeUserMetadataWithRole(
  existing: Record<string, unknown> | null | undefined,
  ruolo: UserRole
): Record<string, unknown> {
  return {
    ...(existing ?? {}),
    ruolo,
  }
}
