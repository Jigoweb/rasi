import {
  mergeAppMetadataWithRole,
  readAppMetadataRole,
} from '@/shared/lib/auth-permissions'

export type ResendAccessMethod = 'invite' | 'recovery'

export type AuthUserForResend = {
  id: string
  email?: string | null
  email_confirmed_at?: string | null
  last_sign_in_at?: string | null
  app_metadata?: Record<string, unknown> | null
  user_metadata?: Record<string, unknown> | null
}

export type ResendAccessAuth = {
  inviteUserByEmail: (
    email: string,
    options: { data?: object; redirectTo?: string }
  ) => Promise<{ error: { message: string } | null }>
  resetPasswordForEmail: (
    email: string,
    options: { redirectTo?: string }
  ) => Promise<{ error: { message: string } | null }>
  updateUserAccess: (
    userId: string,
    attributes: {
      app_metadata?: Record<string, unknown>
      user_metadata?: Record<string, unknown>
    }
  ) => Promise<{ error: { message: string } | null }>
}

export type ResendAccessResult =
  | { ok: true; method: ResendAccessMethod }
  | { ok: false; status: number; error: string }

export function isAlreadyRegisteredInviteError(message: string): boolean {
  return /already been registered/i.test(message)
}

/**
 * GoTrue rejects inviteUserByEmail when the user is already confirmed
 * ("A user with this email address has already been registered.").
 * Unconfirmed pending invites can still be resent with invite.
 */
export function resolveResendAccessMethod(
  user: Pick<AuthUserForResend, 'email_confirmed_at' | 'last_sign_in_at'>
): ResendAccessMethod {
  if (user.email_confirmed_at || user.last_sign_in_at) {
    return 'recovery'
  }
  return 'invite'
}

export function resolveAuthInviteOrigin(
  siteUrl: string | undefined,
  requestOrigin: string | null
): string {
  return siteUrl || requestOrigin || 'http://localhost:3000'
}

export function buildAuthInviteRedirectUrl(origin: string): string {
  return `${origin.replace(/\/$/, '')}/auth/callback?invite=true`
}

/**
 * Metadata utente da reinviare nell'invito.
 * inviteUserByEmail scrive `data` in user_metadata, che il client può cambiare:
 * ruolo e artista_id non vengono copiati. Il collegamento resta in app_metadata.
 */
export function userMetadataWithoutRole(
  existing: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!existing) return {}
  const rest = { ...existing }
  delete rest.ruolo
  delete rest.artista_id
  return rest
}

/**
 * Ruolo da riscrivere in app_metadata durante il reinvio.
 * Se app_metadata.ruolo manca, non si usa user_metadata e non si assegna un default.
 */
export function appMetadataForResend(user: Pick<AuthUserForResend, 'app_metadata'>): Record<string, unknown> | null {
  const ruolo = readAppMetadataRole(user.app_metadata)
  if (!ruolo) return null
  return mergeAppMetadataWithRole(user.app_metadata, ruolo)
}

/**
 * Reinvia accesso al portale: invite per utenti mai confermati,
 * recovery (reset password) per utenti Auth già registrati.
 * Ruolo e artista_id restano in app_metadata; user_metadata non li riceve.
 */
export async function sendResendAccessEmail(
  user: AuthUserForResend,
  origin: string,
  auth: ResendAccessAuth
): Promise<ResendAccessResult> {
  if (!user.email) {
    return { ok: false, status: 400, error: 'Utente senza email' }
  }

  const method = resolveResendAccessMethod(user)
  const redirectTo = buildAuthInviteRedirectUrl(origin)
  const appMetadata = appMetadataForResend(user)
  const inviteData = userMetadataWithoutRole(user.user_metadata)

  if (appMetadata) {
    const { error: updateError } = await auth.updateUserAccess(user.id, {
      app_metadata: appMetadata,
    })
    if (updateError) {
      return { ok: false, status: 500, error: updateError.message }
    }
  }

  if (method === 'invite') {
    const { error } = await auth.inviteUserByEmail(user.email, {
      data: inviteData,
      redirectTo,
    })
    if (!error) {
      return { ok: true, method }
    }
    if (!isAlreadyRegisteredInviteError(error.message)) {
      return { ok: false, status: 500, error: error.message }
    }
    // Utente confermato non rilevato dai timestamp: usa recovery.
  }

  const { error } = await auth.resetPasswordForEmail(user.email, { redirectTo })
  if (error) {
    return { ok: false, status: 500, error: error.message }
  }
  return { ok: true, method: 'recovery' }
}
