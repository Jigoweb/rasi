import {
  type UserRole,
  VALID_USER_ROLES,
  rolesInvitableBy,
} from '@/shared/lib/auth-permissions'

export type ValidateUserInviteInput = {
  actorIsAdmin: boolean
  email: unknown
  ruolo?: unknown
  artista_id?: unknown
}

export type ValidateUserInviteResult =
  | { ok: true; email: string; ruolo: UserRole; artistaId: string | null }
  | { ok: false; status: number; error: string }

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Valida un invito utente (email + ruolo) secondo la matrice admin/operatore.
 * Non esegue I/O: lookup artista e unicità email restano nel caller.
 */
export function validateUserInvite(
  input: ValidateUserInviteInput
): ValidateUserInviteResult {
  const email = asNonEmptyString(input.email)
  if (!email) {
    return { ok: false, status: 400, error: 'email è obbligatoria' }
  }

  const rawRuolo = input.ruolo === undefined || input.ruolo === null || input.ruolo === ''
    ? 'artista'
    : input.ruolo

  if (typeof rawRuolo !== 'string' || !VALID_USER_ROLES.includes(rawRuolo as UserRole)) {
    return {
      ok: false,
      status: 400,
      error: `Ruolo non valido. Ruoli disponibili: ${VALID_USER_ROLES.join(', ')}`,
    }
  }

  const ruolo = rawRuolo as UserRole
  const actorRole: UserRole = input.actorIsAdmin ? 'admin' : 'operatore'
  const invitable = rolesInvitableBy(actorRole)

  if (!invitable.includes(ruolo)) {
    if (actorRole === 'operatore' && ruolo === 'admin') {
      return {
        ok: false,
        status: 403,
        error: 'Gli operatori non possono invitare utenti con ruolo admin',
      }
    }
    return {
      ok: false,
      status: 403,
      error: 'Non hai i permessi per invitare questo ruolo',
    }
  }

  if (ruolo === 'artista') {
    const artistaId = asNonEmptyString(input.artista_id)
    if (!artistaId) {
      return {
        ok: false,
        status: 400,
        error: 'artista_id è obbligatorio per invitare un artista',
      }
    }
    return { ok: true, email, ruolo, artistaId }
  }

  return { ok: true, email, ruolo, artistaId: null }
}
