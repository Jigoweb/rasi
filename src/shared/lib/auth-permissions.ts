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

/**
 * Legge il ruolo da app_metadata (colonna auth.users.raw_app_meta_data).
 * È l'unica fonte autoritativa: user_metadata è scrivibile dal client
 * con auth.updateUser({ data }) e non va usato per autorizzare.
 * Ruolo assente → null. Nessun fallback.
 */
export function readAppMetadataRole(appMetadata: unknown): string | null {
  if (!appMetadata || typeof appMetadata !== 'object') return null
  const ruolo = (appMetadata as Record<string, unknown>).ruolo
  return typeof ruolo === 'string' && ruolo.length > 0 ? ruolo : null
}

/**
 * Ruolo usato per autorizzare. Ignora user_metadata anche se contiene
 * ruolo=admin o ruolo=operatore.
 */
export function readAuthoritativeUserRole(user: {
  app_metadata?: unknown
  user_metadata?: unknown
} | null | undefined): string | null {
  return readAppMetadataRole(user?.app_metadata)
}

/** Merge del ruolo in app_metadata. Non tocca user_metadata. */
export function mergeAppMetadataWithRole(
  existing: Record<string, unknown> | null | undefined,
  ruolo: string
): Record<string, unknown> {
  return {
    ...(existing ?? {}),
    ruolo,
  }
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

/**
 * Ruoli che l'attore può assegnare in un invito email.
 * Più stretto di rolesAssignableBy: collecting non è invitabile.
 */
export function rolesInvitableBy(actorRole: UserRole): UserRole[] {
  if (actorRole === 'admin') {
    return ['admin', 'operatore', 'artista']
  }
  if (actorRole === 'operatore') {
    return ['operatore', 'artista']
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

