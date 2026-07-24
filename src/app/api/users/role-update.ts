import {
  type UserRole,
  resolveUserRole,
  canActorChangeTargetRole,
  mergeUserMetadataWithRole,
  VALID_USER_ROLES,
} from '@/shared/lib/auth-permissions'

export type ValidateRoleChangeInput = {
  actorIsAdmin: boolean
  actorUserId: string
  targetUserId: string
  targetCurrentRole: unknown
  newRole: unknown
}

export type ValidateRoleChangeResult =
  | { ok: true; ruolo: UserRole; actorRole: UserRole }
  | { ok: false; status: number; error: string }

/**
 * Valida un cambio ruolo secondo la matrice admin/operatore.
 * Non esegue I/O: il caller legge metadata e fa merge separatamente.
 */
export function validateRoleChange(
  input: ValidateRoleChangeInput
): ValidateRoleChangeResult {
  const actorRole: UserRole = input.actorIsAdmin ? 'admin' : 'operatore'
  const targetCurrentRole = resolveUserRole(input.targetCurrentRole)

  if (typeof input.newRole !== 'string' || !VALID_USER_ROLES.includes(input.newRole as UserRole)) {
    return {
      ok: false,
      status: 400,
      error: `Ruolo non valido. Ruoli disponibili: ${VALID_USER_ROLES.join(', ')}`,
    }
  }

  const newRole = input.newRole as UserRole

  if (
    input.actorIsAdmin &&
    input.targetUserId === input.actorUserId &&
    newRole !== 'admin'
  ) {
    return {
      ok: false,
      status: 400,
      error: 'Non puoi rimuovere il tuo stesso ruolo di amministratore',
    }
  }

  const permission = canActorChangeTargetRole(actorRole, targetCurrentRole, newRole)
  if (!permission.ok) {
    return { ok: false, status: 403, error: permission.error }
  }

  return { ok: true, ruolo: newRole, actorRole }
}

export { mergeUserMetadataWithRole }
