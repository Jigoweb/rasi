import { canManageArtistiContatti, readAuthoritativeUserRole } from '@/shared/lib/auth-permissions'

export type ContattiImportPrincipal = {
  app_metadata?: unknown
  user_metadata?: unknown
} | null

export type ContattiImportAccess =
  | { ok: true }
  | { ok: false; status: 401 | 403; error: string }

/** Ruolo solo da app_metadata. user_metadata non autorizza l'import. */
export function authorizeContattiImport(user: ContattiImportPrincipal): ContattiImportAccess {
  if (!user) {
    return { ok: false, status: 401, error: 'Accesso richiesto' }
  }
  if (!canManageArtistiContatti(readAuthoritativeUserRole(user))) {
    return {
      ok: false,
      status: 403,
      error: 'Solo amministratori e operatori possono recuperare i contatti degli artisti',
    }
  }
  return { ok: true }
}
