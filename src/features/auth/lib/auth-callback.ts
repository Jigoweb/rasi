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
