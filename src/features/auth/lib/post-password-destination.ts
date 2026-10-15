/**
 * Destinazione dopo l'impostazione password da invito.
 * operatore/admin → dashboard operativa; artista o ruolo assente/sconosciuto → profilo.
 */
export function getPostPasswordDestination(ruolo: unknown): string {
  if (ruolo === 'operatore' || ruolo === 'admin') {
    return '/dashboard'
  }

  return '/dashboard/profilo'
}
