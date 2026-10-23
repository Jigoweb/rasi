import { canManageOperaCast, readAuthoritativeUserRole } from '@/shared/lib/auth-permissions'

export type CastImportPrincipal = {
  app_metadata?: unknown
  user_metadata?: unknown
} | null

export type CastImportAccess =
  | { ok: true }
  | { ok: false; status: 401 | 403; error: string }

/** Ruolo solo da app_metadata. user_metadata non autorizza l'import. */
export function authorizeCastImport(user: CastImportPrincipal): CastImportAccess {
  if (!user) {
    return { ok: false, status: 401, error: 'Accesso richiesto' }
  }
  if (!canManageOperaCast(readAuthoritativeUserRole(user))) {
    return {
      ok: false,
      status: 403,
      error: 'Solo amministratori e operatori possono gestire il cast',
    }
  }
  return { ok: true }
}
