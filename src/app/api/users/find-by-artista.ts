import { readAuthoritativeUserRole, resolveUserRole } from '@/shared/lib/auth-permissions'

export type AuthUserLike = {
  id: string
  email?: string | null
  invited_at?: string | null
  last_sign_in_at?: string | null
  app_metadata?: { ruolo?: string | null; [key: string]: unknown } | null
  user_metadata?: { artista_id?: string | null; ruolo?: string | null } | null
}

export type LinkedUserSummary = {
  id: string
  email: string | null
  ruolo: string
  invited_at: string | null
  last_sign_in_at: string | null
}

/**
 * Trova l'utente Auth collegato a un artista_id nei risultati listUsers.
 */
export function findUserByArtistaId(
  users: AuthUserLike[],
  artistaId: string
): LinkedUserSummary | null {
  const match = users.find((u) => u.user_metadata?.artista_id === artistaId)
  if (!match) return null

  return {
    id: match.id,
    email: match.email ?? null,
    ruolo: resolveUserRole(readAuthoritativeUserRole(match)),
    invited_at: match.invited_at ?? null,
    last_sign_in_at: match.last_sign_in_at ?? null,
  }
}
