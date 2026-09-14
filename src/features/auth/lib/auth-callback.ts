export type AuthCallbackDestinationInput = {
  origin: string
  invite: boolean
  success: boolean
}

/**
 * Destinazione post-callback Auth in base a successo e tipo link.
 */
export function getAuthCallbackDestination({
  origin,
  invite,
  success,
}: AuthCallbackDestinationInput): string {
  const base = origin.replace(/\/$/, '')

  if (!success) {
    const tipo = invite ? 'invito' : 'auth'
    return `${base}/auth/link-errore?tipo=${tipo}`
  }

  if (invite) {
    return `${base}/auth/imposta-password`
  }

  return `${base}/dashboard`
}

export type CompleteAuthCallbackInput = {
  origin: string
  invite: boolean
  code: string | null
  hash: string
  exchangeCode: (code: string) => Promise<{ error: { message: string } | null }>
  setSession: (tokens: {
    access_token: string
    refresh_token: string
  }) => Promise<{ error: { message: string } | null }>
}

export function parseImplicitAuthHash(
  hash: string
): { access_token: string; refresh_token: string; type: string | null } | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw) return null
  const params = new URLSearchParams(raw)
  const access_token = params.get('access_token')
  const refresh_token = params.get('refresh_token')
  if (!access_token || !refresh_token) return null
  return {
    access_token,
    refresh_token,
    type: params.get('type'),
  }
}

/**
 * Completa il callback Auth: PKCE (`code`) o token impliciti nel fragment
 * (inviteUserByEmail / resetPasswordForEmail avviati dal server).
 */
export async function completeAuthCallback(
  input: CompleteAuthCallbackInput
): Promise<string> {
  if (input.code) {
    const { error } = await input.exchangeCode(input.code)
    return getAuthCallbackDestination({
      origin: input.origin,
      invite: input.invite,
      success: !error,
    })
  }

  const implicit = parseImplicitAuthHash(input.hash)
  if (implicit) {
    const { error } = await input.setSession({
      access_token: implicit.access_token,
      refresh_token: implicit.refresh_token,
    })
    return getAuthCallbackDestination({
      origin: input.origin,
      invite: input.invite,
      success: !error,
    })
  }

  return getAuthCallbackDestination({
    origin: input.origin,
    invite: input.invite,
    success: false,
  })
}
